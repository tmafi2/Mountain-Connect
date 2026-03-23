"use client";

import Link from "next/link";
import { seedBusinesses } from "@/lib/data/businesses";
import { seedJobs } from "@/lib/data/jobs";
import { seedApplicants } from "@/lib/data/applications";

/* ─── Stats from seed data ──────────────────────────────── */

const pendingCount = seedBusinesses.filter((b) => b.verification_status === "pending_review").length;
const verifiedCount = seedBusinesses.filter((b) => b.verification_status === "verified").length;
const totalBusinesses = seedBusinesses.length;
const totalJobs = seedJobs.length;
const activeJobs = seedJobs.filter((j) => j.is_active).length;
const totalApplications = seedApplicants.length;

const STATS = [
  { label: "Total Businesses", value: totalBusinesses, href: "/admin/businesses", color: "bg-blue-50 text-blue-700" },
  { label: "Pending Verification", value: pendingCount, href: "/admin/verification", color: "bg-yellow-50 text-yellow-700" },
  { label: "Verified Businesses", value: verifiedCount, href: "/admin/verification", color: "bg-green-50 text-green-700" },
  { label: "Active Jobs", value: activeJobs, href: "/admin/jobs", color: "bg-purple-50 text-purple-700" },
  { label: "Total Applications", value: totalApplications, href: "/admin/businesses", color: "bg-indigo-50 text-indigo-700" },
  { label: "Reported Items", value: 2, href: "/admin/reported", color: "bg-red-50 text-red-700" },
];

/* ─── Recent activity ──────────────────────────────────── */

const RECENT_ACTIVITY = [
  { id: "1", action: "Business submitted for verification", target: "Mountain Burger Co.", time: "2 hours ago", type: "verification" },
  { id: "2", action: "New business registered", target: "Alpine Adventures Ltd.", time: "5 hours ago", type: "business" },
  { id: "3", action: "Job posting reported", target: "Suspicious Job Listing #42", time: "1 day ago", type: "report" },
  { id: "4", action: "Worker flagged for review", target: "John D.", time: "1 day ago", type: "report" },
  { id: "5", action: "Business verified", target: "NZSki", time: "2 days ago", type: "verification" },
  { id: "6", action: "New job posted", target: "Ski Instructor — Advanced", time: "2 days ago", type: "job" },
];

const ACTIVITY_ICONS: Record<string, string> = {
  verification: "bg-yellow-50 text-yellow-600",
  business: "bg-blue-50 text-blue-600",
  report: "bg-red-50 text-red-600",
  job: "bg-purple-50 text-purple-600",
};

/* ─── Page ──────────────────────────────────────────────── */

export default function AdminDashboardPage() {
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
            Review Pending ({pendingCount})
          </Link>
          <Link
            href="/admin/reported"
            className="rounded-lg bg-red-50 px-4 py-2.5 text-sm font-semibold text-red-700 transition-colors hover:bg-red-100"
          >
            Review Reports (2)
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
          {RECENT_ACTIVITY.map((item) => (
            <div key={item.id} className="flex items-start gap-3 rounded-lg p-3 transition-colors hover:bg-accent/5">
              <div className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${ACTIVITY_ICONS[item.type]}`}>
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
                {item.type === "report" && (
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                )}
                {item.type === "job" && (
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2" />
                  </svg>
                )}
              </div>
              <div className="flex-1">
                <p className="text-sm text-foreground/80">{item.action}</p>
                <p className="text-sm font-medium text-primary">{item.target}</p>
              </div>
              <span className="text-xs text-foreground/40">{item.time}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
