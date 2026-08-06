// Launch locations for the public release.
// To expand: add whole countries to LAUNCH_COUNTRIES, or individual resorts/
// towns to LAUNCH_RESORT_LEGACY_IDS / LAUNCH_TOWN_SLUGS (used for the Australia
// launch, which is scoped to the Snowy Mountains rather than the whole country).
// To remove the gate entirely: make isInLaunchLocation return true.

// Whole countries that are live. NOTE: match the resort `country` strings used
// in the resorts data ("USA", not "United States").
export const LAUNCH_COUNTRIES = ["Canada", "Japan", "USA"];

// Individual Australian resorts/towns that are live (Australia is scoped to the
// Snowy Mountains, so it is gated per-resort rather than via LAUNCH_COUNTRIES).
export const LAUNCH_RESORT_LEGACY_IDS = ["52", "50"]; // Thredbo, Perisher
export const LAUNCH_TOWN_SLUGS = ["jindabyne"];
export const LAUNCH_LOCATION_NAMES =
  "Thredbo, Perisher & Jindabyne, plus Canada, Japan & the USA";

export function isInLaunchLocation(
  resortLegacyId: string | null | undefined,
  townSlug: string | null | undefined,
  resortCountry?: string | null | undefined
): boolean {
  if (resortCountry && LAUNCH_COUNTRIES.includes(resortCountry)) {
    return true;
  }
  if (resortLegacyId && LAUNCH_RESORT_LEGACY_IDS.includes(resortLegacyId)) {
    return true;
  }
  if (townSlug && LAUNCH_TOWN_SLUGS.includes(townSlug)) {
    return true;
  }
  return false;
}
