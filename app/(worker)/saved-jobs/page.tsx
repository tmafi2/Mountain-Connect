import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import SavedJobsClient from "./SavedJobsClient";
import type { SavedJob } from "./SavedJobsClient";

export const dynamic = "force-dynamic";

export default async function SavedJobsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Fire saved-jobs and applied-jobs lookup in parallel — both only need
  // user.id. The applications query inner-joins worker_profiles on user_id
  // so we don't have to resolve the worker_profile row first; saves a
  // round-trip on every visit to /saved-jobs. Also fixes a pre-existing
  // typo: the SELECT was for `job_id` but the column on applications is
  // `job_post_id`, so `appliedJobIds` was silently always empty.
  const [savedRes, appsRes] = await Promise.all([
    supabase
      .from("saved_jobs")
      .select(`id, job_post_id, created_at, job_posts(
        title, description, requirements, salary_range, pay_amount, pay_currency,
        position_type, category, accommodation_included, ski_pass_included, meal_perks,
        visa_sponsorship, start_date, end_date, how_to_apply, application_email, application_url,
        business_profiles(business_name, logo_url, verification_status),
        resorts(name, country)
      )`)
      .eq("user_id", user.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("applications")
      .select("job_post_id, worker_profiles!inner(user_id)")
      .eq("worker_profiles.user_id", user.id),
  ]);

  const data = savedRes.data;

  const savedJobs: SavedJob[] = (data || []).map((s: Record<string, unknown>) => {
    const jp = s.job_posts as Record<string, unknown> | null;
    const bp = jp?.business_profiles as { business_name: string; logo_url: string | null; verification_status: string } | null;
    const resort = jp?.resorts as { name: string; country: string } | null;
    return {
      id: s.id as string,
      job_post_id: s.job_post_id as string,
      title: (jp?.title as string) || "Unknown Job",
      description: (jp?.description as string) || "",
      requirements: (jp?.requirements as string) || null,
      business_name: bp?.business_name || "Unknown Business",
      business_logo_url: bp?.logo_url || null,
      business_verified: bp?.verification_status === "verified",
      resort_name: resort?.name || "",
      resort_country: resort?.country || "",
      salary_range: (jp?.salary_range as string) || "",
      pay_amount: (jp?.pay_amount as string) || null,
      pay_currency: (jp?.pay_currency as string) || null,
      position_type: (jp?.position_type as string) || "full_time",
      category: (jp?.category as string) || null,
      accommodation_included: (jp?.accommodation_included as boolean) || false,
      ski_pass_included: (jp?.ski_pass_included as boolean) || false,
      meal_perks: (jp?.meal_perks as boolean) || false,
      visa_sponsorship: (jp?.visa_sponsorship as boolean) || false,
      start_date: (jp?.start_date as string) || null,
      end_date: (jp?.end_date as string) || null,
      how_to_apply: (jp?.how_to_apply as string) || null,
      application_email: (jp?.application_email as string) || null,
      application_url: (jp?.application_url as string) || null,
      saved_at: s.created_at as string,
    };
  });

  const appliedJobIds: string[] = (appsRes.data || [])
    .map((a) => a.job_post_id as string)
    .filter(Boolean);

  return (
    <SavedJobsClient
      initialSavedJobs={savedJobs}
      initialAppliedJobIds={appliedJobIds}
    />
  );
}
