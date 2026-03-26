"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function WorkerDashboard() {
  const [userName, setUserName] = useState("");
  const [profileCompletion, setProfileCompletion] = useState(0);
  const [loading, setLoading] = useState(true);
  const [appCount, setAppCount] = useState(0);
  const [interviewCount, setInterviewCount] = useState(0);
  const [savedCount, setSavedCount] = useState(0);

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
          .select("id, profile_completion_pct")
          .eq("user_id", user.id)
          .single();
        if (profile?.profile_completion_pct != null) {
          setProfileCompletion(profile.profile_completion_pct);
        }

        if (profile?.id) {
          const [apps, interviews, saved] = await Promise.all([
            supabase.from("applications").select("id", { count: "exact", head: true }).eq("worker_id", profile.id),
            supabase.from("interviews").select("id", { count: "exact", head: true }).eq("worker_id", profile.id).in("status", ["invited", "scheduled"]),
            supabase.from("saved_jobs").select("id", { count: "exact", head: true }).eq("user_id", user.id),
          ]);
          setAppCount(apps.count ?? 0);
          setInterviewCount(interviews.count ?? 0);
          setSavedCount(saved.count ?? 0);
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

  return (
    <div className="mx-auto max-w-5xl">
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

        <div className="relative z-10">
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

      {/* ── Quick Actions ─────────────────────────────────────── */}
      <div className="mt-10">
        <h2 className="text-lg font-semibold text-primary">Quick Actions</h2>
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <ActionCard
            href="/profile"
            title="Complete Your Profile"
            description="Add work history, skills & preferences to stand out."
            icon={
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
              </svg>
            }
            gradient="from-secondary/10 to-highlight/5"
          />
          <ActionCard
            href="/jobs"
            title="Browse Jobs"
            description="Explore seasonal positions at resorts worldwide."
            icon={
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 14.15v4.25c0 1.094-.787 2.036-1.872 2.18-2.087.277-4.216.42-6.378.42s-4.291-.143-6.378-.42c-1.085-.144-1.872-1.086-1.872-2.18v-4.25m16.5 0a2.18 2.18 0 00.75-1.661V8.706c0-1.081-.768-2.015-1.837-2.175a48.114 48.114 0 00-3.413-.387m4.5 8.006c-.194.165-.42.295-.673.38A23.978 23.978 0 0112 15.75c-2.648 0-5.195-.429-7.577-1.22a2.016 2.016 0 01-.673-.38m0 0A2.18 2.18 0 013 12.489V8.706c0-1.081.768-2.015 1.837-2.175a48.111 48.111 0 013.413-.387m7.5 0V5.25A2.25 2.25 0 0013.5 3h-3a2.25 2.25 0 00-2.25 2.25v.894m7.5 0a48.667 48.667 0 00-7.5 0M12 12.75h.008v.008H12v-.008z" />
              </svg>
            }
            gradient="from-highlight/10 to-secondary/5"
          />
          <ActionCard
            href="/explore"
            title="Explore Resorts"
            description="Discover mountains and plan your next season."
            icon={
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 6.75V15m6-6v8.25m.503 3.498l4.875-2.437c.381-.19.622-.58.622-1.006V4.82c0-.836-.88-1.38-1.628-1.006l-3.869 1.934c-.317.159-.69.159-1.006 0L9.503 3.252a1.125 1.125 0 00-1.006 0L3.622 5.689C3.24 5.88 3 6.27 3 6.695V19.18c0 .836.88 1.38 1.628 1.006l3.869-1.934c.317-.159.69-.159 1.006 0l4.994 2.497c.317.158.69.158 1.006 0z" />
              </svg>
            }
            gradient="from-warm/10 to-highlight/5"
          />
        </div>
      </div>

      {/* ── Recent Activity ───────────────────────────────────── */}
      <div className="mt-10 mb-4">
        <h2 className="text-lg font-semibold text-primary">Recent Activity</h2>
        <div className="mt-4 rounded-2xl border border-accent/60 bg-white/70 p-8 text-center backdrop-blur-sm">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-secondary/10">
            <svg className="h-6 w-6 text-secondary/60" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p className="text-sm font-medium text-foreground/70">
            No activity yet
          </p>
          <p className="mt-1 text-xs text-foreground/40">
            Start by browsing jobs or completing your profile — your journey begins here.
          </p>
        </div>
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

