import { createClient } from "@/lib/supabase/server";
import DashboardClient from "./DashboardClient";
import type { ActivityItem, UpcomingInterview } from "./DashboardClient";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Dashboard | Mountain Connects",
  description: "Your worker dashboard — track applications, interviews, and saved jobs.",
};

export default async function WorkerDashboardPage() {
  let userName = "there";
  let profileCompletion = 0;
  let avatarUrl: string | null = null;
  let nationality = "";
  let appCount = 0;
  let interviewCount = 0;
  let savedCount = 0;
  let activities: ActivityItem[] = [];
  let hasOffer = false;
  let hasInvitedInterview = false;
  let upcomingInterviews: UpcomingInterview[] = [];

  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (user) {
      userName = user.user_metadata?.full_name?.split(" ")[0] || "there";

      // Fetch worker profile
      const { data: profile } = await supabase
        .from("worker_profiles")
        .select("id, profile_completion_pct, avatar_url, nationality")
        .eq("user_id", user.id)
        .single();

      if (profile?.profile_completion_pct != null) {
        profileCompletion = profile.profile_completion_pct;
      }
      if (profile?.avatar_url) avatarUrl = profile.avatar_url;
      if (profile?.nationality) nationality = profile.nationality;

      if (profile?.id) {
        // Run all counts + data queries in parallel
        const [apps, interviews, saved, recentApps, recentInterviews] = await Promise.all([
          supabase.from("applications").select("id", { count: "exact", head: true }).eq("worker_id", profile.id),
          supabase.from("interviews").select("id", { count: "exact", head: true }).eq("worker_id", profile.id).in("status", ["invited", "scheduled"]),
          supabase.from("saved_jobs").select("id", { count: "exact", head: true }).eq("user_id", user.id),
          supabase
            .from("applications")
            .select("id, status, applied_at, updated_at, job_post_id, job_posts(title, business_profiles(business_name))")
            .eq("worker_id", profile.id)
            .order("applied_at", { ascending: false })
            .limit(10),
          supabase
            .from("interviews")
            .select("id, status, invited_at, scheduled_at, scheduled_date, scheduled_start_time, scheduled_end_time, completed_at, cancelled_at, video_room_url, application_id, applications(job_post_id, job_posts(title, business_profiles(business_name)))")
            .eq("worker_id", profile.id)
            .order("created_at", { ascending: false })
            .limit(10),
        ]);

        appCount = apps.count ?? 0;
        interviewCount = interviews.count ?? 0;
        savedCount = saved.count ?? 0;

        // Build activity feed
        const feed: ActivityItem[] = [];

        if (recentApps.data) {
          for (const app of recentApps.data) {
            const job = app.job_posts as unknown as { title: string; business_profiles: { business_name: string } } | null;
            const jobTitle = job?.title || "a position";
            const bizName = job?.business_profiles?.business_name || "a business";

            feed.push({
              id: `app-${app.id}`,
              type: "applied",
              title: `You applied to ${jobTitle}`,
              subtitle: bizName,
              date: app.applied_at,
              href: "/applications",
            });

            if (app.status === "viewed" || app.status === "reviewed") {
              feed.push({
                id: `viewed-${app.id}`,
                type: "viewed",
                title: `Your application was viewed`,
                subtitle: `${bizName} — ${jobTitle}`,
                date: app.updated_at || app.applied_at,
                href: "/applications",
              });
            }
            if (app.status === "offered") {
              feed.push({
                id: `offered-${app.id}`,
                type: "offered",
                title: `You received an offer!`,
                subtitle: `${bizName} — ${jobTitle}`,
                date: app.updated_at || app.applied_at,
                href: "/applications",
              });
            }
            if (app.status === "accepted") {
              feed.push({
                id: `accepted-${app.id}`,
                type: "accepted",
                title: `You accepted an offer`,
                subtitle: `${bizName} — ${jobTitle}`,
                date: app.updated_at || app.applied_at,
                href: "/applications",
              });
            }
            if (app.status === "rejected") {
              feed.push({
                id: `rejected-${app.id}`,
                type: "rejected",
                title: `Application not selected`,
                subtitle: `${bizName} — ${jobTitle}`,
                date: app.updated_at || app.applied_at,
                href: "/applications",
              });
            }
          }
        }

        if (recentInterviews.data) {
          for (const iv of recentInterviews.data) {
            const appData = iv.applications as unknown as { job_posts: { title: string; business_profiles: { business_name: string } } } | null;
            const jobTitle = appData?.job_posts?.title || "a position";
            const bizName = appData?.job_posts?.business_profiles?.business_name || "a business";

            if (iv.status === "invited") {
              feed.push({
                id: `iv-invite-${iv.id}`,
                type: "interview_invited",
                title: `Interview invitation from ${bizName}`,
                subtitle: jobTitle,
                date: iv.invited_at,
                href: "/interviews",
              });
            }
            if (iv.status === "scheduled" && iv.scheduled_date) {
              const dateStr = new Date(iv.scheduled_date).toLocaleDateString("en-AU", { month: "short", day: "numeric" });
              const timeStr = iv.scheduled_start_time ? ` at ${iv.scheduled_start_time.slice(0, 5)}` : "";
              feed.push({
                id: `iv-sched-${iv.id}`,
                type: "interview_scheduled",
                title: `Interview confirmed for ${dateStr}${timeStr}`,
                subtitle: `${bizName} — ${jobTitle}`,
                date: iv.scheduled_at || iv.invited_at,
                href: "/interviews",
              });
            }
            if (iv.status === "completed") {
              feed.push({
                id: `iv-done-${iv.id}`,
                type: "interview_completed",
                title: `Interview completed with ${bizName}`,
                subtitle: jobTitle,
                date: iv.completed_at || iv.invited_at,
                href: "/interviews",
              });
            }
          }
        }

        // Detect actionable states
        if (recentApps.data?.some((a) => a.status === "offered")) hasOffer = true;
        if (recentInterviews.data?.some((iv) => iv.status === "invited")) hasInvitedInterview = true;

        // Detect upcoming interviews (today/tomorrow)
        if (recentInterviews.data) {
          const now = new Date();
          const todayStr = now.toISOString().slice(0, 10);
          const tomorrow = new Date(now);
          tomorrow.setDate(tomorrow.getDate() + 1);
          const tomorrowStr = tomorrow.toISOString().slice(0, 10);

          const upcoming: UpcomingInterview[] = [];
          for (const iv of recentInterviews.data) {
            if (iv.status !== "scheduled" || !iv.scheduled_date) continue;

            const ivDate = iv.scheduled_date.slice(0, 10);
            const isToday = ivDate === todayStr;
            const isTomorrow = ivDate === tomorrowStr;

            if (!isToday && !isTomorrow) continue;

            let isPast = false;
            if (isToday && iv.scheduled_end_time) {
              const [eh, em] = iv.scheduled_end_time.split(":").map(Number);
              const endDateTime = new Date(now);
              endDateTime.setHours(eh, em, 0, 0);
              if (now > endDateTime) isPast = true;
            } else if (isToday && iv.scheduled_start_time) {
              const [sh, sm] = iv.scheduled_start_time.split(":").map(Number);
              const startPlus1h = new Date(now);
              startPlus1h.setHours(sh + 1, sm, 0, 0);
              if (now > startPlus1h) isPast = true;
            }

            const ivApp = iv.applications as unknown as { job_posts: { title: string; business_profiles: { business_name: string } } } | null;
            upcoming.push({
              id: iv.id,
              jobTitle: ivApp?.job_posts?.title || "Interview",
              businessName: ivApp?.job_posts?.business_profiles?.business_name || "a business",
              scheduledDate: iv.scheduled_date,
              scheduledTime: iv.scheduled_start_time || null,
              endTime: iv.scheduled_end_time || null,
              videoUrl: iv.video_room_url || null,
              urgency: isToday ? "today" : "tomorrow",
              isPast,
            });
          }

          upcoming.sort((a, b) => {
            if (a.urgency !== b.urgency) return a.urgency === "today" ? -1 : 1;
            return (a.scheduledTime || "").localeCompare(b.scheduledTime || "");
          });

          upcomingInterviews = upcoming;
        }

        // Sort activity by date descending
        feed.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        activities = feed;
      }
    }
  } catch (err) {
    console.error("Failed to fetch dashboard data:", err);
  }

  return (
    <DashboardClient
      userName={userName}
      profileCompletion={profileCompletion}
      avatarUrl={avatarUrl}
      nationality={nationality}
      appCount={appCount}
      interviewCount={interviewCount}
      savedCount={savedCount}
      activities={activities}
      hasOffer={hasOffer}
      hasInvitedInterview={hasInvitedInterview}
      upcomingInterviews={upcomingInterviews}
    />
  );
}
