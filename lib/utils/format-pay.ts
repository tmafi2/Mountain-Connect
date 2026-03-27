/** Currency code → symbol mapping */
const CURRENCY_SYMBOLS: Record<string, string> = {
  AUD: "$",
  NZD: "$",
  CAD: "$",
  USD: "$",
  EUR: "€",
  GBP: "£",
  CHF: "CHF ",
  JPY: "¥",
  NOK: "kr ",
  SEK: "kr ",
  CLP: "$",
  ARS: "$",
};

/**
 * Format pay display with currency code and symbol.
 * e.g. "AUD $22-30/hr", "EUR €18/hr", "CHF CHF 25/hr"
 */
export function formatPay(
  payAmount: string | null | undefined,
  payCurrency: string | null | undefined,
  fallback?: string | null
): string {
  if (!payAmount && !fallback) return "TBD";
  const amount = payAmount || fallback || "TBD";
  if (!payCurrency) return amount;

  const symbol = CURRENCY_SYMBOLS[payCurrency] || "";
  // Avoid double-prefixing if amount already starts with the currency or symbol
  if (amount.startsWith(payCurrency) || amount.startsWith(symbol.trim())) {
    return amount;
  }
  return `${payCurrency} ${symbol}${amount}`;
}
