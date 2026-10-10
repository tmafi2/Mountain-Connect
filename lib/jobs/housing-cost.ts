/**
 * What staff housing costs the worker, and whether it comes out of wages.
 *
 * ⚠️ WHY THESE EXIST: `accommodation_cost` was a TEXT column with ONE
 * non-empty value on the whole board — "¥60k per month". Nothing could be
 * aggregated from it, and the question workers ask most about staff housing
 * ("is the rent taken out of my pay?") had no column at all; 36 live
 * descriptions mentioned it only in prose. Migration 00112 added four
 * structured columns mirroring how pay is already stored.
 *
 * ⚠️ UNKNOWN IS NOT "NO". `accommodation_cost_deducted` is a NULLABLE boolean
 * with no default, and every function here returns null rather than a
 * reassuring phrase when the advert did not say. Rendering "Paid separately"
 * for a listing that never mentioned it would be the same class of error as
 * `pay_currency DEFAULT 'USD'`, which made a placeholder read as a fact on
 * 177 listings (00109).
 */

/** Symbols for the currencies the board actually quotes housing in. */
const SYMBOLS: Record<string, string> = {
  AUD: "$", NZD: "$", CAD: "$", USD: "$", EUR: "€", GBP: "£",
  CHF: "CHF ", JPY: "¥", NOK: "kr ", SEK: "kr ", CLP: "$", ARS: "$", GEL: "₾",
};

export type HousingCost = {
  amount: number | null | undefined;
  currency?: string | null;
  period?: string | null;
};

/**
 * "¥60,000/month", or null when there is no amount.
 *
 * Returns null — never "TBD" or "Ask" — so a caller must decide what absence
 * looks like in its own layout rather than being handed filler.
 */
export function formatHousingCost(cost: HousingCost): string | null {
  const { amount, currency, period } = cost;
  if (amount === null || amount === undefined) return null;
  if (!Number.isFinite(amount) || amount < 0) return null;

  if (amount === 0) return period ? `Free (${period})` : "Free";

  const code = (currency ?? "").trim().toUpperCase();
  const symbol = code ? SYMBOLS[code] ?? "" : "";
  const n = amount.toLocaleString("en-GB", { maximumFractionDigits: 2 });
  // The code as well as the symbol, because "$" alone is four currencies on
  // this board and the resort's country is not always on screen beside it.
  const money = code ? `${code} ${symbol}${n}` : n;
  return period ? `${money}/${period}` : money;
}

/**
 * How to describe the deduction, or null when the advert did not say.
 *
 * ⚠️ THE null CASE IS THE COMMON ONE and must stay silent. There is no
 * "not specified" string here on purpose: a label saying nothing still takes
 * up a row in a table and reads, to someone scanning, as information.
 */
export function housingDeductedLabel(deducted: boolean | null | undefined): string | null {
  if (deducted === true) return "Deducted from pay";
  if (deducted === false) return "Paid separately";
  return null;
}

/** True when there is anything worth rendering a housing-cost line for. */
export function hasHousingCostInfo(
  cost: HousingCost,
  deducted: boolean | null | undefined
): boolean {
  return formatHousingCost(cost) !== null || housingDeductedLabel(deducted) !== null;
}
