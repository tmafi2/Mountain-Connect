"use client";

import { useState, useMemo } from "react";
import { seedApplicants, type SeedApplicant } from "@/lib/data/applications";
import ApplicantCard from "@/components/ui/ApplicantCard";

type FilterStatus = "all" | "pending" | "reviewed" | "interview_scheduled" | "accepted" | "rejected";

export default function ApplicantsPage() {
  const [filter, setFilter] = useState<FilterStatus>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [invitingId, setInvitingId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    let results: SeedApplicant[] = seedApplicants;

    if (filter !== "all") {
      results = results.filter((a) => a.status === filter);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      results = results.filter(
        (a) =>
          a.worker_name.toLowerCase().includes(q) ||
          a.job_title.toLowerCase().includes(q) ||
          a.resort_name.toLowerCase().includes(q) ||
          a.worker_skills.some((s) => s.toLowerCase().includes(q))
      );
    }

    return results;
  }, [filter, searchQuery]);

  const handleInvite = async (applicationId: string) => {
    setInvitingId(applicationId);
    // In production this would call /api/interviews/invite
    // For demo purposes, simulate a delay
    await new Promise((r) => setTimeout(r, 1000));
    setInvitingId(null);
    alert(`Interview invitation sent for application ${applicationId}! (Demo mode — in production this calls the invite API)`);
  };

  const counts = useMemo(() => {
    const c = { all: seedApplicants.length, pending: 0, reviewed: 0, interview_scheduled: 0, accepted: 0, rejected: 0 };
    for (const a of seedApplicants) {
      c[a.status as keyof typeof c]++;
    }
    return c;
  }, []);

  const FILTERS: { value: FilterStatus; label: string }[] = [
    { value: "all", label: `All (${counts.all})` },
    { value: "pending", label: `Pending (${counts.pending})` },
    { value: "reviewed", label: `Reviewed (${counts.reviewed})` },
    { value: "interview_scheduled", label: `Interview (${counts.interview_scheduled})` },
    { value: "accepted", label: `Accepted (${counts.accepted})` },
    { value: "rejected", label: `Rejected (${counts.rejected})` },
  ];

  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="text-2xl font-bold text-primary">Applicants</h1>
      <p className="mt-1 text-sm text-foreground/60">
        Review and manage applications across all your job listings.
      </p>

      {/* Search + Filters */}
      <div className="mt-6 space-y-4">
        <input
          type="text"
          placeholder="Search by name, job, resort, or skill…"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full rounded-lg border border-accent bg-white px-4 py-2.5 text-sm text-primary placeholder-foreground/40 focus:border-secondary focus:outline-none focus:ring-1 focus:ring-secondary"
        />

        <div className="flex flex-wrap gap-2">
          {FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                filter === f.value
                  ? "bg-primary text-white"
                  : "bg-accent/20 text-foreground/70 hover:bg-accent/40"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Results */}
      <div className="mt-6 space-y-3">
        {filtered.length === 0 ? (
          <div className="rounded-xl border border-accent bg-white p-8 text-center">
            <p className="text-sm text-foreground/50">
              No applicants match your filters.
            </p>
          </div>
        ) : (
          filtered.map((applicant) => (
            <ApplicantCard
              key={applicant.application_id}
              applicant={applicant}
              onInvite={handleInvite}
              inviting={invitingId === applicant.application_id}
            />
          ))
        )}
      </div>
    </div>
  );
}
