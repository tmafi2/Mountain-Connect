"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

interface AppRow {
  id: string;
  status: string;
  applied_at: string;
  updated_at: string | null;
  worker_name: string;
  worker_email: string;
  worker_location: string | null;
  worker_skills: string[] | null;
  worker_id: string;
  job_title: string;
  job_id: string;
  business_name: string;
  business_id: string;
  pay: string | null;
}

const STATUS_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  new: { bg: "bg-blue-50", text: "text-blue-700", label: "New" },
  viewed: { bg: "bg-indigo-50", text: "text-indigo-700", label: "Viewed" },
  reviewed: { bg: "bg-indigo-50", text: "text-indigo-700", label: "Reviewed" },
  shortlisted: { bg: "bg-cyan-50", text: "text-cyan-700", label: "Shortlisted" },
  interview_pending: { bg: "bg-purple-50", text: "text-purple-700", label: "Interview Pending" },
  interview: { bg: "bg-purple-50", text: "text-purple-700", label: "Interview" },
  offered: { bg: "bg-amber-50", text: "text-amber-700", label: "Offered" },
  accepted: { bg: "bg-green-50", text: "text-green-700", label: "Accepted" },
  rejected: { bg: "bg-red-50", text: "text-red-600", label: "Unsuccessful" },
  withdrawn: { bg: "bg-gray-100", text: "text-gray-500", label: "Withdrawn" },
};

export default function AdminApplicationsPage() {
  const [apps, setApps] = useState<AppRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selected, setSelected] = useState<AppRow | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/admin/applications");
        if (!res.ok) { console.error("Error loading applications:", res.statusText); setLoading(false); return; }
        const { applications: data, emailMap } = await res.json();

        if (data) {
          setApps(data.map((a: any) => {
            const wp = a.worker_profiles as { first_name: string | null; last_name: string | null; user_id: string; location_current: string | null; skills: string[] | null } | null;
            const jp = a.job_posts as { id: string; title: string; salary_range: string | null; business_profiles: { id: string; business_name: string } } | null;
            return {
              id: a.id as string,
              status: a.status as string,
              applied_at: a.applied_at as string,
              updated_at: a.updated_at as string | null,
              worker_name: [wp?.first_name, wp?.last_name].filter(Boolean).join(" ") || "Unknown",
              worker_email: emailMap[wp?.user_id || ""] || "",
              worker_location: wp?.location_current || null,
              worker_skills: wp?.skills || null,
              worker_id: a.worker_id as string,
              job_title: jp?.title || "Unknown",
              job_id: (jp?.id || a.job_post_id) as string,
              business_name: jp?.business_profiles?.business_name || "Unknown",
              business_id: jp?.business_profiles?.id || "",
              pay: jp?.salary_range || null,
            };
          }));
      }
      } catch (err) {
        console.error("Error loading applications:", err);
      }
      setLoading(false);
    })();
  }, []);

  const filtered = useMemo(() => {
    let results = [...apps];
    if (statusFilter !== "all") results = results.filter((a) => a.status === statusFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      results = results.filter((a) =>
        a.worker_name.toLowerCase().includes(q) ||
        a.job_title.toLowerCase().includes(q) ||
        a.business_name.toLowerCase().includes(q)
      );
    }
    return results;
  }, [apps, search, statusFilter]);

  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    apps.forEach((a) => { c[a.status] = (c[a.status] || 0) + 1; });
    return c;
  }, [apps]);

  if (loading) {
    return <div className="flex h-64 items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-primary" /></div>;
  }

  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="text-2xl font-bold text-primary">All Applications</h1>
      <p className="mt-1 text-sm text-foreground/60">
        {apps.length} total — {counts.new || 0} new, {(counts.interview || 0) + (counts.interview_pending || 0)} interviewing, {counts.offered || 0} offered
      </p>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search applicant, job, or business..."
          className="w-72 rounded-lg border border-accent bg-white px-4 py-2.5 text-sm text-primary focus:border-secondary focus:outline-none focus:ring-1 focus:ring-secondary" />
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-lg border border-accent bg-white px-4 py-2.5 text-sm text-primary focus:border-secondary focus:outline-none">
          <option value="all">All Statuses</option>
          <option value="new">New</option>
          <option value="viewed">Viewed</option>
          <option value="interview_pending">Interview Pending</option>
          <option value="interview">Interview</option>
          <option value="offered">Offered</option>
          <option value="accepted">Accepted</option>
          <option value="rejected">Unsuccessful</option>
          <option value="withdrawn">Withdrawn</option>
        </select>
        <span className="text-sm text-foreground/50">{filtered.length} applications</span>
      </div>

      <div className="mt-6 overflow-hidden rounded-xl border border-accent bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-accent bg-accent/10 text-left text-xs uppercase tracking-wider text-foreground/50">
              <th className="px-5 py-3">Applicant</th>
              <th className="px-5 py-3">Job Title</th>
              <th className="px-5 py-3">Business</th>
              <th className="px-5 py-3">Status</th>
              <th className="px-5 py-3 text-right">Applied</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((app) => {
              const s = STATUS_STYLES[app.status] || STATUS_STYLES.new;
              return (
                <tr key={app.id} onClick={() => setSelected(app)} className="border-b border-accent/30 cursor-pointer transition-colors hover:bg-accent/5">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-secondary/10 text-xs font-bold text-secondary">
                        {app.worker_name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-medium text-primary">{app.worker_name}</p>
                        {app.worker_email && <p className="text-xs text-foreground/40">{app.worker_email}</p>}
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3 text-foreground/70">{app.job_title}</td>
                  <td className="px-5 py-3 text-foreground/70">{app.business_name}</td>
                  <td className="px-5 py-3">
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${s.bg} ${s.text}`}>{s.label}</span>
                  </td>
                  <td className="px-5 py-3 text-right text-foreground/50">
                    {new Date(app.applied_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {filtered.length === 0 && <div className="p-8 text-center text-sm text-foreground/40">No applications found.</div>}
      </div>

      {/* Detail Modal */}
      {selected && (() => {
        const s = STATUS_STYLES[selected.status] || STATUS_STYLES.new;
        return (
          <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setSelected(null)} />
            <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white shadow-2xl">
              <div className="relative h-28 rounded-t-2xl overflow-hidden bg-gradient-to-br from-cyan-600 via-cyan-500 to-secondary">
                <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
                <button onClick={() => setSelected(null)} className="absolute top-3 right-3 rounded-full bg-white/90 p-1.5 text-foreground/60 hover:bg-white hover:text-foreground transition-colors">
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="relative px-6 pb-6">
                <div className="flex items-end gap-4 -mt-8">
                  <div className="flex h-16 w-16 items-center justify-center rounded-xl border-4 border-white bg-cyan-50 text-lg font-bold text-cyan-700 shadow-md">
                    {selected.worker_name.charAt(0).toUpperCase()}
                  </div>
                  <div className="pb-1">
                    <h2 className="text-xl font-bold text-primary">{selected.worker_name}</h2>
                    <span className={`mt-1 inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${s.bg} ${s.text}`}>{s.label}</span>
                  </div>
                </div>

                {/* Applicant Info */}
                <div className="mt-6 grid grid-cols-2 gap-4">
                  <div><p className="text-[10px] font-semibold uppercase tracking-wider text-foreground/40">Email</p><p className="mt-0.5 text-sm text-foreground/70">{selected.worker_email || "—"}</p></div>
                  <div><p className="text-[10px] font-semibold uppercase tracking-wider text-foreground/40">Location</p><p className="mt-0.5 text-sm text-foreground/70">{selected.worker_location || "—"}</p></div>
                  <div><p className="text-[10px] font-semibold uppercase tracking-wider text-foreground/40">Applied</p><p className="mt-0.5 text-sm text-foreground/70">{new Date(selected.applied_at).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</p></div>
                  <div><p className="text-[10px] font-semibold uppercase tracking-wider text-foreground/40">Last Updated</p><p className="mt-0.5 text-sm text-foreground/70">{selected.updated_at ? new Date(selected.updated_at).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }) : "—"}</p></div>
                </div>

                {/* Skills */}
                {selected.worker_skills && selected.worker_skills.length > 0 && (
                  <div className="mt-5">
                    <p className="text-xs font-semibold uppercase tracking-wider text-foreground/40 mb-2">Skills</p>
                    <div className="flex flex-wrap gap-1.5">
                      {selected.worker_skills.map((skill) => (
                        <span key={skill} className="rounded-full bg-secondary/10 px-3 py-1 text-xs font-medium text-secondary">{skill}</span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Job Info */}
                <div className="mt-5 rounded-lg bg-accent/10 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wider text-foreground/40 mb-2">Applied For</p>
                  <p className="text-sm font-medium text-primary">{selected.job_title}</p>
                  <p className="text-xs text-foreground/50">{selected.business_name}{selected.pay ? ` · ${selected.pay}` : ""}</p>
                </div>

                <div className="mt-5 pt-4 border-t border-accent/30">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-foreground/40 mb-1">Application ID</p>
                  <p className="text-xs font-mono text-foreground/50">{selected.id}</p>
                </div>

                {/* Actions */}
                <div className="mt-5 flex items-center gap-3">
                  <Link href={`/business/workers/${selected.worker_id}`} target="_blank" className="rounded-xl border border-accent/40 px-4 py-2.5 text-sm font-semibold text-foreground/70 hover:bg-accent/10 transition-colors">
                    View Applicant Profile
                  </Link>
                  <Link href={`/jobs/${selected.job_id}`} target="_blank" className="rounded-xl border border-accent/40 px-4 py-2.5 text-sm font-semibold text-foreground/70 hover:bg-accent/10 transition-colors">
                    View Job Listing
                  </Link>
                </div>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
