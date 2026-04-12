import { NextResponse, after } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { createNotification } from "@/lib/notifications/create";
import { sendApplicationWithdrawnEmail } from "@/lib/email/send";
import { rateLimit } from "@/lib/rate-limit";

/**
 * POST /api/applications/withdraw
 * Withdraw a single application. Notifies the business owner
 * via in-app notification and email.
 */
export async function POST(request: Request) {
  const rateLimited = await rateLimit(request, { identifier: "app-withdraw" });
  if (rateLimited) return rateLimited;

  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { applicationId } = await request.json();
    if (!applicationId) {
      return NextResponse.json({ error: "Missing applicationId" }, { status: 400 });
    }

    const admin = createAdminClient();

    // Fetch the application with worker and job details
    const { data: app } = await admin
      .from("applications")
      .select("id, status, worker_id, job_post_id, worker_profiles(user_id, first_name, last_name), job_posts(title, business_id)")
      .eq("id", applicationId)
      .single();

    if (!app) return NextResponse.json({ error: "Application not found" }, { status: 404 });

    const wp = app.worker_profiles as unknown as { user_id: string; first_name: string | null; last_name: string | null };
    if (wp.user_id !== user.id) {
      return NextResponse.json({ error: "Not your application" }, { status: 403 });
    }

    // Only allow withdrawing active applications
    const activeStatuses = ["new", "viewed", "interview_pending", "interview", "offered"];
    if (!activeStatuses.includes(app.status)) {
      return NextResponse.json({ error: "Application cannot be withdrawn" }, { status: 400 });
    }

    const workerName = [wp.first_name, wp.last_name].filter(Boolean).join(" ") || "A worker";
    const jp = app.job_posts as unknown as { title: string; business_id: string };

    // Update status to withdrawn
    const { error: updateError } = await admin
      .from("applications")
      .update({ status: "withdrawn", updated_at: new Date().toISOString() })
      .eq("id", applicationId);

    if (updateError) throw updateError;

    // Fetch business profile
    const { data: businessProfile } = await admin
      .from("business_profiles")
      .select("user_id, business_name")
      .eq("id", jp.business_id)
      .single();

    if (businessProfile) {
      const jobTitle = jp.title;
      const businessUserId = businessProfile.user_id;
      const businessName = businessProfile.business_name;

      // In-app notification
      try {
        await createNotification({
          userId: businessUserId,
          type: "application_status_changed",
          title: `${workerName} withdrew their application`,
          message: `${workerName} has withdrawn their application for ${jobTitle}.`,
          link: "/business/applicants",
        });
      } catch (err) {
        console.error("Failed to notify business:", err);
      }

      // Email (non-blocking)
      const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "";
      after(async () => {
        try {
          const { data: { user: businessUser } } = await admin.auth.admin.getUserById(businessUserId);
          if (businessUser?.email) {
            await sendApplicationWithdrawnEmail({
              to: businessUser.email,
              businessName,
              workerName,
              jobTitle,
              applicantsUrl: `${SITE_URL}/business/applicants`,
            });
          }
        } catch (err) {
          console.error("Failed to send withdrawal email:", err);
        }
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error withdrawing application:", error);
    return NextResponse.json({ error: "Failed to withdraw application" }, { status: 500 });
  }
}
