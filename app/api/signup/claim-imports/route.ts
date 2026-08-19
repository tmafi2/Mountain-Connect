import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { rateLimit } from "@/lib/rate-limit";
import { resolveEffectiveTier, TIER_FEATURES } from "@/lib/tier";
import { parkListingsOnClaim } from "@/lib/billing/job-parking";

/**
 * POST /api/signup/claim-imports
 *
 * Links an unclaimed, admin-imported business_profile to the currently
 * signed-in auth user. Called from the signup page immediately after
 * auth.signUp() succeeds — the user is transiently signed in at that
 * point, before the signup flow calls signOut().
 *
 * Updates the existing unclaimed profile in place (user_id, is_claimed,
 * claim_token=null, optionally business_name / resort_id) rather than
 * inserting a new one, so there is only ever one business_profiles row
 * per user. The caller is expected to skip the usual business_profiles
 * upsert when this endpoint is used.
 */
export async function POST(request: Request) {
  const rateLimited = await rateLimit(request, { identifier: "signup-check" });
  if (rateLimited) return rateLimited;

  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json().catch(() => ({}));
    const rawEmail = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const businessName = typeof body.businessName === "string" ? body.businessName.trim() : "";
    const resortId = typeof body.resortId === "string" && body.resortId ? body.resortId : null;

    if (!rawEmail || user.email?.toLowerCase() !== rawEmail) {
      return NextResponse.json(
        { error: "Email mismatch — can only claim imports for your own email" },
        { status: 400 }
      );
    }

    const admin = createAdminClient();
    const { data: profiles } = await admin
      .from("business_profiles")
      .select("id, tier, selected_tier, subscription_status, grace_period_ends_at")
      .eq("email", rawEmail)
      .eq("is_claimed", false);

    if (!profiles || profiles.length === 0) {
      return NextResponse.json({ claimed: 0 });
    }

    // Link the first unclaimed profile to this user. Any extras with the
    // same email get their emails wiped so they don't show up in future
    // check-imports calls (admin can still find them by business name).
    const [primary, ...extras] = profiles;

    const updatePayload: Record<string, unknown> = {
      user_id: user.id,
      is_claimed: true,
      claim_token: null,
      verification_status: "pending_review",
    };
    if (businessName) updatePayload.business_name = businessName;
    if (resortId) updatePayload.resort_id = resortId;

    const { error: updateErr } = await admin
      .from("business_profiles")
      .update(updatePayload)
      .eq("id", primary.id);

    if (updateErr) {
      console.error("Failed to claim import on signup:", updateErr);
      return NextResponse.json({ error: updateErr.message }, { status: 500 });
    }

    if (extras.length > 0) {
      const { error: detachErr } = await admin
        .from("business_profiles")
        .update({ email: null })
        .in("id", extras.map((e) => e.id));

      if (detachErr) {
        console.error("Failed to detach extra unclaimed profiles:", detachErr);
      }
    }

    // Same tier gate as /api/claim/complete — otherwise this is a clean
    // bypass: sign up with the email we imported against and inherit every
    // listing live for free.
    //
    // Unlike the claim-link flow there is no picker here; the user is
    // mid-signup and has never seen these listings. Passing no preference
    // keeps the newest live (enforceJobLimit's rule) and parks the rest,
    // which they can swap from manage-listings. Never fail the signup over
    // it — the account and the link matter more than the limit, and the
    // downgrade rule is a second line of defence.
    let parkedCount = 0;
    try {
      const effectiveTier = resolveEffectiveTier({
        tier: primary.tier,
        selected_tier: primary.selected_tier,
        subscription_status: primary.subscription_status,
        grace_period_ends_at: primary.grace_period_ends_at,
      });
      parkedCount = await parkListingsOnClaim(
        admin,
        primary.id,
        null,
        TIER_FEATURES[effectiveTier].maxActiveJobs
      );
    } catch (err) {
      console.error("Failed to apply listing limit on signup claim:", err);
    }

    return NextResponse.json({ claimed: 1, businessId: primary.id, parkedCount });
  } catch (err) {
    console.error("claim-imports error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
