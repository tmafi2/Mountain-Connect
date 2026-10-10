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

/** Below this, a median says more about one employer than about a town. */
export const MIN_LISTINGS = 5;

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

/** Linear-interpolation percentile — the common definition. */
export function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return Number.NaN;
  if (sorted.length === 1) return sorted[0];
  const idx = (sorted.length - 1) * p;
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  return lo === hi ? sorted[lo] : sorted[lo] + (sorted[hi] - sorted[lo]) * (idx - lo);
}

export const round2 = (n: number) => Math.round(n * 100) / 100;

/**
 * A housing cost as a weekly figure, so night/month/season quotes compare.
 *
 * A month is 52/12 weeks, not 4 — treating it as 4 understates a monthly rent
 * by 8%. A season is 24 weeks, roughly the November–April window the listings
 * describe, and is the one approximation here.
 */
export function toWeekly(amount: number, period: string | null): number | null {
  switch (period) {
    case "night": return amount * 7;
    case "week": return amount;
    case "month": return (amount * 12) / 52;
    case "season": return amount / 24;
    default: return null;
  }
}

/** True when this town has enough priced listings to quote a wage. */
export function canQuotePay(town: TownPay): boolean {
  return town.pricedCount >= MIN_LISTINGS && town.medianHourly !== null && town.currency !== null;
}

/** True when this town has enough stated housing costs to quote one. */
export function canQuoteHousing(town: TownPay): boolean {
  return town.housingCostCount >= MIN_LISTINGS && town.medianWeeklyHousing !== null;
}

/**
 * "CAD $25.50" — the code as well as the symbol.
 *
 * ⚠️ BOTH, ALWAYS. "$" is CAD, AUD, NZD and USD on this board. A worker
 * reading "$25.50/hour" on a page that also covers Japan has no way to know
 * which, and the page never converts between them.
 */
const SYMBOLS: Record<string, string> = {
  CAD: "$", AUD: "$", NZD: "$", USD: "$", EUR: "€", GBP: "£",
  JPY: "¥", CHF: "CHF ", SEK: "kr ", CLP: "$", ARS: "$", GEL: "₾",
};

/**
 * Two decimals when there are any, none when there are not — so CAD 25.5
 * reads "$25.50" like money, while JPY 1400 reads "¥1,400" rather than
 * "¥1,400.00" for a currency with no minor unit. A bare `maximumFractionDigits`
 * gives "$25.5", which is not a price anyone writes.
 */
function digits(amount: number): string {
  const fractional = Math.abs(amount % 1) > Number.EPSILON;
  return amount.toLocaleString("en-GB", {
    minimumFractionDigits: fractional ? 2 : 0,
    maximumFractionDigits: 2,
  });
}

export function money(amount: number | null, currency: string | null): string | null {
  if (amount === null || !Number.isFinite(amount) || currency === null) return null;
  return `${currency} ${SYMBOLS[currency] ?? ""}${digits(amount)}`;
}

/** "CAD $20.25–$29" for the quartile range, or null when it cannot be shown. */
export function range(town: TownPay): string | null {
  if (!canQuotePay(town) || town.p25Hourly === null || town.p75Hourly === null) return null;
  // ⚠️ A range with identical ends is not a range. Fernie rendered "CAD
  // $21–$21" and Furano "JPY ¥1,400–¥1,400", which reads as a broken template
  // rather than as "every listing here pays the same". The median above it
  // already says the number.
  if (town.p25Hourly === town.p75Hourly) return null;
  const symbol = SYMBOLS[town.currency as string] ?? "";
  return `${town.currency} ${symbol}${digits(town.p25Hourly)}–${symbol}${digits(town.p75Hourly)}`;
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
