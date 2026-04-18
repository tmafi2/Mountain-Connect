"use client";

import Link from "next/link";
import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const COUNTRY_FLAGS: Record<string, string> = {
  "Australia": "\u{1F1E6}\u{1F1FA}", "Austria": "\u{1F1E6}\u{1F1F9}", "Argentina": "\u{1F1E6}\u{1F1F7}", "Brazil": "\u{1F1E7}\u{1F1F7}",
  "Canada": "\u{1F1E8}\u{1F1E6}", "Chile": "\u{1F1E8}\u{1F1F1}", "France": "\u{1F1EB}\u{1F1F7}", "Germany": "\u{1F1E9}\u{1F1EA}",
  "Ireland": "\u{1F1EE}\u{1F1EA}", "Italy": "\u{1F1EE}\u{1F1F9}", "Japan": "\u{1F1EF}\u{1F1F5}", "Mexico": "\u{1F1F2}\u{1F1FD}",
  "Netherlands": "\u{1F1F3}\u{1F1F1}", "New Zealand": "\u{1F1F3}\u{1F1FF}", "Norway": "\u{1F1F3}\u{1F1F4}", "Poland": "\u{1F1F5}\u{1F1F1}",
  "Portugal": "\u{1F1F5}\u{1F1F9}", "South Africa": "\u{1F1FF}\u{1F1E6}", "South Korea": "\u{1F1F0}\u{1F1F7}", "Spain": "\u{1F1EA}\u{1F1F8}",
  "Sweden": "\u{1F1F8}\u{1F1EA}", "Switzerland": "\u{1F1E8}\u{1F1ED}", "United Kingdom": "\u{1F1EC}\u{1F1E7}", "USA": "\u{1F1FA}\u{1F1F8}",
  "United States": "\u{1F1FA}\u{1F1F8}",
};

/* --- Types --- */

export interface ListingItem {
  id: string;
  title: string;
  resort: string;
  location: string;
  status: "active" | "paused" | "closed" | "draft";
  pay: string;
  type: string;
  posted: string;
  startDate: string;
  endDate: string;
  housing: boolean;
  skiPass: boolean;
  urgent: boolean;
}

export type ApplicantStatus = "pending" | "reviewed" | "interview_scheduled" | "accepted" | "rejected";

export interface ApplicantItem {
  id: string;
  applicationId: string;
  jobId: string;
  name: string;
  email: string;
  location: string;
  avatar: string | null;
  nationality: string | null;
  skills: string[];
  experience: number;
  status: ApplicantStatus;
  appliedAt: string;
  coverLetter: string;
  availability: string;
  languages: string[];
}

export interface ManageListingsClientProps {
  initialListings: ListingItem[];
  initialApplicants: ApplicantItem[];
  /** Whether the current business is verified. When false, all listings are
   *  hidden from the public regardless of status. */
  businessVerified?: boolean;
}

/* --- Style helpers --- */

const LISTING_STATUS_STYLES: Record<string, { bg: string; text: string; dot: string; label: string }> = {
  active: { bg: "bg-green-50 border-green-200", text: "text-green-700", dot: "bg-green-500", label: "Active" },
  draft: { bg: "bg-blue-50 border-blue-200", text: "text-blue-600", dot: "bg-blue-400", label: "Draft" },
  paused: { bg: "bg-yellow-50 border-yellow-200", text: "text-yellow-700", dot: "bg-yellow-400", label: "Paused" },
  closed: { bg: "bg-gray-50 border-gray-200", text: "text-gray-500", dot: "bg-gray-400", label: "Closed" },
};

const APPLICANT_STATUS_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  pending: { bg: "bg-blue-50", text: "text-blue-700", label: "Pending" },
  reviewed: { bg: "bg-yellow-50", text: "text-yellow-700", label: "Reviewed" },
  interview_scheduled: { bg: "bg-purple-50", text: "text-purple-700", label: "Interview" },
  accepted: { bg: "bg-green-50", text: "text-green-700", label: "Accepted" },
  rejected: { bg: "bg-red-50", text: "text-red-500", label: "Unsuccessful" },
};

type FilterTab = "all" | "active" | "draft" | "paused" | "closed";

/* --- Component --- */

export default function ManageListingsClient({ initialListings, initialApplicants, businessVerified = true }: ManageListingsClientProps) {
  return (
    <Suspense fallback={<div className="flex min-h-[60vh] items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-primary" /></div>}>
      <ManageListingsContent initialListings={initialListings} initialApplicants={initialApplicants} businessVerified={businessVerified} />
    </Suspense>
  );
}

function ManageListingsContent({ initialListings, initialApplicants, businessVerified = true }: ManageListingsClientProps) {
  const searchParams = useSearchParams();
  const initialSearch = searchParams.get("search") || "";
  const [filter, setFilter] = useState<FilterTab>("all");
  const [expandedListing, setExpandedListing] = useState<string | null>(null);
  const [selectedApplicant, setSelectedApplicant] = useState<string | null>(null);
  const [applicants, setApplicants] = useState<ApplicantItem[]>(initialApplicants);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState(initialSearch);
  const [applicantSort, setApplicantSort] = useState<"newest" | "oldest" | "experience" | "name">("newest");
  const [applicantStatusFilter, setApplicantStatusFilter] = useState<"all" | ApplicantStatus>("all");
  const [listings] = useState<ListingItem[]>(initialListings);
  const [acceptConfirm, setAcceptConfirm] = useState<ApplicantItem | null>(null);
  const [editingStatus, setEditingStatus] = useState<string | null>(null);
  const [templateModalJob, setTemplateModalJob] = useState<ListingItem | null>(null);
  const [templateModalName, setTemplateModalName] = useState("");
  const [templateModalSaving, setTemplateModalSaving] = useState(false);
  const [templateModalError, setTemplateModalError] = useState<string | null>(null);
  const [templateSavedToast, setTemplateSavedToast] = useState(false);

  const query = searchQuery.toLowerCase().trim();

  const searchFiltered = listings.filter((listing) => {
    if (!query) return true;
    const listingApplicants = applicants.filter((a) => a.jobId === listing.id);
    return (
      listing.title.toLowerCase().includes(query) ||
      listing.resort.toLowerCase().includes(query) ||
      listing.location.toLowerCase().includes(query) ||
      listingApplicants.some((a) => a.name.toLowerCase().includes(query))
    );
  });

  const filtered = filter === "all" ? searchFiltered : searchFiltered.filter((l) => l.status === filter);

  const counts = {
    all: searchFiltered.length,
    active: searchFiltered.filter((l) => l.status === "active").length,
    draft: searchFiltered.filter((l) => l.status === "draft").length,
    paused: searchFiltered.filter((l) => l.status === "paused").length,
    closed: searchFiltered.filter((l) => l.status === "closed").length,
  };

  const getApplicantsForJob = (jobId: string) => {
    let result = applicants.filter((a) => a.jobId === jobId);

    if (applicantStatusFilter !== "all") {
      result = result.filter((a) => a.status === applicantStatusFilter);
    }

    result = [...result].sort((a, b) => {
      switch (applicantSort) {
        case "newest":
          return new Date(b.appliedAt).getTime() - new Date(a.appliedAt).getTime();
        case "oldest":
          return new Date(a.appliedAt).getTime() - new Date(b.appliedAt).getTime();
        case "experience":
          return b.experience - a.experience;
        case "name":
          return a.name.localeCompare(b.name);
        default:
          return 0;
      }
    });

    return result;
  };

  const getRawApplicantsForJob = (jobId: string) => applicants.filter((a) => a.jobId === jobId);

  const handleStatusChange = async (applicantId: string, newStatus: ApplicantStatus) => {
    const dbStatusMap: Record<ApplicantStatus, string> = {
      pending: "new",
      reviewed: "viewed",
      interview_scheduled: "interview",
      accepted: "accepted",
      rejected: "rejected",
    };

    setActionLoading(applicantId + newStatus);

    setApplicants((prev) =>
      prev.map((a) => (a.id === applicantId ? { ...a, status: newStatus } : a))
    );

    try {
      const applicant = applicants.find((a) => a.id === applicantId);
      if (applicant?.applicationId) {
        const supabase = createClient();
        await supabase
          .from("applications")
          .update({ status: dbStatusMap[newStatus] })
          .eq("id", applicant.applicationId);
      }
    } catch (err) {
      console.error("Failed to update application status:", err);
    }

    setActionLoading(null);
  };

  const toggleListing = (id: string) => {
    setExpandedListing(expandedListing === id ? null : id);
    setSelectedApplicant(null);
    setApplicantSort("newest");
    setApplicantStatusFilter("all");
  };

  const openTemplateModal = (listing: ListingItem) => {
    setTemplateModalJob(listing);
    setTemplateModalName(listing.title);
    setTemplateModalError(null);
  };

  const closeTemplateModal = () => {
    if (templateModalSaving) return;
    setTemplateModalJob(null);
    setTemplateModalName("");
    setTemplateModalError(null);
  };

  const confirmSaveTemplateFromJob = async () => {
    if (!templateModalJob) return;
    if (!templateModalName.trim()) return;
    setTemplateModalSaving(true);
    setTemplateModalError(null);

    const res = await fetch("/api/templates/from-job", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jobId: templateModalJob.id,
        name: templateModalName.trim(),
      }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setTemplateModalError(data.error || "Failed to save template.");
      setTemplateModalSaving(false);
      return;
    }

    setTemplateModalSaving(false);
    setTemplateModalJob(null);
    setTemplateModalName("");
    setTemplateSavedToast(true);
    setTimeout(() => setTemplateSavedToast(false), 4000);
  };

  const activeApplicant = applicants.find((a) => a.id === selectedApplicant);

  return (
    <div className="mx-auto max-w-5xl">
      {/* Corporate gradient header */}
      <div className="relative -mx-6 -mt-6 mb-8 overflow-hidden rounded-2xl px-8 py-10 sm:px-10 sm:py-12">
        <div className="absolute inset-0 bg-gradient-to-br from-[#0a1e33] via-[#0f2942] to-[#132d4a]" />
        <div className="pointer-events-none absolute -right-12 -top-12 h-48 w-48 rounded-3xl bg-secondary/8 blur-2xl rotate-12" />
        <div className="pointer-events-none absolute bottom-0 left-1/3 h-32 w-64 rounded-full bg-secondary/6 blur-3xl" />
        <div className="pointer-events-none absolute right-0 bottom-0 h-24 w-24 rounded-2xl bg-highlight/5 blur-xl" />
        <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: "radial-gradient(circle at 1px 1px, white 1px, transparent 0)", backgroundSize: "32px 32px" }} />

        <div className="relative flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <svg className="h-4 w-4 text-secondary/70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              <span className="text-xs font-medium uppercase tracking-widest text-secondary/70">Job Board</span>
            </div>
            <h1 className="text-2xl font-bold text-white">Manage Listings</h1>
            <p className="mt-1 text-sm text-white/50">
              View, edit, and manage all your job postings.
            </p>
          </div>
          <Link
            href="/business/post-job"
            className="shrink-0 rounded-xl bg-white/10 border border-white/20 px-4 py-2.5 text-sm font-semibold text-white transition-all hover:bg-white/20 hover:-translate-y-0.5"
          >
            + Post New Job
          </Link>
        </div>
      </div>

      {/* Search bar */}
      <div className="relative mb-4">
        <svg className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search listings, resorts, applicants..."
          className="w-full rounded-xl border border-accent/40 bg-white py-2.5 pl-10 pr-4 text-sm text-primary shadow-sm focus:border-secondary focus:outline-none focus:ring-1 focus:ring-secondary"
        />
      </div>

      {/* Filter tabs */}
      <div className="mb-6 flex gap-2">
        {(["all", "active", "draft", "paused", "closed"] as FilterTab[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setFilter(tab)}
            className={`rounded-xl border px-3 py-1.5 text-sm font-medium transition-all ${
              filter === tab
                ? "border-primary bg-primary text-white shadow-sm"
                : "border-accent/50 bg-white text-foreground/70 hover:bg-accent/20 hover:border-accent"
            }`}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)} ({counts[tab]})
          </button>
        ))}
      </div>

      {/* Listings */}
      <div className="space-y-4">
        {filtered.length === 0 && (
          <div className="rounded-2xl border border-accent/40 bg-white p-10 text-center shadow-sm">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-accent/20">
              <svg className="h-6 w-6 text-foreground/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <p className="text-sm font-medium text-foreground/60">No listings found.</p>
            <p className="mt-1 text-xs text-foreground/40">Try adjusting your filters or post a new job.</p>
          </div>
        )}
        {filtered.map((listing) => {
          const style = LISTING_STATUS_STYLES[listing.status];
          const isExpanded = expandedListing === listing.id;
          const jobApplicants = getApplicantsForJob(listing.id);
          const rawJobApplicants = getRawApplicantsForJob(listing.id);

          return (
            <div key={listing.id} className="rounded-2xl border border-accent/40 bg-white overflow-hidden shadow-sm transition-all hover:shadow-md">
              {/* Listing header -- clickable */}
              <button
                onClick={() => toggleListing(listing.id)}
                className="w-full p-5 text-left transition-colors hover:bg-accent/5"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <Link
                        href={`/business/manage-listings/${listing.id}`}
                        onClick={(e) => e.stopPropagation()}
                        className="font-semibold text-primary hover:text-secondary hover:underline"
                      >
                        {listing.title}
                      </Link>
                      <span
                        className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${style.bg} ${style.text}`}
                      >
                        <span className={`h-1.5 w-1.5 rounded-full ${style.dot}`} />
                        {style.label}
                      </span>
                      {/* 'Not public' indicator — listing is not visible to workers
                          unless status is active AND the business is verified. */}
                      {(!businessVerified || listing.status !== "active") && (
                        <span
                          className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-700"
                          title={
                            !businessVerified
                              ? "Your business is not yet verified — this listing is hidden from workers."
                              : listing.status === "draft"
                              ? "Drafts are only visible to you. Publish to make it live."
                              : listing.status === "paused"
                              ? "Paused listings are hidden from workers. Resume to make it live."
                              : "Closed listings are hidden from workers."
                          }
                        >
                          <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                          </svg>
                          Not public
                        </span>
                      )}
                      {listing.urgent && (
                        <span className="inline-flex rounded-full border border-red-200 bg-red-50 px-2 py-0.5 text-xs font-semibold text-red-600">
                          Urgently Hiring
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-sm text-foreground/60">
                      {listing.resort} &middot; {listing.location}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0 ml-4">
                    <span
                      role="button"
                      tabIndex={0}
                      onClick={(e) => {
                        e.stopPropagation();
                        openTemplateModal(listing);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.stopPropagation();
                          e.preventDefault();
                          openTemplateModal(listing);
                        }
                      }}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-purple-200 bg-purple-50 px-2.5 py-1 text-xs font-medium text-purple-700 transition-colors hover:bg-purple-100 cursor-pointer"
                      title="Save this listing as a template for reuse"
                    >
                      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
                      </svg>
                      Save as Template
                    </span>
                    <span className="text-sm font-medium text-foreground/50">
                      {rawJobApplicants.length} applicant{rawJobApplicants.length !== 1 ? "s" : ""}
                    </span>
                    <svg
                      className={`h-5 w-5 text-foreground/40 transition-transform ${isExpanded ? "rotate-180" : ""}`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>

                {/* Details row */}
                <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5">
                  <span className="text-sm text-foreground/60">{listing.pay}</span>
                  <span className="text-xs text-foreground/30">&middot;</span>
                  <span className="text-sm text-foreground/60">{listing.type}</span>
                  <span className="text-xs text-foreground/30">&middot;</span>
                  <span className="text-sm text-foreground/60">{listing.startDate} -- {listing.endDate}</span>
                  {listing.housing && (
                    <span className="inline-flex rounded-full bg-secondary/10 px-2 py-0.5 text-xs font-medium text-primary">Housing</span>
                  )}
                  {listing.skiPass && (
                    <span className="inline-flex rounded-full bg-secondary/10 px-2 py-0.5 text-xs font-medium text-primary">Ski Pass</span>
                  )}
                </div>
              </button>

              {/* Expanded: applicant list + detail */}
              {isExpanded && (
                <div className="border-t border-accent/40">
                  {rawJobApplicants.length === 0 ? (
                    <div className="p-8 text-center">
                      <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-xl bg-accent/20">
                        <svg className="h-5 w-5 text-foreground/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                      </div>
                      <p className="text-sm text-foreground/50">No applicants yet for this listing.</p>
                    </div>
                  ) : (
                    <div className="flex">
                      {/* Applicant list */}
                      <div className={`border-r border-accent/40 ${selectedApplicant ? "w-2/5" : "w-full"}`}>
                        <div className="px-4 py-3 border-b border-accent/30 bg-background/50 space-y-2.5">
                          <div className="flex items-center justify-between">
                            <p className="text-xs font-semibold uppercase tracking-wider text-foreground/50">
                              Applicants ({jobApplicants.length}{applicantStatusFilter !== "all" ? ` of ${rawJobApplicants.length}` : ""})
                            </p>
                            <select
                              value={applicantSort}
                              onChange={(e) => setApplicantSort(e.target.value as typeof applicantSort)}
                              className="rounded-lg border border-accent/40 bg-white px-2 py-1 text-xs text-primary focus:border-secondary focus:outline-none focus:ring-1 focus:ring-secondary"
                            >
                              <option value="newest">Newest First</option>
                              <option value="oldest">Oldest First</option>
                              <option value="experience">Most Experience</option>
                              <option value="name">Name A-Z</option>
                            </select>
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            {(
                              [
                                { value: "all", label: "All" },
                                { value: "pending", label: "Pending" },
                                { value: "reviewed", label: "Reviewed" },
                                { value: "interview_scheduled", label: "Interview" },
                                { value: "accepted", label: "Accepted" },
                                { value: "rejected", label: "Unsuccessful" },
                              ] as const
                            ).map((pill) => (
                              <button
                                key={pill.value}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setApplicantStatusFilter(pill.value);
                                  setSelectedApplicant(null);
                                }}
                                className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium transition-colors ${
                                  applicantStatusFilter === pill.value
                                    ? "bg-secondary text-white"
                                    : "bg-white border border-accent/50 text-foreground/60 hover:bg-accent/20"
                                }`}
                              >
                                {pill.label}
                              </button>
                            ))}
                          </div>
                        </div>
                        <div className="divide-y divide-accent/30">
                          {jobApplicants.length === 0 && (
                            <div className="px-4 py-6 text-center">
                              <p className="text-sm text-foreground/50">No applicants match this filter.</p>
                            </div>
                          )}
                          {jobApplicants.map((applicant) => {
                            const aStyle = APPLICANT_STATUS_STYLES[applicant.status];
                            const isSelected = selectedApplicant === applicant.id;
                            const initials = applicant.name
                              .split(" ")
                              .map((n) => n[0])
                              .join("")
                              .toUpperCase();

                            return (
                              <button
                                key={applicant.id}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedApplicant(isSelected ? null : applicant.id);
                                }}
                                className={`w-full px-4 py-3 text-left transition-colors hover:bg-accent/10 ${
                                  isSelected ? "bg-secondary/10 border-l-2 border-l-secondary" : ""
                                }`}
                              >
                                <div className="flex items-center gap-3">
                                  <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-secondary/20 text-xs font-bold text-primary">
                                    {applicant.avatar && applicant.avatar.startsWith("flag:") ? (
                                      <span className="text-xl">{applicant.avatar.replace("flag:", "")}</span>
                                    ) : applicant.avatar ? (
                                      <img src={applicant.avatar} alt={applicant.name} className="h-full w-full object-cover" />
                                    ) : applicant.nationality && COUNTRY_FLAGS[applicant.nationality] ? (
                                      <span className="text-xl">{COUNTRY_FLAGS[applicant.nationality]}</span>
                                    ) : (
                                      initials
                                    )}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                      <p className="font-medium text-primary text-sm truncate">{applicant.name}</p>
                                      <span className={`inline-flex rounded-full px-1.5 py-0.5 text-[10px] font-medium ${aStyle.bg} ${aStyle.text}`}>
                                        {aStyle.label}
                                      </span>
                                    </div>
                                    <p className="text-xs text-foreground/50 truncate">{applicant.location} &middot; {applicant.experience}y exp</p>
                                  </div>
                                  <svg className="h-4 w-4 text-foreground/30 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                  </svg>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Applicant detail panel */}
                      {selectedApplicant && activeApplicant && (
                        <div className="w-3/5 p-5 overflow-y-auto" style={{ maxHeight: "calc(100vh - 200px)" }}>
                          {/* Header */}
                          <div className="flex items-start justify-between">
                            <div className="flex items-center gap-3">
                              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-secondary/20 text-sm font-bold text-primary">
                                {activeApplicant.name.split(" ").map((n) => n[0]).join("").toUpperCase()}
                              </div>
                              <div>
                                <h3 className="font-semibold text-primary">{activeApplicant.name}</h3>
                                <p className="text-sm text-foreground/60">{activeApplicant.location}</p>
                              </div>
                            </div>
                            <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${APPLICANT_STATUS_STYLES[activeApplicant.status].bg} ${APPLICANT_STATUS_STYLES[activeApplicant.status].text}`}>
                              {APPLICANT_STATUS_STYLES[activeApplicant.status].label}
                            </span>
                          </div>

                          {/* Contact */}
                          <div className="mt-4 flex items-center gap-2 text-sm text-foreground/60">
                            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                            </svg>
                            {activeApplicant.email}
                          </div>

                          {/* Quick stats */}
                          <div className="mt-4 grid grid-cols-3 gap-3">
                            <div className="rounded-xl bg-accent/20 p-3 text-center">
                              <p className="text-lg font-bold text-primary">{activeApplicant.experience}</p>
                              <p className="text-[10px] uppercase tracking-wider text-foreground/50">Years Exp.</p>
                            </div>
                            <div className="rounded-xl bg-accent/20 p-3 text-center">
                              <p className="text-lg font-bold text-primary">{activeApplicant.languages.length}</p>
                              <p className="text-[10px] uppercase tracking-wider text-foreground/50">Languages</p>
                            </div>
                            <div className="rounded-xl bg-accent/20 p-3 text-center">
                              <p className="text-lg font-bold text-primary">{activeApplicant.skills.length}</p>
                              <p className="text-[10px] uppercase tracking-wider text-foreground/50">Skills</p>
                            </div>
                          </div>

                          {/* Skills */}
                          <div className="mt-5">
                            <h4 className="text-xs font-semibold uppercase tracking-wider text-foreground/50">Skills &amp; Certifications</h4>
                            <div className="mt-2 flex flex-wrap gap-1.5">
                              {activeApplicant.skills.map((skill) => (
                                <span key={skill} className="inline-flex rounded-full bg-accent/30 px-2.5 py-0.5 text-xs text-foreground/70">
                                  {skill}
                                </span>
                              ))}
                            </div>
                          </div>

                          {/* Languages */}
                          <div className="mt-4">
                            <h4 className="text-xs font-semibold uppercase tracking-wider text-foreground/50">Languages</h4>
                            <div className="mt-2 flex flex-wrap gap-1.5">
                              {activeApplicant.languages.map((lang) => (
                                <span key={lang} className="inline-flex rounded-full bg-secondary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
                                  {lang}
                                </span>
                              ))}
                            </div>
                          </div>

                          {/* Availability */}
                          <div className="mt-4">
                            <h4 className="text-xs font-semibold uppercase tracking-wider text-foreground/50">Availability</h4>
                            <p className="mt-1.5 text-sm text-foreground">{activeApplicant.availability}</p>
                          </div>

                          {/* Cover letter */}
                          <div className="mt-4">
                            <h4 className="text-xs font-semibold uppercase tracking-wider text-foreground/50">Cover Letter</h4>
                            <div className="mt-2 rounded-xl bg-accent/10 p-4">
                              <p className="text-sm leading-relaxed text-foreground/80">{activeApplicant.coverLetter}</p>
                            </div>
                          </div>

                          {/* Applied date */}
                          <p className="mt-4 text-xs text-foreground/40">Applied {activeApplicant.appliedAt}</p>

                          {/* Action buttons */}
                          <div className="mt-5 border-t border-accent/40 pt-4">
                            <h4 className="text-xs font-semibold uppercase tracking-wider text-foreground/50 mb-3">Actions</h4>
                            <div className="flex flex-wrap gap-2">
                              {(activeApplicant.status === "accepted" || activeApplicant.status === "rejected") ? (
                                editingStatus === activeApplicant.id ? (
                                  <>
                                    <button
                                      onClick={() => { handleStatusChange(activeApplicant.id, "pending"); setEditingStatus(null); }}
                                      disabled={actionLoading !== null}
                                      className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-medium text-blue-700 transition-all hover:bg-blue-100 hover:-translate-y-0.5 disabled:opacity-50"
                                    >
                                      Move to Pending
                                    </button>
                                    <button
                                      onClick={() => { handleStatusChange(activeApplicant.id, "reviewed"); setEditingStatus(null); }}
                                      disabled={actionLoading !== null}
                                      className="rounded-xl border border-yellow-200 bg-yellow-50 px-4 py-2 text-sm font-medium text-yellow-700 transition-all hover:bg-yellow-100 hover:-translate-y-0.5 disabled:opacity-50"
                                    >
                                      Mark Reviewed
                                    </button>
                                    <button
                                      onClick={() => { handleStatusChange(activeApplicant.id, "interview_scheduled"); setEditingStatus(null); }}
                                      disabled={actionLoading !== null}
                                      className="rounded-xl border border-purple-200 bg-purple-50 px-4 py-2 text-sm font-medium text-purple-700 transition-all hover:bg-purple-100 hover:-translate-y-0.5 disabled:opacity-50"
                                    >
                                      Request Interview
                                    </button>
                                    {activeApplicant.status === "rejected" && (
                                      <button
                                        onClick={() => { setAcceptConfirm(activeApplicant); setEditingStatus(null); }}
                                        disabled={actionLoading !== null}
                                        className="rounded-xl bg-green-600 px-4 py-2 text-sm font-semibold text-white transition-all hover:bg-green-700 hover:-translate-y-0.5 disabled:opacity-50"
                                      >
                                        Accept
                                      </button>
                                    )}
                                    {activeApplicant.status === "accepted" && (
                                      <button
                                        onClick={() => { handleStatusChange(activeApplicant.id, "rejected"); setEditingStatus(null); }}
                                        disabled={actionLoading !== null}
                                        className="rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm font-medium text-red-600 transition-all hover:bg-red-100 hover:-translate-y-0.5 disabled:opacity-50"
                                      >
                                        Unsuccessful
                                      </button>
                                    )}
                                    <button
                                      onClick={() => setEditingStatus(null)}
                                      className="rounded-xl border border-accent/40 px-4 py-2 text-sm font-medium text-foreground/50 transition-colors hover:bg-accent/10"
                                    >
                                      Cancel
                                    </button>
                                  </>
                                ) : (
                                  <button
                                    onClick={() => setEditingStatus(activeApplicant.id)}
                                    className="rounded-xl border border-accent/40 px-4 py-2 text-sm font-medium text-foreground/60 transition-colors hover:bg-accent/10 flex items-center gap-1.5"
                                  >
                                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                                      <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" />
                                    </svg>
                                    Edit Status
                                  </button>
                                )
                              ) : (
                                <>
                                  <button
                                    onClick={() => handleStatusChange(activeApplicant.id, "rejected")}
                                    disabled={actionLoading !== null}
                                    className="rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm font-medium text-red-600 transition-all hover:bg-red-100 hover:-translate-y-0.5 disabled:opacity-50"
                                  >
                                    {actionLoading === activeApplicant.id + "rejected" ? "Updating..." : "Unsuccessful"}
                                  </button>
                                  {activeApplicant.status !== "interview_scheduled" && (
                                    <button
                                      onClick={() => handleStatusChange(activeApplicant.id, "interview_scheduled")}
                                      disabled={actionLoading !== null}
                                      className="rounded-xl border border-purple-200 bg-purple-50 px-4 py-2 text-sm font-medium text-purple-700 transition-all hover:bg-purple-100 hover:-translate-y-0.5 disabled:opacity-50"
                                    >
                                      {actionLoading === activeApplicant.id + "interview_scheduled" ? "Requesting..." : "Request Interview"}
                                    </button>
                                  )}
                                  <button
                                    onClick={() => setAcceptConfirm(activeApplicant)}
                                    disabled={actionLoading !== null}
                                    className="rounded-xl bg-green-600 px-4 py-2 text-sm font-semibold text-white transition-all hover:bg-green-700 hover:-translate-y-0.5 disabled:opacity-50"
                                  >
                                    Accept
                                  </button>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Accept Confirmation Modal */}
      {acceptConfirm && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setAcceptConfirm(null)} />
          <div className="relative w-full max-w-md rounded-2xl bg-white shadow-2xl p-6">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-green-100">
              <svg className="h-7 w-7 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="mt-4 text-center text-lg font-bold text-primary">
              Accept Applicant
            </h3>
            <p className="mt-2 text-center text-sm text-foreground/60">
              Are you sure you want to accept <span className="font-semibold text-primary">{acceptConfirm.name}</span>?
            </p>
            <div className="mt-4 rounded-xl bg-green-50 border border-green-200 p-3">
              <div className="flex items-start gap-2">
                <svg className="mt-0.5 h-4 w-4 shrink-0 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
                </svg>
                <p className="text-xs text-green-700">
                  Accepting will notify <span className="font-semibold">{acceptConfirm.name}</span> that their application has been successful. This will count towards your filled positions.
                </p>
              </div>
            </div>
            <div className="mt-6 flex gap-3">
              <button
                onClick={() => setAcceptConfirm(null)}
                className="flex-1 rounded-xl border border-accent/40 px-4 py-2.5 text-sm font-semibold text-foreground/70 hover:bg-accent/10 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  handleStatusChange(acceptConfirm.id, "accepted");
                  setAcceptConfirm(null);
                }}
                className="flex-1 rounded-xl bg-green-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-green-700 transition-colors"
              >
                Yes, Accept
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Save as Template modal */}
      {templateModalJob && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={closeTemplateModal}
          />
          <div className="relative w-full max-w-md rounded-2xl border border-accent/30 bg-white p-6 shadow-2xl">
            <h3 className="text-lg font-semibold text-primary">Save as Template</h3>
            <p className="mt-1 text-sm text-foreground/60">
              Save &ldquo;{templateModalJob.title}&rdquo; as a template so you can reuse it next season. Dates and resort will not be saved.
            </p>
            <input
              type="text"
              value={templateModalName}
              onChange={(e) => setTemplateModalName(e.target.value)}
              placeholder="Template name (e.g. Head Housekeeper)"
              className="mt-4 w-full rounded-lg border border-accent/50 bg-white px-4 py-2.5 text-sm text-primary focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              autoFocus
            />
            {templateModalError && (
              <p className="mt-2 text-xs text-red-600">{templateModalError}</p>
            )}
            <div className="mt-5 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={closeTemplateModal}
                disabled={templateModalSaving}
                className="rounded-lg px-4 py-2 text-sm font-medium text-foreground/60 hover:bg-accent/20 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmSaveTemplateFromJob}
                disabled={!templateModalName.trim() || templateModalSaving}
                className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary/90 disabled:opacity-50"
              >
                {templateModalSaving ? "Saving..." : "Save Template"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Saved toast */}
      {templateSavedToast && (
        <div className="fixed bottom-6 right-6 z-[70] flex items-center gap-2 rounded-xl border border-purple-200 bg-purple-50 px-4 py-3 text-sm text-purple-700 shadow-lg">
          <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Template saved! Find it on the post-job page.
        </div>
      )}
    </div>
  );
}
