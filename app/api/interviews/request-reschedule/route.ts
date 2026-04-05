import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createNotification } from "@/lib/notifications/create";
import { rateLimit } from "@/lib/rate-limit";

/**
 * POST /api/interviews/request-reschedule
 * Worker requests to reschedule a missed interview.
 */
export async function POST(request: Request) {
  const rateLimited = await rateLimit(request, { identifier: "interview" });
  if (rateLimited) return rateLimited;

  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { interviewId, reason } = await request.json();
    if (!interviewId) return NextResponse.json({ error: "Missing interviewId" }, { status: 400 });

    const admin = createAdminClient();

    // Fetch the interview with business info
    const { data: interview, error: fetchErr } = await admin
      .from("interviews")
      .select("id, status, business_id, worker_id, applications(job_posts(title, business_profiles(user_id, business_name)))")
      .eq("id", interviewId)
      .single();

    if (fetchErr || !interview) {
      return NextResponse.json({ error: "Interview not found" }, { status: 404 });
    }

    // Update interview status
    const { error: updateErr } = await admin
      .from("interviews")
      .update({
        status: "reschedule_requested",
        worker_notes: reason || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", interviewId);

    if (updateErr) {
      console.error("Interview update error:", updateErr);
      return NextResponse.json({ error: "Failed to update interview" }, { status: 500 });
    }

    // Get the business user_id for notification
    const app = interview.applications as unknown as {
      job_posts: { title: string; business_profiles: { user_id: string; business_name: string } };
    } | null;

    const businessUserId = app?.job_posts?.business_profiles?.user_id;
    const jobTitle = app?.job_posts?.title || "an interview";

    if (businessUserId) {
      await createNotification({
        userId: businessUserId,
        type: "interview_rescheduled",
        title: "Interview Reschedule Requested",
        message: `A worker has requested to reschedule their interview for ${jobTitle}. Reason: ${reason || "No reason provided"}`,
        link: "/business/interviews",
        metadata: { interview_id: interviewId },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error requesting reschedule:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
