import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendApplicationStatusChangedEmail } from "@/lib/email/send";
import { rateLimit } from "@/lib/rate-limit";

/**
 * POST /api/emails/application-status
 * Called when a business changes an application's status.
 * Sends a notification email to the worker.
 */
export async function POST(request: Request) {
  const rateLimited = await rateLimit(request, { identifier: "email" });
  if (rateLimited) return rateLimited;

  try {
    const { applicationId, newStatus } = await request.json();

    if (!applicationId || !newStatus) {
      return NextResponse.json({ error: "Missing applicationId or newStatus" }, { status: 400 });
    }

    // Don't send emails for internal statuses
    const notifiableStatuses = ["reviewed", "shortlisted", "interview", "accepted", "rejected"];
    if (!notifiableStatuses.includes(newStatus)) {
      return NextResponse.json({ success: true, skipped: true });
    }

    const supabase = createAdminClient();

    // Fetch application with job and worker info
    const { data: application } = await supabase
      .from("applications")
      .select("worker_id, job_post_id, job_posts(title, business_id, business_profiles(business_name))")
      .eq("id", applicationId)
      .single();

    if (!application) {
      return NextResponse.json({ error: "Application not found" }, { status: 404 });
    }

    // Fetch worker profile
    const { data: worker } = await supabase
      .from("worker_profiles")
      .select("first_name, last_name, user_id")
      .eq("id", application.worker_id)
      .single();

    if (!worker) {
      return NextResponse.json({ error: "Worker not found" }, { status: 404 });
    }

    // Get worker email
    const { data: workerUser } = await supabase.auth.admin.getUserById(worker.user_id);
    if (!workerUser?.user?.email) {
      return NextResponse.json({ success: true, skipped: true, reason: "No worker email" });
    }

    const job = application.job_posts as unknown as {
      title: string;
      business_profiles: { business_name: string };
    };

    const workerName = [worker.first_name, worker.last_name].filter(Boolean).join(" ") || "there";
    const dashboardUrl = `${process.env.NEXT_PUBLIC_SITE_URL || "https://mountainconnects.com"}/dashboard`;

    // Human-readable status labels
    const statusLabels: Record<string, string> = {
      reviewed: "Reviewed",
      shortlisted: "Shortlisted",
      interview: "Interview",
      accepted: "Accepted",
      rejected: "Not Selected",
    };

    await sendApplicationStatusChangedEmail({
      to: workerUser.user.email,
      workerName,
      jobTitle: job.title,
      businessName: job.business_profiles.business_name,
      newStatus: statusLabels[newStatus] || newStatus,
      dashboardUrl,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error sending application status email:", error);
    return NextResponse.json({ error: "Failed to send email" }, { status: 500 });
  }
}
