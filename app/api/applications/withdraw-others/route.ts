import { NextResponse, after } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { createNotification } from "@/lib/notifications/create";
import { sendApplicationWithdrawnEmail } from "@/lib/email/send";
import { rateLimit } from "@/lib/rate-limit";

/**
 * POST /api/applications/withdraw-others
 * After a worker accepts an offer, withdraw all their other active applications
 * and notify each affected business.
 */
export async function POST(request: Request) {
  const rateLimited = await rateLimit(request, { identifier: "withdraw-others" });
  if (rateLimited) return rateLimited;

  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { acceptedApplicationId } = await request.json();
    if (!acceptedApplicationId) {
      return NextResponse.json({ error: "Missing acceptedApplicationId" }, { status: 400 });
    }

    const admin = createAdminClient();

    // Fetch the accepted application with worker and job details
    const { data: acceptedApp } = await admin
      .from("applications")
      .select("id, status, worker_id, job_post_id, worker_profiles(user_id, first_name, last_name), job_posts(title, business_id)")
      .eq("id", acceptedApplicationId)
      .single();

    if (!acceptedApp) {
      return NextResponse.json({ error: "Application not found" }, { status: 404 });
    }

    const wp = acceptedApp.worker_profiles as unknown as { user_id: string; first_name: string | null; last_name: string | null };
    if (wp.user_id !== user.id) {
      return NextResponse.json({ error: "Not your application" }, { status: 403 });
    }

    if (acceptedApp.status !== "accepted") {
      return NextResponse.json({ error: "Application is not in accepted status" }, { status: 400 });
    }

    const workerName = [wp.first_name, wp.last_name].filter(Boolean).join(" ") || "A worker";

    // Find all other active applications by the same worker
    const { data: otherApps } = await admin
      .from("applications")
      .select("id, job_post_id, job_posts(title, business_id)")
      .eq("worker_id", acceptedApp.worker_id)
      .neq("id", acceptedApplicationId)
      .in("status", ["new", "viewed", "interview_pending", "interview", "offered"]);

    if (!otherApps || otherApps.length === 0) {
      return NextResponse.json({ success: true, withdrawnCount: 0 });
    }

    // Withdraw all other applications
    const otherIds = otherApps.map((a) => a.id);
    const { error: updateError } = await admin
      .from("applications")
      .update({ status: "withdrawn", updated_at: new Date().toISOString() })
      .in("id", otherIds);

    if (updateError) throw updateError;

    // Notify each affected business
    const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "";

    for (const app of otherApps) {
      const jp = app.job_posts as unknown as { title: string; business_id: string };

      // Fetch business profile for this job's business
      const { data: businessProfile } = await admin
        .from("business_profiles")
        .select("user_id, business_name")
        .eq("id", jp.business_id)
        .single();

      if (!businessProfile) continue;

      const jobTitle = jp.title;
      const businessUserId = businessProfile.user_id;
      const businessName = businessProfile.business_name;

      // Create in-app notification
      try {
        await createNotification({
          userId: businessUserId,
          type: "application_status_changed",
          title: `${workerName} withdrew their application`,
          message: `${workerName} has accepted a position elsewhere and withdrawn their application for ${jobTitle}.`,
          link: "/business/applicants",
        });
      } catch (err) {
        console.error("Failed to notify business:", err);
      }

      // Send email notification (non-blocking)
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

    return NextResponse.json({ success: true, withdrawnCount: otherApps.length });
  } catch (error) {
    console.error("Error withdrawing other applications:", error);
    return NextResponse.json({ error: "Failed to withdraw applications" }, { status: 500 });
  }
}
