import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createNotification } from "@/lib/notifications/create";

/**
 * POST /api/job-alerts/match
 * Called when a new job is published. Checks all active alerts
 * and sends notifications to matching workers.
 */
export async function POST(request: Request) {
  try {
    const { jobId } = await request.json();
    if (!jobId) return NextResponse.json({ error: "Missing jobId" }, { status: 400 });

    const supabase = createAdminClient();

    // Fetch the new job details
    const { data: job } = await supabase
      .from("job_posts")
      .select("id, title, category, position_type, accommodation_included, ski_pass_included, visa_sponsorship, meal_perks, urgently_hiring, business_profiles(business_name, location, country), resorts(name)")
      .eq("id", jobId)
      .single();

    if (!job) return NextResponse.json({ error: "Job not found" }, { status: 404 });

    // Fetch all active alerts
    const { data: alerts } = await supabase
      .from("job_alerts")
      .select("id, user_id, filters, name")
      .eq("is_active", true);

    if (!alerts || alerts.length === 0) {
      return NextResponse.json({ matched: 0 });
    }

    const business = job.business_profiles as unknown as { business_name: string; location: string; country: string } | null;
    const resort = job.resorts as unknown as { name: string } | null;

    let matched = 0;

    for (const alert of alerts) {
      const f = alert.filters as Record<string, unknown>;
      let matches = true;

      // Category filter
      if (f.category && f.category !== "" && f.category !== job.category) {
        matches = false;
      }

      // Country filter
      if (f.country && f.country !== "" && business?.country !== f.country) {
        matches = false;
      }

      // Resort filter
      if (f.resort && f.resort !== "" && resort?.name !== f.resort) {
        matches = false;
      }

      // Position type filter
      if (f.position_type && f.position_type !== "" && f.position_type !== job.position_type) {
        matches = false;
      }

      // Perk filters (yes/no/all)
      if (f.accommodation === "yes" && !job.accommodation_included) matches = false;
      if (f.accommodation === "no" && job.accommodation_included) matches = false;
      if (f.ski_pass === "yes" && !job.ski_pass_included) matches = false;
      if (f.ski_pass === "no" && job.ski_pass_included) matches = false;
      if (f.visa_sponsorship === "yes" && !job.visa_sponsorship) matches = false;
      if (f.visa_sponsorship === "no" && job.visa_sponsorship) matches = false;
      if (f.meal_perks === "yes" && !job.meal_perks) matches = false;
      if (f.meal_perks === "no" && job.meal_perks) matches = false;

      // Urgently hiring filter
      if (f.urgently_hiring === true && !job.urgently_hiring) matches = false;

      if (matches) {
        matched++;
        try {
          await createNotification({
            userId: alert.user_id,
            type: "job_alert_match",
            title: "New job matches your alert",
            message: `${job.title} at ${business?.business_name || "a resort"} matches your "${alert.name}" alert.`,
            link: `/jobs/${job.id}`,
            metadata: { job_id: job.id, alert_id: alert.id },
          });
        } catch (err) {
          console.error(`Failed to notify user ${alert.user_id}:`, err);
        }
      }
    }

    // Update last_checked_at for matched alerts
    if (matched > 0) {
      const matchedAlertIds = alerts
        .filter((a) => {
          const f = a.filters as Record<string, unknown>;
          // Re-check match (simplified — same logic)
          if (f.category && f.category !== "" && f.category !== job.category) return false;
          if (f.country && f.country !== "" && business?.country !== f.country) return false;
          if (f.resort && f.resort !== "" && resort?.name !== f.resort) return false;
          if (f.position_type && f.position_type !== "" && f.position_type !== job.position_type) return false;
          return true;
        })
        .map((a) => a.id);

      if (matchedAlertIds.length > 0) {
        await supabase
          .from("job_alerts")
          .update({ last_checked_at: new Date().toISOString() })
          .in("id", matchedAlertIds);
      }
    }

    return NextResponse.json({ matched });
  } catch (error) {
    console.error("Error matching job alerts:", error);
    return NextResponse.json({ error: "Failed to match alerts" }, { status: 500 });
  }
}
