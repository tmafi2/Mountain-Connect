import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createRoom } from "@/lib/daily/client";
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
    const { interview_id, action, reschedule_slot } = body as {
      interview_id: string;
      action: "accept" | "decline" | "reschedule";
      reschedule_slot?: {
        date: string;
        start_time: string;
        end_time: string;
        timezone: string;
      };
    };

    if (!interview_id || !action) {
      return NextResponse.json(
        { error: "interview_id and action are required" },
        { status: 400 }
      );
    }

    if (!["accept", "decline", "reschedule"].includes(action)) {
      return NextResponse.json(
        { error: "action must be accept, decline, or reschedule" },
        { status: 400 }
      );
    }

    const admin = createAdminClient();

    // Verify user has a worker profile
    const { data: workerProfile } = await admin
      .from("worker_profiles")
      .select("id, user_id, first_name, last_name")
      .eq("user_id", user.id)
      .single();

    if (!workerProfile) {
      return NextResponse.json(
        { error: "Worker profile not found" },
        { status: 403 }
      );
    }

    // Look up the interview
    const { data: interview } = await admin
      .from("interviews")
      .select(
        "id, business_id, worker_id, status, room_expires_at, application_id"
      )
      .eq("id", interview_id)
      .single();

    if (!interview) {
      return NextResponse.json(
        { error: "Interview not found" },
        { status: 404 }
      );
    }

    // Verify worker owns this interview
    if (interview.worker_id !== workerProfile.id) {
      return NextResponse.json(
        { error: "You are not the worker for this interview" },
        { status: 403 }
      );
    }

    // Verify status is 'live'
    if (interview.status !== "live") {
      return NextResponse.json(
        { error: "This interview is not in live status" },
        { status: 400 }
      );
    }

    // Check room_expires_at hasn't passed
    if (
      interview.room_expires_at &&
      new Date(interview.room_expires_at) < new Date()
    ) {
      // Update the interview status to reflect expiry
      await admin
        .from("interviews")
        .update({
          status: "cancelled",
          updated_at: new Date().toISOString(),
        })
        .eq("id", interview_id);

      return NextResponse.json(
        { error: "This interview request has expired" },
        { status: 410 }
      );
    }

    // Get business profile for notifications
    const { data: businessProfile } = await admin
      .from("business_profiles")
      .select("id, user_id, business_name")
      .eq("id", interview.business_id)
      .single();

    // Get job title via application -> job_posts
    let jobTitle = "a position";
    if (interview.application_id) {
      const { data: application } = await admin
        .from("applications")
        .select("job_posts(title)")
        .eq("id", interview.application_id)
        .single();
      const jobPost = application?.job_posts as unknown as {
        title: string;
      } | null;
      if (jobPost?.title) jobTitle = jobPost.title;
    }
    const workerName = `${workerProfile.first_name} ${workerProfile.last_name}`;

    // ── ACCEPT ──────────────────────────────────────────
    if (action === "accept") {
      // Create Daily.co room
      const roomName = `mc-instant-${interview_id.slice(0, 8)}`;
      const room = await createRoom(roomName);

      if (!room) {
        return NextResponse.json(
          { error: "Failed to create video room" },
          { status: 500 }
        );
      }

      // Update interview with room info
      await admin
        .from("interviews")
        .update({
          video_room_name: room.name,
          video_room_url: room.url,
          status: "scheduled",
          scheduled_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", interview_id);

      // Notify business
      if (businessProfile) {
        try {
          await createNotification({
            userId: businessProfile.user_id,
            type: "interview_scheduled",
            title: "Instant Interview Accepted",
            message: `${workerName} accepted your instant interview for ${jobTitle}`,
            link: `/interviews/${interview_id}`,
            metadata: {
              interview_id,
              worker_name: workerName,
              job_title: jobTitle,
            },
          });
        } catch (notifError) {
          console.error("Failed to create notification:", notifError);
        }
      }

      return NextResponse.json({ video_room_url: room.url });
    }

    // ── DECLINE ─────────────────────────────────────────
    if (action === "decline") {
      await admin
        .from("interviews")
        .update({
          status: "declined",
          declined_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", interview_id);

      if (businessProfile) {
        // Create notification for business
        try {
          await createNotification({
            userId: businessProfile.user_id,
            type: "instant_interview_declined",
            title: "Instant Interview Declined",
            message: `${workerName} declined your instant interview for ${jobTitle}`,
            link: `/interviews/${interview_id}`,
            metadata: {
              interview_id,
              worker_name: workerName,
              job_title: jobTitle,
            },
          });
        } catch (notifError) {
          console.error("Failed to create notification:", notifError);
        }

        // Send decline email to business
        try {
          const emailModule = await import("@/lib/email/send") as Record<string, unknown>;
          const sendFn = emailModule.sendInstantInterviewDeclinedEmail as
            | ((params: Record<string, unknown>) => Promise<unknown>)
            | undefined;

          if (sendFn) {
            const businessEmail = (
              await admin.auth.admin.getUserById(businessProfile.user_id)
            ).data.user?.email;

            if (businessEmail) {
              await sendFn({
                to: businessEmail,
                businessName: businessProfile.business_name,
                workerName,
                jobTitle,
              });
            }
          }
        } catch (emailError) {
          console.error(
            "Failed to send instant interview declined email:",
            emailError
          );
        }
      }

      return NextResponse.json({ success: true });
    }

    // ── RESCHEDULE ──────────────────────────────────────
    if (action === "reschedule") {
      if (reschedule_slot) {
        // Worker provided a specific time slot
        await admin
          .from("interviews")
          .update({
            status: "scheduled",
            scheduled_date: reschedule_slot.date,
            scheduled_start_time: reschedule_slot.start_time,
            scheduled_end_time: reschedule_slot.end_time,
            timezone: reschedule_slot.timezone,
            scheduled_at: new Date().toISOString(),
            is_instant: false,
            updated_at: new Date().toISOString(),
          })
          .eq("id", interview_id);
      } else {
        // Worker wants to reschedule but hasn't picked a time
        await admin
          .from("interviews")
          .update({
            status: "reschedule_requested",
            updated_at: new Date().toISOString(),
          })
          .eq("id", interview_id);
      }

      if (businessProfile) {
        // Create notification for business
        try {
          await createNotification({
            userId: businessProfile.user_id,
            type: "instant_interview_rescheduled",
            title: "Interview Reschedule Requested",
            message: `${workerName} wants to reschedule the instant interview for ${jobTitle}`,
            link: `/interviews/${interview_id}`,
            metadata: {
              interview_id,
              worker_name: workerName,
              job_title: jobTitle,
              reschedule_slot: reschedule_slot || null,
            },
          });
        } catch (notifError) {
          console.error("Failed to create notification:", notifError);
        }

        // Send reschedule email to business
        try {
          const emailModule = await import("@/lib/email/send") as Record<string, unknown>;
          const sendFn = emailModule.sendInstantInterviewRescheduleEmail as
            | ((params: Record<string, unknown>) => Promise<unknown>)
            | undefined;

          if (sendFn) {
            const businessEmail = (
              await admin.auth.admin.getUserById(businessProfile.user_id)
            ).data.user?.email;

            if (businessEmail) {
              await sendFn({
                to: businessEmail,
                businessName: businessProfile.business_name,
                workerName,
                jobTitle,
                rescheduleSlot: reschedule_slot || null,
              });
            }
          }
        } catch (emailError) {
          console.error(
            "Failed to send instant interview reschedule email:",
            emailError
          );
        }
      }

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("Instant interview respond error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
