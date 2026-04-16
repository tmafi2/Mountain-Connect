import { createClient } from "@/lib/supabase/server";
import ApplicationsClient, { demoApplications, type Application } from "./ApplicationsClient";

export const dynamic = "force-dynamic";

export default async function ApplicationsPage() {
  let initialApplications: Application[] = demoApplications;
  let currentUserId: string | null = null;

  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (user) {
      currentUserId = user.id;

      const { data: wp } = await supabase
        .from("worker_profiles")
        .select("id")
        .eq("user_id", user.id)
        .single();

      if (wp) {
        const { data } = await supabase
          .from("applications")
          .select("*, job_posts(title, salary_range, position_type, start_date, business_profiles(business_name, location, user_id), resorts(name)), interviews(status, scheduled_date, scheduled_start_time, invite_token), contracts(id, status, original_pdf_path, signed_pdf_path), worker_profiles(first_name, last_name)")
          .eq("worker_id", wp.id)
          .order("applied_at", { ascending: false });

        if (data && data.length > 0) {
          const statusMap: Record<string, Application["status"]> = {
            new: "applied",
            viewed: "viewed",
            interview_pending: "interview",
            interview: "interview",
            offered: "offered",
            accepted: "accepted",
            rejected: "rejected",
            withdrawn: "withdrawn",
          };

          const mapped: Application[] = data.map((a: Record<string, unknown>) => {
            const jp = a.job_posts as Record<string, unknown> | null;
            const bp = jp?.business_profiles as { business_name: string; location: string | null; user_id: string | null } | null;
            const resort = jp?.resorts as { name: string } | null;
            const interviews = a.interviews as { status: string; scheduled_date: string | null; scheduled_start_time: string | null; invite_token: string | null }[] | null;
            const latestInterview = interviews?.[0] || null;
            const contracts = a.contracts as { id: string; status: string; original_pdf_path: string; signed_pdf_path: string | null }[] | null;
            const latestContract = contracts?.[0] || null;
            const wpData = a.worker_profiles as { first_name: string | null; last_name: string | null } | null;
            const posType = (jp?.position_type as string) || "full_time";

            return {
              id: a.id as string,
              job_title: (jp?.title as string) || "Unknown Position",
              business_name: bp?.business_name || "Unknown Business",
              business_location: bp?.location || "",
              business_user_id: bp?.user_id || null,
              resort_name: resort?.name || "",
              status: statusMap[a.status as string] || "applied",
              applied_at: a.applied_at as string,
              cover_letter: (a.cover_letter as string) || "",
              has_resume: !!(a.resume_url),
              salary_range: (jp?.salary_range as string) || "",
              employment_type: posType === "full_time" ? "Full-Time" : posType === "part_time" ? "Part-Time" : "Casual",
              start_date: (jp?.start_date as string) || "",
              interview_status: latestInterview ? (latestInterview.status as "invited" | "scheduled" | "completed") : null,
              interview_date: latestInterview?.scheduled_date || null,
              interview_time: latestInterview?.scheduled_start_time || null,
              interview_invite_token: latestInterview?.invite_token || null,
              last_updated: (a.updated_at as string) || (a.applied_at as string),
              contract_id: latestContract?.id || null,
              contract_status: latestContract ? (latestContract.status as "pending" | "signed") : null,
              contract_original_path: latestContract?.original_pdf_path || null,
              contract_signed_path: latestContract?.signed_pdf_path || null,
              worker_name: [wpData?.first_name, wpData?.last_name].filter(Boolean).join(" ") || "Worker",
            };
          });
          initialApplications = mapped;
        } else {
          // User has a worker profile but no applications — show empty state
          initialApplications = [];
        }
      } else {
        // User has no worker profile — show empty state
        initialApplications = [];
      }
    }
    // If no user, keep demoApplications as the default
  } catch {
    // On error for non-authenticated, show demo data (already the default)
  }

  return (
    <ApplicationsClient
      initialApplications={initialApplications}
      currentUserId={currentUserId}
    />
  );
}
