/**
 * The shared primitives behind every published figure.
 *
 * Extracted when the second data page needed them. One copy, because the
 * rules they encode are the promises AEO.md makes to a reader — a second,
 * slightly different `money()` or a second floor would be a second set of
 * promises, and the drift would show up as two pages disagreeing.
 */

/** Below this, a figure describes a handful of employers, not a place. */
export const MIN_LISTINGS = 5;

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

/** A share as a percentage, or null when the denominator is too small. */
export function share(numerator: number, denominator: number): number | null {
  if (denominator < MIN_LISTINGS) return null;
  return round2((numerator / denominator) * 100);
}

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

/**
 * ⚠️ THE CODE AS WELL AS THE SYMBOL, ALWAYS. "$" is CAD, AUD, NZD and USD on
 * this board. A worker reading "$25.50" on a page that also covers Japan has
 * no way to know which, and no page here ever converts between them.
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
export function digits(amount: number): string {
  const fractional = Math.abs(amount % 1) > Number.EPSILON;
  return amount.toLocaleString("en-GB", {
    minimumFractionDigits: fractional ? 2 : 0,
    maximumFractionDigits: 2,
  });
}

export function symbolFor(currency: string): string {
  return SYMBOLS[currency] ?? "";
}

export function money(amount: number | null, currency: string | null): string | null {
  if (amount === null || !Number.isFinite(amount) || currency === null) return null;
  return `${currency} ${symbolFor(currency)}${digits(amount)}`;
}
