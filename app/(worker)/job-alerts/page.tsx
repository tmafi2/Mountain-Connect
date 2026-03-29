"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

interface JobAlert {
  id: string;
  name: string;
  filters: Record<string, unknown>;
  is_active: boolean;
  last_checked_at: string | null;
  created_at: string;
}

/* ─── human-readable filter labels ───────────────────────── */
const PERK_LABELS: Record<string, Record<string, string>> = {
  accommodation: { yes: "Staff accommodation included", no: "No accommodation" },
  ski_pass: { yes: "Ski pass included", no: "No ski pass" },
  visa_sponsorship: { yes: "Visa sponsorship available", no: "No visa sponsorship" },
  meal_perks: { yes: "Meal perks included", no: "No meal perks" },
};

const POSITION_LABELS: Record<string, string> = {
  full_time: "Full Time",
  part_time: "Part Time",
  casual: "Casual",
};

function filterPills(filters: Record<string, unknown>): { label: string; key: string }[] {
  const pills: { label: string; key: string }[] = [];

  if (filters.category) pills.push({ label: filters.category as string, key: "category" });
  if (filters.country) pills.push({ label: filters.country as string, key: "country" });
  if (filters.resort) pills.push({ label: filters.resort as string, key: "resort" });
  if (filters.position_type) pills.push({ label: POSITION_LABELS[filters.position_type as string] || (filters.position_type as string), key: "position_type" });

  for (const [key, map] of Object.entries(PERK_LABELS)) {
    const val = filters[key] as string | undefined;
    if (val && val !== "all" && map[val]) {
      pills.push({ label: map[val], key });
    }
  }

  if (filters.urgently_hiring) pills.push({ label: "Urgently hiring only", key: "urgently_hiring" });

  return pills;
}

export default function JobAlertsPage() {
  const [alerts, setAlerts] = useState<JobAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchAlerts = async () => {
    try {
      const res = await fetch("/api/job-alerts");
      if (res.ok) {
        const data = await res.json();
        setAlerts(data.alerts || []);
      }
    } catch {
      // silent
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchAlerts();
  }, []);

  const toggleAlert = async (id: string, currentActive: boolean) => {
    setTogglingId(id);
    try {
      await fetch("/api/job-alerts", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, is_active: !currentActive }),
      });
      setAlerts((prev) =>
        prev.map((a) => (a.id === id ? { ...a, is_active: !currentActive } : a))
      );
    } catch {
      // silent
    }
    setTogglingId(null);
  };

  const deleteAlert = async (id: string) => {
    setDeletingId(id);
    try {
      await fetch("/api/job-alerts", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      setAlerts((prev) => prev.filter((a) => a.id !== id));
    } catch {
      // silent
    }
    setDeletingId(null);
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-secondary" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-primary">Job Alerts</h1>
          <p className="mt-1 text-sm text-foreground/50">
            Get notified when new jobs match your saved search criteria.
          </p>
        </div>
        <Link
          href="/jobs"
          className="flex items-center gap-2 rounded-lg bg-secondary px-4 py-2.5 text-sm font-semibold text-white transition-all hover:bg-secondary-light hover:shadow-md"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Create New Alert
        </Link>
      </div>

      {alerts.length === 0 ? (
        <div className="rounded-2xl border border-accent/60 bg-white p-12 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-secondary/10">
            <svg className="h-7 w-7 text-secondary/60" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
            </svg>
          </div>
          <p className="text-sm font-medium text-foreground/70">No job alerts yet</p>
          <p className="mt-1 text-xs text-foreground/40">
            Go to the Jobs page, set your filters, and click &ldquo;Create Alert from Filters&rdquo; to get started.
          </p>
          <Link
            href="/jobs"
            className="mt-6 inline-flex items-center gap-2 rounded-lg bg-secondary/10 px-5 py-2.5 text-sm font-semibold text-secondary transition-colors hover:bg-secondary/20"
          >
            Browse Jobs
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
            </svg>
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {alerts.map((alert) => {
            const pills = filterPills(alert.filters);
            return (
              <div
                key={alert.id}
                className={`rounded-2xl border bg-white p-5 transition-all ${
                  alert.is_active ? "border-accent/60" : "border-accent/30 opacity-60"
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2.5">
                      <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${alert.is_active ? "bg-secondary/15 text-secondary" : "bg-foreground/10 text-foreground/40"}`}>
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
                        </svg>
                      </div>
                      <div>
                        <h3 className="text-sm font-semibold text-primary">{alert.name}</h3>
                        <p className="text-[11px] text-foreground/40">
                          Created {new Date(alert.created_at).toLocaleDateString("en-AU", { month: "short", day: "numeric", year: "numeric" })}
                          {alert.last_checked_at && ` · Last matched ${new Date(alert.last_checked_at).toLocaleDateString("en-AU", { month: "short", day: "numeric" })}`}
                        </p>
                      </div>
                    </div>

                    {/* Filter pills */}
                    {pills.length > 0 ? (
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {pills.map((pill) => (
                          <span
                            key={pill.key}
                            className="inline-flex items-center rounded-full bg-accent/40 px-2.5 py-1 text-[11px] font-medium text-foreground/70"
                          >
                            {pill.label}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="mt-3 text-xs text-foreground/40 italic">All jobs (no specific filters)</p>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    {/* Toggle */}
                    <button
                      onClick={() => toggleAlert(alert.id, alert.is_active)}
                      disabled={togglingId === alert.id}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        alert.is_active ? "bg-secondary" : "bg-foreground/20"
                      }`}
                      title={alert.is_active ? "Pause alert" : "Resume alert"}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform ${
                          alert.is_active ? "translate-x-6" : "translate-x-1"
                        }`}
                      />
                    </button>

                    {/* Delete */}
                    <button
                      onClick={() => deleteAlert(alert.id)}
                      disabled={deletingId === alert.id}
                      className="rounded-lg p-1.5 text-foreground/30 transition-colors hover:bg-red-50 hover:text-red-500"
                      title="Delete alert"
                    >
                      {deletingId === alert.id ? (
                        <span className="block h-4 w-4 animate-spin rounded-full border-2 border-red-300 border-t-red-500" />
                      ) : (
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
