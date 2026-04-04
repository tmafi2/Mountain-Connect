// Launch locations for the initial public release.
// To expand: add more legacy_ids or town slugs to these arrays.
// To remove the gate entirely: make isInLaunchLocation return true.

export const LAUNCH_RESORT_LEGACY_IDS = ["52", "50"]; // Thredbo, Perisher
export const LAUNCH_TOWN_SLUGS = ["jindabyne"];
export const LAUNCH_LOCATION_NAMES = "Thredbo, Perisher & Jindabyne";

export function isInLaunchLocation(
  resortLegacyId: string | null | undefined,
  townSlug: string | null | undefined
): boolean {
  if (resortLegacyId && LAUNCH_RESORT_LEGACY_IDS.includes(resortLegacyId)) {
    return true;
  }
  if (townSlug && LAUNCH_TOWN_SLUGS.includes(townSlug)) {
    return true;
  }
  return false;
}
