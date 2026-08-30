import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { resolveEffectiveTier, type BusinessTier } from "@/lib/tier";

/**
 * POST /api/business/jobs/auto-renew   { jobId, autoRenew }
 *
 * Turns auto-renew on or off for one of the caller's own listings.
 *
 * ENTITLEMENT IS CHECKED HERE, not only in the UI. The toggle is hidden for
 * free businesses, but a hidden control is not a closed door — this is the
 * same rule the job-post limit follows, where the server is the authority
 * and lib/billing/post-gate.ts does the deciding.
 *
 * Switching auto-renew OFF is always allowed, whatever the tier. A business
 * whose subscription lapsed should be able to tidy up its own settings, and
 * refusing would leave a flag they can see and cannot clear. The flag is
 * inert while unpaid in any case: the sweep re-resolves entitlement each
 * run, so a lapsed business's listings expire normally.
 */
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const jobId = typeof body?.jobId === "string" ? body.jobId : "";
  const autoRenew = body?.autoRenew === true;
  if (!jobId) return NextResponse.json({ error: "Missing jobId" }, { status: 400 });

  const { data: bp } = await supabase
    .from("business_profiles")
    .select("id, tier, selected_tier, subscription_status, grace_period_ends_at")
    .eq("user_id", user.id)
    .single();

  if (!bp) return NextResponse.json({ error: "No business profile" }, { status: 404 });

  if (autoRenew) {
    const tier = resolveEffectiveTier({
      tier: bp.tier as BusinessTier | null,
      selected_tier: bp.selected_tier as BusinessTier | null,
      subscription_status: bp.subscription_status as string | null,
      grace_period_ends_at: bp.grace_period_ends_at as string | null,
    });
    if (tier === "free") {
      return NextResponse.json(
        { error: "Auto-renew is available on paid plans. You can still renew any listing yourself." },
        { status: 403 }
      );
    }
  }

  // Scoped by business_id as well as id, so a caller cannot flip the flag on
  // somebody else's listing by guessing an id.
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("job_posts")
    .update({ auto_renew: autoRenew })
    .eq("id", jobId)
    .eq("business_id", bp.id)
    .select("id");

  if (error) {
    console.error("[auto-renew] update failed:", error);
    return NextResponse.json({ error: "Could not update the listing" }, { status: 500 });
  }
  if (!data?.length) {
    return NextResponse.json({ error: "Listing not found" }, { status: 404 });
  }

  return NextResponse.json({ jobId, autoRenew });
}
