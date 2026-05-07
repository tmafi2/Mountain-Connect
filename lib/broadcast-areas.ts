// Registry of broadcast "areas" admins can blast worker emails for.
// Each area resolves to a list of resort legacy_ids (the static-data
// IDs in lib/data/resorts.ts) which the API endpoint maps to live
// resort UUIDs at send time.

export interface BroadcastArea {
  key: string;
  /** Display name as it should appear in the email subject + body. */
  displayName: string;
  /** Legacy resort IDs from lib/data/resorts.ts that define the area. */
  resortLegacyIds: string[];
  /** Path used as the "Browse all jobs" CTA in the email. */
  browseUrlPath: string;
}

export const BROADCAST_AREAS: BroadcastArea[] = [
  {
    key: "snowy-mountains",
    displayName: "the Snowy Mountains",
    resortLegacyIds: ["70", "50", "71", "52"], // Charlotte's Pass, Perisher, Selwyn, Thredbo
    browseUrlPath: "/jobs?town=jindabyne",
  },
];

export function findBroadcastArea(key: string): BroadcastArea | undefined {
  return BROADCAST_AREAS.find((a) => a.key === key);
}
