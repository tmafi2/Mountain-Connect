import type { SupabaseClient } from "@supabase/supabase-js";
import { TIER_FEATURES, type BusinessTier } from "@/lib/tier";

/**
 * Parking = a job post we took off the board to enforce a tier limit, as
 * opposed to one the owner paused deliberately. The distinction lives in
 * job_posts.paused_reason (migration 00087) and it is what makes the
 * restore below safe: a NULL reason is the owner's own decision and is
 * never touched.
 *
 * Two things park a job:
 *   claim_gated     — a business claimed an imported shell carrying several
 *                     listings; the free tier keeps one live, the rest park.
 *   tier_downgrade  — the billing downgrade rule (enforceJobLimit).
 *
 * Both unpark on upgrade, newest-first, up to whatever the new tier allows.
 *
 * Other parts of the app now pause jobs for their own reasons — 00092's
 * 'stale_cleanup', and job expiry after it. Those are NOT billing decisions
 * and must never be undone by an upgrade, so everything here matches on
 * BILLING_PAUSE_REASONS explicitly rather than on "paused_reason is set".
 */
export type PauseReason = "claim_gated" | "tier_downgrade";

/**
 * The only reasons billing may reverse. Anything paused for another reason
 * is somebody else's decision to undo.
 */
export const BILLING_PAUSE_REASONS: PauseReason[] = ["claim_gated", "tier_downgrade"];

/**
 * Park the active jobs this business's tier does not cover, keeping
 * `keepLiveJobId` live by preference.
 *
 * Called at claim time. The business has just taken ownership of listings
 * we imported on their behalf and picked the one that stays live. Nothing
 * is deleted — applications and expressions of interest stay attached to
 * the parked rows and become visible again the moment the business
 * upgrades, which is the whole point: parked demand is the strongest
 * argument for the paid plan.
 *
 * The limit comes from the claimant's EFFECTIVE tier, not a hardcoded 1.
 * That matters because migration 00080 stamped a courtesy window onto every
 * business row including unclaimed shells, so a shell claimed before
 * 2026-10-15 legitimately resolves to premium and must keep everything
 * live. An infinite limit parks nothing and returns 0.
 *
 * Drafts are left alone. They were never public and the normal publish
 * gate already covers them.
 *
 * `keepLiveJobId` must be verified as belonging to `businessId` by the
 * caller. Returns the number of jobs parked.
 */
export async function parkListingsOnClaim(
  admin: SupabaseClient,
  businessId: string,
  keepLiveJobId: string | null,
  limit: number
): Promise<number> {
  if (!Number.isFinite(limit)) return 0;

  const { data: active, error: readErr } = await admin
    .from("job_posts")
    .select("id")
    .eq("business_id", businessId)
    .eq("status", "active")
    .order("created_at", { ascending: false });

  if (readErr) {
    console.error("[billing] parkListingsOnClaim read failed:", readErr);
    return 0;
  }

  // The chosen listing takes the first slot; any remaining headroom goes to
  // the newest of the rest, matching enforceJobLimit's newest-first rule.
  const ids = (active ?? []).map((j) => j.id);
  const chosen = keepLiveJobId && ids.includes(keepLiveJobId) ? keepLiveJobId : null;
  const keep = new Set<string>(chosen ? [chosen] : []);
  for (const id of ids) {
    if (keep.size >= limit) break;
    keep.add(id);
  }

  const toPark = ids.filter((id) => !keep.has(id));
  if (toPark.length === 0) return 0;

  const { error } = await admin
    .from("job_posts")
    .update({ status: "paused", is_active: false, paused_reason: "claim_gated" })
    .in("id", toPark);

  if (error) {
    console.error("[billing] parkListingsOnClaim failed:", error);
    return 0;
  }

  console.log(
    `[billing] parked ${toPark.length} listing(s) at claim for business ${businessId} ` +
      `(limit ${limit}, kept ${keep.size} live)`
  );
  return toPark.length;
}

/**
 * Bring parked jobs back, newest-first, up to what `tier` allows.
 *
 * The mirror of enforceJobLimit. Only rows parked FOR BILLING are eligible —
 * a job the owner paused stays paused, because silently re-publishing a role
 * they filled is worse than making them click once.
 *
 * Matched against BILLING_PAUSE_REASONS rather than "any reason set": once
 * paused_reason grew non-billing values (00092's 'stale_cleanup', and job
 * expiry after it), "we set it" stopped implying "we may undo it". A stale
 * listing retired months ago must not come back because someone upgraded.
 *
 * Jobs restored beyond the limit stay parked with their reason intact, so
 * a later upgrade picks up where this left off.
 *
 * Returns the number restored.
 */
export async function restoreParkedJobs(
  admin: SupabaseClient,
  businessId: string,
  tier: BusinessTier
): Promise<number> {
  const limit = TIER_FEATURES[tier].maxActiveJobs;

  const [{ count: activeCount }, { data: parked, error: readErr }] = await Promise.all([
    admin
      .from("job_posts")
      .select("id", { count: "exact", head: true })
      .eq("business_id", businessId)
      .eq("status", "active"),
    admin
      .from("job_posts")
      .select("id")
      .eq("business_id", businessId)
      .eq("status", "paused")
      .in("paused_reason", BILLING_PAUSE_REASONS)
      .order("created_at", { ascending: false }),
  ]);

  if (readErr) {
    console.error("[billing] restoreParkedJobs read failed:", readErr);
    return 0;
  }
  if (!parked?.length) return 0;

  // Infinite limit (premium/enterprise) restores everything.
  const capacity = Number.isFinite(limit) ? limit - (activeCount ?? 0) : parked.length;
  if (capacity <= 0) return 0;

  const ids = parked.slice(0, capacity).map((j) => j.id);
  const { error } = await admin
    .from("job_posts")
    .update({ status: "active", is_active: true, paused_reason: null })
    .in("id", ids);

  if (error) {
    console.error("[billing] restoreParkedJobs failed:", error);
    return 0;
  }

  console.log(
    `[billing] restored ${ids.length} parked job(s) for business ${businessId} (tier ${tier}, limit ${limit})`
  );
  return ids.length;
}

/** How many jobs are parked behind the paywall right now. */
export async function countParkedJobs(
  supabase: SupabaseClient,
  businessId: string
): Promise<number> {
  const { count } = await supabase
    .from("job_posts")
    .select("id", { count: "exact", head: true })
    .eq("business_id", businessId)
    .eq("status", "paused")
    .in("paused_reason", BILLING_PAUSE_REASONS);
  return count ?? 0;
}
