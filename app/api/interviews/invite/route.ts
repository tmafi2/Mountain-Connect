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
  const { application_id } = body as { application_id: string };

  if (!application_id) {
    return NextResponse.json({ error: "application_id is required" }, { status: 400 });
  }

  // Get business profile for the logged-in user
  const { data: business } = await supabase
    .from("business_profiles")
    .select("id, business_name")
    .eq("user_id", user.id)
    .single();

  if (!business) {
    return NextResponse.json({ error: "No business profile found" }, { status: 404 });
  }

  const admin = createAdminClient();

  // Get the application with job and worker info
  const { data: application, error: appError } = await admin
    .from("applications")
    .select("id, job_post_id, worker_id, status")
    .eq("id", application_id)
    .single();

  if (appError || !application) {
    return NextResponse.json({ error: "Application not found" }, { status: 404 });
  }

  // Check if already invited
  const { data: existing } = await admin
    .from("interviews")
    .select("id")
    .eq("application_id", application_id)
    .in("status", ["invited", "scheduled"])
    .single();

  if (existing) {
    return NextResponse.json({ error: "Interview already exists for this application" }, { status: 409 });
  }

  // Get job info
  const { data: job } = await admin
    .from("job_posts")
    .select("title")
    .eq("id", application.job_post_id)
    .single();

  // Get worker profile + user info
  const { data: workerProfile } = await admin
    .from("worker_profiles")
    .select("id, user_id, first_name, last_name")
    .eq("id", application.worker_id)
    .single();

  if (!workerProfile) {
    return NextResponse.json({ error: "Worker profile not found" }, { status: 404 });
  }

  // Get worker's auth user for email
  const { data: { user: workerUser } } = await admin.auth.admin.getUserById(workerProfile.user_id);

  // Create the interview record
  const { data: interview, error: intError } = await admin
    .from("interviews")
    .insert({
      application_id,
      business_id: business.id,
      worker_id: workerProfile.id,
      status: "invited",
    })
    .select()
    .single();

  if (intError) {
    return NextResponse.json({ error: intError.message }, { status: 500 });
  }

  // Update application status
  await admin
    .from("applications")
    .update({ status: "interview" })
    .eq("id", application_id);

  const workerName = [workerProfile.first_name, workerProfile.last_name]
    .filter(Boolean)
    .join(" ") || "there";
  const jobTitle = job?.title || "the position";
  const origin = request.headers.get("origin") || "http://localhost:3000";
  const bookingUrl = `${origin}/interviews/book?token=${interview.invite_token}`;

  // Create in-app notification for the worker
  await createNotification({
    userId: workerProfile.user_id,
    type: "interview_invited",
    title: "Interview Invitation",
    message: `${business.business_name} has invited you to interview for ${jobTitle}. Click to book a time slot.`,
    link: bookingUrl,
    metadata: {
      interview_id: interview.id,
      business_name: business.business_name,
      job_title: jobTitle,
    },
  });

  // Send email (non-blocking — don't fail the request if email fails)
  if (workerUser?.email) {
    sendInterviewInviteEmail({
      to: workerUser.email,
      workerName,
      businessName: business.business_name,
      jobTitle,
      bookingUrl,
    }).catch((err) => console.error("Failed to send invite email:", err));
  }

  return NextResponse.json({ interview }, { status: 201 });
}
