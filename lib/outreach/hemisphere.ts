/**
 * lib/outreach/hemisphere.ts
 *
 * Outreach emails talk about "the winter season", which means opposite
 * halves of the year depending on where the lead is. Southern leads
 * (Australia, NZ, South America) run Jun–Oct; northern ones (Canada,
 * Japan, USA, Europe) run Nov–Apr, labelled "2026/27" style.
 *
 * The default is "south", which is only safe while every lead we cannot
 * place is Australian — the original list was. It stopped being safe on
 * 2026-09-20, when a 212-row Canadian list arrived carrying 32 leads with
 * a town and no resort (Banff, Canmore, Squamish, Kelowna). A business in
 * a ski TOWN frequently belongs to no resort in particular, so reading the
 * country off the resort alone would have offered all 32 of them a June
 * season. A town knows its own country; ask it before falling back.
 */
export type Hemisphere = "north" | "south";

const SOUTHERN_COUNTRIES = ["Australia", "New Zealand", "Chile", "Argentina"];

export function hemisphereForCountry(
  country: string | null | undefined
): Hemisphere {
  if (!country) return "south";
  return SOUTHERN_COUNTRIES.includes(country) ? "south" : "north";
}

/**
 * The resolution every send path should use: the resort first, since it is
 * the more specific of the two, then the lead's town. It lives here rather
 * than being spelled `resort?.country ?? town?.country` at each call site —
 * there are three, and the fourth one added would have inherited the bug.
 */
export function hemisphereForLead(
  resort: { country?: string | null } | null | undefined,
  town: { country?: string | null } | null | undefined
): Hemisphere {
  return hemisphereForCountry(resort?.country ?? town?.country);
}
