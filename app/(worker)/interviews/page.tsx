import { createClient } from "@/lib/supabase/server";
import InterviewsClient from "./InterviewsClient";
import type { Interview } from "./InterviewsClient";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Interviews | Mountain Connects",
  description: "Manage your upcoming interviews, view your schedule, and prepare for your next opportunity.",
};

export default async function InterviewsPage() {
  let interviews: Interview[] = [];

  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (user) {
      const { data: profile } = await supabase
        .from("worker_profiles")
        .select("id")
        .eq("user_id", user.id)
        .single();

      if (profile) {
        const { data } = await supabase
          .from("interviews")
          .select(`
            id, status, scheduled_date, scheduled_start_time, scheduled_end_time, timezone, business_notes, invite_token,
            applications(job_posts(id, title, description, salary_range, pay_amount, pay_currency, position_type, start_date, accommodation_included, ski_pass_included, business_id, business_profiles(id, business_name, location)))
          `)
          .eq("worker_id", profile.id)
          .order("created_at", { ascending: false });

        if (data && data.length > 0) {
          interviews = data.map((iv: Record<string, unknown>) => {
            const app = iv.applications as Record<string, unknown> | null;
            const jp = app?.job_posts as Record<string, unknown> | null;
            const bp = jp?.business_profiles as { id: string; business_name: string; location: string } | null;
            const statusVal = iv.status as string;
            const validStatuses = ["scheduled", "invited", "completed", "cancelled", "missed", "reschedule_requested", "rescheduled"];
            const payDisplay = (jp?.pay_amount as string) ? `${(jp?.pay_currency as string) || "AUD"} ${jp?.pay_amount}` : (jp?.salary_range as string) || null;
            return {
              id: iv.id as string,
              job_id: (jp?.id as string) || null,
              business_id: bp?.id || (jp?.business_id as string) || null,
              job_title: (jp?.title as string) || "Unknown Position",
              business_name: bp?.business_name || "Unknown Business",
              business_location: bp?.location || "",
              status: (validStatuses.includes(statusVal) ? statusVal : "invited") as Interview["status"],
              scheduled_date: iv.scheduled_date as string | null,
              scheduled_start_time: iv.scheduled_start_time ? (iv.scheduled_start_time as string).slice(0, 5) : null,
              scheduled_end_time: iv.scheduled_end_time ? (iv.scheduled_end_time as string).slice(0, 5) : null,
              timezone: iv.timezone as string | null,
              notes: (iv.business_notes as string) || "",
              job_description: (jp?.description as string) || null,
              job_pay: payDisplay,
              job_position_type: (jp?.position_type as string) || null,
              job_start_date: (jp?.start_date as string) || null,
              job_accommodation: (jp?.accommodation_included as boolean) || false,
              job_ski_pass: (jp?.ski_pass_included as boolean) || false,
              invite_token: (iv.invite_token as string) || null,
            };
          });
        }
      }
    }
  } catch (err) {
    console.error("Failed to fetch interviews:", err);
  }

  return <InterviewsClient initialInterviews={interviews} />;
}
