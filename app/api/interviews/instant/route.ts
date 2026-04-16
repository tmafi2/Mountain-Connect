import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createNotification } from "@/lib/notifications/create";

export async function POST(request: NextRequest) {
  try {
    // Auth check
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { application_id } = body as { application_id: string };

    if (!application_id) {
      return NextResponse.json(
        { error: "application_id is required" },
        { status: 400 }
      );
    }

    const admin = createAdminClient();

    // Verify user is a business owner
    const { data: businessProfile } = await admin
      .from("business_profiles")
      .select("id, business_name, user_id")
      .eq("user_id", user.id)
      .single();

    if (!businessProfile) {
      return NextResponse.json(
        { error: "Only business owners can create instant interviews" },
        { status: 403 }
      );
    }

    // Look up the application with job and worker details
    const { data: application } = await admin
      .from("applications")
      .select(
        `
        id,
        worker_id,
        status,
        job_posts (
          id,
          title,
          business_id
        ),
        worker_profiles (
          id,
          user_id,
          contact_email,
          first_name,
          last_name
        )
      `
      )
      .eq("id", application_id)
      .single();

    if (!application) {
      return NextResponse.json(
        { error: "Application not found" },
        { status: 404 }
      );
    }

    const jobPost = application.job_posts as unknown as {
      id: string;
      title: string;
      business_id: string;
    };
    const workerProfile = application.worker_profiles as unknown as {
      id: string;
      user_id: string;
      contact_email: string | null;
      first_name: string;
      last_name: string;
    };

    // Verify the business owns this application's job
    if (jobPost.business_id !== businessProfile.id) {
      return NextResponse.json(
        { error: "You do not own this application" },
        { status: 403 }
      );
    }

    // Auto-cancel any prior live interviews for this application that are
    // still hanging around (worker never accepted, expired, etc). This lets
    // businesses always start a fresh instant interview regardless of history.
    await admin
      .from("interviews")
      .update({
        status: "cancelled",
        cancelled_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("application_id", application_id)
      .eq("status", "live");

    // Insert the interview. Note: we deliberately do NOT set scheduled_date
    // for live interviews — it would otherwise display as a confusing
    // 'Schedule' card on the detail page (and using UTC's "today" can show
    // as yesterday for users in eastern timezones).
    const roomExpiresAt = new Date(
      Date.now() + 20 * 60 * 1000
    ).toISOString();

    const { data: interview, error: insertError } = await admin
      .from("interviews")
      .insert({
        application_id,
        business_id: businessProfile.id,
        worker_id: application.worker_id,
        status: "live",
        is_instant: true,
        room_expires_at: roomExpiresAt,
        invited_at: new Date().toISOString(),
      })
      .select("id")
      .single();

    if (insertError || !interview) {
      console.error("Failed to create instant interview:", insertError);
      return NextResponse.json(
        { error: "Failed to create interview" },
        { status: 500 }
      );
    }

    // Update application status to 'interview' if not already
    if (application.status !== "interview") {
      await admin
        .from("applications")
        .update({ status: "interview", updated_at: new Date().toISOString() })
        .eq("id", application_id);
    }

    // Create notification for the worker
    try {
      await createNotification({
        userId: workerProfile.user_id,
        type: "instant_interview_request",
        title: "Live Interview Request",
        message: `${businessProfile.business_name} wants to interview you now for ${jobPost.title}`,
        link: `/interviews/${interview.id}`,
        metadata: {
          interview_id: interview.id,
          business_name: businessProfile.business_name,
          job_title: jobPost.title,
          room_expires_at: roomExpiresAt,
        },
      });
    } catch (notifError) {
      console.error("Failed to create notification:", notifError);
    }

    // Send email to worker (template not yet created — will be added later)
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const emailModule = await import("@/lib/email/send") as Record<string, unknown>;
      const sendFn = emailModule.sendInstantInterviewRequestEmail as
        | ((params: Record<string, unknown>) => Promise<unknown>)
        | undefined;

      if (sendFn) {
        const workerEmail =
          workerProfile.contact_email ||
          (
            await admin.auth.admin.getUserById(workerProfile.user_id)
          ).data.user?.email;

        if (workerEmail) {
          const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://mountainconnects.com";
          await sendFn({
            to: workerEmail,
            workerName: `${workerProfile.first_name} ${workerProfile.last_name}`,
            businessName: businessProfile.business_name,
            jobTitle: jobPost.title,
            interviewUrl: `${baseUrl}/interviews/${interview.id}`,
          });
        }
      }
    } catch (emailError) {
      console.error("Failed to send instant interview email:", emailError);
    }

    return NextResponse.json({
      interview_id: interview.id,
      room_expires_at: roomExpiresAt,
    });
  } catch (error) {
    console.error("Instant interview creation error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
