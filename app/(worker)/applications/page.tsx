"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

interface Application {
  id: string;
  job_title: string;
  business_name: string;
  business_location: string;
  resort_name: string;
  status: "applied" | "viewed" | "interview" | "offered" | "accepted" | "rejected";
  applied_at: string;
  cover_letter: string;
  has_resume: boolean;
  salary_range: string;
  employment_type: string;
  start_date: string;
  interview_status: "invited" | "scheduled" | "completed" | null;
  interview_date: string | null;
  interview_time: string | null;
  last_updated: string;
}

const demoApplications: Application[] = [
  {
    id: "app-w1",
    job_title: "Ski Instructor — All Levels",
    business_name: "Whistler Blackcomb Ski School",
    business_location: "Whistler, BC",
    resort_name: "Whistler Blackcomb",
    status: "interview",
    applied_at: "2026-03-05T11:20:00Z",
    cover_letter:
      "I am an experienced ski instructor with CSIA Level 2 certification and five seasons of teaching across all age groups and ability levels. I am passionate about sharing the joy of skiing and creating memorable mountain experiences for guests.",
    has_resume: true,
    salary_range: "$22–$30/hr",
    employment_type: "Seasonal Full-Time",
    start_date: "Dec 2026",
    interview_status: "scheduled",
    interview_date: "2026-03-28",
    interview_time: "10:00",
    last_updated: "2026-03-20T09:00:00Z",
  },
  {
    id: "app-w2",
    job_title: "Guest Services Agent",
    business_name: "Revelstoke Mountain Resort",
    business_location: "Revelstoke, BC",
    resort_name: "Revelstoke Mountain Resort",
    status: "interview",
    applied_at: "2026-03-08T09:00:00Z",
    cover_letter:
      "With three years of front-desk hospitality experience, I thrive in fast-paced resort environments. I am fluent in English and French and love helping guests discover the best a resort has to offer.",
    has_resume: true,
    salary_range: "$19–$23/hr",
    employment_type: "Seasonal Full-Time",
    start_date: "Nov 2026",
    interview_status: "invited",
    interview_date: null,
    interview_time: null,
    last_updated: "2026-03-18T14:30:00Z",
  },
  {
    id: "app-w3",
    job_title: "Bartender — Après Ski Lounge",
    business_name: "Whistler Village Hospitality",
    business_location: "Whistler Village, BC",
    resort_name: "Whistler Blackcomb",
    status: "applied",
    applied_at: "2026-03-12T18:45:00Z",
    cover_letter:
      "I bring four years of bartending experience with a specialty in craft cocktails and high-volume service. I am Serving It Right certified and ready to bring great energy to the après scene.",
    has_resume: true,
    salary_range: "$17/hr + tips",
    employment_type: "Seasonal Part-Time",
    start_date: "Dec 2026",
    interview_status: null,
    interview_date: null,
    interview_time: null,
    last_updated: "2026-03-12T18:45:00Z",
  },
  {
    id: "app-w4",
    job_title: "Snowboard Instructor",
    business_name: "Big White Ski School",
    business_location: "Big White, BC",
    resort_name: "Big White",
    status: "viewed",
    applied_at: "2026-03-14T06:30:00Z",
    cover_letter:
      "As a CASI Level 1 snowboard instructor and former competitive rider, I am excited to share my passion for snowboarding with learners of all levels at Big White.",
    has_resume: false,
    salary_range: "$20–$26/hr",
    employment_type: "Seasonal Full-Time",
    start_date: "Dec 2026",
    interview_status: null,
    interview_date: null,
    interview_time: null,
    last_updated: "2026-03-16T11:00:00Z",
  },
  {
    id: "app-w5",
    job_title: "Lift Operations Crew",
    business_name: "Whistler Blackcomb Operations",
    business_location: "Whistler, BC",
    resort_name: "Whistler Blackcomb",
    status: "accepted",
    applied_at: "2026-02-20T10:00:00Z",
    cover_letter:
      "I have strong mechanical aptitude and a calm demeanor under pressure. I completed lift operations training last season and am eager to return in a full-time role.",
    has_resume: true,
    salary_range: "$21–$25/hr",
    employment_type: "Seasonal Full-Time",
    start_date: "Nov 2026",
    interview_status: "completed",
    interview_date: "2026-03-10",
    interview_time: "14:00",
    last_updated: "2026-03-15T16:00:00Z",
  },
  {
    id: "app-w6",
    job_title: "Resort Host — Front Desk",
    business_name: "Sun Peaks Grand Hotel",
    business_location: "Sun Peaks, BC",
    resort_name: "Sun Peaks",
    status: "offered",
    applied_at: "2026-02-25T08:15:00Z",
    cover_letter:
      "I have two years of hotel front-desk experience and a passion for mountain communities. I excel at creating warm first impressions and resolving guest concerns quickly.",
    has_resume: true,
    salary_range: "$19–$22/hr",
    employment_type: "Seasonal Full-Time",
    start_date: "Dec 2026",
    interview_status: "completed",
    interview_date: "2026-03-08",
    interview_time: "11:00",
    last_updated: "2026-03-20T10:00:00Z",
  },
  {
    id: "app-w7",
    job_title: "Ski Technician",
    business_name: "Whistler Ski Rentals",
    business_location: "Whistler Village, BC",
    resort_name: "Whistler Blackcomb",
    status: "rejected",
    applied_at: "2026-03-01T14:00:00Z",
    cover_letter:
      "I have hands-on experience tuning and mounting skis and snowboards. I enjoy working with equipment and helping customers find the perfect setup for their ability.",
    has_resume: true,
    salary_range: "$18–$22/hr",
    employment_type: "Seasonal Full-Time",
    start_date: "Dec 2026",
    interview_status: null,
    interview_date: null,
    interview_time: null,
    last_updated: "2026-03-10T09:00:00Z",
  },
  {
    id: "app-w8",
    job_title: "Housekeeping Team Lead",
    business_name: "Fairmont Chateau Whistler",
    business_location: "Whistler, BC",
    resort_name: "Whistler Blackcomb",
    status: "applied",
    applied_at: "2026-03-18T07:30:00Z",
    cover_letter:
      "With five years of housekeeping experience, including two in a supervisory role, I am ready to lead a team that delivers five-star cleanliness and guest satisfaction.",
    has_resume: true,
    salary_range: "$23–$28/hr",
    employment_type: "Full-Time",
    start_date: "Nov 2026",
    interview_status: null,
    interview_date: null,
    interview_time: null,
    last_updated: "2026-03-18T07:30:00Z",
  },
];

const STATUS_LABELS: Record<Application["status"], string> = {
  applied: "Applied",
  viewed: "Viewed",
  interview: "Interview",
  offered: "Offered",
  accepted: "Accepted",
  rejected: "Unsuccessful",
};

const STATUS_STYLES: Record<Application["status"], { bg: string; text: string }> = {
  applied: { bg: "bg-yellow-50", text: "text-yellow-700" },
  viewed: { bg: "bg-blue-50", text: "text-blue-700" },
  interview: { bg: "bg-purple-50", text: "text-purple-700" },
  offered: { bg: "bg-emerald-50", text: "text-emerald-700" },
  accepted: { bg: "bg-green-50", text: "text-green-700" },
  rejected: { bg: "bg-red-50", text: "text-red-700" },
};

const TIMELINE_STEPS = ["Applied", "Viewed", "Interview", "Offer", "Accepted"] as const;

const STATUS_ORDER: Record<string, number> = {
  applied: 0,
  viewed: 1,
  interview: 2,
  offered: 3,
  accepted: 4,
  rejected: -1,
};

type FilterTab = "all" | Application["status"];

const SORT_OPTIONS = ["Newest First", "Oldest First", "By Status"] as const;
type SortOption = (typeof SORT_OPTIONS)[number];

export default function ApplicationsPage() {
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<FilterTab>("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [sortOption, setSortOption] = useState<SortOption>("Newest First");
  const [showSortDropdown, setShowSortDropdown] = useState(false);
  const [applications, setApplications] = useState<Application[]>([]);
  const [pageLoading, setPageLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          // Not logged in — show demo data
          setApplications(demoApplications);
          setPageLoading(false);
          return;
        }

        const { data: wp } = await supabase
          .from("worker_profiles")
          .select("id")
          .eq("user_id", user.id)
          .single();

        if (!wp) { setPageLoading(false); return; }

        const { data } = await supabase
          .from("applications")
          .select("*, job_posts(title, salary_range, position_type, start_date, business_profiles(business_name, location), resorts(name)), interviews(status, scheduled_date, scheduled_start_time)")
          .eq("worker_id", wp.id)
          .order("applied_at", { ascending: false });

        if (data && data.length > 0) {
          const statusMap: Record<string, Application["status"]> = {
            new: "applied",
            viewed: "viewed",
            interview_pending: "interview",
            interview: "interview",
            offered: "offered",
            accepted: "accepted",
            rejected: "rejected",
          };

          const mapped: Application[] = data.map((a: Record<string, unknown>) => {
            const jp = a.job_posts as Record<string, unknown> | null;
            const bp = jp?.business_profiles as { business_name: string; location: string | null } | null;
            const resort = jp?.resorts as { name: string } | null;
            const interviews = a.interviews as { status: string; scheduled_date: string | null; scheduled_start_time: string | null }[] | null;
            const latestInterview = interviews?.[0] || null;
            const posType = (jp?.position_type as string) || "full_time";

            return {
              id: a.id as string,
              job_title: (jp?.title as string) || "Unknown Position",
              business_name: bp?.business_name || "Unknown Business",
              business_location: bp?.location || "",
              resort_name: resort?.name || "",
              status: statusMap[a.status as string] || "applied",
              applied_at: a.applied_at as string,
              cover_letter: (a.cover_letter as string) || "",
              has_resume: !!(a.resume_url),
              salary_range: (jp?.salary_range as string) || "",
              employment_type: posType === "full_time" ? "Full-Time" : posType === "part_time" ? "Part-Time" : "Casual",
              start_date: (jp?.start_date as string) || "",
              interview_status: latestInterview ? (latestInterview.status as "invited" | "scheduled" | "completed") : null,
              interview_date: latestInterview?.scheduled_date || null,
              interview_time: latestInterview?.scheduled_start_time || null,
              last_updated: (a.updated_at as string) || (a.applied_at as string),
            };
          });
          setApplications(mapped);
        }
        // else: user has no applications — keep empty array
      } catch {
        // On error for non-authenticated, show demo data
      }
      setPageLoading(false);
    })();
  }, []);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const formatShortDate = (dateStr: string) => {
    const date = new Date(dateStr + "T00:00:00");
    return date.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  };

  const formatTime12 = (time: string) => {
    const [h, m] = time.split(":");
    const hour = parseInt(h);
    const ampm = hour >= 12 ? "PM" : "AM";
    return `${hour % 12 || 12}:${m} ${ampm}`;
  };

  if (pageLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-secondary" />
      </div>
    );
  }

  // Filter by search
  const searchFiltered = applications.filter((app) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      app.job_title.toLowerCase().includes(q) ||
      app.business_name.toLowerCase().includes(q) ||
      app.resort_name.toLowerCase().includes(q)
    );
  });

  // Filter by tab
  const tabFiltered =
    activeTab === "all"
      ? searchFiltered
      : searchFiltered.filter((app) => app.status === activeTab);

  // Sort
  const sorted = [...tabFiltered].sort((a, b) => {
    if (sortOption === "Newest First") {
      return new Date(b.applied_at).getTime() - new Date(a.applied_at).getTime();
    }
    if (sortOption === "Oldest First") {
      return new Date(a.applied_at).getTime() - new Date(b.applied_at).getTime();
    }
    // By Status
    return (STATUS_ORDER[a.status] ?? 0) - (STATUS_ORDER[b.status] ?? 0);
  });

  // Tab counts (based on search-filtered, not tab-filtered)
  const counts: Record<FilterTab, number> = {
    all: searchFiltered.length,
    applied: searchFiltered.filter((a) => a.status === "applied").length,
    viewed: searchFiltered.filter((a) => a.status === "viewed").length,
    interview: searchFiltered.filter((a) => a.status === "interview").length,
    offered: searchFiltered.filter((a) => a.status === "offered").length,
    accepted: searchFiltered.filter((a) => a.status === "accepted").length,
    rejected: searchFiltered.filter((a) => a.status === "rejected").length,
  };

  const tabs: { key: FilterTab; label: string }[] = [
    { key: "all", label: "All" },
    { key: "applied", label: "Applied" },
    { key: "viewed", label: "Viewed" },
    { key: "interview", label: "Interview" },
    { key: "offered", label: "Offered" },
    { key: "accepted", label: "Accepted" },
    { key: "rejected", label: "Unsuccessful" },
  ];

  const getTimelineIndex = (status: Application["status"]): number => {
    if (status === "rejected") return -1;
    return STATUS_ORDER[status] ?? 0;
  };

  return (
    <div className="mx-auto max-w-4xl">
      {/* Gradient header */}
      <div className="relative -mx-6 -mt-6 mb-8 overflow-hidden rounded-b-3xl bg-gradient-to-br from-primary via-primary-light to-primary px-6 pb-8 pt-8 sm:-mx-8 sm:px-8">
        <div className="pointer-events-none absolute -left-10 -top-10 h-40 w-40 rounded-full bg-secondary/20 blur-3xl" />
        <div className="pointer-events-none absolute -right-6 bottom-0 h-36 w-36 rounded-full bg-highlight/15 blur-3xl" />
        <div className="relative">
          <h1 className="text-2xl font-bold text-white">My Applications</h1>
          <p className="mt-1 text-sm text-white/60">
            Track the status of all your job applications.
          </p>
        </div>
      </div>

      {/* Search + Sort */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <svg
            className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground/40"
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
            placeholder="Search by job title, business, or resort..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-accent/50 bg-white/70 py-2.5 pl-10 pr-4 text-sm text-foreground placeholder:text-foreground/40 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-secondary/30"
          />
        </div>
        <div className="relative">
          <button
            onClick={() => setShowSortDropdown((v) => !v)}
            className="flex items-center gap-2 rounded-xl border border-accent/50 bg-white/70 px-4 py-2.5 text-sm text-foreground/60 backdrop-blur-sm transition-colors hover:border-secondary/50"
          >
            {sortOption}
            <svg
              className={`h-4 w-4 transition-transform ${showSortDropdown ? "rotate-180" : ""}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </button>
          {showSortDropdown && (
            <div className="absolute right-0 z-10 mt-1 w-44 rounded-xl border border-accent/50 bg-white/90 py-1 shadow-lg backdrop-blur-sm">
              {SORT_OPTIONS.map((opt) => (
                <button
                  key={opt}
                  onClick={() => {
                    setSortOption(opt);
                    setShowSortDropdown(false);
                  }}
                  className={`block w-full px-4 py-2 text-left text-sm transition-colors hover:bg-primary/5 ${
                    sortOption === opt ? "font-semibold text-primary" : "text-foreground/70"
                  }`}
                >
                  {opt}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Status filter tabs — rounded-full pills */}
      <div className="mt-4 flex flex-wrap gap-2">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition-all ${
              activeTab === tab.key
                ? "bg-primary text-white shadow-md shadow-primary/20"
                : "border border-accent/50 bg-white/70 text-foreground/60 backdrop-blur-sm hover:border-secondary/50 hover:bg-white"
            }`}
          >
            {tab.label}
            <span
              className={`ml-1.5 inline-flex h-5 min-w-[20px] items-center justify-center rounded-full px-1 text-xs ${
                activeTab === tab.key
                  ? "bg-white/20 text-white"
                  : "bg-foreground/5 text-foreground/50"
              }`}
            >
              {counts[tab.key]}
            </span>
          </button>
        ))}
      </div>

      {/* Application cards */}
      <div className="mt-5 space-y-3">
        {sorted.length === 0 && (
          <div className="rounded-2xl border border-accent/50 bg-white/70 p-12 text-center backdrop-blur-sm">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-secondary/15">
              <svg className="h-7 w-7 text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <h3 className="text-base font-semibold text-primary">No applications found</h3>
            <p className="mt-1 text-sm text-foreground/50">Try adjusting your search or filters.</p>
          </div>
        )}
        {sorted.map((app) => {
          const isExpanded = expandedId === app.id;
          const style = STATUS_STYLES[app.status];
          const timelineIdx = getTimelineIndex(app.status);

          return (
            <div
              key={app.id}
              className="rounded-2xl border border-accent/50 bg-white/70 backdrop-blur-sm transition-all hover:-translate-y-0.5 hover:shadow-lg hover:shadow-secondary/5"
            >
              {/* Card header — always visible */}
              <button
                onClick={() => setExpandedId(isExpanded ? null : app.id)}
                className="flex w-full items-start justify-between p-5 text-left"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-primary">{app.job_title}</h3>
                    <span
                      className={`inline-flex shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold ${style.bg} ${style.text}`}
                    >
                      {STATUS_LABELS[app.status]}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-foreground/60">
                    {app.business_name} · {app.resort_name}
                  </p>
                  <p className="mt-1 text-xs text-foreground/40">
                    Applied {formatDate(app.applied_at)}
                  </p>
                </div>
                <svg
                  className={`ml-4 mt-1 h-5 w-5 shrink-0 text-foreground/30 transition-transform ${
                    isExpanded ? "rotate-180" : ""
                  }`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </button>

              {/* Expanded detail panel */}
              {isExpanded && (
                <div className="border-t border-accent/50 px-5 pb-5 pt-4">
                  {/* Status timeline */}
                  <div className="mb-6">
                    <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-foreground/40">
                      Status Timeline
                    </p>
                    {app.status === "rejected" ? (
                      <div className="flex items-center gap-2 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M6 18L18 6M6 6l12 12"
                          />
                        </svg>
                        Application was not selected to move forward.
                      </div>
                    ) : (
                      <div className="flex items-center">
                        {TIMELINE_STEPS.map((step, idx) => {
                          const filled = idx <= timelineIdx;
                          const isLast = idx === TIMELINE_STEPS.length - 1;
                          return (
                            <div key={step} className="flex items-center">
                              <div className="flex flex-col items-center">
                                <div
                                  className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold transition-all ${
                                    filled
                                      ? "bg-gradient-to-br from-secondary to-highlight text-white shadow-md shadow-secondary/30"
                                      : "border-2 border-foreground/15 text-foreground/30"
                                  }`}
                                >
                                  {filled ? (
                                    <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                    </svg>
                                  ) : (
                                    idx + 1
                                  )}
                                </div>
                                <span
                                  className={`mt-1.5 text-[10px] font-medium ${
                                    filled ? "text-secondary" : "text-foreground/30"
                                  }`}
                                >
                                  {step}
                                </span>
                              </div>
                              {!isLast && (
                                <div
                                  className={`mx-1 h-0.5 w-8 sm:w-12 ${
                                    idx < timelineIdx ? "bg-gradient-to-r from-secondary to-highlight" : "bg-foreground/10"
                                  }`}
                                />
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Job details */}
                  <div className="mb-5 grid grid-cols-2 gap-x-8 gap-y-3 sm:grid-cols-4">
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-foreground/40">
                        Salary
                      </p>
                      <p className="mt-0.5 text-sm font-medium text-foreground">
                        {app.salary_range}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-foreground/40">
                        Type
                      </p>
                      <p className="mt-0.5 text-sm font-medium text-foreground">
                        {app.employment_type}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-foreground/40">
                        Start Date
                      </p>
                      <p className="mt-0.5 text-sm font-medium text-foreground">
                        {app.start_date}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-foreground/40">
                        Last Updated
                      </p>
                      <p className="mt-0.5 text-sm font-medium text-foreground">
                        {formatDate(app.last_updated)}
                      </p>
                    </div>
                  </div>

                  {/* Application details */}
                  <div className="mb-5">
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-foreground/40">
                      Application Details
                    </p>
                    <div className="rounded-xl bg-accent/20 p-3.5">
                      <p className="text-sm leading-relaxed text-foreground/70">
                        {app.cover_letter}
                      </p>
                      <div className="mt-3 flex items-center gap-2">
                        {app.has_resume ? (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-green-50 px-3 py-1 text-xs font-medium text-green-700">
                            <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                              />
                            </svg>
                            Resume attached
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-foreground/5 px-3 py-1 text-xs font-medium text-foreground/40">
                            No resume attached
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Business info */}
                  <div className="mb-5">
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-foreground/40">
                      Business Info
                    </p>
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary/15 text-sm font-bold text-secondary">
                        {app.business_name.charAt(0)}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">
                          {app.business_name}
                        </p>
                        <p className="text-xs text-foreground/50">
                          {app.business_location}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Interview section */}
                  {app.interview_status === "scheduled" && app.interview_date && (
                    <div className="mb-5 rounded-xl border border-blue-100 bg-blue-50/50 p-4">
                      <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-blue-600">
                        Interview Scheduled
                      </p>
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2 text-sm font-medium text-blue-800">
                          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                            />
                          </svg>
                          {formatShortDate(app.interview_date)} at{" "}
                          {formatTime12(app.interview_time!)}
                        </div>
                        <Link
                          href="/interviews"
                          className="rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-blue-700"
                        >
                          Join Call
                        </Link>
                      </div>
                    </div>
                  )}

                  {app.interview_status === "invited" && (
                    <div className="mb-5 rounded-xl border border-purple-100 bg-purple-50/50 p-4">
                      <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-purple-600">
                        Interview Invitation
                      </p>
                      <p className="mb-3 text-sm text-purple-700">
                        You have been invited to book an interview for this position.
                      </p>
                      <Link
                        href="/interviews/book?token=demo"
                        className="inline-flex rounded-xl bg-purple-600 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-purple-700"
                      >
                        Book Interview
                      </Link>
                    </div>
                  )}

                  {app.interview_status === "completed" && (
                    <div className="mb-5 flex items-center gap-2 rounded-xl bg-green-50 px-4 py-3 text-sm font-medium text-green-700">
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                      Interview completed
                      {app.interview_date && (
                        <span className="text-green-600">
                          {" "}
                          on {formatShortDate(app.interview_date)}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Next Steps guidance */}
                  <NextStepsGuidance status={app.status} businessName={app.business_name} interviewStatus={app.interview_status} />

                  {/* Action buttons */}
                  <div className="flex items-center gap-3">
                    <button className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white transition-all hover:-translate-y-0.5 hover:bg-primary/90 hover:shadow-md hover:shadow-primary/20">
                      Message Business
                    </button>
                    {app.status !== "rejected" && app.status !== "accepted" && (
                      <button className="rounded-xl border border-red-200 px-4 py-2 text-sm font-semibold text-red-600 transition-colors hover:bg-red-50">
                        Withdraw Application
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ── Next Steps Guidance ──────────────────────────────────── */
function NextStepsGuidance({
  status,
  businessName,
  interviewStatus,
}: {
  status: Application["status"];
  businessName: string;
  interviewStatus: Application["interview_status"];
}) {
  const configs: Record<string, { border: string; bg: string; iconBg: string; iconColor: string; heading: string; icon: React.ReactNode; body: React.ReactNode }> = {
    applied: {
      border: "border-blue-100",
      bg: "bg-blue-50/50",
      iconBg: "bg-blue-100",
      iconColor: "text-blue-600",
      heading: "Application Submitted",
      icon: (
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      body: (
        <div>
          <p className="text-sm text-blue-800">Your application has been submitted. Employers typically review within 5-7 business days.</p>
          <ul className="mt-2 space-y-1">
            <li className="flex items-start gap-2 text-xs text-blue-700">
              <span className="mt-0.5 text-blue-400">-</span>
              Make sure your profile is complete and up to date
            </li>
            <li className="flex items-start gap-2 text-xs text-blue-700">
              <span className="mt-0.5 text-blue-400">-</span>
              Keep an eye on your notifications for updates
            </li>
            <li className="flex items-start gap-2 text-xs text-blue-700">
              <span className="mt-0.5 text-blue-400">-</span>
              Continue applying to other positions while you wait
            </li>
          </ul>
        </div>
      ),
    },
    viewed: {
      border: "border-indigo-100",
      bg: "bg-indigo-50/50",
      iconBg: "bg-indigo-100",
      iconColor: "text-indigo-600",
      heading: "Application Viewed",
      icon: (
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ),
      body: (
        <div>
          <p className="text-sm text-indigo-800">Great news — {businessName} has seen your application! They&apos;re reviewing your profile.</p>
          <ul className="mt-2 space-y-1">
            <li className="flex items-start gap-2 text-xs text-indigo-700">
              <span className="mt-0.5 text-indigo-400">-</span>
              The employer is considering your application
            </li>
            <li className="flex items-start gap-2 text-xs text-indigo-700">
              <span className="mt-0.5 text-indigo-400">-</span>
              Ensure your contact details are correct in case they reach out
            </li>
          </ul>
        </div>
      ),
    },
    interview: {
      border: "border-purple-100",
      bg: "bg-purple-50/50",
      iconBg: "bg-purple-100",
      iconColor: "text-purple-600",
      heading: interviewStatus === "scheduled" ? "Interview Scheduled" : interviewStatus === "completed" ? "Interview Complete" : "Interview Stage",
      icon: (
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25h-9A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25z" />
        </svg>
      ),
      body: (
        <div>
          <p className="text-sm text-purple-800">
            {interviewStatus === "completed"
              ? `Your interview with ${businessName} is complete. They'll be in touch with next steps.`
              : `Prepare for your interview — review the job description and have questions ready.`}
          </p>
          {interviewStatus !== "completed" && (
            <ul className="mt-2 space-y-1">
              <li className="flex items-start gap-2 text-xs text-purple-700">
                <span className="mt-0.5 text-purple-400">-</span>
                Research the business and resort before the interview
              </li>
              <li className="flex items-start gap-2 text-xs text-purple-700">
                <span className="mt-0.5 text-purple-400">-</span>
                Prepare 2-3 questions to ask the interviewer
              </li>
              <li className="flex items-start gap-2 text-xs text-purple-700">
                <span className="mt-0.5 text-purple-400">-</span>
                Test your camera and microphone before a video call
              </li>
              <li className="flex items-start gap-2 text-xs text-purple-700">
                <span className="mt-0.5 text-purple-400">-</span>
                Dress presentably even for remote interviews
              </li>
            </ul>
          )}
        </div>
      ),
    },
    offered: {
      border: "border-amber-200",
      bg: "bg-gradient-to-r from-amber-50 to-yellow-50",
      iconBg: "bg-amber-100",
      iconColor: "text-amber-600",
      heading: "You Have an Offer!",
      icon: (
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z" />
        </svg>
      ),
      body: (
        <div>
          <p className="text-sm text-amber-800">
            Review the offer details carefully. You can message {businessName} if you have questions before making a decision.
          </p>
          <div className="mt-3 flex items-center gap-2">
            <button className="rounded-lg bg-green-600 px-4 py-2 text-xs font-semibold text-white transition-all hover:bg-green-700 hover:shadow-md">
              Accept Offer
            </button>
            <button className="rounded-lg border border-red-200 px-4 py-2 text-xs font-semibold text-red-600 transition-colors hover:bg-red-50">
              Decline Offer
            </button>
          </div>
          <ul className="mt-3 space-y-1">
            <li className="flex items-start gap-2 text-xs text-amber-700">
              <span className="mt-0.5 text-amber-400">-</span>
              Check the salary, start date, and accommodation details
            </li>
            <li className="flex items-start gap-2 text-xs text-amber-700">
              <span className="mt-0.5 text-amber-400">-</span>
              Ask about visa sponsorship if applicable
            </li>
            <li className="flex items-start gap-2 text-xs text-amber-700">
              <span className="mt-0.5 text-amber-400">-</span>
              Message the business with any questions
            </li>
          </ul>
        </div>
      ),
    },
    accepted: {
      border: "border-green-200",
      bg: "bg-gradient-to-r from-green-50 to-emerald-50",
      iconBg: "bg-green-100",
      iconColor: "text-green-600",
      heading: "Congratulations!",
      icon: (
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
        </svg>
      ),
      body: (
        <div>
          <p className="text-sm text-green-800">
            You&apos;ve accepted the offer at {businessName}! Here&apos;s what to prepare before your start date:
          </p>
          <ul className="mt-2 space-y-1">
            <li className="flex items-start gap-2 text-xs text-green-700">
              <span className="mt-0.5 text-green-400">-</span>
              Ensure your visa/work permit is sorted (if applicable)
            </li>
            <li className="flex items-start gap-2 text-xs text-green-700">
              <span className="mt-0.5 text-green-400">-</span>
              Arrange travel and accommodation logistics
            </li>
            <li className="flex items-start gap-2 text-xs text-green-700">
              <span className="mt-0.5 text-green-400">-</span>
              Prepare required documents (ID, tax forms, certifications)
            </li>
            <li className="flex items-start gap-2 text-xs text-green-700">
              <span className="mt-0.5 text-green-400">-</span>
              Message {businessName} about arrival details and housing
            </li>
            <li className="flex items-start gap-2 text-xs text-green-700">
              <span className="mt-0.5 text-green-400">-</span>
              Pack for mountain weather — layers, thermals, ski gear
            </li>
          </ul>
        </div>
      ),
    },
    rejected: {
      border: "border-gray-200",
      bg: "bg-gray-50/50",
      iconBg: "bg-gray-100",
      iconColor: "text-gray-500",
      heading: "Not Selected This Time",
      icon: (
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
        </svg>
      ),
      body: (
        <div>
          <p className="text-sm text-gray-700">
            Unfortunately, {businessName} has gone with another candidate. Don&apos;t be discouraged — plenty of resorts are still hiring.
          </p>
          <div className="mt-3">
            <Link href="/jobs" className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-white transition-all hover:bg-primary/90">
              Browse More Jobs
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
              </svg>
            </Link>
          </div>
        </div>
      ),
    },
  };

  const config = configs[status];
  if (!config) return null;

  return (
    <div className={`mb-5 rounded-xl border ${config.border} ${config.bg} p-4`}>
      <div className="mb-2 flex items-center gap-2">
        <div className={`flex h-6 w-6 items-center justify-center rounded-full ${config.iconBg} ${config.iconColor}`}>
          {config.icon}
        </div>
        <p className="text-xs font-semibold uppercase tracking-wider text-foreground/60">
          Next Steps — {config.heading}
        </p>
      </div>
      {config.body}
    </div>
  );
}
