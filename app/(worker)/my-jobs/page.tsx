"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

interface JobEntry {
  id: string;
  jobTitle: string;
  businessName: string;
  resortName: string;
  location: string;
  startDate: string | null;
  endDate: string | null;
  salaryRange: string | null;
  positionType: string | null;
  accommodationIncluded: boolean;
  status: "accepted" | "withdrawn" | "rejected" | "completed";
  appliedAt: string;
  updatedAt: string;
}

export default function MyJobsPage() {
  const [loading, setLoading] = useState(true);
  const [currentJob, setCurrentJob] = useState<JobEntry | null>(null);
  const [pastJobs, setPastJobs] = useState<JobEntry[]>([]);

  useEffect(() => {
    (async () => {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { setLoading(false); return; }

        const { data: wp } = await supabase
          .from("worker_profiles")
          .select("id")
          .eq("user_id", user.id)
          .single();

        if (!wp) { setLoading(false); return; }

        // Fetch all accepted applications (current jobs)
        const { data: acceptedApps } = await supabase
          .from("applications")
          .select("id, status, applied_at, updated_at, job_posts(title, salary_range, position_type, start_date, end_date, accommodation_included, business_profiles(business_name, location), resorts(name))")
          .eq("worker_id", wp.id)
          .eq("status", "accepted")
          .order("updated_at", { ascending: false });

        // Fetch past jobs (withdrawn by user - they had these at some point)
        const { data: pastApps } = await supabase
          .from("applications")
          .select("id, status, applied_at, updated_at, job_posts(title, salary_range, position_type, start_date, end_date, accommodation_included, business_profiles(business_name, location), resorts(name))")
          .eq("worker_id", wp.id)
          .in("status", ["withdrawn", "rejected"])
          .order("updated_at", { ascending: false });

        const mapApp = (a: Record<string, unknown>): JobEntry => {
          const jp = a.job_posts as Record<string, unknown> | null;
          const bp = jp?.business_profiles as { business_name: string; location: string | null } | null;
          const resort = jp?.resorts as { name: string } | null;
          return {
            id: a.id as string,
            jobTitle: (jp?.title as string) || "Unknown Position",
            businessName: bp?.business_name || "Unknown Business",
            resortName: resort?.name || "",
            location: bp?.location || "",
            startDate: (jp?.start_date as string) || null,
            endDate: (jp?.end_date as string) || null,
            salaryRange: (jp?.salary_range as string) || null,
            positionType: (jp?.position_type as string) || null,
            accommodationIncluded: !!(jp?.accommodation_included),
            status: a.status as JobEntry["status"],
            appliedAt: a.applied_at as string,
            updatedAt: (a.updated_at as string) || (a.applied_at as string),
          };
        };

        if (acceptedApps && acceptedApps.length > 0) {
          setCurrentJob(mapApp(acceptedApps[0] as unknown as Record<string, unknown>));
        }

        if (pastApps && pastApps.length > 0) {
          setPastJobs(pastApps.map((a) => mapApp(a as unknown as Record<string, unknown>)));
        }
      } catch {
        // silently fail
      }
      setLoading(false);
    })();
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-secondary" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl">
      {/* Gradient header */}
      <div className="relative -mx-6 -mt-6 mb-8 overflow-hidden rounded-b-3xl bg-gradient-to-br from-primary via-primary-light to-primary px-6 pb-8 pt-8 sm:-mx-8 sm:px-8">
        <div className="pointer-events-none absolute -left-10 -top-10 h-40 w-40 rounded-full bg-secondary/20 blur-3xl" />
        <div className="pointer-events-none absolute -right-6 bottom-0 h-36 w-36 rounded-full bg-highlight/15 blur-3xl" />
        <div className="relative">
          <h1 className="text-2xl font-bold text-white">My Jobs</h1>
          <p className="mt-1 text-sm text-white/60">
            Your current position and job history.
          </p>
        </div>
      </div>

      {/* ── Current Job ─────────────────────────────────────── */}
      <section className="mb-10">
        <h2 className="mb-4 text-lg font-semibold text-primary">Current Job</h2>
        {currentJob ? (
          <CurrentJobCard job={currentJob} />
        ) : (
          <div className="rounded-2xl border border-accent/50 bg-white/70 p-10 text-center backdrop-blur-sm">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-secondary/10">
              <svg className="h-7 w-7 text-secondary/60" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 14.15v4.25c0 1.094-.787 2.036-1.872 2.18-2.087.277-4.216.42-6.378.42s-4.291-.143-6.378-.42c-1.085-.144-1.872-1.086-1.872-2.18v-4.25m16.5 0a2.18 2.18 0 00.75-1.661V8.706c0-1.081-.768-2.015-1.837-2.175a48.114 48.114 0 00-3.413-.387m4.5 8.006c-.194.165-.42.295-.673.38A23.978 23.978 0 0112 15.75c-2.648 0-5.195-.429-7.577-1.22a2.016 2.016 0 01-.673-.38m0 0A2.18 2.18 0 013 12.489V8.706c0-1.081.768-2.015 1.837-2.175a48.111 48.111 0 013.413-.387m7.5 0V5.25A2.25 2.25 0 0013.5 3h-3a2.25 2.25 0 00-2.25 2.25v.894m7.5 0a48.667 48.667 0 00-7.5 0" />
              </svg>
            </div>
            <h3 className="text-base font-semibold text-primary">No current job</h3>
            <p className="mt-1 text-sm text-foreground/50">
              When you accept a job offer, it will appear here.
            </p>
            <Link
              href="/jobs"
              className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-secondary px-5 py-2.5 text-sm font-semibold text-white transition-all hover:-translate-y-0.5 hover:bg-secondary/90 hover:shadow-lg hover:shadow-secondary/20"
            >
              Browse Jobs
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
              </svg>
            </Link>
          </div>
        )}
      </section>

      {/* ── Past Jobs ───────────────────────────────────────── */}
      <section>
        <h2 className="mb-4 text-lg font-semibold text-primary">Past Applications</h2>
        {pastJobs.length === 0 ? (
          <div className="rounded-2xl border border-accent/50 bg-white/70 p-10 text-center backdrop-blur-sm">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-foreground/5">
              <svg className="h-7 w-7 text-foreground/30" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-base font-semibold text-foreground/70">No past jobs yet</h3>
            <p className="mt-1 text-sm text-foreground/40">
              Withdrawn and past applications will appear here.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {pastJobs.map((job) => (
              <PastJobCard key={job.id} job={job} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

/* ── Current Job Card ────────────────────────────────────── */
function CurrentJobCard({ job }: { job: JobEntry }) {
  const posLabel = job.positionType === "full_time" ? "Full-Time" : job.positionType === "part_time" ? "Part-Time" : job.positionType === "casual" ? "Casual" : null;

  return (
    <div className="relative overflow-hidden rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50 via-green-50 to-teal-50 p-6 shadow-sm">
      <div className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full bg-emerald-200/30 blur-2xl" />
      <div className="pointer-events-none absolute -left-4 bottom-0 h-20 w-20 rounded-full bg-teal-200/20 blur-2xl" />

      <div className="relative">
        <div className="flex items-center gap-2 mb-4">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-700">
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            Accepted
          </span>
        </div>

        <h3 className="text-xl font-bold text-emerald-900">{job.jobTitle}</h3>
        <p className="mt-1 text-sm font-medium text-emerald-700">
          {job.businessName}
          {job.resortName ? <> &middot; {job.resortName}</> : ""}
        </p>
        {job.location && (
          <p className="mt-0.5 text-xs text-emerald-600/70">{job.location}</p>
        )}

        <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-4">
          {job.startDate && (
            <DetailPill
              icon={
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
                </svg>
              }
              label="Start Date"
              value={job.startDate}
              color="emerald"
            />
          )}
          {job.endDate && (
            <DetailPill
              icon={
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
                </svg>
              }
              label="End Date"
              value={job.endDate}
              color="emerald"
            />
          )}
          {job.salaryRange && (
            <DetailPill
              icon={
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              }
              label="Pay"
              value={job.salaryRange}
              color="emerald"
            />
          )}
          {posLabel && (
            <DetailPill
              icon={
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 14.15v4.25c0 1.094-.787 2.036-1.872 2.18-2.087.277-4.216.42-6.378.42s-4.291-.143-6.378-.42c-1.085-.144-1.872-1.086-1.872-2.18v-4.25m16.5 0a2.18 2.18 0 00.75-1.661V8.706c0-1.081-.768-2.015-1.837-2.175a48.114 48.114 0 00-3.413-.387m4.5 8.006c-.194.165-.42.295-.673.38A23.978 23.978 0 0112 15.75c-2.648 0-5.195-.429-7.577-1.22a2.016 2.016 0 01-.673-.38m0 0A2.18 2.18 0 013 12.489V8.706c0-1.081.768-2.015 1.837-2.175a48.111 48.111 0 013.413-.387m7.5 0V5.25A2.25 2.25 0 0013.5 3h-3a2.25 2.25 0 00-2.25 2.25v.894m7.5 0a48.667 48.667 0 00-7.5 0" />
                </svg>
              }
              label="Type"
              value={posLabel}
              color="emerald"
            />
          )}
        </div>

        {job.accommodationIncluded && (
          <div className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-emerald-100/80 px-3 py-1 text-xs font-medium text-emerald-700">
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 21v-4.875c0-.621.504-1.125 1.125-1.125h5.25c.621 0 1.125.504 1.125 1.125V21m0 0h4.5V3.545M12.75 21h7.5V10.75M2.25 21h1.5m18 0h-18M2.25 9l4.5-1.636M18.75 3l-1.5.545m0 6.205l3 1m1.5.5l-1.5-.5M6.75 7.364V3h-3v18m3-13.636l10.5-3.819" />
            </svg>
            Accommodation included
          </div>
        )}

        <div className="mt-5 flex items-center gap-3">
          <Link
            href="/applications"
            className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-semibold text-white transition-all hover:-translate-y-0.5 hover:bg-emerald-700 hover:shadow-lg hover:shadow-emerald-600/20"
          >
            View Application
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
            </svg>
          </Link>
        </div>
      </div>
    </div>
  );
}

/* ── Past Job Card ───────────────────────────────────────── */
function PastJobCard({ job }: { job: JobEntry }) {
  const posLabel = job.positionType === "full_time" ? "Full-Time" : job.positionType === "part_time" ? "Part-Time" : job.positionType === "casual" ? "Casual" : null;

  const statusConfig = {
    withdrawn: { bg: "bg-gray-50", text: "text-gray-500", label: "Withdrawn" },
    rejected: { bg: "bg-red-50", text: "text-red-600", label: "Unsuccessful" },
    completed: { bg: "bg-blue-50", text: "text-blue-600", label: "Completed" },
    accepted: { bg: "bg-green-50", text: "text-green-600", label: "Accepted" },
  };
  const sc = statusConfig[job.status] || statusConfig.withdrawn;

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  };

  return (
    <div className="rounded-2xl border border-accent/50 bg-white/70 p-5 backdrop-blur-sm transition-all hover:-translate-y-0.5 hover:shadow-lg hover:shadow-secondary/5">
      <div className="flex items-start justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-primary">{job.jobTitle}</h3>
            <span className={`inline-flex shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold ${sc.bg} ${sc.text}`}>
              {sc.label}
            </span>
          </div>
          <p className="mt-1 text-sm text-foreground/60">
            {job.businessName}
            {job.resortName ? <> &middot; {job.resortName}</> : ""}
          </p>
          {job.location && (
            <p className="mt-0.5 text-xs text-foreground/40">{job.location}</p>
          )}
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-foreground/50">
        {job.salaryRange && (
          <span className="flex items-center gap-1">
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {job.salaryRange}
          </span>
        )}
        {posLabel && (
          <span className="flex items-center gap-1">
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 14.15v4.25c0 1.094-.787 2.036-1.872 2.18-2.087.277-4.216.42-6.378.42s-4.291-.143-6.378-.42c-1.085-.144-1.872-1.086-1.872-2.18v-4.25m16.5 0a2.18 2.18 0 00.75-1.661V8.706c0-1.081-.768-2.015-1.837-2.175a48.114 48.114 0 00-3.413-.387m4.5 8.006c-.194.165-.42.295-.673.38A23.978 23.978 0 0112 15.75c-2.648 0-5.195-.429-7.577-1.22a2.016 2.016 0 01-.673-.38m0 0A2.18 2.18 0 013 12.489V8.706c0-1.081.768-2.015 1.837-2.175a48.111 48.111 0 013.413-.387m7.5 0V5.25A2.25 2.25 0 0013.5 3h-3a2.25 2.25 0 00-2.25 2.25v.894m7.5 0a48.667 48.667 0 00-7.5 0" />
            </svg>
            {posLabel}
          </span>
        )}
        <span className="flex items-center gap-1">
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {formatDate(job.updatedAt)}
        </span>
      </div>
    </div>
  );
}

/* ── Detail Pill ─────────────────────────────────────────── */
function DetailPill({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string; color: string }) {
  const colorClasses: Record<string, { icon: string; label: string; value: string }> = {
    emerald: { icon: "text-emerald-500", label: "text-emerald-600/60", value: "text-emerald-800" },
    gray: { icon: "text-foreground/40", label: "text-foreground/40", value: "text-foreground/70" },
  };
  const c = colorClasses[color] || colorClasses.gray;

  return (
    <div>
      <div className={`mb-1 ${c.icon}`}>{icon}</div>
      <p className={`text-[10px] font-semibold uppercase tracking-wider ${c.label}`}>{label}</p>
      <p className={`mt-0.5 text-sm font-medium ${c.value}`}>{value}</p>
    </div>
  );
}
