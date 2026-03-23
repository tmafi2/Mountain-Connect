"use client";

import { useState, useMemo, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  seedJobs,
  JOB_CATEGORIES,
  JOB_COUNTRIES,
  JOB_RESORTS,
  type SeedJob,
} from "@/lib/data/jobs";
import { resorts } from "@/lib/data/resorts";
import ResortMap from "@/components/ui/ResortMap";
import type { MapPin } from "@/components/ui/Map";

/* ─── filter state ────────────────────────────────────────── */
interface Filters {
  search: string;
  category: string;
  country: string;
  resort: string;
  position_type: string;
  accommodation: string; // "all" | "yes" | "no"
  ski_pass: string;      // "all" | "yes" | "no"
  visa_sponsorship: string;
  meal_perks: string;
  urgently_hiring: boolean;
  sort: string;
}

const INITIAL_FILTERS: Filters = {
  search: "",
  category: "",
  country: "",
  resort: "",
  position_type: "",
  accommodation: "all",
  ski_pass: "all",
  visa_sponsorship: "all",
  meal_perks: "all",
  urgently_hiring: false,
  sort: "newest",
};

/* ─── helpers ─────────────────────────────────────────────── */
function timeAgo(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const days = Math.floor((now.getTime() - date.getTime()) / 86400000);
  if (days === 0) return "Today";
  if (days === 1) return "1 day ago";
  if (days < 7) return `${days} days ago`;
  if (days < 30) return `${Math.floor(days / 7)} weeks ago`;
  return `${Math.floor(days / 30)} months ago`;
}

function daysUntil(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const days = Math.ceil((date.getTime() - now.getTime()) / 86400000);
  if (days < 0) return "Started";
  if (days === 0) return "Starts today";
  if (days === 1) return "Starts tomorrow";
  if (days < 30) return `Starts in ${days} days`;
  return `Starts in ${Math.floor(days / 30)} months`;
}

/* ═══════════════════════════════════════════════════════════ */
/*  PAGE COMPONENT                                            */
/* ═══════════════════════════════════════════════════════════ */
export default function FindAJobPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-background">
          <p className="text-foreground/50">Loading jobs...</p>
        </div>
      }
    >
      <FindAJobContent />
    </Suspense>
  );
}

function FindAJobContent() {
  const searchParams = useSearchParams();
  const [filters, setFilters] = useState<Filters>(() => {
    // Pre-populate filters from URL query params
    const initial = { ...INITIAL_FILTERS };
    const resort = searchParams.get("resort");
    const category = searchParams.get("category");
    const country = searchParams.get("country");
    if (resort) initial.resort = resort;
    if (category) initial.category = category;
    if (country) initial.country = country;
    return initial;
  });
  const [showFilters, setShowFilters] = useState(true);
  const [viewMode, setViewMode] = useState<"list" | "map">("list");
  const [selectedJob, setSelectedJob] = useState<SeedJob | null>(() => {
    // Auto-open a specific job if ?open=jobId is in the URL
    const openId = searchParams.get("open");
    if (openId) {
      return seedJobs.find((j) => j.id === openId) ?? null;
    }
    return null;
  });

  const setFilter = <K extends keyof Filters>(key: K, value: Filters[K]) =>
    setFilters((prev) => ({ ...prev, [key]: value }));

  /* ─── filter + sort logic ───────────────────────────────── */
  const filteredJobs = useMemo(() => {
    let jobs = [...seedJobs];

    // Text search
    if (filters.search) {
      const q = filters.search.toLowerCase();
      jobs = jobs.filter(
        (j) =>
          j.title.toLowerCase().includes(q) ||
          j.business_name.toLowerCase().includes(q) ||
          j.resort_name.toLowerCase().includes(q) ||
          j.description.toLowerCase().includes(q) ||
          j.category.toLowerCase().includes(q)
      );
    }

    // Filters
    if (filters.category) jobs = jobs.filter((j) => j.category === filters.category);
    if (filters.country) jobs = jobs.filter((j) => j.resort_country === filters.country);
    if (filters.resort) jobs = jobs.filter((j) => j.resort_name === filters.resort);
    if (filters.position_type) jobs = jobs.filter((j) => j.position_type === filters.position_type);
    if (filters.accommodation === "yes") jobs = jobs.filter((j) => j.accommodation_included);
    if (filters.accommodation === "no") jobs = jobs.filter((j) => !j.accommodation_included);
    if (filters.ski_pass === "yes") jobs = jobs.filter((j) => j.ski_pass_included);
    if (filters.ski_pass === "no") jobs = jobs.filter((j) => !j.ski_pass_included);
    if (filters.visa_sponsorship === "yes") jobs = jobs.filter((j) => j.visa_sponsorship);
    if (filters.visa_sponsorship === "no") jobs = jobs.filter((j) => !j.visa_sponsorship);
    if (filters.meal_perks === "yes") jobs = jobs.filter((j) => j.meal_perks);
    if (filters.meal_perks === "no") jobs = jobs.filter((j) => !j.meal_perks);
    if (filters.urgently_hiring) jobs = jobs.filter((j) => j.urgently_hiring);

    // Sort
    switch (filters.sort) {
      case "newest":
        jobs.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        break;
      case "oldest":
        jobs.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
        break;
      case "a-z":
        jobs.sort((a, b) => a.title.localeCompare(b.title));
        break;
      case "applications":
        jobs.sort((a, b) => a.applications_count - b.applications_count);
        break;
    }

    return jobs;
  }, [filters]);

  const activeFilterCount = [
    filters.category,
    filters.country,
    filters.resort,
    filters.position_type,
    filters.accommodation !== "all" ? filters.accommodation : "",
    filters.ski_pass !== "all" ? filters.ski_pass : "",
    filters.visa_sponsorship !== "all" ? filters.visa_sponsorship : "",
    filters.meal_perks !== "all" ? filters.meal_perks : "",
    filters.urgently_hiring ? "yes" : "",
  ].filter(Boolean).length;

  /* ─── render ────────────────────────────────────────────── */
  return (
    <div className="min-h-screen bg-background">
      {/* Hero / Search Bar */}
      <div className="border-b border-accent bg-white">
        <div className="mx-auto max-w-7xl px-6 py-10">
          <h1 className="text-3xl font-bold text-primary md:text-4xl">
            Find a Job
          </h1>
          <p className="mt-2 text-foreground">
            Browse seasonal job listings at ski resorts worldwide. Filter by
            location, role, perks, and more.
          </p>

          {/* Search bar */}
          <div className="mt-6 flex gap-3">
            <div className="relative flex-1">
              <svg
                className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground/40"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
              <input
                type="text"
                placeholder="Search jobs, resorts, or businesses..."
                value={filters.search}
                onChange={(e) => setFilter("search", e.target.value)}
                className="w-full rounded-lg border border-accent bg-white py-3 pl-11 pr-4 text-sm text-primary placeholder:text-foreground/40 focus:border-secondary focus:outline-none focus:ring-2 focus:ring-secondary/30"
              />
            </div>
            <button
              type="button"
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-2 rounded-lg border px-4 py-3 text-sm font-medium transition-colors ${
                showFilters
                  ? "border-primary bg-primary text-white"
                  : "border-accent bg-white text-foreground hover:bg-accent/30"
              }`}
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
              </svg>
              Filters
              {activeFilterCount > 0 && (
                <span className={`flex h-5 w-5 items-center justify-center rounded-full text-xs ${
                  showFilters ? "bg-white/20 text-white" : "bg-primary text-white"
                }`}>
                  {activeFilterCount}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-6 py-8">
        <div className="flex gap-8">
          {/* ── Sidebar Filters ────────────────────────────── */}
          {showFilters && (
            <aside className="hidden w-72 shrink-0 lg:block">
              <div className="sticky top-24 space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-semibold text-primary">
                    Filters
                  </h2>
                  {activeFilterCount > 0 && (
                    <button
                      type="button"
                      onClick={() => setFilters(INITIAL_FILTERS)}
                      className="text-xs font-medium text-secondary hover:text-primary"
                    >
                      Clear all
                    </button>
                  )}
                </div>

                {/* Category */}
                <FilterSection title="Job Category">
                  <FilterSelect
                    value={filters.category}
                    onChange={(v) => setFilter("category", v)}
                    placeholder="All categories"
                    options={JOB_CATEGORIES.map((c) => ({ value: c, label: c }))}
                  />
                </FilterSection>

                {/* Country */}
                <FilterSection title="Country">
                  <FilterSelect
                    value={filters.country}
                    onChange={(v) => {
                      setFilter("country", v);
                      setFilter("resort", ""); // reset resort when country changes
                    }}
                    placeholder="All countries"
                    options={JOB_COUNTRIES.map((c) => ({ value: c, label: c }))}
                  />
                </FilterSection>

                {/* Resort */}
                <FilterSection title="Resort">
                  <FilterSelect
                    value={filters.resort}
                    onChange={(v) => setFilter("resort", v)}
                    placeholder="All resorts"
                    options={(filters.country
                      ? JOB_RESORTS.filter((r) =>
                          seedJobs.some(
                            (j) =>
                              j.resort_name === r &&
                              j.resort_country === filters.country
                          )
                        )
                      : JOB_RESORTS
                    ).map((r) => ({ value: r, label: r }))}
                  />
                </FilterSection>

                {/* Position Type */}
                <FilterSection title="Position Type">
                  <FilterSelect
                    value={filters.position_type}
                    onChange={(v) => setFilter("position_type", v)}
                    placeholder="All types"
                    options={[
                      { value: "full_time", label: "Full Time" },
                      { value: "part_time", label: "Part Time" },
                      { value: "casual", label: "Casual" },
                    ]}
                  />
                </FilterSection>

                {/* Accommodation */}
                <FilterSection title="Staff Accommodation">
                  <FilterToggleGroup
                    value={filters.accommodation}
                    onChange={(v) => setFilter("accommodation", v)}
                    options={[
                      { value: "all", label: "All" },
                      { value: "yes", label: "Included" },
                      { value: "no", label: "Not included" },
                    ]}
                  />
                </FilterSection>

                {/* Ski Pass */}
                <FilterSection title="Ski Pass">
                  <FilterToggleGroup
                    value={filters.ski_pass}
                    onChange={(v) => setFilter("ski_pass", v)}
                    options={[
                      { value: "all", label: "All" },
                      { value: "yes", label: "Included" },
                      { value: "no", label: "Not included" },
                    ]}
                  />
                </FilterSection>

                {/* Meal Perks */}
                <FilterSection title="Meal Perks">
                  <FilterToggleGroup
                    value={filters.meal_perks}
                    onChange={(v) => setFilter("meal_perks", v)}
                    options={[
                      { value: "all", label: "All" },
                      { value: "yes", label: "Yes" },
                      { value: "no", label: "No" },
                    ]}
                  />
                </FilterSection>

                {/* Visa Sponsorship */}
                <FilterSection title="Visa Sponsorship">
                  <FilterToggleGroup
                    value={filters.visa_sponsorship}
                    onChange={(v) => setFilter("visa_sponsorship", v)}
                    options={[
                      { value: "all", label: "All" },
                      { value: "yes", label: "Available" },
                      { value: "no", label: "Not offered" },
                    ]}
                  />
                </FilterSection>

                {/* Urgently Hiring */}
                <FilterSection title="Other">
                  <label className="flex cursor-pointer items-center gap-3">
                    <input
                      type="checkbox"
                      checked={filters.urgently_hiring}
                      onChange={(e) =>
                        setFilter("urgently_hiring", e.target.checked)
                      }
                      className="h-4 w-4 rounded border-accent text-primary focus:ring-secondary"
                    />
                    <span className="text-sm text-foreground">
                      Urgently hiring only
                    </span>
                  </label>
                </FilterSection>
              </div>
            </aside>
          )}

          {/* ── Main content ───────────────────────────────── */}
          <main className="min-w-0 flex-1">
            {/* Results header */}
            <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-sm text-foreground">
                  <span className="font-semibold text-primary">
                    {filteredJobs.length}
                  </span>{" "}
                  {filteredJobs.length === 1 ? "job" : "jobs"} found
                  {filters.search && (
                    <span>
                      {" "}
                      for &ldquo;
                      <span className="font-medium text-primary">
                        {filters.search}
                      </span>
                      &rdquo;
                    </span>
                  )}
                </p>
              </div>

              <div className="flex items-center gap-3">
                {/* View toggle */}
                <div className="flex rounded-lg border border-accent overflow-hidden">
                  <button
                    onClick={() => setViewMode("list")}
                    className={`px-3 py-2 text-sm font-medium transition-colors ${
                      viewMode === "list"
                        ? "bg-primary text-white"
                        : "bg-white text-foreground/60 hover:bg-accent/20"
                    }`}
                    title="List view"
                  >
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                    </svg>
                  </button>
                  <button
                    onClick={() => setViewMode("map")}
                    className={`px-3 py-2 text-sm font-medium transition-colors ${
                      viewMode === "map"
                        ? "bg-primary text-white"
                        : "bg-white text-foreground/60 hover:bg-accent/20"
                    }`}
                    title="Map view"
                  >
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </button>
                </div>

                <label className="text-xs text-foreground/60">Sort by</label>
                <select
                  value={filters.sort}
                  onChange={(e) => setFilter("sort", e.target.value)}
                  className="rounded-lg border border-accent bg-white px-3 py-2 text-sm text-primary focus:border-secondary focus:outline-none"
                >
                  <option value="newest">Newest first</option>
                  <option value="oldest">Oldest first</option>
                  <option value="a-z">A–Z</option>
                  <option value="applications">Fewest applicants</option>
                </select>
              </div>
            </div>

            {/* Mobile filter pills */}
            {activeFilterCount > 0 && (
              <div className="mb-4 flex flex-wrap gap-2 lg:hidden">
                {filters.category && (
                  <FilterPill
                    label={filters.category}
                    onRemove={() => setFilter("category", "")}
                  />
                )}
                {filters.country && (
                  <FilterPill
                    label={filters.country}
                    onRemove={() => setFilter("country", "")}
                  />
                )}
                {filters.resort && (
                  <FilterPill
                    label={filters.resort}
                    onRemove={() => setFilter("resort", "")}
                  />
                )}
                {filters.accommodation !== "all" && (
                  <FilterPill
                    label={`Accom: ${filters.accommodation}`}
                    onRemove={() => setFilter("accommodation", "all")}
                  />
                )}
                {filters.urgently_hiring && (
                  <FilterPill
                    label="Urgent"
                    onRemove={() => setFilter("urgently_hiring", false)}
                  />
                )}
              </div>
            )}

            {/* Job listings */}
            {filteredJobs.length === 0 ? (
              <div className="rounded-xl border border-accent bg-white p-16 text-center">
                <div className="text-5xl text-foreground/20">&#9968;</div>
                <p className="mt-4 text-lg font-semibold text-primary">
                  No jobs match your filters
                </p>
                <p className="mt-1 text-sm text-foreground/60">
                  Try adjusting your search or clearing some filters.
                </p>
                <button
                  type="button"
                  onClick={() => setFilters(INITIAL_FILTERS)}
                  className="mt-4 rounded-lg bg-primary px-6 py-2 text-sm font-medium text-white hover:bg-primary/90"
                >
                  Clear all filters
                </button>
              </div>
            ) : viewMode === "map" ? (
              /* ── Map View ──────────────────────────────────── */
              <div>
                <ResortMap
                  pins={(() => {
                    // Group jobs by resort and create pins
                    const resortJobCounts = new Map<string, { count: number; names: string[] }>();
                    filteredJobs.forEach((job) => {
                      const existing = resortJobCounts.get(job.resort_name);
                      if (existing) {
                        existing.count++;
                        if (!existing.names.includes(job.title)) existing.names.push(job.title);
                      } else {
                        resortJobCounts.set(job.resort_name, { count: 1, names: [job.title] });
                      }
                    });

                    const pins: MapPin[] = [];
                    resortJobCounts.forEach((info, resortName) => {
                      const resort = resorts.find((r) => r.name === resortName);
                      if (resort) {
                        pins.push({
                          id: resort.id,
                          lat: resort.latitude,
                          lng: resort.longitude,
                          label: `${resort.name} (${info.count} ${info.count === 1 ? "job" : "jobs"})`,
                          sublabel: info.names.slice(0, 3).join(", ") + (info.names.length > 3 ? "..." : ""),
                          href: `/resorts/${resort.id}`,
                        });
                      }
                    });
                    return pins;
                  })()}
                  height="500px"
                />
                {/* Compact job list below map */}
                <div className="mt-4 space-y-2">
                  {filteredJobs.map((job) => (
                    <button
                      key={job.id}
                      type="button"
                      onClick={() => setSelectedJob(selectedJob?.id === job.id ? null : job)}
                      className={`w-full rounded-lg border bg-white px-4 py-3 text-left text-sm transition-all hover:shadow-sm ${
                        selectedJob?.id === job.id
                          ? "border-primary ring-1 ring-primary/20"
                          : "border-accent hover:border-secondary"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <span className="font-semibold text-primary">{job.title}</span>
                          <span className="mx-2 text-foreground/30">·</span>
                          <span className="text-foreground/60">{job.business_name}</span>
                          <span className="mx-2 text-foreground/30">·</span>
                          <span className="text-foreground/60">{job.resort_name}</span>
                        </div>
                        <span className="shrink-0 font-medium text-primary">{job.pay_amount}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              /* ── List View ─────────────────────────────────── */
              <div className="space-y-4">
                {filteredJobs.map((job) => (
                  <JobCard
                    key={job.id}
                    job={job}
                    isSelected={selectedJob?.id === job.id}
                    onClick={() =>
                      setSelectedJob(
                        selectedJob?.id === job.id ? null : job
                      )
                    }
                  />
                ))}
              </div>
            )}
          </main>
        </div>
      </div>

      {/* ── Job Detail Modal / Slide-over ─────────────────── */}
      {selectedJob && (
        <JobDetailPanel
          job={selectedJob}
          onClose={() => setSelectedJob(null)}
        />
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════ */
/*  SUB-COMPONENTS                                            */
/* ═══════════════════════════════════════════════════════════ */

/* ── Job Card ─────────────────────────────────────────────── */
function JobCard({
  job,
  isSelected,
  onClick,
}: {
  job: SeedJob;
  isSelected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full rounded-xl border bg-white p-5 text-left transition-all hover:shadow-md ${
        isSelected
          ? "border-primary ring-2 ring-primary/20"
          : "border-accent hover:border-secondary"
      }`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-base font-semibold text-primary">
              {job.title}
            </h3>
            {job.urgently_hiring && (
              <span className="rounded-full bg-red-50 px-2 py-0.5 text-xs font-semibold text-red-600">
                Urgently Hiring
              </span>
            )}
          </div>

          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-foreground">
            <span className="font-medium">{job.business_name}</span>
            {job.business_verified && (
              <span className="text-xs text-blue-500" title="Verified business">
                &#10003; Verified
              </span>
            )}
            <span className="text-foreground/30">|</span>
            <span>{job.resort_name}</span>
            <span className="text-foreground/30">|</span>
            <span>{job.resort_country}</span>
          </div>
        </div>

        <div className="text-right">
          <p className="text-sm font-semibold text-primary">{job.pay_amount}</p>
          <p className="text-xs text-foreground/50">
            {job.position_type === "full_time"
              ? "Full Time"
              : job.position_type === "part_time"
                ? "Part Time"
                : "Casual"}
          </p>
        </div>
      </div>

      {/* Tags */}
      <div className="mt-3 flex flex-wrap gap-2">
        <PerkTag label={job.category} />
        {job.accommodation_included && <PerkTag label="Accommodation" variant="green" />}
        {job.ski_pass_included && <PerkTag label="Ski Pass" variant="blue" />}
        {job.meal_perks && <PerkTag label="Meals" variant="amber" />}
        {job.visa_sponsorship && <PerkTag label="Visa Sponsorship" variant="purple" />}
      </div>

      {/* Footer */}
      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-foreground/50">
        <span>Posted {timeAgo(job.created_at)}</span>
        {job.start_date && <span>{daysUntil(job.start_date)}</span>}
        <span>{job.applications_count} applicants</span>
      </div>
    </button>
  );
}

/* ── Perk Tag ─────────────────────────────────────────────── */
function PerkTag({
  label,
  variant = "default",
}: {
  label: string;
  variant?: "default" | "green" | "blue" | "amber" | "purple";
}) {
  const styles = {
    default: "bg-accent/40 text-foreground",
    green: "bg-emerald-50 text-emerald-700",
    blue: "bg-blue-50 text-blue-700",
    amber: "bg-amber-50 text-amber-700",
    purple: "bg-purple-50 text-purple-700",
  };
  return (
    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${styles[variant]}`}>
      {label}
    </span>
  );
}

/* ── Job Detail Panel ─────────────────────────────────────── */
function JobDetailPanel({
  job,
  onClose,
}: {
  job: SeedJob;
  onClose: () => void;
}) {
  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="fixed inset-y-0 right-0 z-50 flex w-full max-w-xl flex-col bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-accent p-6">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-xl font-bold text-primary">{job.title}</h2>
              {job.urgently_hiring && (
                <span className="rounded-full bg-red-50 px-2 py-0.5 text-xs font-semibold text-red-600">
                  Urgently Hiring
                </span>
              )}
            </div>
            <p className="mt-1 text-sm text-foreground">
              {job.business_name}
              {job.business_verified && (
                <span className="ml-2 text-xs text-blue-500">
                  &#10003; Verified
                </span>
              )}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-foreground/50 hover:bg-accent/30 hover:text-primary"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="space-y-6">
            {/* Quick info grid */}
            <div className="grid grid-cols-2 gap-3">
              <InfoBox label="Location" value={`${job.resort_name}, ${job.resort_country}`} />
              <InfoBox label="Pay" value={job.pay_amount} />
              <InfoBox
                label="Position"
                value={
                  job.position_type === "full_time"
                    ? "Full Time"
                    : job.position_type === "part_time"
                      ? "Part Time"
                      : "Casual"
                }
              />
              <InfoBox label="Category" value={job.category} />
              <InfoBox
                label="Season"
                value={
                  job.start_date && job.end_date
                    ? `${new Date(job.start_date).toLocaleDateString("en-GB", { month: "short", year: "numeric" })} – ${new Date(job.end_date).toLocaleDateString("en-GB", { month: "short", year: "numeric" })}`
                    : "Flexible"
                }
              />
              <InfoBox label="Language" value={job.language_required} />
            </div>

            {/* Perks */}
            <div>
              <h3 className="text-sm font-semibold text-primary">Perks & Benefits</h3>
              <div className="mt-2 grid grid-cols-2 gap-2">
                <PerkRow
                  label="Staff Accommodation"
                  included={job.accommodation_included}
                  detail={job.housing_details}
                />
                <PerkRow label="Ski / Lift Pass" included={job.ski_pass_included} />
                <PerkRow label="Meal Perks" included={job.meal_perks} />
                <PerkRow label="Visa Sponsorship" included={job.visa_sponsorship} />
              </div>
              {job.accommodation_included && job.housing_details && (
                <p className="mt-2 rounded-lg bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
                  {job.housing_details}
                </p>
              )}
            </div>

            {/* Description */}
            <div>
              <h3 className="text-sm font-semibold text-primary">
                About the Role
              </h3>
              <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-foreground">
                {job.description}
              </p>
            </div>

            {/* Requirements */}
            {job.requirements && (
              <div>
                <h3 className="text-sm font-semibold text-primary">
                  Requirements
                </h3>
                <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-foreground">
                  {job.requirements}
                </p>
              </div>
            )}

            {/* Meta */}
            <div className="rounded-lg bg-background p-4">
              <div className="grid grid-cols-2 gap-3 text-xs text-foreground/60">
                <div>
                  <p className="font-medium text-foreground/40">Posted</p>
                  <p>{timeAgo(job.created_at)}</p>
                </div>
                <div>
                  <p className="font-medium text-foreground/40">Applicants</p>
                  <p>{job.applications_count}</p>
                </div>
                {job.start_date && (
                  <div>
                    <p className="font-medium text-foreground/40">Start Date</p>
                    <p>
                      {new Date(job.start_date).toLocaleDateString("en-GB", {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      })}
                    </p>
                  </div>
                )}
                {job.end_date && (
                  <div>
                    <p className="font-medium text-foreground/40">End Date</p>
                    <p>
                      {new Date(job.end_date).toLocaleDateString("en-GB", {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      })}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Resort link */}
            <Link
              href={`/resorts/${job.resort_id}`}
              className="flex items-center gap-3 rounded-lg border border-accent p-4 transition-colors hover:bg-accent/20"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary/20 text-lg">
                &#9968;
              </div>
              <div>
                <p className="text-sm font-medium text-primary">
                  {job.resort_name}
                </p>
                <p className="text-xs text-foreground/60">
                  View resort details, living info, and more jobs
                </p>
              </div>
            </Link>
          </div>
        </div>

        {/* Footer CTA */}
        <div className="border-t border-accent bg-white p-6">
          <button
            type="button"
            onClick={() =>
              alert(
                "Application submitted! (Test mode — no backend connected)"
              )
            }
            className="w-full rounded-lg bg-primary py-3 text-sm font-semibold text-white transition-colors hover:bg-primary/90"
          >
            Apply Now
          </button>
          <p className="mt-2 text-center text-xs text-foreground/40">
            Test mode — in production this would submit your worker profile as an application.
          </p>
        </div>
      </div>
    </>
  );
}

/* ── Filter components ────────────────────────────────────── */
function FilterSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-foreground/50">
        {title}
      </p>
      {children}
    </div>
  );
}

function FilterSelect({
  value,
  onChange,
  placeholder,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  options: { value: string; label: string }[];
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full rounded-lg border border-accent bg-white px-3 py-2 text-sm text-primary focus:border-secondary focus:outline-none focus:ring-2 focus:ring-secondary/30"
    >
      <option value="">{placeholder}</option>
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

function FilterToggleGroup({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div className="flex gap-1 rounded-lg bg-accent/30 p-1">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={`flex-1 rounded-md px-2 py-1.5 text-xs font-medium transition-colors ${
            value === o.value
              ? "bg-white text-primary shadow-sm"
              : "text-foreground/60 hover:text-foreground"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function FilterPill({
  label,
  onRemove,
}: {
  label: string;
  onRemove: () => void;
}) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
      {label}
      <button
        type="button"
        onClick={onRemove}
        className="ml-0.5 text-foreground/40 hover:text-red-500"
      >
        &times;
      </button>
    </span>
  );
}

/* ── Helper components ────────────────────────────────────── */
function InfoBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-background px-3 py-2.5">
      <p className="text-xs text-foreground/50">{label}</p>
      <p className="mt-0.5 text-sm font-medium text-primary">{value}</p>
    </div>
  );
}

function PerkRow({
  label,
  included,
  detail,
}: {
  label: string;
  included: boolean;
  detail?: string | null;
}) {
  return (
    <div className="flex items-center gap-2">
      <span
        className={`flex h-5 w-5 items-center justify-center rounded-full text-xs ${
          included
            ? "bg-emerald-100 text-emerald-600"
            : "bg-accent/50 text-foreground/30"
        }`}
      >
        {included ? "\u2713" : "\u2013"}
      </span>
      <span
        className={`text-sm ${
          included ? "text-primary" : "text-foreground/40"
        }`}
      >
        {label}
      </span>
    </div>
  );
}
