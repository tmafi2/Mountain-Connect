"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

const STORAGE_KEY = "admin_dashboard_last_stats";

interface Stats {
  totalBusinesses: number;
  pendingVerification: number;
  verifiedBusinesses: number;
  totalWorkers: number;
  activeJobs: number;
  totalApplications: number;
}

interface DeltaInfo {
  value: number;
  direction: "up" | "down" | "none";
}

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<Stats>({
    totalBusinesses: 0,
    pendingVerification: 0,
    verifiedBusinesses: 0,
    totalWorkers: 0,
    activeJobs: 0,
    totalApplications: 0,
  });
  const [deltas, setDeltas] = useState<Record<string, DeltaInfo>>({});
  const [lastSeenDate, setLastSeenDate] = useState<string | null>(null);
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

      const currentStats: Stats = {
        totalBusinesses: businesses.count ?? 0,
        pendingVerification: pending.count ?? 0,
        verifiedBusinesses: verified.count ?? 0,
        totalWorkers: workers.count ?? 0,
        activeJobs: jobs.count ?? 0,
        totalApplications: applications.count ?? 0,
      };

      setStats(currentStats);

      // Calculate deltas from last saved stats
      try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
          const parsed = JSON.parse(saved) as { stats: Stats; date: string };
          setLastSeenDate(parsed.date);

          const newDeltas: Record<string, DeltaInfo> = {};
          for (const key of Object.keys(currentStats) as (keyof Stats)[]) {
            const diff = currentStats[key] - (parsed.stats[key] ?? 0);
            newDeltas[key] = {
              value: Math.abs(diff),
              direction: diff > 0 ? "up" : diff < 0 ? "down" : "none",
            };
          }
          setDeltas(newDeltas);
        }
      } catch {
        // No saved stats or parse error — just show totals without deltas
      }

      // Save current stats for next visit
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          stats: currentStats,
          date: new Date().toISOString(),
        })
      );

      // Recent business registrations as activity
      const { data: recentBusinesses } = await supabase
        .from("business_profiles")
        .select("id, business_name, verification_status, created_at")
        .order("created_at", { ascending: false })
        .limit(10);

      // Recent worker registrations
      const { data: recentWorkers } = await supabase
        .from("worker_profiles")
        .select("id, first_name, last_name, created_at")
        .order("created_at", { ascending: false })
        .limit(5);

      // Recent applications
      const { data: recentApps } = await supabase
        .from("applications")
        .select("id, applied_at, job_posts(title), worker_profiles(first_name, last_name)")
        .order("applied_at", { ascending: false })
        .limit(5);

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

      if (recentWorkers) {
        for (const w of recentWorkers) {
          const name = [w.first_name, w.last_name].filter(Boolean).join(" ") || "Unknown";
          activity.push({
            id: w.id + "-worker",
            action: "New worker signed up",
            target: name,
            time: formatTimeAgo(w.created_at),
            type: "worker",
          });
        }
      }

      if (recentApps) {
        for (const app of recentApps) {
          const wp = app.worker_profiles as { first_name: string; last_name: string } | null;
          const jp = app.job_posts as { title: string } | null;
          const workerName = wp ? [wp.first_name, wp.last_name].filter(Boolean).join(" ") : "Unknown";
          activity.push({
            id: app.id + "-app",
            action: `${workerName} applied`,
            target: jp?.title || "Unknown Job",
            time: formatTimeAgo(app.applied_at),
            type: "job",
          });
        }
      }

      // Sort all activity by time and take top 10
      activity.sort((a, b) => {
        const aTime = parseTimeAgo(a.time);
        const bTime = parseTimeAgo(b.time);
        return aTime - bTime;
      });

      setRecentActivity(activity.slice(0, 10));
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

  const STAT_CARDS: { key: keyof Stats; label: string; href: string; icon: React.ReactNode; color: string; iconBg: string }[] = [
    {
      key: "totalBusinesses",
      label: "Total Businesses",
      href: "/admin/businesses",
      color: "text-blue-700",
      iconBg: "bg-blue-50 text-blue-600",
      icon: (
        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21" />
        </svg>
      ),
    },
    {
      key: "pendingVerification",
      label: "Pending Verification",
      href: "/admin/verification",
      color: "text-yellow-700",
      iconBg: "bg-yellow-50 text-yellow-600",
      icon: (
        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
    {
      key: "verifiedBusinesses",
      label: "Verified Businesses",
      href: "/admin/verification",
      color: "text-green-700",
      iconBg: "bg-green-50 text-green-600",
      icon: (
        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
    {
      key: "totalWorkers",
      label: "Total Workers",
      href: "/admin/workers",
      color: "text-indigo-700",
      iconBg: "bg-indigo-50 text-indigo-600",
      icon: (
        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
        </svg>
      ),
    },
    {
      key: "activeJobs",
      label: "Active Jobs",
      href: "/admin/jobs",
      color: "text-purple-700",
      iconBg: "bg-purple-50 text-purple-600",
      icon: (
        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 14.15v4.25c0 1.094-.787 2.036-1.872 2.18-2.087.277-4.216.42-6.378.42s-4.291-.143-6.378-.42c-1.085-.144-1.872-1.086-1.872-2.18v-4.25m16.5 0a2.18 2.18 0 00.75-1.661V8.706c0-1.081-.768-2.015-1.837-2.175a48.114 48.114 0 00-3.413-.387m4.5 8.006c-.194.165-.42.295-.673.38A23.978 23.978 0 0112 15.75c-2.648 0-5.195-.429-7.577-1.22a2.016 2.016 0 01-.673-.38m0 0A2.18 2.18 0 013 12.489V8.706c0-1.081.768-2.015 1.837-2.175a48.111 48.111 0 013.413-.387m7.5 0V5.25A2.25 2.25 0 0013.5 3h-3a2.25 2.25 0 00-2.25 2.25v.894m7.5 0a48.667 48.667 0 00-7.5 0M12 12.75h.008v.008H12v-.008z" />
        </svg>
      ),
    },
    {
      key: "totalApplications",
      label: "Total Applications",
      href: "/admin/jobs",
      color: "text-cyan-700",
      iconBg: "bg-cyan-50 text-cyan-600",
      icon: (
        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
        </svg>
      ),
    },
  ];

  const ACTIVITY_ICONS: Record<string, { bg: string; icon: React.ReactNode }> = {
    verification: {
      bg: "bg-yellow-50 text-yellow-600",
      icon: (
        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
        </svg>
      ),
    },
    business: {
      bg: "bg-blue-50 text-blue-600",
      icon: (
        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5" />
        </svg>
      ),
    },
    worker: {
      bg: "bg-indigo-50 text-indigo-600",
      icon: (
        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      ),
    },
    job: {
      bg: "bg-purple-50 text-purple-600",
      icon: (
        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      ),
    },
  };

  return (
    <div className="mx-auto max-w-5xl">
      {/* Header */}
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-bold text-primary">Admin Dashboard</h1>
          <p className="mt-1 text-sm text-foreground/60">
            Platform overview and quick actions.
          </p>
        </div>
        {lastSeenDate && (
          <p className="text-xs text-foreground/40">
            Changes since {new Date(lastSeenDate).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
          </p>
        )}
      </div>

      {/* Stats grid */}
      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3">
        {STAT_CARDS.map((stat) => {
          const delta = deltas[stat.key];
          return (
            <Link
              key={stat.key}
              href={stat.href}
              className="group rounded-xl border border-accent bg-white p-5 transition-all hover:border-secondary/50 hover:shadow-md hover:-translate-y-0.5"
            >
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-foreground/60">{stat.label}</p>
                <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${stat.iconBg} transition-colors group-hover:scale-110`}>
                  {stat.icon}
                </div>
              </div>
              <div className="mt-2 flex items-end gap-2">
                <p className="text-3xl font-bold text-primary">{stats[stat.key]}</p>
                {delta && (
                  <span
                    className={`mb-1 inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-xs font-semibold ${
                      delta.direction === "up"
                        ? "bg-green-50 text-green-600"
                        : delta.direction === "down"
                        ? "bg-red-50 text-red-600"
                        : "bg-gray-100 text-gray-500"
                    }`}
                  >
                    {delta.direction === "up" ? (
                      <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 19.5l15-15m0 0H8.25m11.25 0v11.25" />
                      </svg>
                    ) : delta.direction === "down" ? (
                      <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 4.5l15 15m0 0V8.25m0 11.25H8.25" />
                      </svg>
                    ) : (
                      <span className="text-xs">—</span>
                    )}
                    {delta.direction === "up" ? `+${delta.value}` : delta.direction === "down" ? `-${delta.value}` : "0"}
                  </span>
                )}
              </div>
              <p className="mt-1 text-xs text-foreground/40 group-hover:text-secondary transition-colors">
                View details &rarr;
              </p>
            </Link>
          );
        })}
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
        <div className="mt-4 space-y-1">
          {recentActivity.length === 0 ? (
            <p className="text-sm text-foreground/40">No activity yet.</p>
          ) : (
            recentActivity.map((item) => {
              const actIcon = ACTIVITY_ICONS[item.type] || { bg: "bg-gray-50 text-gray-600", icon: null };
              return (
                <div key={item.id} className="flex items-start gap-3 rounded-lg p-3 transition-colors hover:bg-accent/5">
                  <div className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${actIcon.bg}`}>
                    {actIcon.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-foreground/80">{item.action}</p>
                    <p className="text-sm font-medium text-primary truncate">{item.target}</p>
                  </div>
                  <span className="shrink-0 text-xs text-foreground/40">{item.time}</span>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

/* ─── Helpers ─── */

function formatTimeAgo(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function parseTimeAgo(timeStr: string): number {
  if (timeStr === "Just now") return 0;
  const match = timeStr.match(/(\d+)([mhd])/);
  if (!match) return 999999;
  const num = parseInt(match[1]);
  switch (match[2]) {
    case "m": return num;
    case "h": return num * 60;
    case "d": return num * 1440;
    default: return 999999;
  }
}
