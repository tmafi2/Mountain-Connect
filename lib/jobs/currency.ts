/**
 * What currency a job at this resort is quoted in.
 *
 * ⚠️ WHY THIS EXISTS: `job_posts.pay_currency` used to carry a column default
 * of 'USD', and the importer omits the field when extraction finds no
 * currency — so the default fired and the row came out saying US dollars.
 *
 * That made USD mean "we don't know", on a board with NO US resorts. On
 * 2026-10-10 it was 177 of 341 open jobs. Cross-tabbed against the resort's
 * country it was unmistakable: 124/124 CAD rows and 40/40 JPY rows carried
 * pay, while 0/58 Canadian-USD and 0/115 Japanese-USD rows did. The stamp was
 * applied exactly when there was nothing to denominate.
 *
 * The rule now, and it is two different answers to two different questions:
 *
 *   no pay at all      -> pay_currency IS NULL. There is nothing to
 *                         denominate, and NULL says that; "USD" says
 *                         something false about a job in Niseko.
 *   pay, no currency   -> derive it from the resort's country, below.
 *
 * ⚠️ THE DERIVED CASE IS AN INFERENCE, not a reading of the advert. A
 * Japanese resort hiring through an Australian agency could genuinely quote
 * AUD. It is still far better than the alternatives: USD was wrong for every
 * one of those rows, and NULL would leave a number on screen with no unit.
 * A currency the advert states always wins — this is only ever the fallback.
 */

/**
 * Keyed on the country strings used in `resorts.country`, which are the
 * static resort data's spellings — "USA", not "United States".
 *
 * Georgia was missing from the copy of this map that lived in the business
 * post-job form, so a Georgian resort silently fell through to no currency.
 */
export const COUNTRY_CURRENCY: Record<string, string> = {
  Andorra: "EUR",
  Argentina: "ARS",
  Australia: "AUD",
  Austria: "EUR",
  Canada: "CAD",
  Chile: "CLP",
  France: "EUR",
  Georgia: "GEL",
  Italy: "EUR",
  Japan: "JPY",
  "New Zealand": "NZD",
  Sweden: "SEK",
  Switzerland: "CHF",
  USA: "USD",
};

/**
 * The currency to store for a job, given what was extracted and where the
 * resort is. Returns null when there is no pay — the caller should then write
 * NULL rather than omitting the column, so no database default can fill it in.
 */
export function currencyForJob(
  payAmount: string | number | null | undefined,
  statedCurrency: string | null | undefined,
  resortCountry: string | null | undefined
): string | null {
  const hasPay = payAmount !== null && payAmount !== undefined && String(payAmount).trim() !== "";
  if (!hasPay) return null;

  const stated = (statedCurrency ?? "").trim().toUpperCase();
  if (stated) return stated;

  return COUNTRY_CURRENCY[(resortCountry ?? "").trim()] ?? null;
}
