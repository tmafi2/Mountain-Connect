import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createNotification } from "@/lib/notifications/create";
import { sendInterviewInviteEmail } from "@/lib/email/send";
import { rateLimit } from "@/lib/rate-limit";

export async function POST(request: NextRequest) {
  const rateLimited = await rateLimit(request, { identifier: "interview" });
  if (rateLimited) return rateLimited;

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

  if (interview.status !== "scheduled") {
    return NextResponse.json({ error: "Only scheduled interviews can be rescheduled" }, { status: 400 });
  }

  // Verify business owns this
  const { data: business } = await admin
    .from("business_profiles")
    .select("id, user_id, business_name")
    .eq("id", interview.business_id)
    .single();

  if (!business || business.user_id !== user.id) {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  // Reset interview to rescheduled (worker must pick a new time)
  const newToken = crypto.randomUUID();

  const { error: updateErr } = await admin
    .from("interviews")
    .update({
      status: "rescheduled",
      scheduled_date: null,
      scheduled_start_time: null,
      scheduled_end_time: null,
      scheduled_at: null,
      video_room_name: null,
      video_room_url: null,
      invite_token: newToken,
      updated_at: new Date().toISOString(),
    })
    .eq("id", interview_id);

  if (updateErr) {
    return NextResponse.json({ error: updateErr.message }, { status: 500 });
  }

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
  const bookingUrl = `${origin}/interviews/book?token=${newToken}`;

  // Notify worker
  if (workerProfile) {
    await createNotification({
      userId: workerProfile.user_id,
      type: "interview_rescheduled",
      title: "Interview Rescheduled",
      message: `${business.business_name} has asked to reschedule your interview for ${jobTitle}. Please select a new time.`,
      link: bookingUrl,
      metadata: { interview_id },
    });

    // Email worker with new booking link
    const { data: { user: workerUser } } = await admin.auth.admin.getUserById(workerProfile.user_id);
    if (workerUser?.email) {
      sendInterviewInviteEmail({
        to: workerUser.email,
        workerName,
        businessName: business.business_name,
        jobTitle,
        bookingUrl,
      }).catch((err) => console.error("Failed to send reschedule email:", err));
    }
  }

  return NextResponse.json({ success: true, new_token: newToken });
}
