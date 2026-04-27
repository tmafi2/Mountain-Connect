import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { SeedApplicant } from "@/lib/data/applications";
import type { ApplicationStatus } from "@/types/database";
import ApplicantsClient from "./ApplicantsClient";

export const dynamic = "force-dynamic";

export default async function ApplicantsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: business } = await supabase
    .from("business_profiles")
    .select("id")
    .eq("user_id", user.id)
    .single();

  if (!business) redirect("/business/onboarding");

  // Fetch job listings and applications in parallel
  const [jobsResult, applicationsResult] = await Promise.all([
    supabase
      .from("job_posts")
      .select("id, title")
      .eq("business_id", business.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("applications")
      .select("*, job_posts(id, title, resort_id, resorts(name)), worker_profiles(id, user_id, first_name, last_name, phone, profile_photo_url, avatar_url, location_current, skills, years_seasonal_experience, bio, certifications, work_history, visa_status, work_eligible_countries, date_of_birth, nationality, languages, references, cv_url, contact_email, users(email))")
      .eq("job_posts.business_id", business.id),
  ]);

  const allListings = (jobsResult.data ?? []).map((j) => ({
    id: j.id,
    title: j.title,
  }));

  const applicants: SeedApplicant[] = (applicationsResult.data ?? [])
    .filter((a: Record<string, unknown>) => a.job_posts !== null)
    .map((a: Record<string, unknown>) => {
      const jp = a.job_posts as Record<string, unknown>;
      const resort = jp.resorts as { name: string } | null;
      const wp = a.worker_profiles as Record<string, unknown> | null;
      const firstName = (wp?.first_name as string) || "";
      const lastName = (wp?.last_name as string) || "";
      // Worker email: prefer their explicit contact_email override, fall back
      // to the auth users.email pulled via the users(email) join. Both can be
      // null if the row is incomplete.
      const wpUser = wp?.users as { email?: string | null } | null;
      const workerEmail = (wp?.contact_email as string | null) || wpUser?.email || "";

      return {
        id: (wp?.id as string) || (a.worker_id as string),
        application_id: a.id as string,
        job_id: jp.id as string,
        job_title: jp.title as string,
        resort_name: resort?.name || "",
        worker_name: [firstName, lastName].filter(Boolean).join(" ") || "Unknown",
        worker_email: workerEmail,
        worker_phone: (wp?.phone as string) || null,
        worker_avatar: (wp?.avatar_url as string) || (wp?.profile_photo_url as string) || null,
        worker_location: (wp?.location_current as string) || null,
        worker_skills: (wp?.skills as string[]) || [],
        years_experience: (wp?.years_seasonal_experience as number) || 0,
        status: a.status as ApplicationStatus,
        applied_at: a.applied_at as string,
        cover_letter: (a.cover_letter as string) || "",
        languages: (wp?.languages as { language: string; proficiency: string }[]) || [],
        availability: null,
        bio: (wp?.bio as string) || null,
        certifications: (wp?.certifications as { name: string; issuing_body: string | null }[]) || [],
        work_history: (wp?.work_history as { title: string; company: string; location: string; start_date: string; end_date: string | null; description: string }[]) || [],
        education: null,
        visa_status: (wp?.visa_status as string) || null,
        work_eligible_countries: (wp?.work_eligible_countries as string[]) || null,
        date_of_birth: (wp?.date_of_birth as string) || null,
        nationality: (wp?.nationality as string) || null,
        worker_resume_url: (a.resume_url as string) || (wp?.cv_url as string) || null,
        worker_user_id: (wp?.user_id as string) || null,
      };
    });

  return (
    <ApplicantsClient
      initialApplicants={applicants}
      initialListings={allListings}
    />
  );
}
