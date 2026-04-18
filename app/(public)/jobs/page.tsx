import { createClient } from "@/lib/supabase/server";
import { type SeedJob } from "@/lib/data/jobs";
import JobsClient from "./JobsClient";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Find a Job | Mountain Connects",
  description:
    "Browse seasonal job listings at ski resorts worldwide. Filter by location, role, perks, and more.",
};

export default async function FindAJobPage() {
  // Fetch all active jobs server-side — no loading spinner needed
  let jobs: SeedJob[] = [];

  try {
    const supabase = await createClient();
    // Show every active job regardless of the business's verification status.
    // We still expose the verified state on each row so the UI can badge them.
    const { data } = await supabase
      .from("job_posts")
      .select(
        "*, business_profiles!inner(business_name, verification_status, logo_url), resorts(name, country), nearby_towns(name, slug)"
      )
      .eq("status", "active");

    if (data && data.length > 0) {
      jobs = data.map((j: Record<string, unknown>) => {
        const bp = j.business_profiles as {
          business_name: string;
          verification_status: string;
          logo_url: string | null;
        } | null;
        const resort = j.resorts as { name: string; country: string } | null;
        const nearbyTown = j.nearby_towns as {
          name: string;
          slug: string;
        } | null;
        const posType = (j.position_type as string) || "full_time";

        return {
          id: j.id as string,
          business_id: j.business_id as string,
          resort_id: j.resort_id as string,
          title: j.title as string,
          description: j.description as string,
          requirements: (j.requirements as string) || null,
          accommodation_included: j.accommodation_included as boolean,
          salary_range: (j.salary_range as string) || null,
          start_date: (j.start_date as string) || null,
          end_date: (j.end_date as string) || null,
          is_active: true,
          created_at: j.created_at as string,
          business_name: bp?.business_name || "Unknown Business",
          business_verified: bp?.verification_status === "verified",
          business_logo_url: bp?.logo_url || null,
          resort_name: resort?.name || "",
          resort_country: resort?.country || "",
          nearby_town_id: (j.nearby_town_id as string) || null,
          nearby_town_name: nearbyTown?.name || null,
          category: (j.category as string) || "Other",
          position_type: posType as "full_time" | "part_time" | "casual",
          pay_amount:
            (j.pay_amount as string) || (j.salary_range as string) || "",
          pay_currency: (j.pay_currency as string) || "USD",
          housing_details: (j.housing_details as string) || null,
          meal_perks: (j.meal_perks as boolean) || false,
          ski_pass_included: (j.ski_pass_included as boolean) || false,
          language_required: (j.language_required as string) || "English",
          visa_sponsorship: (j.visa_sponsorship as boolean) || false,
          urgently_hiring: (j.urgently_hiring as boolean) || false,
          positions_available: (j.positions_available as number) || 1,
          accommodation_type: (j.accommodation_type as string) || null,
          accommodation_cost: (j.accommodation_cost as string) || null,
          status: ((j.status as string) || "active") as
            | "active"
            | "paused"
            | "closed"
            | "draft",
          how_to_apply: (j.how_to_apply as string) || null,
          application_email: (j.application_email as string) || null,
          application_url: (j.application_url as string) || null,
          featured_until: (j.featured_until as string) || null,
          applications_count: 0,
        };
      });
    }
  } catch (err) {
    console.error("Failed to fetch jobs server-side:", err);
  }

  return <JobsClient initialJobs={jobs} />;
}
