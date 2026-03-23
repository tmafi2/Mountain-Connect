"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function BusinessDashboard() {
  const [userName, setUserName] = useState("");
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
    supabase.auth.getUser().then(({ data }) => {
      setUserName(data.user?.user_metadata?.full_name || "there");
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
        Manage your job listings and review applicants.
      </p>

      {/* Stats row */}
      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard href="/business/manage-listings" label="Active Listings" value="3" sub="Currently posted" />
        <StatCard href="/business/applicants" label="Total Applicants" value="8" sub="Across all jobs" />
        <StatCard href="/business/interviews" label="Interviews" value="3" sub="Upcoming scheduled" />
        <StatCard href="/business/company-profile" label="Company Profile" value="40%" sub="Completion" accent />
      </div>

      {/* Quick actions */}
      <h2 className="mt-10 text-lg font-semibold text-primary">Quick Actions</h2>
      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <ActionCard
          href="/business/post-job"
          title="Post a New Job"
          description="Create a job listing and start receiving applications from seasonal workers."
        />
        <ActionCard
          href="/business/manage-listings"
          title="Manage Listings"
          description="Edit, pause, or close your existing job listings."
        />
        <ActionCard
          href="/business/company-profile"
          title="Company Profile"
          description="Update your business details to attract the right candidates."
        />
      </div>

      {/* Recent activity */}
      <h2 className="mt-10 text-lg font-semibold text-primary">
        Recent Activity
      </h2>
      <div className="mt-4 rounded-xl border border-accent bg-white p-8 text-center">
        <p className="text-sm text-foreground/50">
          No recent activity yet. Post your first job to start receiving
          applications.
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
