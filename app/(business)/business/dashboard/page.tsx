import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isInLaunchLocation } from "@/lib/config/launch-locations";
import DashboardClient from "./DashboardClient";
import type { BizActivity, EoiRow } from "./DashboardClient";
import type { BusinessTier } from "@/lib/tier";

export const dynamic = "force-dynamic";

export default async function BusinessDashboard() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }

  const userName = user.user_metadata?.full_name?.split(" ")[0] || "there";

  // Fetch business profile
  const { data: profile } = await supabase
    .from("business_profiles")
    .select("*")
    .eq("user_id", user.id)
    .single();

  if (!profile) {
    redirect("/business/onboarding");
  }

  const companyName = profile.business_name || "";
  const verificationStatus = profile.verification_status || "unverified";
  const businessTier = (profile.tier || "free") as BusinessTier;
  const profileId = profile.id;
  const showVerifiedCelebration = !!(profile.show_verified_celebration && profile.verification_status === "verified");

  // Profile completion calculation (same logic as company-profile page)
  const fields = [
    profile.business_name,
    profile.description,
    Array.isArray(profile.industries) && profile.industries.length > 0 ? "has_industries" : "",
    profile.website,
    profile.phone,
    profile.email,
    profile.location,
    profile.country,
    profile.address,
    Array.isArray(profile.standard_perks) && profile.standard_perks.length > 0 ? "has_perks" : "",
    profile.resort_id ? "has_resort" : "",
    profile.logo_url ? "has_logo" : "",
  ];
  const filled = fields.filter((f) => f && String(f).length > 0).length;
  const profileCompletion = Math.round((filled / fields.length) * 100);

  // Fetch resort legacy_id and town slug in parallel for launch location check
  const [resortResult, townResult] = await Promise.all([
    profile.resort_id
      ? supabase.from("resorts").select("legacy_id").eq("id", profile.resort_id).single()
      : Promise.resolve({ data: null }),
    profile.nearby_town_id
      ? supabase.from("nearby_towns").select("slug").eq("id", profile.nearby_town_id).single()
      : Promise.resolve({ data: null }),
  ]);

  const resortLegacyId = resortResult.data?.legacy_id ?? null;
  const townSlug = townResult.data?.slug ?? null;
  const inLaunchLocation = isInLaunchLocation(resortLegacyId, townSlug);

  // Fetch active listing count
  const { count: activeListingCount } = await supabase
    .from("job_posts")
    .select("id", { count: "exact", head: true })
    .eq("business_id", profile.id)
    .eq("status", "active");

  const listingCount = String(activeListingCount ?? 0);

  // Fetch ALL job IDs for this business (not just active) to count applicants across all listings
  const { data: allJobIds } = await supabase
    .from("job_posts")
    .select("id")
    .eq("business_id", profile.id);

  let applicantCount = "0";
  let interviewCount = "0";
  let expressionsOfInterest: EoiRow[] = [];

  if (allJobIds && allJobIds.length > 0) {
    const jobIds = allJobIds.map((j) => j.id);

    const [applicants, interviews, eois] = await Promise.all([
      supabase
        .from("applications")
        .select("id", { count: "exact", head: true })
        .in("job_post_id", jobIds),
      supabase
        .from("interviews")
        .select("id", { count: "exact", head: true })
        .eq("business_id", profile.id)
        .in("status", ["scheduled", "invited"]),
      supabase
        .from("expressions_of_interest")
        .select("id, job_post_id, name, email, phone, message, created_at, job_posts(title)")
        .in("job_post_id", jobIds)
        .order("created_at", { ascending: false }),
    ]);

    applicantCount = String(applicants.count ?? 0);
    interviewCount = String(interviews.count ?? 0);

    if (eois.data) {
      expressionsOfInterest = eois.data.map((e: Record<string, unknown>) => {
        const jp = e.job_posts as { title: string } | null;
        return {
          id: e.id as string,
          jobPostId: e.job_post_id as string,
          jobTitle: jp?.title || "A listing",
          name: e.name as string,
          email: e.email as string,
          phone: (e.phone as string) || null,
          message: (e.message as string) || null,
          createdAt: e.created_at as string,
        };
      });
    }
  }

  // ── Build activity feed ──────────────────────────────
  const feed: BizActivity[] = [];

  // Recent applications
  if (allJobIds && allJobIds.length > 0) {
    const jobIds = allJobIds.map((j) => j.id);
    const { data: recentApps } = await supabase
      .from("applications")
      .select("id, status, applied_at, updated_at, worker_id, job_post_id, worker_profiles(first_name, last_name), job_posts(title)")
      .in("job_post_id", jobIds)
      .order("applied_at", { ascending: false })
      .limit(10);

    if (recentApps) {
      for (const app of recentApps) {
        const wp = app.worker_profiles as unknown as { first_name: string | null; last_name: string | null } | null;
        const jp = app.job_posts as unknown as { title: string } | null;
        const name = [wp?.first_name, wp?.last_name].filter(Boolean).join(" ") || "A worker";
        const jobTitle = jp?.title || "a position";

        feed.push({
          id: `app-${app.id}`,
          type: "new_application",
          title: `${name} applied`,
          subtitle: jobTitle,
          date: app.applied_at,
          href: "/business/applicants",
        });

        if (app.status === "accepted") {
          feed.push({
            id: `accepted-${app.id}`,
            type: "offer_accepted",
            title: `${name} accepted your offer`,
            subtitle: jobTitle,
            date: app.updated_at || app.applied_at,
            href: "/business/applicants",
          });
        }
        if (app.status === "rejected") {
          feed.push({
            id: `declined-${app.id}`,
            type: "offer_declined",
            title: `${name} declined your offer`,
            subtitle: jobTitle,
            date: app.updated_at || app.applied_at,
            href: "/business/applicants",
          });
        }
      }
    }
  }

  // Recent interviews
  const { data: recentInterviews } = await supabase
    .from("interviews")
    .select("id, status, scheduled_date, scheduled_start_time, scheduled_at, completed_at, invited_at, applications(job_post_id, job_posts(title), worker_id, worker_profiles(first_name, last_name))")
    .eq("business_id", profile.id)
    .order("created_at", { ascending: false })
    .limit(10);

  if (recentInterviews) {
    for (const iv of recentInterviews) {
      const appData = iv.applications as unknown as { job_posts: { title: string }; worker_profiles: { first_name: string | null; last_name: string | null } } | null;
      const name = [appData?.worker_profiles?.first_name, appData?.worker_profiles?.last_name].filter(Boolean).join(" ") || "A worker";
      const jobTitle = appData?.job_posts?.title || "a position";

      if (iv.status === "scheduled") {
        feed.push({
          id: `iv-sched-${iv.id}`,
          type: "interview_scheduled",
          title: `Interview booked with ${name}`,
          subtitle: jobTitle,
          date: iv.scheduled_at || iv.invited_at,
          href: "/business/interviews",
        });
      }
      if (iv.status === "completed") {
        feed.push({
          id: `iv-done-${iv.id}`,
          type: "interview_completed",
          title: `Interview completed with ${name}`,
          subtitle: jobTitle,
          date: iv.completed_at || iv.invited_at,
          href: "/business/interviews",
        });
      }
    }
  }

  // Recent job postings
  const { data: recentJobs } = await supabase
    .from("job_posts")
    .select("id, title, status, created_at")
    .eq("business_id", profile.id)
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(5);

  if (recentJobs) {
    for (const job of recentJobs) {
      feed.push({
        id: `job-${job.id}`,
        type: "listing_published",
        title: `Published "${job.title}"`,
        subtitle: "Job listing",
        date: job.created_at,
        href: `/business/manage-listings/${job.id}`,
      });
    }
  }

  // Verification event
  if (profile.verification_status === "verified") {
    feed.push({
      id: "verified",
      type: "verified",
      title: "Business verified",
      subtitle: "Your account is now verified",
      date: profile.updated_at || profile.created_at,
      href: "/business/admin",
    });
  }

  feed.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return (
    <DashboardClient
      userName={userName}
      companyName={companyName}
      profileCompletion={profileCompletion}
      verificationStatus={verificationStatus}
      listingCount={listingCount}
      applicantCount={applicantCount}
      interviewCount={interviewCount}
      profileId={profileId}
      activities={feed}
      inLaunchLocation={inLaunchLocation}
      businessTier={businessTier}
      showVerifiedCelebration={showVerifiedCelebration}
      expressionsOfInterest={expressionsOfInterest}
    />
  );
}
