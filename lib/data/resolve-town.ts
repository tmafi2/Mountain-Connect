import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Resolve a free-text location string to a nearby_town_id UUID by
 * exact (case-insensitive) match against the nearby_towns table.
 *
 * Examples that match Jindabyne:
 *   "Jindabyne"
 *   "jindabyne"
 *   "Jindabyne, NSW"   (first comma-chunk matches)
 *
 * Examples that do NOT match (returned as null):
 *   "Snowy Mountains, NSW"   (region, not a town in our DB)
 *   "Jindbayne"              (typo — exact match only on purpose)
 *
 * Used by the import-listing routes so business_profile shells get
 * the FK stamped at insert-time, not just stored as text. Mirrors the
 * one-shot backfill at scripts/backfill-business-town-fk.ts.
 *
 * Returns null on missing input, no match, or DB error.
 */
export async function resolveTownIdFromLocation(
  admin: SupabaseClient,
  location: string | null | undefined
): Promise<string | null> {
  const trimmed = location?.trim();
  if (!trimmed) return null;

  const { data: towns, error } = await admin
    .from("nearby_towns")
    .select("id, name");
  if (error || !towns) return null;

  const byName = new Map<string, string>();
  for (const t of towns) byName.set((t.name as string).toLowerCase(), t.id as string);

  // Try the full string first, then the first comma-separated chunk.
  // Exact match only — "Jindbayne" is treated as no-match rather than
  // fuzzy-corrected so a typo in the import doesn't silently get
  // inferred to the wrong town.
  const trials = [trimmed, trimmed.split(",")[0]].map((s) => s.trim().toLowerCase());
  for (const trial of trials) {
    const id = byName.get(trial);
    if (id) return id;
  }
  return null;
}
