import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { logAdminAction } from "@/lib/audit/log";
import { sendImportOutreachEmail } from "@/lib/email/send";
import { notifyGoogleIndexing } from "@/lib/seo/google-indexing";

function resolveOrigin(request: Request): string {
  const origin = request.headers.get("origin");
  if (origin) return origin;
  return process.env.NEXT_PUBLIC_BASE_URL || "https://www.mountainconnects.com";
}

/**
 * POST /api/admin/publish-job
 *
 * Admin-only. Flips a draft job_post to active, sends the outreach
 * email if the business is still unclaimed, and pings the Google
 * Indexing API. Used to approve drafts created via the import flow.
 */
export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const admin = createAdminClient();
    const { data: adminUser } = await admin
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single();
    if (adminUser?.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { jobId } = (await request.json()) as { jobId?: string };
    if (!jobId) return NextResponse.json({ error: "jobId is required" }, { status: 400 });

    const { data: job } = await admin
      .from("job_posts")
      .select("id, title, status, business_id, source")
      .eq("id", jobId)
      .maybeSingle();

    if (!job) return NextResponse.json({ error: "Job not found" }, { status: 404 });
    if (job.status === "active") {
      return NextResponse.json({ success: true, alreadyActive: true });
    }

    const { error: updateErr } = await admin
      .from("job_posts")
      .update({ status: "active", is_active: true })
      .eq("id", jobId);

    if (updateErr) {
      console.error("Failed to flip job to active:", updateErr);
      return NextResponse.json({ error: updateErr.message }, { status: 500 });
    }

    // Look up the business so we can email the owner if still unclaimed
    const { data: business } = await admin
      .from("business_profiles")
      .select("id, business_name, email, is_claimed, claim_token")
      .eq("id", job.business_id)
      .maybeSingle();

    let emailSent = false;
    let emailError: string | null = null;

    if (business && !business.is_claimed && business.email && business.claim_token) {
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
        emailSent = !!result;
        if (!result) emailError = "Email service is not configured";
      } catch (err) {
        console.error("Failed to send outreach email on publish:", err);
        emailError = err instanceof Error ? err.message : "Unknown email error";
      }
    }

    notifyGoogleIndexing(
      `${process.env.NEXT_PUBLIC_BASE_URL || "https://www.mountainconnects.com"}/jobs/${jobId}`,
      "URL_UPDATED"
    ).catch((err) => console.error("Google indexing notify failed:", err));

    await logAdminAction({
      adminId: user.id,
      action: "business_approved",
      targetType: "job",
      targetId: jobId,
      details: { published_from_draft: true, email_sent: emailSent },
    }).catch(() => {});

    return NextResponse.json({
      success: true,
      jobId,
      emailSent,
      emailError,
      sentTo: business?.email || null,
    });
  } catch (err) {
    console.error("publish-job error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
