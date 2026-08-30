import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyRenewToken } from "@/lib/jobs/renew-token";
import { nextExpiryFrom } from "@/lib/jobs/expiry";

/**
 * POST /api/jobs/renew   { token }
 *
 * Extends every listing the token's business currently has expiring, and
 * brings back any it has already let lapse.
 *
 * WHY POST AND NOT THE EMAILED LINK ITSELF. A GET that mutates is fetched
 * by mail scanners and link previewers, which would renew listings nobody
 * clicked. The email points at /jobs/renew/[token], a page that shows what
 * is about to be renewed and posts here on a button press.
 *
 * NOT GATED ON TIER. Renewal is one click for everybody — a free business
 * that cannot renew simply deletes and reposts, which costs them less
 * effort than renewing and costs us the post's applications and its age.
 * The paid perk is auto-renew, which is doing it for them.
 *
 * The token authorises this on its own; there is no session. It is
 * HMAC-signed, expires, and the worst it can do is keep a business's own
 * listings live for another eight weeks — which they can undo by pausing.
 */
export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const token = typeof body?.token === "string" ? body.token : "";
  if (!token) {
    return NextResponse.json({ error: "Missing token" }, { status: 400 });
  }

  const verdict = verifyRenewToken(token);
  if (!verdict.ok) {
    return NextResponse.json(
      {
        error:
          verdict.reason === "expired"
            ? "This link has expired. You can renew from your dashboard instead."
            : "This link is not valid.",
        reason: verdict.reason,
      },
      { status: verdict.reason === "expired" ? 410 : 400 }
    );
  }

  const admin = createAdminClient();
  const now = new Date();
  const renewedAt = nextExpiryFrom(now).toISOString();

  // Two sets, deliberately: extend what is live, and revive only what WE
  // expired. A listing the owner paused themselves stays paused — the same
  // rule that governs billing restores in lib/billing/job-parking.ts.
  const [{ data: active, error: activeErr }, { data: lapsed, error: lapsedErr }] =
    await Promise.all([
      admin
        .from("job_posts")
        .select("id")
        .eq("business_id", verdict.businessId)
        .eq("status", "active")
        .not("expires_at", "is", null),
      admin
        .from("job_posts")
        .select("id")
        .eq("business_id", verdict.businessId)
        .eq("status", "paused")
        .eq("paused_reason", "expired"),
    ]);

  if (activeErr || lapsedErr) {
    console.error("[job-renew] read failed:", activeErr ?? lapsedErr);
    return NextResponse.json({ error: "Could not load your listings" }, { status: 500 });
  }

  let renewed = 0;
  let revived = 0;

  if (active?.length) {
    const { error } = await admin
      .from("job_posts")
      .update({ expires_at: renewedAt, expiry_warning_sent_at: null })
      .in("id", active.map((j) => j.id));
    if (error) {
      console.error("[job-renew] extend failed:", error);
      return NextResponse.json({ error: "Could not renew your listings" }, { status: 500 });
    }
    renewed = active.length;
  }

  if (lapsed?.length) {
    // expires_at is set in the same statement so the trigger's own stamp
    // does not override it — see migration 00093.
    const { error } = await admin
      .from("job_posts")
      .update({
        status: "active",
        is_active: true,
        paused_reason: null,
        expires_at: renewedAt,
        expiry_warning_sent_at: null,
        expired_notice_sent_at: null,
      })
      .in("id", lapsed.map((j) => j.id));
    if (error) {
      console.error("[job-renew] revive failed:", error);
      return NextResponse.json({ error: "Could not restore your listings" }, { status: 500 });
    }
    revived = lapsed.length;
  }

  console.log(
    `[job-renew] business ${verdict.businessId}: renewed ${renewed}, revived ${revived}, until ${renewedAt}`
  );

  return NextResponse.json({ renewed, revived, expiresAt: renewedAt });
}
