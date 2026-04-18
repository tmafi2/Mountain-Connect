"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

interface JobRow {
  id: string;
  title: string;
  description: string | null;
  requirements: string | null;
  position_type: string;
  status: string;
  pay_amount: string | null;
  pay_currency: string | null;
  salary_range: string | null;
  positions_available: number;
  accommodation_included: boolean;
  ski_pass_included: boolean;
  visa_sponsorship: boolean;
  meal_perks: boolean;
  start_date: string | null;
  end_date: string | null;
  resort_name: string | null;
  nearby_town_name: string | null;
  featured_until: string | null;
  created_at: string;
  business_id: string;
  business_name?: string;
}

interface JobApplicant {
  id: string;
  name: string;
  status: string;
  applied_at: string;
}

export default function AdminJobsPage() {
  const [jobs, setJobs] = useState<JobRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "draft" | "closed">("all");
  const [selected, setSelected] = useState<JobRow | null>(null);
  const [selectedApplicants, setSelectedApplicants] = useState<JobApplicant[]>([]);
  const [loadingApplicants, setLoadingApplicants] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [featuring, setFeaturing] = useState(false);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("job_posts")
        .select("id, title, description, requirements, position_type, status, pay_amount, pay_currency, salary_range, positions_available, accommodation_included, ski_pass_included, visa_sponsorship, meal_perks, start_date, end_date, featured_until, created_at, business_id, resorts(name), nearby_towns(name)")
        .order("created_at", { ascending: false });

      if (error) { console.error("Error loading jobs:", error); setLoading(false); return; }

      if (data && data.length > 0) {
        const bizIds = [...new Set(data.map((j) => j.business_id))];
        const { data: bizData } = await supabase.from("business_profiles").select("id, business_name").in("id", bizIds);
        const bizMap: Record<string, string> = {};
        if (bizData) bizData.forEach((b) => { bizMap[b.id] = b.business_name; });

        setJobs(data.map((j) => ({
          ...j,
          resort_name: (j.resorts as unknown as { name: string } | null)?.name || null,
          nearby_town_name: ((j as any).nearby_towns as { name: string } | null)?.name || null,
          business_name: bizMap[j.business_id] || "Unknown",
        })));
      }
      setLoading(false);
    }
    load();
  }, []);

  // Load applicants when a job is selected
  useEffect(() => {
    if (!selected) { setSelectedApplicants([]); return; }
    setLoadingApplicants(true);
    (async () => {
      const supabase = createClient();
      const { data } = await supabase
        .from("applications")
        .select("id, status, applied_at, worker_profiles(first_name, last_name)")
        .eq("job_post_id", selected.id)
        .order("applied_at", { ascending: false });

      if (data) {
        setSelectedApplicants(data.map((a) => {
          const wp = a.worker_profiles as unknown as { first_name: string | null; last_name: string | null } | null;
          return {
            id: a.id,
            name: [wp?.first_name, wp?.last_name].filter(Boolean).join(" ") || "Unknown",
            status: a.status as string,
            applied_at: a.applied_at as string,
          };
        }));
      }
      setLoadingApplicants(false);
    })();
  }, [selected]);

  const handleDeleteJob = async () => {
    if (!selected) return;
    setDeleting(true);
    try {
      const res = await fetch("/api/admin/delete-job", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId: selected.id }),
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        alert("Error deleting job: " + (data.error || "Unknown error"));
        setDeleting(false);
        return;
      }

      setJobs((prev) => prev.filter((j) => j.id !== selected.id));
      setSelected(null);
      setShowDeleteConfirm(false);
    } catch (err) {
      console.error("Failed to delete job:", err);
      alert("Failed to delete job. Please try again.");
    }
    setDeleting(false);
  };

  const handleToggleFeature = async () => {
    if (!selected) return;
    setFeaturing(true);
    const isFeatured = selected.featured_until && new Date(selected.featured_until) > new Date();
    try {
      const res = await fetch("/api/admin/feature-job", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId: selected.id, featured: !isFeatured, days: 30 }),
      });
      const data = await res.json();
      if (data.success) {
        const updatedJob = { ...selected, featured_until: data.featured_until };
        setSelected(updatedJob);
        setJobs((prev) => prev.map((j) => j.id === selected.id ? updatedJob : j));
      }
    } catch (err) {
      console.error("Feature toggle error:", err);
    }
    setFeaturing(false);
  };

  const filtered = useMemo(() => {
    let results = [...jobs];
    if (statusFilter === "active") results = results.filter((j) => j.status === "active");
    else if (statusFilter === "draft") results = results.filter((j) => j.status === "draft");
    else if (statusFilter === "closed") results = results.filter((j) => j.status !== "active" && j.status !== "draft");

    if (search.trim()) {
      const q = search.toLowerCase();
      results = results.filter((j) => j.title.toLowerCase().includes(q) || (j.business_name && j.business_name.toLowerCase().includes(q)));
    }
    return results;
  }, [jobs, search, statusFilter]);

  const activeCount = jobs.filter((j) => j.status === "active").length;

  if (loading) {
    return <div className="flex h-64 items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-primary" /></div>;
  }

  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="text-2xl font-bold text-primary">All Jobs</h1>
      <p className="mt-1 text-sm text-foreground/60">{jobs.length} total jobs — {activeCount} active</p>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search jobs..."
          className="w-64 rounded-lg border border-accent bg-white px-4 py-2.5 text-sm text-primary focus:border-secondary focus:outline-none focus:ring-1 focus:ring-secondary" />
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
          className="rounded-lg border border-accent bg-white px-4 py-2.5 text-sm text-primary focus:border-secondary focus:outline-none">
          <option value="all">All Statuses</option>
          <option value="active">Active</option>
          <option value="draft">Draft</option>
          <option value="closed">Closed / Paused</option>
        </select>
        <span className="text-sm text-foreground/50">{filtered.length} jobs</span>
      </div>

      <div className="mt-6 overflow-hidden rounded-xl border border-accent bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-accent bg-accent/10 text-left text-xs uppercase tracking-wider text-foreground/50">
              <th className="px-5 py-3">Job Title</th>
              <th className="px-5 py-3">Business</th>
              <th className="px-5 py-3">Type</th>
              <th className="px-5 py-3">Pay</th>
              <th className="px-5 py-3">Status</th>
              <th className="px-5 py-3 text-right">Posted</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((job) => (
              <tr key={job.id} onClick={() => setSelected(job)} className="border-b border-accent/30 cursor-pointer transition-colors hover:bg-accent/5">
                <td className="px-5 py-3 font-medium text-primary">
                  {job.featured_until && new Date(job.featured_until) > new Date() && (
                    <span className="mr-1.5 inline-flex items-center rounded-full bg-amber-50 px-1.5 py-0.5 text-[10px] font-semibold text-amber-600" title="Featured">★</span>
                  )}
                  {job.title}
                </td>
                <td className="px-5 py-3 text-foreground/70">{job.business_name}</td>
                <td className="px-5 py-3 text-foreground/70 capitalize">{job.position_type?.replace("_", " ") || "—"}</td>
                <td className="px-5 py-3 text-foreground/70">{job.pay_amount ? `${job.pay_currency || "AUD"} $${job.pay_amount}` : "—"}</td>
                <td className="px-5 py-3">
                  <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium capitalize ${
                    job.status === "active" ? "bg-green-50 text-green-700" :
                    job.status === "draft" ? "bg-blue-50 text-blue-600" :
                    "bg-gray-50 text-gray-600"
                  }`}>{job.status}</span>
                </td>
                <td className="px-5 py-3 text-right text-foreground/50">{new Date(job.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && <div className="p-8 text-center text-sm text-foreground/40">No jobs found.</div>}
      </div>

      {/* ─── Job Detail Modal ─── */}
      {selected && !showDeleteConfirm && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setSelected(null)} />
          <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white shadow-2xl">
            {/* Header */}
            <div className="relative h-28 rounded-t-2xl overflow-hidden bg-gradient-to-br from-primary via-primary/80 to-secondary">
              <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
              <button onClick={() => setSelected(null)} className="absolute top-3 right-3 rounded-full bg-white/90 p-1.5 text-foreground/60 hover:bg-white hover:text-foreground transition-colors">
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="relative px-6 pb-6">
              <div className="-mt-6">
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="text-xl font-bold text-primary">{selected.title}</h2>
                    <p className="mt-0.5 text-sm text-foreground/50">{selected.business_name}</p>
                  </div>
                  <span className={`mt-1 inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${
                    selected.status === "active" ? "bg-green-50 text-green-700" :
                    selected.status === "draft" ? "bg-blue-50 text-blue-600" :
                    selected.status === "paused" ? "bg-yellow-50 text-yellow-700" :
                    "bg-gray-50 text-gray-600"
                  }`}>{selected.status}</span>
                </div>
              </div>

              {/* Info Grid */}
              <div className="mt-5 grid grid-cols-2 gap-4">
                <InfoItem label="Job Type" value={selected.position_type?.replace("_", " ")} />
                <InfoItem label="Pay" value={selected.salary_range || (selected.pay_amount ? `${selected.pay_currency || "AUD"} $${selected.pay_amount}` : null)} />
                <InfoItem label="Resort" value={selected.resort_name} />
                <InfoItem label="Town" value={selected.nearby_town_name} />
                <InfoItem label="Positions" value={String(selected.positions_available || 1)} />
                <InfoItem label="Start Date" value={selected.start_date ? new Date(selected.start_date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : null} />
                <InfoItem label="End Date" value={selected.end_date ? new Date(selected.end_date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : null} />
                <InfoItem label="Posted" value={new Date(selected.created_at).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })} />
                <InfoItem label="Job ID" value={selected.id} mono />
              </div>

              {/* Perks */}
              <div className="mt-5">
                <p className="text-xs font-semibold uppercase tracking-wider text-foreground/40 mb-2">Perks</p>
                <div className="flex flex-wrap gap-1.5">
                  {selected.accommodation_included && <span className="rounded-full bg-green-50 px-3 py-1 text-xs font-medium text-green-700">🏠 Accommodation</span>}
                  {selected.ski_pass_included && <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700">🎿 Ski Pass</span>}
                  {selected.visa_sponsorship && <span className="rounded-full bg-purple-50 px-3 py-1 text-xs font-medium text-purple-700">🛂 Visa Sponsorship</span>}
                  {selected.meal_perks && <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700">🍽️ Meals</span>}
                  {!selected.accommodation_included && !selected.ski_pass_included && !selected.visa_sponsorship && !selected.meal_perks && (
                    <span className="text-xs text-foreground/40">No perks listed</span>
                  )}
                </div>
              </div>

              {/* Description */}
              {selected.description && (
                <div className="mt-5">
                  <p className="text-xs font-semibold uppercase tracking-wider text-foreground/40 mb-2">Description</p>
                  <p className="text-sm text-foreground/70 leading-relaxed whitespace-pre-wrap">{selected.description}</p>
                </div>
              )}

              {/* Requirements */}
              {selected.requirements && (
                <div className="mt-5">
                  <p className="text-xs font-semibold uppercase tracking-wider text-foreground/40 mb-2">Requirements</p>
                  <p className="text-sm text-foreground/70 leading-relaxed whitespace-pre-wrap">{selected.requirements}</p>
                </div>
              )}

              {/* Applicants */}
              <div className="mt-5">
                <p className="text-xs font-semibold uppercase tracking-wider text-foreground/40 mb-2">Applicants ({selectedApplicants.length})</p>
                {loadingApplicants ? (
                  <div className="flex justify-center py-4"><div className="h-5 w-5 animate-spin rounded-full border-2 border-accent border-t-secondary" /></div>
                ) : selectedApplicants.length === 0 ? (
                  <p className="text-sm text-foreground/40">No applications yet.</p>
                ) : (
                  <div className="space-y-1.5">
                    {selectedApplicants.map((app) => (
                      <div key={app.id} className="flex items-center justify-between rounded-lg bg-accent/10 px-4 py-2.5">
                        <p className="text-sm font-medium text-primary">{app.name}</p>
                        <div className="text-right">
                          <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium capitalize ${
                            app.status === "accepted" ? "bg-green-50 text-green-700" :
                            app.status === "rejected" ? "bg-red-50 text-red-600" :
                            app.status === "interview" ? "bg-purple-50 text-purple-700" :
                            "bg-gray-50 text-gray-600"
                          }`}>{app.status === "new" ? "applied" : app.status}</span>
                          <p className="mt-0.5 text-[10px] text-foreground/40">{new Date(app.applied_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="mt-5 pt-4 border-t border-accent/30 flex items-center gap-3 flex-wrap">
                <button
                  onClick={handleToggleFeature}
                  disabled={featuring}
                  className={`rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors disabled:opacity-50 ${
                    selected.featured_until && new Date(selected.featured_until) > new Date()
                      ? "border border-amber-300 bg-amber-50 text-amber-700 hover:bg-amber-100"
                      : "border border-amber-300 bg-white text-amber-600 hover:bg-amber-50"
                  }`}
                >
                  {featuring ? "Updating..." : selected.featured_until && new Date(selected.featured_until) > new Date() ? "★ Unfeature Job" : "☆ Feature Job (30 days)"}
                </button>
                <Link href={`/jobs/${selected.id}`} target="_blank" className="rounded-xl border border-accent/40 px-4 py-2.5 text-sm font-semibold text-foreground/70 hover:bg-accent/10 transition-colors">
                  View Public Listing
                </Link>
                <button onClick={() => setShowDeleteConfirm(true)} className="rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-semibold text-red-600 transition-colors hover:bg-red-100">
                  Remove Listing
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── Delete Confirmation ─── */}
      {showDeleteConfirm && selected && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowDeleteConfirm(false)} />
          <div className="relative w-full max-w-md rounded-2xl bg-white shadow-2xl p-6">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-red-100">
              <svg className="h-7 w-7 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
              </svg>
            </div>
            <h3 className="mt-4 text-center text-lg font-bold text-primary">Remove Listing</h3>
            <p className="mt-2 text-center text-sm text-foreground/60">
              Are you sure you want to permanently remove &ldquo;{selected.title}&rdquo;? This will also remove all associated applications.
            </p>
            <div className="mt-6 flex gap-3">
              <button onClick={() => setShowDeleteConfirm(false)} className="flex-1 rounded-xl border border-accent/40 py-2.5 text-sm font-semibold text-foreground/70 hover:bg-accent/10 transition-colors">
                Cancel
              </button>
              <button onClick={handleDeleteJob} disabled={deleting} className="flex-1 rounded-xl bg-red-600 py-2.5 text-sm font-semibold text-white hover:bg-red-700 transition-colors disabled:opacity-50">
                {deleting ? "Removing..." : "Yes, Remove"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function InfoItem({ label, value, mono }: { label: string; value: string | null | undefined; mono?: boolean }) {
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-wider text-foreground/40">{label}</p>
      <p className={`mt-0.5 text-sm ${mono ? "font-mono text-xs" : ""} ${value ? "text-foreground/70" : "text-foreground/30"} capitalize`}>
        {value || "—"}
      </p>
    </div>
  );
}
