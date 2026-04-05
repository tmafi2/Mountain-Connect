import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { createNotification } from "@/lib/notifications/create";
import { sendInterviewConfirmationEmail } from "@/lib/email/send";
import { rateLimit } from "@/lib/rate-limit";

export async function POST(request: NextRequest) {
  const rateLimited = await rateLimit(request, { identifier: "interview" });
  if (rateLimited) return rateLimited;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { invite_token, date, start_time, end_time, timezone } = body as {
    invite_token: string;
    date: string;
    start_time: string;
    end_time: string;
    timezone: string;
  };

  if (!invite_token || !date || !start_time || !end_time) {
    return NextResponse.json({ error: "invite_token, date, start_time, and end_time are required" }, { status: 400 });
  }

  const admin = createAdminClient();

  // Find the interview by invite token
  const { data: interview, error: intErr } = await admin
    .from("interviews")
    .select("*, applications(job_post_id)")
    .eq("invite_token", invite_token)
    .single();

  if (intErr || !interview) {
    return NextResponse.json({ error: "Invalid or expired invite token" }, { status: 404 });
  }

  if (interview.status !== "invited" && interview.status !== "rescheduled") {
    return NextResponse.json({ error: `Interview cannot be booked — status is ${interview.status}` }, { status: 400 });
  }

  // Verify the logged-in user owns this worker profile
  const { data: workerProfile } = await admin
    .from("worker_profiles")
    .select("id, user_id, first_name, last_name")
    .eq("id", interview.worker_id)
    .single();

  if (!workerProfile || workerProfile.user_id !== user.id) {
    return NextResponse.json({ error: "Not authorized to book this interview" }, { status: 403 });
  }

  // Check for conflicts — another interview already booked at the same time for this business
  const { data: conflicts } = await admin
    .from("interviews")
    .select("id")
    .eq("business_id", interview.business_id)
    .eq("scheduled_date", date)
    .eq("status", "scheduled")
    .neq("id", interview.id);

  // Check time overlap
  if (conflicts && conflicts.length > 0) {
    // Fetch full details for overlap check
    const { data: conflictDetails } = await admin
      .from("interviews")
      .select("scheduled_start_time, scheduled_end_time")
      .eq("business_id", interview.business_id)
      .eq("scheduled_date", date)
      .eq("status", "scheduled")
      .neq("id", interview.id);

    const hasOverlap = (conflictDetails || []).some((c) => {
      return start_time < c.scheduled_end_time && end_time > c.scheduled_start_time;
    });

    if (hasOverlap) {
      return NextResponse.json({ error: "This time slot is no longer available" }, { status: 409 });
    }
  }

  // Parse slot duration from availability window
  const slotDuration = parseTimeDiff(start_time, end_time);

  // Book the interview
  const { data: updated, error: updateErr } = await admin
    .from("interviews")
    .update({
      status: "scheduled",
      scheduled_date: date,
      scheduled_start_time: start_time,
      scheduled_end_time: end_time,
      timezone,
      slot_duration_minutes: slotDuration,
      scheduled_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", interview.id)
    .select()
    .single();

  if (updateErr) {
    return NextResponse.json({ error: updateErr.message }, { status: 500 });
  }

  // Get business info for notifications
  const { data: businessProfile } = await admin
    .from("business_profiles")
    .select("id, user_id, business_name")
    .eq("id", interview.business_id)
    .single();

  const { data: job } = await admin
    .from("job_posts")
    .select("title")
    .eq("id", interview.applications?.job_post_id)
    .single();

  const workerName = [workerProfile.first_name, workerProfile.last_name].filter(Boolean).join(" ") || "Worker";
  const jobTitle = job?.title || "the position";
  const origin = request.headers.get("origin") || "http://localhost:3000";

  const formatTime12 = (t: string) => {
    const [h, m] = t.split(":");
    const hour = parseInt(h);
    const ampm = hour >= 12 ? "PM" : "AM";
    return `${hour % 12 || 12}:${m} ${ampm}`;
  };

  const formattedDate = new Date(date + "T00:00:00").toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  // Notify business
  if (businessProfile) {
    await createNotification({
      userId: businessProfile.user_id,
      type: "interview_scheduled",
      title: "Interview Booked",
      message: `${workerName} has booked their interview for ${jobTitle} on ${formattedDate} at ${formatTime12(start_time)}.`,
      link: `/business/interviews/${interview.id}`,
      metadata: { interview_id: interview.id },
    });

    // Email business
    const { data: { user: businessUser } } = await admin.auth.admin.getUserById(businessProfile.user_id);
    if (businessUser?.email) {
      sendInterviewConfirmationEmail({
        to: businessUser.email,
        recipientName: businessProfile.business_name,
        otherPartyName: workerName,
        jobTitle,
        date: formattedDate,
        startTime: formatTime12(start_time),
        endTime: formatTime12(end_time),
        timezone,
        interviewUrl: `${origin}/business/interviews/${interview.id}`,
      }).catch((err) => console.error("Failed to send business confirmation email:", err));
    }
  }

  // Notify worker (confirmation)
  await createNotification({
    userId: workerProfile.user_id,
    type: "interview_scheduled",
    title: "Interview Confirmed",
    message: `Your interview for ${jobTitle} with ${businessProfile?.business_name || "the business"} is confirmed for ${formattedDate} at ${formatTime12(start_time)}.`,
    link: `/interviews/${interview.id}`,
    metadata: { interview_id: interview.id },
  });

  // Email worker
  sendInterviewConfirmationEmail({
    to: user.email!,
    recipientName: workerName,
    otherPartyName: businessProfile?.business_name || "the business",
    jobTitle,
    date: formattedDate,
    startTime: formatTime12(start_time),
    endTime: formatTime12(end_time),
    timezone,
    interviewUrl: `${origin}/interviews/${interview.id}`,
  }).catch((err) => console.error("Failed to send worker confirmation email:", err));

  return NextResponse.json({ interview: updated }, { status: 200 });
}

function parseTimeDiff(start: string, end: string): number {
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  return (eh * 60 + em) - (sh * 60 + sm);
}
