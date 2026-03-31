import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createNotification } from "@/lib/notifications/create";

/**
 * POST /api/interviews/reschedule-respond
 * Business approves or declines a reschedule request.
 */
export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { interviewId, action, declineReason } = await request.json();
    if (!interviewId || !action) {
      return NextResponse.json({ error: "Missing interviewId or action" }, { status: 400 });
    }

    const admin = createAdminClient();

    // Fetch the interview
    const { data: interview, error: fetchErr } = await admin
      .from("interviews")
      .select("id, status, worker_id, business_id, applications(job_posts(title, business_profiles(business_name)))")
      .eq("id", interviewId)
      .single();

    if (fetchErr || !interview) {
      return NextResponse.json({ error: "Interview not found" }, { status: 404 });
    }

    if (interview.status !== "reschedule_requested" && interview.status !== "missed") {
      return NextResponse.json({ error: "Interview is not in a reschedule-requested state" }, { status: 400 });
    }

    const app = interview.applications as unknown as {
      job_posts: { title: string; business_profiles: { business_name: string } };
    } | null;
    const jobTitle = app?.job_posts?.title || "Interview";
    const businessName = app?.job_posts?.business_profiles?.business_name || "the business";

    // Get worker's user_id for notification
    const { data: workerProfile } = await admin
      .from("worker_profiles")
      .select("user_id")
      .eq("id", interview.worker_id)
      .single();

    if (!workerProfile) {
      return NextResponse.json({ error: "Worker not found" }, { status: 404 });
    }

    if (action === "approve") {
      // Reset interview to invited so business can set a new time
      await admin
        .from("interviews")
        .update({
          status: "invited",
          scheduled_date: null,
          scheduled_start_time: null,
          scheduled_end_time: null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", interviewId);

      // Notify the worker
      await createNotification({
        userId: workerProfile.user_id,
        type: "reschedule_approved",
        title: "Reschedule Approved!",
        message: `${businessName} has approved your reschedule request for ${jobTitle}. You'll receive a new interview invitation soon.`,
        link: "/interviews",
        metadata: { interview_id: interviewId },
      });

      return NextResponse.json({ success: true, newStatus: "invited" });
    } else if (action === "decline") {
      // Mark as missed (final state)
      await admin
        .from("interviews")
        .update({
          status: "missed",
          updated_at: new Date().toISOString(),
        })
        .eq("id", interviewId);

      // Notify the worker with next steps
      await createNotification({
        userId: workerProfile.user_id,
        type: "reschedule_declined",
        title: "Reschedule Request Declined",
        message: `${businessName} was unable to reschedule your interview for ${jobTitle}. ${declineReason || "We suggest exploring other opportunities or reaching out to the business directly."}`,
        link: "/interviews",
        metadata: { interview_id: interviewId },
      });

      return NextResponse.json({ success: true, newStatus: "missed" });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("Error responding to reschedule:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
