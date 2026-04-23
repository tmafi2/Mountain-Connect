import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/require-admin";
import { logAdminAction } from "@/lib/audit/log";
import { sendImportOutreachEmail } from "@/lib/email/send";

function resolveOrigin(request: Request): string {
  const origin = request.headers.get("origin");
  if (origin) return origin;
  return process.env.NEXT_PUBLIC_BASE_URL || "https://www.mountainconnects.com";
}

/**
 * POST /api/admin/resend-outreach
 *
 * Admin-only. Re-sends the claim-link outreach email for an unclaimed,
 * admin-imported business. Uses the existing claim_token so any copies
 * of the previous email still work — this is a delivery retry, not a
 * security rotation.
 */
export async function POST(request: Request) {
  try {
    const auth = await requireAdmin();
    if (auth instanceof NextResponse) return auth;
    const { admin, user } = auth;

    const { jobId } = (await request.json().catch(() => ({}))) as { jobId?: string };
    if (!jobId) return NextResponse.json({ error: "jobId is required" }, { status: 400 });

    const { data: job } = await admin
      .from("job_posts")
      .select("id, title, source, business_id")
      .eq("id", jobId)
      .maybeSingle();

    if (!job) return NextResponse.json({ error: "Job not found" }, { status: 404 });

    const { data: business } = await admin
      .from("business_profiles")
      .select("id, business_name, email, is_claimed, claim_token")
      .eq("id", job.business_id)
      .maybeSingle();

    if (!business) {
      return NextResponse.json({ error: "Business not found" }, { status: 404 });
    }
    if (business.is_claimed) {
      return NextResponse.json(
        { error: "This business has already claimed their listing — nothing to send." },
        { status: 400 }
      );
    }
    if (!business.email) {
      return NextResponse.json(
        { error: "No business email on file for this listing." },
        { status: 400 }
      );
    }
    if (!business.claim_token) {
      return NextResponse.json(
        { error: "Missing claim token — listing may be in an inconsistent state." },
        { status: 500 }
      );
    }

    const claimUrl = `${resolveOrigin(request)}/claim/${business.claim_token}`;

    try {
      const result = await sendImportOutreachEmail({
        to: business.email,
        businessName: business.business_name,
        jobTitle: job.title,
        source: job.source || "an external listing",
        claimUrl,
        eoiCount: 0,
      });
      if (!result) {
        return NextResponse.json(
          { error: "Email service is not configured" },
          { status: 500 }
        );
      }
    } catch (err) {
      console.error("Failed to resend outreach email:", err);
      return NextResponse.json(
        { error: err instanceof Error ? err.message : "Failed to send email" },
        { status: 500 }
      );
    }

    await logAdminAction({
      adminId: user.id,
      action: "business_info_requested",
      targetType: "business",
      targetId: business.id,
      details: { resent: true, job_id: jobId, sent_to: business.email },
    }).catch(() => {});

    return NextResponse.json({
      success: true,
      sentTo: business.email,
    });
  } catch (err) {
    console.error("resend-outreach error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
