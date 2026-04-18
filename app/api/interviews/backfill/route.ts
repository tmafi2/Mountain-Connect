import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createNotification } from "@/lib/notifications/create";
import { sendInterviewInviteEmail } from "@/lib/email/send";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: business } = await supabase
    .from("business_profiles")
    .select("id, business_name")
    .eq("user_id", user.id)
    .single();

  if (!business) {
    return NextResponse.json({ error: "No business profile found" }, { status: 404 });
  }

  const admin = createAdminClient();

  const { data: jobs } = await admin
    .from("job_posts")
    .select("id")
    .eq("business_id", business.id);

  const jobIds = (jobs || []).map((j) => j.id);
  if (jobIds.length === 0) {
    return NextResponse.json({ created: 0, applications: [] });
  }

  const { data: applications } = await admin
    .from("applications")
    .select("id, job_post_id, worker_id")
    .eq("status", "interview")
    .in("job_post_id", jobIds);

  if (!applications || applications.length === 0) {
    return NextResponse.json({ created: 0, applications: [] });
  }

  const { data: existingInterviews } = await admin
    .from("interviews")
    .select("application_id")
    .in("application_id", applications.map((a) => a.id))
    .in("status", ["invited", "scheduled"]);

  const existingSet = new Set((existingInterviews || []).map((i) => i.application_id));
  const missing = applications.filter((a) => !existingSet.has(a.id));

  const origin = request.headers.get("origin") || "http://localhost:3000";
  const created: { applicationId: string; workerName: string; jobTitle: string }[] = [];
  const failed: { applicationId: string; reason: string }[] = [];

  for (const app of missing) {
    const { data: workerProfile } = await admin
      .from("worker_profiles")
      .select("id, user_id, first_name, last_name")
      .eq("id", app.worker_id)
      .single();

    if (!workerProfile) {
      failed.push({ applicationId: app.id, reason: "worker profile not found" });
      continue;
    }

    const { data: job } = await admin
      .from("job_posts")
      .select("title")
      .eq("id", app.job_post_id)
      .single();

    const { data: interview, error: intError } = await admin
      .from("interviews")
      .insert({
        application_id: app.id,
        business_id: business.id,
        worker_id: workerProfile.id,
        status: "invited",
      })
      .select()
      .single();

    if (intError || !interview) {
      failed.push({ applicationId: app.id, reason: intError?.message || "insert failed" });
      continue;
    }

    const workerName = [workerProfile.first_name, workerProfile.last_name]
      .filter(Boolean)
      .join(" ") || "there";
    const jobTitle = job?.title || "the position";
    const bookingUrl = `${origin}/interviews/book?token=${interview.invite_token}`;

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

    const { data: { user: workerUser } } = await admin.auth.admin.getUserById(workerProfile.user_id);
    if (workerUser?.email) {
      sendInterviewInviteEmail({
        to: workerUser.email,
        workerName,
        businessName: business.business_name,
        jobTitle,
        bookingUrl,
      }).catch((err) => console.error("Failed to send backfill invite email:", err));
    }

    created.push({ applicationId: app.id, workerName, jobTitle });
  }

  return NextResponse.json({ created: created.length, applications: created, failed });
}
