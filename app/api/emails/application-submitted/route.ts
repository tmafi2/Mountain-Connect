import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendApplicationReceivedEmail } from "@/lib/email/send";
import { sendNewApplicantEmail } from "@/lib/email/send";
import { rateLimit } from "@/lib/rate-limit";

/**
 * POST /api/emails/application-submitted
 * Called after a worker successfully submits an application.
 * Sends confirmation to the worker + notification to the business.
 */
export async function POST(request: Request) {
  const rateLimited = await rateLimit(request, { identifier: "email" });
  if (rateLimited) return rateLimited;

  try {
    const { jobId, workerId } = await request.json();

    if (!jobId || !workerId) {
      return NextResponse.json({ error: "Missing jobId or workerId" }, { status: 400 });
    }

    const supabase = createAdminClient();

    // Fetch job details + business info
    const { data: job } = await supabase
      .from("job_posts")
      .select("title, business_id, business_profiles(business_name, email, user_id)")
      .eq("id", jobId)
      .single();

    if (!job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    // Fetch worker info
    const { data: worker } = await supabase
      .from("worker_profiles")
      .select("first_name, last_name, user_id")
      .eq("id", workerId)
      .single();

    if (!worker) {
      return NextResponse.json({ error: "Worker not found" }, { status: 404 });
    }

    // Get worker email from auth
    const { data: workerUser } = await supabase.auth.admin.getUserById(worker.user_id);

    const business = job.business_profiles as unknown as {
      business_name: string;
      email: string | null;
      user_id: string;
    };

    const workerName = [worker.first_name, worker.last_name].filter(Boolean).join(" ") || "there";
    const jobUrl = `${process.env.NEXT_PUBLIC_SITE_URL || "https://mountainconnects.com"}/jobs/${jobId}`;
    const applicantsUrl = `${process.env.NEXT_PUBLIC_SITE_URL || "https://mountainconnects.com"}/business/manage-listings/${jobId}`;

    // Send both emails concurrently (non-blocking — don't fail the response)
    const emailPromises: Promise<unknown>[] = [];

    // 1. Confirmation to the worker
    if (workerUser?.user?.email) {
      emailPromises.push(
        sendApplicationReceivedEmail({
          to: workerUser.user.email,
          workerName,
          jobTitle: job.title,
          businessName: business.business_name,
          jobUrl,
        }).catch((err) => console.error("Failed to send application-received email:", err))
      );
    }

    // 2. Notification to the business
    if (business.email) {
      emailPromises.push(
        sendNewApplicantEmail({
          to: business.email,
          businessName: business.business_name,
          workerName,
          jobTitle: job.title,
          applicantsUrl,
        }).catch((err) => console.error("Failed to send new-applicant email:", err))
      );
    }

    await Promise.all(emailPromises);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error sending application emails:", error);
    return NextResponse.json({ error: "Failed to send emails" }, { status: 500 });
  }
}
