"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function AdminDashboardPage() {
  const [stats, setStats] = useState({
    totalBusinesses: 0,
    pendingVerification: 0,
    verifiedBusinesses: 0,
    totalWorkers: 0,
    activeJobs: 0,
    totalApplications: 0,
  });
  const [recentActivity, setRecentActivity] = useState<
    { id: string; action: string; target: string; time: string; type: string }[]
  >([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const supabase = createClient();

      const [businesses, pending, verified, workers, jobs, applications] = await Promise.all([
        supabase.from("business_profiles").select("id", { count: "exact", head: true }),
        supabase.from("business_profiles").select("id", { count: "exact", head: true }).eq("verification_status", "pending_review"),
        supabase.from("business_profiles").select("id", { count: "exact", head: true }).eq("verification_status", "verified"),
        supabase.from("worker_profiles").select("id", { count: "exact", head: true }),
        supabase.from("job_posts").select("id", { count: "exact", head: true }).eq("status", "active"),
        supabase.from("applications").select("id", { count: "exact", head: true }),
      ]);

      setStats({
        totalBusinesses: businesses.count ?? 0,
        pendingVerification: pending.count ?? 0,
        verifiedBusinesses: verified.count ?? 0,
        totalWorkers: workers.count ?? 0,
        activeJobs: jobs.count ?? 0,
        totalApplications: applications.count ?? 0,
      });

      // Recent business registrations as activity
      const { data: recentBusinesses } = await supabase
        .from("business_profiles")
        .select("id, business_name, verification_status, created_at")
        .order("created_at", { ascending: false })
        .limit(10);

      const activity: typeof recentActivity = [];
      if (recentBusinesses) {
        for (const biz of recentBusinesses) {
          if (biz.verification_status === "pending_review") {
            activity.push({
              id: biz.id + "-pending",
              action: "Business submitted for verification",
              target: biz.business_name,
              time: formatTimeAgo(biz.created_at),
              type: "verification",
            });
          } else if (biz.verification_status === "verified") {
            activity.push({
              id: biz.id + "-verified",
              action: "Business verified",
              target: biz.business_name,
              time: formatTimeAgo(biz.created_at),
              type: "verification",
            });
          } else {
            activity.push({
              id: biz.id + "-registered",
              action: "New business registered",
              target: biz.business_name,
              time: formatTimeAgo(biz.created_at),
              type: "business",
            });
          }
        }
      }

      setRecentActivity(activity.slice(0, 8));
      setLoading(false);
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-primary" />
      </div>
    );
  }

  const STATS = [
    { label: "Total Businesses", value: stats.totalBusinesses, href: "/admin/businesses", color: "bg-blue-50 text-blue-700" },
    { label: "Pending Verification", value: stats.pendingVerification, href: "/admin/verification", color: "bg-yellow-50 text-yellow-700" },
    { label: "Verified Businesses", value: stats.verifiedBusinesses, href: "/admin/verification", color: "bg-green-50 text-green-700" },
    { label: "Total Workers", value: stats.totalWorkers, href: "/admin/workers", color: "bg-indigo-50 text-indigo-700" },
    { label: "Active Jobs", value: stats.activeJobs, href: "/admin/jobs", color: "bg-purple-50 text-purple-700" },
    { label: "Total Applications", value: stats.totalApplications, href: "/admin/businesses", color: "bg-cyan-50 text-cyan-700" },
  ];

  const ACTIVITY_ICONS: Record<string, string> = {
    verification: "bg-yellow-50 text-yellow-600",
    business: "bg-blue-50 text-blue-600",
    report: "bg-red-50 text-red-600",
    job: "bg-purple-50 text-purple-600",
    worker: "bg-indigo-50 text-indigo-600",
  };

  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="text-2xl font-bold text-primary">Admin Dashboard</h1>
      <p className="mt-1 text-sm text-foreground/60">
        Platform overview and quick actions.
      </p>

      {/* Stats grid */}
      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3">
        {STATS.map((stat) => (
          <Link
            key={stat.label}
            href={stat.href}
            className="rounded-xl border border-accent bg-white p-5 transition-all hover:border-secondary/50 hover:shadow-sm"
          >
            <p className="text-sm text-foreground/60">{stat.label}</p>
            <p className="mt-1 text-3xl font-bold text-primary">{stat.value}</p>
            <span className={`mt-2 inline-block rounded-full px-2 py-0.5 text-xs font-medium ${stat.color}`}>
              View
            </span>
          </Link>
        ))}
      </div>

      {/* Quick actions */}
      <div className="mt-8 rounded-xl border border-accent bg-white p-6">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-foreground/50">Quick Actions</h2>
        <div className="mt-4 flex flex-wrap gap-3">
          <Link
            href="/admin/verification"
            className="rounded-lg bg-yellow-50 px-4 py-2.5 text-sm font-semibold text-yellow-700 transition-colors hover:bg-yellow-100"
          >
            Review Pending ({stats.pendingVerification})
          </Link>
          <Link
            href="/admin/businesses"
            className="rounded-lg bg-blue-50 px-4 py-2.5 text-sm font-semibold text-blue-700 transition-colors hover:bg-blue-100"
          >
            Browse Businesses
          </Link>
          <Link
            href="/admin/workers"
            className="rounded-lg bg-indigo-50 px-4 py-2.5 text-sm font-semibold text-indigo-700 transition-colors hover:bg-indigo-100"
          >
            Browse Workers
          </Link>
        </div>
      </div>

      {/* Recent activity */}
      <div className="mt-6 rounded-xl border border-accent bg-white p-6">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-foreground/50">Recent Activity</h2>
        <div className="mt-4 space-y-3">
          {recentActivity.length === 0 ? (
            <p className="text-sm text-foreground/40">No activity yet.</p>
          ) : (
            recentActivity.map((item) => (
              <div key={item.id} className="flex items-start gap-3 rounded-lg p-3 transition-colors hover:bg-accent/5">
                <div className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${ACTIVITY_ICONS[item.type] || "bg-gray-50 text-gray-600"}`}>
                  {item.type === "verification" && (
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                  )}
                  {item.type === "business" && (
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5" />
                    </svg>
                  )}
                </div>
                <div className="flex-1">
                  <p className="text-sm text-foreground/80">{item.action}</p>
                  <p className="text-sm font-medium text-primary">{item.target}</p>
                </div>
                <span className="text-xs text-foreground/40">{item.time}</span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function formatTimeAgo(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
