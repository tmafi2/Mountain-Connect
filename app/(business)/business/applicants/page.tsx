"use client";

import { useState, useMemo } from "react";
import { seedApplicants, type SeedApplicant } from "@/lib/data/applications";
import ApplicantCard from "@/components/ui/ApplicantCard";
import type { ApplicationStatus } from "@/types/database";

type FilterStatus = "all" | ApplicationStatus;

export default function ApplicantsPage() {
  const [filter, setFilter] = useState<FilterStatus>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [listingFilter, setListingFilter] = useState<string>("all");
  const [invitingId, setInvitingId] = useState<string | null>(null);
  const [applicants, setApplicants] = useState(seedApplicants);

  // Get unique listings for the dropdown
  const listings = useMemo(() => {
    const map = new Map<string, string>();
    for (const a of seedApplicants) {
      if (!map.has(a.job_id)) {
        map.set(a.job_id, a.job_title);
      }
    }
    return Array.from(map.entries()).map(([id, title]) => ({ id, title }));
  }, []);

  const handleStatusChange = (applicationId: string, newStatus: string) => {
    setApplicants((prev) =>
      prev.map((a) =>
        a.application_id === applicationId
          ? { ...a, status: newStatus as ApplicationStatus }
          : a
      )
    );
  };

  const filtered = useMemo(() => {
    let results: SeedApplicant[] = applicants;

    // Filter by listing
    if (listingFilter !== "all") {
      results = results.filter((a) => a.job_id === listingFilter);
    }

    // Filter by status
    if (filter !== "all") {
      results = results.filter((a) => a.status === filter);
    }

    // Search
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
  }, [filter, searchQuery, listingFilter, applicants]);

  const handleInvite = async (applicationId: string) => {
    setInvitingId(applicationId);
    await new Promise((r) => setTimeout(r, 1000));
    setInvitingId(null);
    alert(`Interview invitation sent for application ${applicationId}! (Demo mode — in production this calls the invite API)`);
  };

  // Count applicants per status (respecting listing filter)
  const counts = useMemo(() => {
    const base = listingFilter === "all"
      ? applicants
      : applicants.filter((a) => a.job_id === listingFilter);

    const c = {
      all: base.length,
      new: 0,
      viewed: 0,
      interview_pending: 0,
      interview: 0,
      offered: 0,
      accepted: 0,
      rejected: 0,
    };
    for (const a of base) {
      if (a.status in c) {
        c[a.status as keyof typeof c]++;
      }
    }
    return c;
  }, [listingFilter, applicants]);

  const FILTERS: { value: FilterStatus; label: string; color: string }[] = [
    { value: "all", label: "All", color: "" },
    { value: "new", label: "New", color: "bg-blue-50 text-blue-700" },
    { value: "viewed", label: "Viewed", color: "bg-sky-50 text-sky-700" },
    { value: "interview_pending", label: "Interview Pending", color: "bg-yellow-50 text-yellow-700" },
    { value: "interview", label: "Interview", color: "bg-purple-50 text-purple-700" },
    { value: "offered", label: "Offered / Contract Sent", color: "bg-orange-50 text-orange-700" },
    { value: "accepted", label: "Accepted", color: "bg-green-50 text-green-700" },
    { value: "rejected", label: "Rejected", color: "bg-red-50 text-red-700" },
  ];

  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="text-2xl font-bold text-primary">Applicants</h1>
      <p className="mt-1 text-sm text-foreground/60">
        Review and manage applications across all your job listings.
      </p>

      {/* Search + Listing Filter */}
      <div className="mt-6 flex gap-3">
        <div className="relative flex-1">
          <svg className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Search by name, job, resort, or skill…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-lg border border-accent bg-white py-2.5 pl-10 pr-4 text-sm text-primary placeholder-foreground/40 focus:border-secondary focus:outline-none focus:ring-1 focus:ring-secondary"
          />
        </div>
        <select
          value={listingFilter}
          onChange={(e) => setListingFilter(e.target.value)}
          className="rounded-lg border border-accent bg-white px-4 py-2.5 text-sm text-primary focus:border-secondary focus:outline-none focus:ring-1 focus:ring-secondary"
        >
          <option value="all">All Listings</option>
          {listings.map((l) => (
            <option key={l.id} value={l.id}>
              {l.title}
            </option>
          ))}
        </select>
      </div>

      {/* Status filter tabs */}
      <div className="mt-4 flex flex-wrap gap-2">
        {FILTERS.map((f) => {
          const count = counts[f.value as keyof typeof counts] ?? 0;
          const isActive = filter === f.value;

          return (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                isActive
                  ? "bg-primary text-white"
                  : "border border-accent bg-white text-foreground/70 hover:bg-accent/20"
              }`}
            >
              {f.label}
              <span className={`ml-1.5 ${isActive ? "text-white/70" : "text-foreground/40"}`}>
                {count}
              </span>
            </button>
          );
        })}
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
          <>
            <p className="text-xs text-foreground/40">
              Showing {filtered.length} applicant{filtered.length !== 1 ? "s" : ""}
              {listingFilter !== "all" && (
                <> for <span className="font-medium text-foreground/60">{listings.find((l) => l.id === listingFilter)?.title}</span></>
              )}
            </p>
            {filtered.map((applicant) => (
              <ApplicantCard
                key={applicant.application_id}
                applicant={applicant}
                onInvite={handleInvite}
                inviting={invitingId === applicant.application_id}
                onStatusChange={handleStatusChange}
              />
            ))}
          </>
        )}
      </div>
    </div>
  );
}
