import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createNotification } from "@/lib/notifications/create";
import { sendInterviewCancelledEmail } from "@/lib/email/send";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { interview_id } = body as { interview_id: string };

  if (!interview_id) {
    return NextResponse.json({ error: "interview_id is required" }, { status: 400 });
  }

  const admin = createAdminClient();

  // Get interview
  const { data: interview } = await admin
    .from("interviews")
    .select("*, applications(job_post_id)")
    .eq("id", interview_id)
    .single();

  if (!interview) {
    return NextResponse.json({ error: "Interview not found" }, { status: 404 });
  }

  if (interview.status === "cancelled" || interview.status === "completed") {
    return NextResponse.json({ error: `Interview is already ${interview.status}` }, { status: 400 });
  }

  // Verify business owns this interview
  const { data: business } = await admin
    .from("business_profiles")
    .select("id, user_id, business_name")
    .eq("id", interview.business_id)
    .single();

  if (!business || business.user_id !== user.id) {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  // Cancel the interview
  const { error: updateErr } = await admin
    .from("interviews")
    .update({
      status: "cancelled",
      cancelled_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", interview_id);

  if (updateErr) {
    return NextResponse.json({ error: updateErr.message }, { status: 500 });
  }

  // Revert application status
  await admin
    .from("applications")
    .update({ status: "reviewed" })
    .eq("id", interview.application_id);

  // Get worker and job info
  const { data: workerProfile } = await admin
    .from("worker_profiles")
    .select("id, user_id, first_name, last_name")
    .eq("id", interview.worker_id)
    .single();

  const { data: job } = await admin
    .from("job_posts")
    .select("title")
    .eq("id", interview.applications?.job_post_id)
    .single();

  const workerName = workerProfile
    ? [workerProfile.first_name, workerProfile.last_name].filter(Boolean).join(" ") || "there"
    : "there";
  const jobTitle = job?.title || "the position";
  const origin = request.headers.get("origin") || "http://localhost:3000";

  const scheduledDate = interview.scheduled_date
    ? new Date(interview.scheduled_date + "T00:00:00").toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      })
    : undefined;

  // Notify worker
  if (workerProfile) {
    await createNotification({
      userId: workerProfile.user_id,
      type: "interview_cancelled",
      title: "Interview Cancelled",
      message: `${business.business_name} has cancelled your interview for ${jobTitle}${scheduledDate ? ` scheduled for ${scheduledDate}` : ""}.`,
      link: "/interviews",
      metadata: { interview_id },
    });

    // Email worker
    const { data: { user: workerUser } } = await admin.auth.admin.getUserById(workerProfile.user_id);
    if (workerUser?.email) {
      sendInterviewCancelledEmail({
        to: workerUser.email,
        recipientName: workerName,
        otherPartyName: business.business_name,
        jobTitle,
        date: scheduledDate,
        dashboardUrl: `${origin}/dashboard`,
      }).catch((err) => console.error("Failed to send cancel email:", err));
    }
  }

  return NextResponse.json({ success: true });
}
