/**
 * lib/outreach/hemisphere.ts
 *
 * Outreach emails talk about "the winter season", which means opposite
 * halves of the year depending on where the lead's resort is. Southern
 * resorts (Australia, NZ, South America) run Jun–Oct; northern resorts
 * (Canada, Japan, USA, Europe) run Nov–Apr, labelled "2026/27" style.
 *
 * The default is "south" so existing AU leads and any lead without a
 * linked resort keep the original copy unchanged.
 */
export type Hemisphere = "north" | "south";

const SOUTHERN_COUNTRIES = ["Australia", "New Zealand", "Chile", "Argentina"];

export function hemisphereForCountry(
  country: string | null | undefined
): Hemisphere {
  if (!country) return "south";
  return SOUTHERN_COUNTRIES.includes(country) ? "south" : "north";
}
