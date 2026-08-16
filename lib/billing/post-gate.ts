import type { SupabaseClient } from "@supabase/supabase-js";
import { evaluatePostGate, type BillingState, type PostGateResult } from "@/lib/tier";

/**
 * Server-side "can this business publish another job" check.
 *
 * Loads the business's billing state and current job counts, then runs the
 * shared pure gate from lib/tier. This is the ONLY place the numbers are
 * fetched, so the API route, publish-drafts, and any future caller all
 * enforce the identical rule.
 *
 * Counts:
 *   activeJobCount  — jobs with status='active' right now (paid-tier cap)
 *   yearlyLiveJobs  — jobs that went live this calendar year, live or not
 *                     (free-tier "first post free" cap). Drafts excluded.
 *
 * `supabase` should be the caller's user-scoped client so RLS restricts the
 * counts to their own business; pass `businessId` you've already verified
 * they own.
 */
export async function checkPostGate(
  supabase: SupabaseClient,
  businessId: string,
  opts: { extraPending?: number } = {}
): Promise<PostGateResult> {
  const yearStart = new Date(new Date().getFullYear(), 0, 1).toISOString();

  const [profileRes, activeRes, yearlyRes] = await Promise.all([
    supabase
      .from("business_profiles")
      .select("tier, selected_tier, subscription_status, grace_period_ends_at")
      .eq("id", businessId)
      .single(),
    supabase
      .from("job_posts")
      .select("id", { count: "exact", head: true })
      .eq("business_id", businessId)
      .eq("status", "active"),
    // "went live this year": anything that isn't a draft, created this year.
    // A closed/expired post still consumed the free slot for the year.
    supabase
      .from("job_posts")
      .select("id", { count: "exact", head: true })
      .eq("business_id", businessId)
      .neq("status", "draft")
      .gte("created_at", yearStart),
  ]);

  const state: BillingState = {
    tier: (profileRes.data?.tier ?? "free") as BillingState["tier"],
    selected_tier: profileRes.data?.selected_tier ?? null,
    subscription_status: profileRes.data?.subscription_status ?? null,
    grace_period_ends_at: profileRes.data?.grace_period_ends_at ?? null,
  };

  // extraPending lets bulk-publish ask "if I also add N more, still ok?"
  const extra = opts.extraPending ?? 0;
  return evaluatePostGate(
    state,
    (activeRes.count ?? 0) + extra,
    (yearlyRes.count ?? 0) + extra
  );
}
