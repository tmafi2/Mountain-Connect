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

/**
 * A share as a WHOLE percentage, or null when the denominator is too small.
 *
 * ⚠️ No decimals. "14 of 23 (60.87%)" claims a precision twenty-three adverts
 * cannot carry, and every share on these pages prints its fraction beside it,
 * so the percentage is the gloss and the fraction is the evidence. A reader
 * who wants the exact number already has it.
 */
export function share(numerator: number, denominator: number): number | null {
  if (denominator < MIN_LISTINGS) return null;
  return Math.round((numerator / denominator) * 100);
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
 * Currencies with no minor unit. A fraction of one of these is not money.
 *
 * ⚠️ A derived figure is where this bites. The median weekly housing cost at
 * Niseko is calculated from monthly rents, and rendered "JPY ¥4,615.38 a
 * week" — 38 hundredths of a yen, a unit that does not exist, on a page whose
 * whole argument is that its numbers are real.
 */
const ZERO_DECIMAL = new Set(["JPY", "CLP", "KRW", "VND", "ISK", "HUF"]);

/**
 * Two decimals when there are any, none when there are not — so CAD 25.5
 * reads "$25.50" like money, while JPY 1400 reads "¥1,400". A bare
 * `maximumFractionDigits` gives "$25.5", which is not a price anyone writes.
 */
export function digits(amount: number, currency?: string | null): string {
  const whole = currency != null && ZERO_DECIMAL.has(currency);
  const value = whole ? Math.round(amount) : amount;
  const fractional = !whole && Math.abs(value % 1) > Number.EPSILON;
  return value.toLocaleString("en-GB", {
    minimumFractionDigits: fractional ? 2 : 0,
    maximumFractionDigits: whole ? 0 : 2,
  });
}

export function symbolFor(currency: string): string {
  return SYMBOLS[currency] ?? "";
}

export function money(amount: number | null, currency: string | null): string | null {
  if (amount === null || !Number.isFinite(amount) || currency === null) return null;
  return `${currency} ${symbolFor(currency)}${digits(amount, currency)}`;
}
