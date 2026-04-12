"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

/* ─── country → flag emoji mapping ─────────────────────────── */
const COUNTRY_FLAGS: Record<string, string> = {
  "Argentina": "🇦🇷", "Australia": "🇦🇺", "Austria": "🇦🇹", "Belgium": "🇧🇪",
  "Brazil": "🇧🇷", "Bulgaria": "🇧🇬", "Canada": "🇨🇦", "Chile": "🇨🇱",
  "China": "🇨🇳", "Colombia": "🇨🇴", "Croatia": "🇭🇷", "Czech Republic": "🇨🇿",
  "Denmark": "🇩🇰", "Ecuador": "🇪🇨", "Finland": "🇫🇮", "France": "🇫🇷",
  "Germany": "🇩🇪", "Greece": "🇬🇷", "Hungary": "🇭🇺", "India": "🇮🇳",
  "Indonesia": "🇮🇩", "Ireland": "🇮🇪", "Israel": "🇮🇱", "Italy": "🇮🇹",
  "Japan": "🇯🇵", "Malaysia": "🇲🇾", "Mexico": "🇲🇽", "Netherlands": "🇳🇱",
  "New Zealand": "🇳🇿", "Norway": "🇳🇴", "Peru": "🇵🇪", "Philippines": "🇵🇭",
  "Poland": "🇵🇱", "Portugal": "🇵🇹", "Romania": "🇷🇴", "Singapore": "🇸🇬",
  "Slovakia": "🇸🇰", "Slovenia": "🇸🇮", "South Africa": "🇿🇦", "South Korea": "🇰🇷",
  "Spain": "🇪🇸", "Sweden": "🇸🇪", "Switzerland": "🇨🇭", "Thailand": "🇹🇭",
  "Turkey": "🇹🇷", "United Kingdom": "🇬🇧", "United States": "🇺🇸",
  "Uruguay": "🇺🇾", "Venezuela": "🇻🇪", "Country not listed": "🏔️",
};

function getCountryFlag(name: string): string | null {
  if (!name) return null;
  return COUNTRY_FLAGS[name] || null;
}

/* ─── Upcoming interview type ─────────────────────────────── */
interface UpcomingInterview {
  id: string;
  jobTitle: string;
  businessName: string;
  scheduledDate: string; // ISO date
  scheduledTime: string | null; // HH:MM:SS
  endTime: string | null;
  videoUrl: string | null;
  urgency: "today" | "tomorrow";
  isPast: boolean;
}

/* ─── Activity item type ──────────────────────────────────── */
interface ActivityItem {
  id: string;
  type: "applied" | "viewed" | "interview_invited" | "interview_scheduled" | "interview_completed" | "offered" | "accepted" | "rejected";
  title: string;
  subtitle: string;
  date: string;
  href: string;
}

export default function WorkerDashboard() {
  const [userName, setUserName] = useState("");
  const [profileCompletion, setProfileCompletion] = useState(0);
  const [loading, setLoading] = useState(true);
  const [appCount, setAppCount] = useState(0);
  const [interviewCount, setInterviewCount] = useState(0);
  const [savedCount, setSavedCount] = useState(0);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [nationality, setNationality] = useState("");
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [hasOffer, setHasOffer] = useState(false);
  const [hasInvitedInterview, setHasInvitedInterview] = useState(false);
  const [upcomingInterviews, setUpcomingInterviews] = useState<UpcomingInterview[]>([]);
  const [dismissedBanners, setDismissedBanners] = useState<Set<string>>(new Set());
  const [checklistDismissed, setChecklistDismissed] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("mc-onboarding-dismissed") === "true";
    }
    return false;
  });

  useEffect(() => {
    if (
      !process.env.NEXT_PUBLIC_SUPABASE_URL ||
      !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    ) {
      setLoading(false);
      return;
    }
    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data }) => {
      const user = data.user;
      setUserName(user?.user_metadata?.full_name?.split(" ")[0] || "there");

      if (user) {
        const { data: profile } = await supabase
          .from("worker_profiles")
          .select("id, profile_completion_pct, avatar_url, nationality")
          .eq("user_id", user.id)
          .single();
        if (profile?.profile_completion_pct != null) {
          setProfileCompletion(profile.profile_completion_pct);
        }
        if (profile?.avatar_url) setAvatarUrl(profile.avatar_url);
        if (profile?.nationality) setNationality(profile.nationality);

        if (profile?.id) {
          const [apps, interviews, saved, recentApps, recentInterviews] = await Promise.all([
            supabase.from("applications").select("id", { count: "exact", head: true }).eq("worker_id", profile.id),
            supabase.from("interviews").select("id", { count: "exact", head: true }).eq("worker_id", profile.id).in("status", ["invited", "scheduled"]),
            supabase.from("saved_jobs").select("id", { count: "exact", head: true }).eq("user_id", user.id),
            // Fetch recent applications with job/business details
            supabase
              .from("applications")
              .select("id, status, applied_at, updated_at, job_post_id, job_posts(title, business_profiles(business_name))")
              .eq("worker_id", profile.id)
              .order("applied_at", { ascending: false })
              .limit(10),
            // Fetch recent interviews with details
            supabase
              .from("interviews")
              .select("id, status, invited_at, scheduled_at, scheduled_date, scheduled_start_time, scheduled_end_time, completed_at, cancelled_at, video_room_url, application_id, applications(job_post_id, job_posts(title, business_profiles(business_name)))")
              .eq("worker_id", profile.id)
              .order("created_at", { ascending: false })
              .limit(10),
          ]);
          setAppCount(apps.count ?? 0);
          setInterviewCount(interviews.count ?? 0);
          setSavedCount(saved.count ?? 0);

          // Build activity feed
          const feed: ActivityItem[] = [];

          // Add application events
          if (recentApps.data) {
            for (const app of recentApps.data) {
              const job = app.job_posts as unknown as { title: string; business_profiles: { business_name: string } } | null;
              const jobTitle = job?.title || "a position";
              const bizName = job?.business_profiles?.business_name || "a business";

              // Application submitted
              feed.push({
                id: `app-${app.id}`,
                type: "applied",
                title: `You applied to ${jobTitle}`,
                subtitle: bizName,
                date: app.applied_at,
                href: "/applications",
              });

              // Status change events (only if status isn't just "new")
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

          // Add interview events
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
          if (recentApps.data?.some((a) => a.status === "offered")) setHasOffer(true);
          if (recentInterviews.data?.some((iv) => iv.status === "invited")) setHasInvitedInterview(true);

          // Detect interviews within the next 24 hours
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

              // Check if today's interview has already ended
              let isPast = false;
              if (isToday && iv.scheduled_end_time) {
                const [eh, em] = iv.scheduled_end_time.split(":").map(Number);
                const endDateTime = new Date(now);
                endDateTime.setHours(eh, em, 0, 0);
                if (now > endDateTime) isPast = true;
              } else if (isToday && iv.scheduled_start_time) {
                // No end time — check if start time + 1 hour has passed
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

            // Sort: today first, then by time
            upcoming.sort((a, b) => {
              if (a.urgency !== b.urgency) return a.urgency === "today" ? -1 : 1;
              return (a.scheduledTime || "").localeCompare(b.scheduledTime || "");
            });

            setUpcomingInterviews(upcoming);
          }

          // Sort by date descending
          feed.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
          setActivities(feed);
        }
      }

      setLoading(false);
    });
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-secondary" />
      </div>
    );
  }

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 17) return "Good afternoon";
    return "Good evening";
  };

  const visibleBanners = upcomingInterviews.filter((iv) => !dismissedBanners.has(iv.id));

  return (
    <div className="mx-auto max-w-5xl">
      {/* ── Interview Alert Banners ─────────────────────────────── */}
      {visibleBanners.length > 0 && (
        <div className="mb-6 space-y-3">
          {visibleBanners.map((iv) => (
            <InterviewBanner
              key={iv.id}
              interview={iv}
              onDismiss={() => setDismissedBanners((prev) => new Set(prev).add(iv.id))}
            />
          ))}
        </div>
      )}

      {/* ── Hero header with gradient mesh ─────────────────────── */}
      <div className="relative -mx-6 -mt-6 mb-8 overflow-hidden rounded-2xl px-8 py-10 sm:px-10 sm:py-12">
        {/* Gradient mesh background */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary via-primary-light to-primary" />
        <div className="absolute -left-20 -top-20 h-80 w-80 rounded-full bg-secondary/20 blur-3xl" />
        <div className="absolute -bottom-10 right-0 h-60 w-60 rounded-full bg-highlight/15 blur-3xl" />
        <div className="absolute right-1/4 top-0 h-40 w-40 rounded-full bg-secondary-light/10 blur-2xl" />
        {/* Subtle mountain silhouette */}
        <svg className="absolute bottom-0 left-0 right-0 h-16 w-full text-background/5" preserveAspectRatio="none" viewBox="0 0 1200 120">
          <path d="M0,120 L150,80 L300,100 L450,40 L600,90 L750,20 L900,70 L1050,50 L1200,80 L1200,120 Z" fill="currentColor" />
        </svg>

        <div className="relative z-10 flex items-center gap-5">
          {/* Avatar / Flag / Initial */}
          <div className="hidden sm:block flex-shrink-0">
            {avatarUrl && avatarUrl.startsWith("flag:") ? (
              <div className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-white/30 bg-white/10">
                <span className="text-3xl">{avatarUrl.replace("flag:", "")}</span>
              </div>
            ) : avatarUrl ? (
              <img src={avatarUrl} alt="Profile" className="h-16 w-16 rounded-full object-cover border-2 border-white/30" />
            ) : getCountryFlag(nationality) ? (
              <div className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-white/30 bg-white/10">
                <span className="text-3xl">{getCountryFlag(nationality)}</span>
              </div>
            ) : (
              <div className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-white/30 bg-white/10 text-2xl font-bold text-white">
                {userName && userName !== "there" ? userName[0].toUpperCase() : "U"}
              </div>
            )}
          </div>
          <div>
            <p className="text-sm font-medium text-secondary-light/80">
              {greeting()}
            </p>
            <h1 className="mt-1 text-3xl font-bold text-white sm:text-4xl">
              {userName !== "there" ? `Hey ${userName}` : "Welcome back"} <span className="inline-block animate-[wave_2s_ease-in-out_infinite] origin-bottom-right">&#9995;</span>
            </h1>
            <p className="mt-2 max-w-lg text-sm text-white/60">
              Your adventure starts here. Track your applications, nail your interviews, and land your dream seasonal role.
            </p>
          </div>
        </div>
      </div>

      {/* ── Onboarding Checklist ──────────────────────────────── */}
      {!checklistDismissed && (
        <OnboardingChecklist
          profileCompletion={profileCompletion}
          appCount={appCount}
          savedCount={savedCount}
          interviewCount={interviewCount}
          onDismiss={() => {
            setChecklistDismissed(true);
            localStorage.setItem("mc-onboarding-dismissed", "true");
          }}
        />
      )}

      {/* ── Stats row — glassmorphism cards with icons ──────── */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          href="/applications"
          label="Applications"
          value={String(appCount)}
          sub="Submitted"
          icon={
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
            </svg>
          }
          iconBg="bg-secondary/15 text-secondary"
        />
        <StatCard
          href="/interviews"
          label="Interviews"
          value={String(interviewCount)}
          sub="Upcoming"
          icon={
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
            </svg>
          }
          iconBg="bg-highlight/15 text-highlight"
        />
        <StatCard
          href="/saved-jobs"
          label="Saved Jobs"
          value={String(savedCount)}
          sub="Bookmarked"
          icon={
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0z" />
            </svg>
          }
          iconBg="bg-warm/15 text-warm"
        />
        <ProfileCard completion={profileCompletion} />
      </div>

      {/* ── Quick Actions (context-aware) ──────────────────────── */}
      <div className="mt-10">
        <h2 className="text-lg font-semibold text-primary">Quick Actions</h2>
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <QuickActions
            profileCompletion={profileCompletion}
            hasOffer={hasOffer}
            hasInvitedInterview={hasInvitedInterview}
            interviewCount={interviewCount}
            savedCount={savedCount}
            appCount={appCount}
          />
        </div>
      </div>

      {/* ── Recent Activity ───────────────────────────────────── */}
      <div className="mt-10 mb-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-primary">Recent Activity</h2>
          {activities.length > 5 && (
            <Link href="/applications" className="text-xs font-medium text-secondary hover:text-secondary/80 transition-colors">
              View all &rarr;
            </Link>
          )}
        </div>

        {activities.length === 0 ? (
          <div className="mt-4 rounded-2xl border border-accent/60 bg-white/70 p-8 text-center backdrop-blur-sm">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-secondary/10">
              <svg className="h-6 w-6 text-secondary/60" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p className="text-sm font-medium text-foreground/70">No activity yet</p>
            <p className="mt-1 text-xs text-foreground/40">
              Start by browsing jobs or completing your profile — your journey begins here.
            </p>
          </div>
        ) : (
          <div className="mt-4 divide-y divide-accent/40 rounded-2xl border border-accent/60 bg-white/70 backdrop-blur-sm overflow-hidden">
            {activities.slice(0, 5).map((item) => (
              <ActivityRow key={item.id} item={item} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Stat Card ─────────────────────────────────────────────── */
function StatCard({
  href,
  label,
  value,
  sub,
  icon,
  iconBg,
}: {
  href: string;
  label: string;
  value: string;
  sub: string;
  icon: React.ReactNode;
  iconBg: string;
}) {
  return (
    <Link
      href={href}
      className="group relative overflow-hidden rounded-2xl border border-accent/50 bg-white/70 p-5 backdrop-blur-sm transition-all duration-300 hover:-translate-y-1 hover:border-secondary/40 hover:shadow-lg hover:shadow-secondary/5"
    >
      <div className={`mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl ${iconBg} transition-transform duration-300 group-hover:scale-110`}>
        {icon}
      </div>
      <p className="text-xs font-medium uppercase tracking-wider text-foreground/45">
        {label}
      </p>
      <p className="mt-1 text-3xl font-bold text-primary">
        {value}
      </p>
      <p className="mt-0.5 text-xs text-foreground/40">{sub}</p>
      {/* Hover shimmer */}
      <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
    </Link>
  );
}

/* ── Profile Completion Card ───────────────────────────────── */
function ProfileCard({ completion }: { completion: number }) {
  const color = completion >= 80 ? "text-green-500" : completion >= 50 ? "text-secondary" : "text-warm";
  const ringColor = completion >= 80 ? "stroke-green-500" : completion >= 50 ? "stroke-secondary" : "stroke-warm";
  const bgColor = completion >= 80 ? "bg-green-500/15" : completion >= 50 ? "bg-secondary/15" : "bg-warm/15";

  return (
    <Link
      href="/profile"
      className="group relative overflow-hidden rounded-2xl border border-accent/50 bg-white/70 p-5 backdrop-blur-sm transition-all duration-300 hover:-translate-y-1 hover:border-secondary/40 hover:shadow-lg hover:shadow-secondary/5"
    >
      <div className={`mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl ${bgColor} transition-transform duration-300 group-hover:scale-110`}>
        {/* Mini circular progress */}
        <svg className="h-5 w-5 -rotate-90" viewBox="0 0 36 36">
          <circle cx="18" cy="18" r="14" fill="none" stroke="currentColor" strokeWidth="3" className="text-accent/30" />
          <circle
            cx="18" cy="18" r="14" fill="none"
            strokeWidth="3"
            strokeLinecap="round"
            strokeDasharray={`${completion * 0.88} 88`}
            className={ringColor}
          />
        </svg>
      </div>
      <p className="text-xs font-medium uppercase tracking-wider text-foreground/45">
        Profile
      </p>
      <p className={`mt-1 text-3xl font-bold ${color}`}>
        {completion}%
      </p>
      <p className="mt-0.5 text-xs text-foreground/40">Completion</p>
      <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
    </Link>
  );
}

/* ── Activity Row ─────────────────────────────────────────── */
const ACTIVITY_CONFIG: Record<ActivityItem["type"], { icon: React.ReactNode; iconBg: string }> = {
  applied: {
    icon: (
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
      </svg>
    ),
    iconBg: "bg-secondary/15 text-secondary",
  },
  viewed: {
    icon: (
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
    iconBg: "bg-blue-100 text-blue-600",
  },
  interview_invited: {
    icon: (
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
      </svg>
    ),
    iconBg: "bg-highlight/15 text-highlight",
  },
  interview_scheduled: {
    icon: (
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
      </svg>
    ),
    iconBg: "bg-purple-100 text-purple-600",
  },
  interview_completed: {
    icon: (
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    iconBg: "bg-green-100 text-green-600",
  },
  offered: {
    icon: (
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z" />
      </svg>
    ),
    iconBg: "bg-amber-100 text-amber-600",
  },
  accepted: {
    icon: (
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
      </svg>
    ),
    iconBg: "bg-green-100 text-green-600",
  },
  rejected: {
    icon: (
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
      </svg>
    ),
    iconBg: "bg-red-100 text-red-500",
  },
};

function formatTimeAgo(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString("en-AU", { month: "short", day: "numeric" });
}

function ActivityRow({ item }: { item: ActivityItem }) {
  const config = ACTIVITY_CONFIG[item.type];
  return (
    <Link
      href={item.href}
      className="flex items-center gap-4 px-5 py-4 transition-colors hover:bg-accent/20"
    >
      <div className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full ${config.iconBg}`}>
        {config.icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-primary">{item.title}</p>
        <p className="truncate text-xs text-foreground/50">{item.subtitle}</p>
      </div>
      <span className="flex-shrink-0 text-xs text-foreground/40">{formatTimeAgo(item.date)}</span>
    </Link>
  );
}

/* ── Onboarding Checklist ─────────────────────────────────── */
interface ChecklistStep {
  id: string;
  label: string;
  href: string;
  done: boolean;
}

function OnboardingChecklist({
  profileCompletion,
  appCount,
  savedCount,
  interviewCount,
  onDismiss,
}: {
  profileCompletion: number;
  appCount: number;
  savedCount: number;
  interviewCount: number;
  onDismiss: () => void;
}) {
  const steps: ChecklistStep[] = [
    { id: "account", label: "Create your account", href: "/profile", done: true }, // always done if they're on the dashboard
    { id: "profile", label: "Complete your profile", href: "/profile/edit", done: profileCompletion >= 80 },
    { id: "browse", label: "Browse available jobs", href: "/jobs", done: appCount > 0 || savedCount > 0 },
    { id: "save", label: "Save your first job", href: "/jobs", done: savedCount > 0 },
    { id: "apply", label: "Submit your first application", href: "/jobs", done: appCount > 0 },
    { id: "interview", label: "Land your first interview", href: "/interviews", done: interviewCount > 0 },
  ];

  const completed = steps.filter((s) => s.done).length;
  const total = steps.length;
  const pct = Math.round((completed / total) * 100);
  const allDone = completed === total;

  return (
    <div className="mb-8 rounded-2xl border border-accent/60 bg-white/70 backdrop-blur-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-5 pb-3">
        <div className="flex items-center gap-3">
          <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${allDone ? "bg-green-100 text-green-600" : "bg-secondary/15 text-secondary"}`}>
            {allDone ? (
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            ) : (
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.59 14.37a6 6 0 01-5.84 7.38v-4.8m5.84-2.58a14.98 14.98 0 006.16-12.12A14.98 14.98 0 009.631 8.41m5.96 5.96a14.926 14.926 0 01-5.841 2.58m-.119-8.54a6 6 0 00-7.381 5.84h4.8m2.581-5.84a14.927 14.927 0 00-2.58 5.841m2.699 2.7c-.103.021-.207.041-.311.06a15.09 15.09 0 01-2.448-2.448 14.9 14.9 0 01.06-.312m-2.24 2.39a4.493 4.493 0 00-1.757 4.306 4.493 4.493 0 004.306-1.758M16.5 9a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z" />
              </svg>
            )}
          </div>
          <div>
            <h2 className="text-sm font-semibold text-primary">
              {allDone ? "All set! You're ready to go" : "Getting Started"}
            </h2>
            <p className="text-xs text-foreground/40">
              {allDone ? "You've completed all onboarding steps" : `${completed} of ${total} steps completed`}
            </p>
          </div>
        </div>
        {allDone && (
          <button
            onClick={onDismiss}
            className="rounded-lg bg-green-50 px-3 py-1.5 text-xs font-medium text-green-600 transition-colors hover:bg-green-100"
          >
            Dismiss
          </button>
        )}
        {!allDone && (
          <button
            onClick={onDismiss}
            className="rounded-lg p-1.5 text-foreground/30 transition-colors hover:bg-accent/20 hover:text-foreground/50"
            title="Dismiss checklist"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* Progress bar */}
      <div className="mx-5 mb-4">
        <div className="h-2 overflow-hidden rounded-full bg-accent/30">
          <div
            className={`h-full rounded-full transition-all duration-700 ${allDone ? "bg-green-500" : "bg-secondary"}`}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      {/* Steps */}
      {!allDone && (
        <div className="border-t border-accent/30 divide-y divide-accent/20">
          {steps.map((step) => (
            <Link
              key={step.id}
              href={step.done ? "#" : step.href}
              className={`flex items-center gap-3 px-5 py-3 transition-colors ${
                step.done ? "cursor-default" : "hover:bg-accent/10"
              }`}
              onClick={step.done ? (e: React.MouseEvent) => e.preventDefault() : undefined}
            >
              {/* Checkbox */}
              <div
                className={`flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full border-2 transition-all ${
                  step.done
                    ? "border-green-500 bg-green-500"
                    : "border-accent/50"
                }`}
              >
                {step.done && (
                  <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                  </svg>
                )}
              </div>

              {/* Label */}
              <span
                className={`flex-1 text-sm ${
                  step.done
                    ? "text-foreground/40 line-through"
                    : "font-medium text-primary"
                }`}
              >
                {step.label}
              </span>

              {/* Arrow for incomplete steps */}
              {!step.done && (
                <svg className="h-4 w-4 text-foreground/30" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                </svg>
              )}
            </Link>
          ))}
        </div>
      )}

      {/* Congratulatory message when all done */}
      {allDone && (
        <div className="border-t border-accent/30 px-5 py-4 text-center">
          <p className="text-sm text-foreground/60">
            You&apos;re all set up! Keep exploring jobs and applying — your mountain adventure awaits.
          </p>
        </div>
      )}
    </div>
  );
}

/* ── Interview Alert Banner ───────────────────────────────── */
function InterviewBanner({
  interview,
  onDismiss,
}: {
  interview: UpcomingInterview;
  onDismiss: () => void;
}) {
  const isToday = interview.urgency === "today";
  const isPast = interview.isPast;

  // Format time display
  let timeDisplay = "";
  if (interview.scheduledTime) {
    const [h, m] = interview.scheduledTime.split(":").map(Number);
    const d = new Date();
    d.setHours(h, m, 0);
    timeDisplay = d.toLocaleTimeString("en-AU", { hour: "numeric", minute: "2-digit", hour12: true });
  }

  // For tomorrow, also show the day
  let dateLabel = "";
  if (!isToday) {
    const d = new Date(interview.scheduledDate);
    dateLabel = d.toLocaleDateString("en-AU", { weekday: "long", month: "short", day: "numeric" });
  }

  return (
    <div
      className={`relative overflow-hidden rounded-2xl border px-5 py-4 ${
        isPast
          ? "border-accent/50 bg-gradient-to-r from-gray-50 via-white to-white"
          : isToday
          ? "border-secondary/40 bg-gradient-to-r from-secondary/10 via-secondary/5 to-highlight/5"
          : "border-accent/60 bg-gradient-to-r from-primary/5 via-white to-white"
      }`}
    >
      {/* Accent bar for upcoming today interviews only */}
      {isToday && !isPast && (
        <div className="absolute left-0 top-0 bottom-0 w-1 bg-secondary" />
      )}

      <div className="flex items-center gap-4">
        {/* Icon */}
        <div
          className={`flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl ${
            isPast
              ? "bg-green-100 text-green-600"
              : isToday
              ? "bg-secondary/15 text-secondary"
              : "bg-primary/10 text-primary/70"
          }`}
        >
          {isPast ? (
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          ) : isToday ? (
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25h-9A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25z" />
            </svg>
          ) : (
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
            </svg>
          )}
        </div>

        {/* Content */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            {isPast && (
              <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-green-700">
                <svg className="h-2.5 w-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                </svg>
                Done
              </span>
            )}
            {isToday && !isPast && (
              <span className="inline-flex items-center gap-1 rounded-full bg-secondary/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-secondary">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-secondary opacity-75" />
                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-secondary" />
                </span>
                Today
              </span>
            )}
            {!isToday && (
              <span className="inline-flex rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary/70">
                Tomorrow
              </span>
            )}
          </div>
          <p className={`mt-1 text-sm font-semibold ${isPast ? "text-foreground/70" : isToday ? "text-primary" : "text-primary/80"}`}>
            {isPast
              ? `You had an interview today${timeDisplay ? ` at ${timeDisplay}` : ""}`
              : isToday
              ? `You have an interview${timeDisplay ? ` at ${timeDisplay}` : ""}`
              : `Upcoming interview${timeDisplay ? ` at ${timeDisplay}` : ""}${dateLabel ? ` — ${dateLabel}` : ""}`}
          </p>
          <p className="truncate text-xs text-foreground/50">
            {interview.jobTitle} — {interview.businessName}
          </p>
        </div>

        {/* Actions */}
        <div className="flex flex-shrink-0 items-center gap-2">
          {isToday && !isPast && interview.videoUrl ? (
            <Link
              href={interview.videoUrl}
              className="flex items-center gap-1.5 rounded-lg bg-secondary px-4 py-2 text-sm font-semibold text-white shadow-sm transition-all hover:bg-secondary-light hover:shadow-md hover:shadow-secondary/20"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25h-9A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25z" />
              </svg>
              Join Call
            </Link>
          ) : (
            <Link
              href="/interviews"
              className={`rounded-lg px-4 py-2 text-sm font-semibold transition-all ${
                isPast
                  ? "bg-accent/30 text-foreground/60 hover:bg-accent/50"
                  : isToday
                  ? "bg-secondary/10 text-secondary hover:bg-secondary/20"
                  : "bg-primary/5 text-primary/70 hover:bg-primary/10"
              }`}
            >
              View Details
            </Link>
          )}
          <button
            onClick={onDismiss}
            className="rounded-lg p-1.5 text-foreground/30 transition-colors hover:bg-accent/30 hover:text-foreground/60"
            title="Dismiss"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Context-Aware Quick Actions ──────────────────────────── */
interface QuickAction {
  href: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  gradient: string;
  priority: number; // lower = higher priority
}

function QuickActions({
  profileCompletion,
  hasOffer,
  hasInvitedInterview,
  interviewCount,
  savedCount,
  appCount,
}: {
  profileCompletion: number;
  hasOffer: boolean;
  hasInvitedInterview: boolean;
  interviewCount: number;
  savedCount: number;
  appCount: number;
}) {
  const actions: QuickAction[] = [];

  // Priority 1: Pending offer — most time-sensitive
  if (hasOffer) {
    actions.push({
      href: "/applications",
      title: "Review Your Offer",
      description: "You have a pending offer — review and respond before it expires.",
      icon: (
        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z" />
        </svg>
      ),
      gradient: "from-amber-100/80 to-yellow-50",
      priority: 1,
    });
  }

  // Priority 2: Interview invitation to book
  if (hasInvitedInterview) {
    actions.push({
      href: "/interviews",
      title: "Book Your Interview",
      description: "You have an interview invitation waiting — pick a time slot.",
      icon: (
        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
        </svg>
      ),
      gradient: "from-purple-100/80 to-purple-50",
      priority: 2,
    });
  }

  // Priority 3: Upcoming interviews to prepare for
  if (interviewCount > 0 && !hasInvitedInterview) {
    actions.push({
      href: "/interviews",
      title: "Prepare for Interview",
      description: `You have ${interviewCount} upcoming interview${interviewCount > 1 ? "s" : ""} — review details and get ready.`,
      icon: (
        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
        </svg>
      ),
      gradient: "from-highlight/10 to-secondary/5",
      priority: 3,
    });
  }

  // Priority 4: Incomplete profile
  if (profileCompletion < 100) {
    actions.push({
      href: "/profile/edit",
      title: `Complete Your Profile (${profileCompletion}%)`,
      description: "Add work history, skills & preferences to stand out to employers.",
      icon: (
        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
        </svg>
      ),
      gradient: "from-secondary/10 to-highlight/5",
      priority: 4,
    });
  }

  // Priority 5: No applications yet
  if (appCount === 0) {
    actions.push({
      href: "/jobs",
      title: "Apply for Your First Job",
      description: "Browse open positions and submit your first application.",
      icon: (
        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
        </svg>
      ),
      gradient: "from-highlight/10 to-secondary/5",
      priority: 5,
    });
  }

  // Priority 6: No saved jobs
  if (savedCount === 0 && appCount > 0) {
    actions.push({
      href: "/jobs",
      title: "Save More Jobs",
      description: "Bookmark positions you're interested in to apply later.",
      icon: (
        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0z" />
        </svg>
      ),
      gradient: "from-warm/10 to-highlight/5",
      priority: 6,
    });
  }

  // Default actions (always available as fallbacks)
  actions.push({
    href: "/jobs",
    title: "Browse Jobs",
    description: "Explore seasonal positions at resorts worldwide.",
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 14.15v4.25c0 1.094-.787 2.036-1.872 2.18-2.087.277-4.216.42-6.378.42s-4.291-.143-6.378-.42c-1.085-.144-1.872-1.086-1.872-2.18v-4.25m16.5 0a2.18 2.18 0 00.75-1.661V8.706c0-1.081-.768-2.015-1.837-2.175a48.114 48.114 0 00-3.413-.387m4.5 8.006c-.194.165-.42.295-.673.38A23.978 23.978 0 0112 15.75c-2.648 0-5.195-.429-7.577-1.22a2.016 2.016 0 01-.673-.38m0 0A2.18 2.18 0 013 12.489V8.706c0-1.081.768-2.015 1.837-2.175a48.111 48.111 0 013.413-.387m7.5 0V5.25A2.25 2.25 0 0013.5 3h-3a2.25 2.25 0 00-2.25 2.25v.894m7.5 0a48.667 48.667 0 00-7.5 0M12 12.75h.008v.008H12v-.008z" />
      </svg>
    ),
    gradient: "from-highlight/10 to-secondary/5",
    priority: 10,
  });

  actions.push({
    href: "/explore",
    title: "Explore Resorts",
    description: "Discover mountains and plan your next season.",
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 6.75V15m6-6v8.25m.503 3.498l4.875-2.437c.381-.19.622-.58.622-1.006V4.82c0-.836-.88-1.38-1.628-1.006l-3.869 1.934c-.317.159-.69.159-1.006 0L9.503 3.252a1.125 1.125 0 00-1.006 0L3.622 5.689C3.24 5.88 3 6.27 3 6.695V19.18c0 .836.88 1.38 1.628 1.006l3.869-1.934c.317-.159.69-.159 1.006 0l4.994 2.497c.317.158.69.158 1.006 0z" />
      </svg>
    ),
    gradient: "from-warm/10 to-highlight/5",
    priority: 11,
  });

  if (profileCompletion >= 100) {
    actions.push({
      href: "/profile",
      title: "View Your Profile",
      description: "Your profile is complete — review how employers see you.",
      icon: (
        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      gradient: "from-green-100/80 to-green-50",
      priority: 12,
    });
  }

  // Sort by priority, deduplicate by href, take top 3
  const seen = new Set<string>();
  const top3 = actions
    .sort((a, b) => a.priority - b.priority)
    .filter((a) => {
      if (seen.has(a.href)) return false;
      seen.add(a.href);
      return true;
    })
    .slice(0, 3);

  return (
    <>
      {top3.map((action) => (
        <ActionCard
          key={action.href + action.title}
          href={action.href}
          title={action.title}
          description={action.description}
          icon={action.icon}
          gradient={action.gradient}
        />
      ))}
    </>
  );
}

/* ── Action Card ───────────────────────────────────────────── */
function ActionCard({
  href,
  title,
  description,
  icon,
  gradient,
}: {
  href: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  gradient: string;
}) {
  return (
    <Link
      href={href}
      className={`group relative overflow-hidden rounded-2xl border border-accent/50 bg-gradient-to-br ${gradient} p-6 backdrop-blur-sm transition-all duration-300 hover:-translate-y-1 hover:border-secondary/40 hover:shadow-lg hover:shadow-secondary/5`}
    >
      <div className="mb-3 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-white/80 text-primary shadow-sm transition-all duration-300 group-hover:bg-white group-hover:shadow-md group-hover:text-secondary">
        {icon}
      </div>
      <h3 className="font-semibold text-primary transition-colors group-hover:text-secondary">
        {title}
      </h3>
      <p className="mt-1.5 text-sm leading-relaxed text-foreground/55">{description}</p>
      <div className="mt-3 flex items-center gap-1 text-xs font-medium text-secondary opacity-0 transition-all duration-300 group-hover:opacity-100">
        Get started
        <svg className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
        </svg>
      </div>
    </Link>
  );
}



