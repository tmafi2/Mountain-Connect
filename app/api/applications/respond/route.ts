import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { createNotification } from "@/lib/notifications/create";
import { rateLimit } from "@/lib/rate-limit";

/**
 * POST /api/applications/respond
 * Accept or decline a job offer. Updates status on both sides
 * and sends notifications to both worker and business.
 */
export async function POST(request: Request) {
  const rateLimited = await rateLimit(request, { identifier: "app-respond" });
  if (rateLimited) return rateLimited;

  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { applicationId, action } = await request.json();
    if (!applicationId || !action) {
      return NextResponse.json({ error: "Missing applicationId or action" }, { status: 400 });
    }

    if (action !== "accept" && action !== "decline") {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    const admin = createAdminClient();

    // Verify this application belongs to the current user
    const { data: app } = await admin
      .from("applications")
      .select("id, status, worker_id, job_post_id, worker_profiles(user_id, first_name, last_name), job_posts(title, business_id, business_profiles(user_id, business_name))")
      .eq("id", applicationId)
      .single();

    if (!app) return NextResponse.json({ error: "Application not found" }, { status: 404 });

    const wp = app.worker_profiles as unknown as { user_id: string; first_name: string | null; last_name: string | null };
    if (wp.user_id !== user.id) {
      return NextResponse.json({ error: "Not your application" }, { status: 403 });
    }

    if (app.status !== "offered") {
      return NextResponse.json({ error: "Application is not in offered status" }, { status: 400 });
    }

    const jp = app.job_posts as unknown as { title: string; business_profiles: { user_id: string; business_name: string } };
    const newStatus = action === "accept" ? "accepted" : "rejected";
    const workerName = [wp.first_name, wp.last_name].filter(Boolean).join(" ") || "A worker";

    // Update the application status
    const { error: updateError } = await admin
      .from("applications")
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq("id", applicationId);

    if (updateError) throw updateError;

    // Send notification to the business
    try {
      await createNotification({
        userId: jp.business_profiles.user_id,
        type: "application_status_changed",
        title: action === "accept"
          ? `${workerName} accepted your offer!`
          : `${workerName} declined your offer`,
        message: action === "accept"
          ? `${workerName} has accepted the offer for ${jp.title}. Time to prepare for their arrival!`
          : `${workerName} has declined the offer for ${jp.title}.`,
        link: "/business/applicants",
      });
    } catch (err) {
      console.error("Failed to notify business:", err);
    }

    // Send confirmation notification to the worker
    try {
      await createNotification({
        userId: user.id,
        type: "application_status_changed",
        title: action === "accept"
          ? `You accepted the offer at ${jp.business_profiles.business_name}!`
          : `You declined the offer from ${jp.business_profiles.business_name}`,
        message: action === "accept"
          ? `Congratulations! You're heading to ${jp.business_profiles.business_name} for the season. Start preparing!`
          : `You've declined the offer for ${jp.title}. Keep exploring other opportunities!`,
        link: "/applications",
      });
    } catch (err) {
      console.error("Failed to notify worker:", err);
    }

    // Send email notifications (non-blocking)
    fetch(`${process.env.NEXT_PUBLIC_SITE_URL || ""}/api/emails/application-status`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ applicationId, newStatus }),
    }).catch(() => {});

    return NextResponse.json({
      success: true,
      newStatus,
      jobTitle: jp.title,
      businessName: jp.business_profiles.business_name,
    });
  } catch (error) {
    console.error("Error responding to offer:", error);
    return NextResponse.json({ error: "Failed to respond to offer" }, { status: 500 });
  }
}
