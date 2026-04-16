"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { formatPay } from "@/lib/utils/format-pay";

export interface SavedJob {
  id: string;
  job_post_id: string;
  title: string;
  description: string;
  requirements: string | null;
  business_name: string;
  business_logo_url: string | null;
  business_verified: boolean;
  resort_name: string;
  resort_country: string;
  salary_range: string;
  pay_amount: string | null;
  pay_currency: string | null;
  position_type: string;
  category: string | null;
  accommodation_included: boolean;
  ski_pass_included: boolean;
  meal_perks: boolean;
  visa_sponsorship: boolean;
  start_date: string | null;
  end_date: string | null;
  how_to_apply: string | null;
  application_email: string | null;
  application_url: string | null;
  saved_at: string;
}

interface SavedJobsClientProps {
  initialSavedJobs: SavedJob[];
  initialAppliedJobIds: string[];
}

export default function SavedJobsClient({ initialSavedJobs, initialAppliedJobIds }: SavedJobsClientProps) {
  const [savedJobs, setSavedJobs] = useState<SavedJob[]>(initialSavedJobs);
  const [selectedJob, setSelectedJob] = useState<SavedJob | null>(null);
  const [applying, setApplying] = useState(false);
  const [applied, setApplied] = useState(false);
  const [appliedJobIds, setAppliedJobIds] = useState<Set<string>>(new Set(initialAppliedJobIds));

  const handleUnsave = async (savedJobId: string) => {
    setSavedJobs((prev) => prev.filter((j) => j.id !== savedJobId));
    if (selectedJob?.id === savedJobId) setSelectedJob(null);
    const supabase = createClient();
    await supabase.from("saved_jobs").delete().eq("id", savedJobId);
  };

  const handleApply = async (job: SavedJob) => {
    setApplying(true);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: wp } = await supabase.from("worker_profiles").select("id").eq("user_id", user.id).single();
      if (!wp) return;

      await supabase.from("applications").insert({
        job_id: job.job_post_id,
        worker_id: wp.id,
        status: "applied",
      });

      setAppliedJobIds((prev) => new Set([...prev, job.job_post_id]));
      setApplied(true);
      setTimeout(() => setApplied(false), 3000);
    } catch (err) {
      console.error("Failed to apply:", err);
    }
    setApplying(false);
  };

  const posLabel = (t: string) => t === "full_time" ? "Full-Time" : t === "part_time" ? "Part-Time" : "Casual";

  return (
    <div className="mx-auto max-w-5xl">
      {/* Mini gradient header */}
      <div className="relative -mx-6 -mt-6 mb-8 overflow-hidden rounded-b-3xl bg-gradient-to-br from-primary via-primary-light to-primary px-6 pb-8 pt-8 sm:-mx-8 sm:px-8">
        <div className="pointer-events-none absolute -left-10 -top-10 h-40 w-40 rounded-full bg-warm/20 blur-3xl" />
        <div className="pointer-events-none absolute -right-6 bottom-0 h-32 w-32 rounded-full bg-secondary/15 blur-3xl" />
        <div className="relative flex items-end justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Saved Jobs</h1>
            <p className="mt-1 text-sm text-white/60">
              Jobs you&apos;ve bookmarked for later. Click to view details.
            </p>
          </div>
          {savedJobs.length > 0 && (
            <span className="rounded-full bg-white/15 px-3 py-1 text-sm font-semibold text-white backdrop-blur-sm">
              {savedJobs.length} saved
            </span>
          )}
        </div>
      </div>

      {savedJobs.length === 0 ? (
        <div className="mt-2 rounded-2xl border border-accent/50 bg-white/70 p-12 text-center backdrop-blur-sm">
          <div className="relative mx-auto mb-6 h-20 w-20">
            <div className="absolute inset-0 rounded-full bg-warm/10" />
            <div className="absolute inset-2 rounded-full bg-warm/15" />
            <div className="absolute inset-4 flex items-center justify-center rounded-full bg-warm/20">
              <svg className="h-8 w-8 text-warm" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
              </svg>
            </div>
          </div>
          <h2 className="text-lg font-semibold text-primary">No saved jobs yet</h2>
          <p className="mt-2 text-sm text-foreground/60">Bookmark jobs while browsing to save them here for easy access.</p>
          <Link href="/jobs" className="mt-5 inline-block rounded-xl bg-primary px-6 py-2.5 text-sm font-semibold text-white transition-all hover:-translate-y-0.5 hover:bg-primary/90 hover:shadow-lg hover:shadow-primary/20">
            Browse Jobs
          </Link>
        </div>
      ) : (
        <div className="flex flex-col gap-6 lg:flex-row">
          {/* Job list */}
          <div className="w-full space-y-2 lg:w-[360px] lg:shrink-0">
            {savedJobs.map((job) => (
              <button
                key={job.id}
                onClick={() => setSelectedJob(job)}
                className={`flex w-full items-center gap-3 rounded-xl border p-4 text-left transition-all hover:-translate-y-0.5 hover:shadow-md ${
                  selectedJob?.id === job.id
                    ? "border-secondary bg-secondary/5 shadow-md"
                    : "border-accent/50 bg-white/70 hover:border-secondary/30"
                }`}
              >
                {/* Logo */}
                {job.business_logo_url ? (
                  <img src={job.business_logo_url} alt="" className="h-10 w-10 shrink-0 rounded-lg border border-accent/30 object-cover" />
                ) : (
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-xs font-bold text-primary/60">
                    {job.business_name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase()}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-primary">{job.title}</p>
                  <p className="truncate text-xs text-foreground/50">{job.business_name} &middot; {job.resort_name}</p>
                </div>
                {appliedJobIds.has(job.job_post_id) && (
                  <span className="shrink-0 rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-semibold text-green-700">Applied</span>
                )}
              </button>
            ))}
          </div>

          {/* Detail panel */}
          <div className="flex-1">
            {selectedJob ? (
              <div className="rounded-2xl border border-accent/50 bg-white/70 p-6 backdrop-blur-sm">
                {/* Header */}
                <div className="flex items-start gap-4">
                  {selectedJob.business_logo_url ? (
                    <img src={selectedJob.business_logo_url} alt="" className="h-14 w-14 shrink-0 rounded-xl border border-accent/30 object-cover" />
                  ) : (
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-lg font-bold text-primary/60">
                      {selectedJob.business_name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase()}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <h2 className="text-xl font-bold text-primary">{selectedJob.title}</h2>
                    <p className="mt-1 text-sm text-foreground/60">
                      {selectedJob.business_name}
                      {selectedJob.business_verified && (
                        <span className="ml-2 text-xs text-green-600">&#10003; Verified</span>
                      )}
                    </p>
                    <p className="text-sm text-foreground/40">
                      {selectedJob.resort_name}{selectedJob.resort_country ? `, ${selectedJob.resort_country}` : ""}
                    </p>
                  </div>
                </div>

                {/* Quick info pills */}
                <div className="mt-5 flex flex-wrap gap-2">
                  {(selectedJob.pay_amount || selectedJob.salary_range) && (
                    <span className="rounded-full bg-secondary/10 px-3 py-1 text-xs font-semibold text-secondary">
                      {formatPay(selectedJob.pay_amount, selectedJob.pay_currency, selectedJob.salary_range)}
                    </span>
                  )}
                  <span className="rounded-full bg-accent/40 px-3 py-1 text-xs font-medium text-foreground/60">
                    {posLabel(selectedJob.position_type)}
                  </span>
                  {selectedJob.category && (
                    <span className="rounded-full bg-accent/40 px-3 py-1 text-xs font-medium text-foreground/60">
                      {selectedJob.category.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())}
                    </span>
                  )}
                </div>

                {/* Perks */}
                <div className="mt-4 flex flex-wrap gap-2">
                  {selectedJob.accommodation_included && (
                    <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700">🏠 Accommodation</span>
                  )}
                  {selectedJob.ski_pass_included && (
                    <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-[11px] font-semibold text-blue-700">🎿 Ski Pass</span>
                  )}
                  {selectedJob.meal_perks && (
                    <span className="rounded-full bg-orange-50 px-2.5 py-0.5 text-[11px] font-semibold text-orange-700">🍽️ Meals</span>
                  )}
                  {selectedJob.visa_sponsorship && (
                    <span className="rounded-full bg-purple-50 px-2.5 py-0.5 text-[11px] font-semibold text-purple-700">🛂 Visa Sponsorship</span>
                  )}
                </div>

                {/* Dates */}
                {(selectedJob.start_date || selectedJob.end_date) && (
                  <div className="mt-4 flex items-center gap-2 text-xs text-foreground/50">
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
                    </svg>
                    {selectedJob.start_date && <span>Starts {new Date(selectedJob.start_date).toLocaleDateString("en-AU", { month: "short", day: "numeric", year: "numeric" })}</span>}
                    {selectedJob.start_date && selectedJob.end_date && <span>–</span>}
                    {selectedJob.end_date && <span>{new Date(selectedJob.end_date).toLocaleDateString("en-AU", { month: "short", day: "numeric", year: "numeric" })}</span>}
                  </div>
                )}

                {/* Description */}
                <div className="mt-6">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-foreground/40">Description</h3>
                  <p className="mt-2 text-sm leading-relaxed text-foreground/70 whitespace-pre-line">{selectedJob.description}</p>
                </div>

                {/* Requirements */}
                {selectedJob.requirements && (
                  <div className="mt-5">
                    <h3 className="text-sm font-bold uppercase tracking-wider text-foreground/40">Requirements</h3>
                    <p className="mt-2 text-sm leading-relaxed text-foreground/70 whitespace-pre-line">{selectedJob.requirements}</p>
                  </div>
                )}

                {/* How to Apply */}
                {(selectedJob.how_to_apply || selectedJob.application_email || selectedJob.application_url) && (
                  <div className="mt-5 rounded-xl border border-secondary/20 bg-secondary/5 p-5">
                    <h3 className="text-sm font-bold uppercase tracking-wider text-foreground/40 flex items-center gap-2">
                      <svg className="h-4 w-4 text-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      How to Apply
                    </h3>
                    {selectedJob.how_to_apply && (
                      <p className="mt-2 text-sm leading-relaxed text-foreground/70 whitespace-pre-line">{selectedJob.how_to_apply}</p>
                    )}
                    <div className="mt-3 flex flex-wrap gap-2">
                      {selectedJob.application_email && (
                        <a href={`mailto:${selectedJob.application_email}`} className="inline-flex items-center gap-1.5 rounded-lg bg-secondary px-4 py-2 text-sm font-semibold text-white hover:bg-secondary-light transition-colors">
                          Email Application
                        </a>
                      )}
                      {selectedJob.application_url && (
                        <a href={selectedJob.application_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded-lg border border-secondary/30 px-4 py-2 text-sm font-semibold text-secondary hover:bg-secondary/5 transition-colors">
                          Apply on Website
                        </a>
                      )}
                    </div>
                  </div>
                )}

                {/* Action buttons */}
                <div className="mt-8 flex flex-wrap gap-3">
                  {appliedJobIds.has(selectedJob.job_post_id) ? (
                    <span className="inline-flex items-center gap-2 rounded-xl bg-green-50 px-6 py-3 text-sm font-semibold text-green-700 border border-green-200">
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                      </svg>
                      Already Applied
                    </span>
                  ) : (
                    <button
                      onClick={() => handleApply(selectedJob)}
                      disabled={applying}
                      className="rounded-xl bg-secondary px-6 py-3 text-sm font-semibold text-white transition-all hover:-translate-y-0.5 hover:bg-secondary-light hover:shadow-lg hover:shadow-secondary/20 disabled:opacity-50"
                    >
                      {applying ? "Applying..." : "Apply Now"}
                    </button>
                  )}
                  <button
                    onClick={() => handleUnsave(selectedJob.id)}
                    className="rounded-xl border border-red-200 px-5 py-3 text-sm font-semibold text-red-600 transition-colors hover:bg-red-50"
                  >
                    Unsave
                  </button>
                  <Link
                    href={`/jobs?category=${selectedJob.category || ""}&resort=${encodeURIComponent(selectedJob.resort_name)}`}
                    className="rounded-xl border border-accent/50 px-5 py-3 text-sm font-semibold text-primary transition-colors hover:bg-accent/20"
                  >
                    More Jobs Like This
                  </Link>
                </div>
              </div>
            ) : (
              <div className="flex h-full min-h-[400px] items-center justify-center rounded-2xl border border-accent/30 bg-accent/5">
                <div className="text-center px-6">
                  <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-accent/20">
                    <svg className="h-7 w-7 text-foreground/20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.042 21.672L13.684 16.6m0 0l-2.51 2.225.569-9.47 5.227 7.917-3.286-.672zM12 2.25V4.5m5.834.166l-1.591 1.591M20.25 10.5H18M7.757 14.743l-1.59 1.59M6 10.5H3.75m4.007-4.243l-1.59-1.59" />
                    </svg>
                  </div>
                  <p className="text-sm font-medium text-foreground/40">Select a job to view details</p>
                  <p className="mt-1 text-xs text-foreground/30">Click any saved job on the left</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Applied toast */}
      {applied && (
        <div className="fixed bottom-6 left-1/2 z-[100] -translate-x-1/2 animate-in slide-in-from-bottom-4 duration-300">
          <div className="flex items-center gap-3 rounded-xl border border-green-200 bg-white px-5 py-3 shadow-2xl">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-100">
              <svg className="h-4 w-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
              </svg>
            </div>
            <p className="text-sm font-medium text-primary">Application submitted!</p>
          </div>
        </div>
      )}
    </div>
  );
}
