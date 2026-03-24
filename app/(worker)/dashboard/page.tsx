"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function WorkerDashboard() {
  const [userName, setUserName] = useState("");
  const [profileCompletion, setProfileCompletion] = useState(0);
  const [loading, setLoading] = useState(true);

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
      setUserName(user?.user_metadata?.full_name || "there");

      if (user) {
        const { data: profile } = await supabase
          .from("worker_profiles")
          .select("profile_completion_pct")
          .eq("user_id", user.id)
          .single();
        if (profile?.profile_completion_pct != null) {
          setProfileCompletion(profile.profile_completion_pct);
        }
      }

      setLoading(false);
    });
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <p className="text-foreground/50">Loading...</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="text-2xl font-bold text-primary">
        Welcome back, {userName}
      </h1>
      <p className="mt-1 text-sm text-foreground/60">
        Here&apos;s an overview of your job search activity.
      </p>

      {/* Stats row */}
      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard href="/applications" label="Applications" value="5" sub="Total submitted" />
        <StatCard href="/interviews" label="Interviews" value="2" sub="Upcoming" />
        <StatCard href="/saved-jobs" label="Saved Jobs" value="0" sub="Bookmarked" />
        <StatCard href="/profile" label="Profile" value={`${profileCompletion}%`} sub="Completion" accent />
      </div>

      {/* Quick actions */}
      <h2 className="mt-10 text-lg font-semibold text-primary">Quick Actions</h2>
      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <ActionCard
          href="/profile"
          title="Complete Your Profile"
          description="Add your work history, skills, and preferences to stand out to employers."
        />
        <ActionCard
          href="/jobs"
          title="Browse Jobs"
          description="Explore seasonal positions at ski resorts around the world."
        />
        <ActionCard
          href="/explore"
          title="Explore Resorts"
          description="Discover ski resorts and learn about life at each mountain."
        />
      </div>

      {/* Recent activity placeholder */}
      <h2 className="mt-10 text-lg font-semibold text-primary">
        Recent Activity
      </h2>
      <div className="mt-4 rounded-xl border border-accent bg-white p-8 text-center">
        <p className="text-sm text-foreground/50">
          No recent activity yet. Start by browsing jobs or completing your
          profile.
        </p>
      </div>
    </div>
  );
}

function StatCard({
  href,
  label,
  value,
  sub,
  accent,
}: {
  href: string;
  label: string;
  value: string;
  sub: string;
  accent?: boolean;
}) {
  return (
    <Link
      href={href}
      className="rounded-xl border border-accent bg-white p-5 transition-all hover:border-secondary hover:shadow-md"
    >
      <p className="text-xs font-medium uppercase tracking-wider text-foreground/50">
        {label}
      </p>
      <p
        className={`mt-2 text-3xl font-bold ${accent ? "text-secondary" : "text-primary"}`}
      >
        {value}
      </p>
      <p className="mt-1 text-xs text-foreground/50">{sub}</p>
    </Link>
  );
}

function ActionCard({
  href,
  title,
  description,
}: {
  href: string;
  title: string;
  description: string;
}) {
  return (
    <Link
      href={href}
      className="group rounded-xl border border-accent bg-white p-5 transition-all hover:border-secondary hover:shadow-md"
    >
      <h3 className="font-semibold text-primary group-hover:text-secondary">
        {title}
      </h3>
      <p className="mt-2 text-sm text-foreground/60">{description}</p>
    </Link>
  );
}
