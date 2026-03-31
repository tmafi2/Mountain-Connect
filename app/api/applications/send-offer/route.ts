import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createNotification } from "@/lib/notifications/create";

/**
 * POST /api/applications/send-offer
 * Business sends a job offer to a worker via their interview.
 */
export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { interviewId } = await request.json();
    if (!interviewId) return NextResponse.json({ error: "Missing interviewId" }, { status: 400 });

    const admin = createAdminClient();

    // Get interview with application and job info
    const { data: interview } = await admin
      .from("interviews")
      .select("id, application_id, worker_id, business_id, applications(id, job_post_id, job_posts(title, business_profiles(business_name)))")
      .eq("id", interviewId)
      .single();

    if (!interview) return NextResponse.json({ error: "Interview not found" }, { status: 404 });

    // Verify business owns this
    const { data: business } = await admin
      .from("business_profiles")
      .select("id, user_id")
      .eq("id", interview.business_id)
      .single();

    if (!business || business.user_id !== user.id) {
      return NextResponse.json({ error: "Not authorized" }, { status: 403 });
    }

    const app = interview.applications as unknown as {
      id: string;
      job_posts: { title: string; business_profiles: { business_name: string } };
    };

    // Update application status to "offered"
    await admin
      .from("applications")
      .update({ status: "offered", updated_at: new Date().toISOString() })
      .eq("id", interview.application_id);

    // Mark interview as completed
    await admin
      .from("interviews")
      .update({ status: "completed", completed_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq("id", interviewId);

    // Notify worker
    const { data: workerProfile } = await admin
      .from("worker_profiles")
      .select("user_id")
      .eq("id", interview.worker_id)
      .single();

    if (workerProfile) {
      const jobTitle = app?.job_posts?.title || "a position";
      const businessName = app?.job_posts?.business_profiles?.business_name || "A business";

      await createNotification({
        userId: workerProfile.user_id,
        type: "application_status_changed",
        title: "You received a job offer!",
        message: `${businessName} has sent you an offer for ${jobTitle}. View your applications to accept or decline.`,
        link: "/applications",
        metadata: { application_id: interview.application_id },
      });
    }

    // Trigger status email (non-blocking)
    fetch(`${process.env.NEXT_PUBLIC_APP_URL || "https://www.mountainconnects.com"}/api/emails/application-status`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ applicationId: interview.application_id, newStatus: "offered" }),
    }).catch(() => {});

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error sending offer:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
