/**
 * Pay statistics for a mountain town, and the rules about publishing them.
 *
 * Split from `pay-by-town.server.ts` for the reason documented in
 * platform-stats.ts: the query half imports `next/headers`, and pulling that
 * into a client component 500s the route in a way typecheck does not catch.
 * Everything here is pure, so it can be tested without a database.
 *
 * ⚠️ THE HONESTY RULES ARE IN THE TYPES, not in whoever writes the page.
 * AEO.md commits to four of them and three are enforced here:
 *   - never a figure from fewer than MIN_LISTINGS listings
 *   - currencies kept apart, never converted
 *   - the sample size travels WITH the figure, so a caller cannot render one
 *     without the other
 * The fourth — flag outliers rather than dropping them — belongs to the
 * query, which is where the rows are.
 */

import { MIN_LISTINGS, money, percentile, round2, share, symbolFor, digits, toWeekly } from "./figures";

// Re-exported so this module's own callers and tests keep one import. The
// definitions live in figures.ts, shared with the housing page.
export { MIN_LISTINGS, money, percentile, round2, share, toWeekly };

export type TownPay = {
  town: string;
  slug: string;
  country: string;
  /** Resorts these listings sit at — a town can serve more than one. */
  resorts: string[];
  /** Every open listing in the town, priced or not. */
  jobCount: number;
  /** Listings with a usable hourly rate. The denominator for every figure. */
  pricedCount: number;
  /** ⚠️ Never converted. A town is in one country, so this is one code. */
  currency: string | null;
  medianHourly: number | null;
  p25Hourly: number | null;
  p75Hourly: number | null;
  /** Share of all listings in the town offering staff accommodation. */
  pctWithHousing: number | null;
  /** Housing cost, when enough listings state one. */
  medianWeeklyHousing: number | null;
  housingCostCount: number;
};

/** True when this town has enough priced listings to quote a wage. */
export function canQuotePay(town: TownPay): boolean {
  return town.pricedCount >= MIN_LISTINGS && town.medianHourly !== null && town.currency !== null;
}

/** True when this town has enough stated housing costs to quote one. */
export function canQuoteHousing(town: TownPay): boolean {
  return town.housingCostCount >= MIN_LISTINGS && town.medianWeeklyHousing !== null;
}

/**
 * "CAD $20.25–$29" for the quartile range, or null when it cannot be shown.
 *
 * ⚠️ A range with identical ends is not a range. Fernie rendered "CAD
 * $21–$21" and Furano "JPY ¥1,400–¥1,400", which reads as a broken template
 * rather than as "every listing here pays the same". The median printed above
 * it already carries the number.
 */
export function range(town: TownPay): string | null {
  if (!canQuotePay(town) || town.p25Hourly === null || town.p75Hourly === null) return null;
  if (town.p25Hourly === town.p75Hourly) return null;
  const symbol = symbolFor(town.currency as string);
  return `${town.currency} ${symbol}${digits(town.p25Hourly, town.currency)}–${symbol}${digits(town.p75Hourly, town.currency)}`;
}

/**
 * The towns worth putting on the page, most listings first.
 *
 * A town with listings but not enough PRICED ones still belongs here — it can
 * say how many jobs it has and what share include housing, which is true and
 * useful, while the wage column reads "not enough data". Dropping it would
 * make the page look like those towns have no work.
 */
export function publishable(towns: TownPay[]): TownPay[] {
  return towns
    .filter((t) => t.jobCount >= MIN_LISTINGS)
    .sort((a, b) => b.jobCount - a.jobCount || a.town.localeCompare(b.town));
}

/**
 * "CAD $21 to CAD $25.50, and JPY ¥1,400 in Japan" — a range PER CURRENCY.
 *
 * ⚠️ THIS EXISTS BECAUSE THE OBVIOUS VERSION WAS WRONG. Taking a plain
 * min/max across every town produced "median hourly pay ranges from CAD $21
 * to CAD $1,400" — comparing 21 Canadian dollars with 1,400 Japanese yen as
 * though they were the same unit, and labelling the result CAD. It was going
 * out in the FAQPage schema, which is the part an answer engine quotes.
 *
 * Numbers in different currencies are not comparable and this page never
 * converts them, so they are never put in one range.
 */
export function rangeByCurrency(towns: TownPay[]): string {
  const quotable = towns.filter(canQuotePay);
  const byCurrency = new Map<string, number[]>();
  for (const t of quotable) {
    const code = t.currency as string;
    const list = byCurrency.get(code) ?? [];
    list.push(t.medianHourly as number);
    byCurrency.set(code, list);
  }

  const parts = [...byCurrency.entries()]
    // Most towns first, so the biggest market leads the sentence.
    .sort((a, b) => b[1].length - a[1].length)
    .map(([code, medians]) => {
      const lo = Math.min(...medians);
      const hi = Math.max(...medians);
      return lo === hi ? money(lo, code)! : `${money(lo, code)} to ${money(hi, code)}`;
    });

  if (parts.length === 0) return "";
  if (parts.length === 1) return parts[0];
  // Two reads better with a comma than a semicolon; three or more need the
  // semicolons, because each part already contains the word "to".
  if (parts.length === 2) return `${parts[0]}, and ${parts[1]}`;
  return `${parts.slice(0, -1).join("; ")}; and ${parts[parts.length - 1]}`;
}
