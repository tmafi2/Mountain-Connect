"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

/* ─── Types ──────────────────────────────────────────────── */

interface DemoListing {
  id: string;
  title: string;
  resort: string;
  location: string;
  status: "active" | "paused" | "closed";
  pay: string;
  type: string;
  posted: string;
  startDate: string;
  endDate: string;
  housing: boolean;
  skiPass: boolean;
  urgent: boolean;
}

type ApplicantStatus = "pending" | "reviewed" | "interview_scheduled" | "accepted" | "rejected";

interface DemoApplicant {
  id: string;
  jobId: string;
  name: string;
  email: string;
  location: string;
  skills: string[];
  experience: number;
  status: ApplicantStatus;
  appliedAt: string;
  coverLetter: string;
  availability: string;
  languages: string[];
}

/* ─── Demo data ──────────────────────────────────────────── */

const demoListings: DemoListing[] = [
  {
    id: "j1",
    title: "Ski Instructor — All Levels",
    resort: "Whistler Blackcomb",
    location: "Whistler, Canada",
    status: "active",
    pay: "CAD $22–30/hr + tips",
    type: "Full-time",
    posted: "Sep 1, 2025",
    startDate: "Nov 20, 2025",
    endDate: "Apr 15, 2026",
    housing: true,
    skiPass: true,
    urgent: false,
  },
  {
    id: "j2",
    title: "Bartender — Après Ski Bar",
    resort: "Garibaldi Lift Co.",
    location: "Whistler, Canada",
    status: "active",
    pay: "CAD $17/hr + tips",
    type: "Full-time",
    posted: "Sep 15, 2025",
    startDate: "Nov 25, 2025",
    endDate: "Apr 10, 2026",
    housing: false,
    skiPass: false,
    urgent: true,
  },
  {
    id: "j3",
    title: "Housekeeping Team Member",
    resort: "Fairmont Chateau Whistler",
    location: "Whistler, Canada",
    status: "active",
    pay: "CAD $19/hr",
    type: "Full-time",
    posted: "Oct 1, 2025",
    startDate: "Nov 15, 2025",
    endDate: "Apr 30, 2026",
    housing: true,
    skiPass: true,
    urgent: false,
  },
  {
    id: "j4",
    title: "Chef de Partie",
    resort: "Le Refuge Alpine",
    location: "Chamonix, France",
    status: "paused",
    pay: "€2,400/month",
    type: "Full-time",
    posted: "Aug 20, 2025",
    startDate: "Dec 1, 2025",
    endDate: "Mar 31, 2026",
    housing: true,
    skiPass: true,
    urgent: false,
  },
  {
    id: "j5",
    title: "Lift Operator",
    resort: "Vail Mountain Resort",
    location: "Vail, USA",
    status: "closed",
    pay: "USD $18–20/hr",
    type: "Full-time",
    posted: "Jul 10, 2025",
    startDate: "Nov 10, 2025",
    endDate: "Apr 20, 2026",
    housing: true,
    skiPass: true,
    urgent: false,
  },
];

const demoApplicants: DemoApplicant[] = [
  // j1 — Ski Instructor
  {
    id: "a1",
    jobId: "j1",
    name: "Emma Johansson",
    email: "emma.j@example.com",
    location: "Stockholm, Sweden",
    skills: ["CSIA Level 3", "First Aid", "Swedish", "English", "French"],
    experience: 5,
    status: "pending",
    appliedAt: "Mar 10, 2026",
    coverLetter: "I've been teaching skiing for 5 seasons across Sweden and Canada. I hold a CSIA Level 3 certification and I'm passionate about helping beginners discover the joy of skiing. I'm fluent in three languages which helps me connect with international guests. I'm available for the full season and excited about the opportunity at Whistler Blackcomb.",
    availability: "Nov 2025 – Apr 2026 (full season)",
    languages: ["Swedish", "English", "French"],
  },
  {
    id: "a2",
    jobId: "j1",
    name: "Lucas Müller",
    email: "lucas.m@example.com",
    location: "Innsbruck, Austria",
    skills: ["CSIA Level 2", "Avalanche Safety", "German", "English"],
    experience: 3,
    status: "reviewed",
    appliedAt: "Mar 8, 2026",
    coverLetter: "Coming from the Austrian Alps, I bring 3 seasons of instruction experience with a specialty in intermediate to advanced technique. I also hold an Avalanche Safety certification. I'm looking to broaden my experience internationally and Whistler would be the perfect fit.",
    availability: "Dec 2025 – Apr 2026",
    languages: ["German", "English"],
  },
  {
    id: "a3",
    jobId: "j1",
    name: "Marie Dubois",
    email: "marie.d@example.com",
    location: "Chamonix, France",
    skills: ["BASI Level 3", "First Aid", "French", "English", "Spanish"],
    experience: 7,
    status: "accepted",
    appliedAt: "Mar 1, 2026",
    coverLetter: "With 7 years of instruction across France, Spain, and Canada, I bring deep expertise in all-mountain teaching. I hold BASI Level 3 and have consistently received top guest ratings. I'm looking forward to joining the Whistler Blackcomb team for another season.",
    availability: "Nov 2025 – Apr 2026 (full season)",
    languages: ["French", "English", "Spanish"],
  },
  {
    id: "a4",
    jobId: "j1",
    name: "Kenji Nakamura",
    email: "kenji.n@example.com",
    location: "Nagano, Japan",
    skills: ["SAJ Level 2", "Children's Instruction", "Japanese", "English"],
    experience: 4,
    status: "pending",
    appliedAt: "Mar 14, 2026",
    coverLetter: "I specialize in children's ski instruction and have taught at several major resorts in Japan. I'm excited about the opportunity to work at Whistler where I can also help with the growing number of Japanese guests visiting the resort.",
    availability: "Dec 2025 – Mar 2026",
    languages: ["Japanese", "English"],
  },
  // j2 — Bartender
  {
    id: "a5",
    jobId: "j2",
    name: "Sophie Chen",
    email: "sophie.c@example.com",
    location: "Melbourne, Australia",
    skills: ["RSA Certified", "Cocktail Making", "English", "Mandarin"],
    experience: 4,
    status: "pending",
    appliedAt: "Mar 12, 2026",
    coverLetter: "I've worked in Melbourne's top cocktail bars for 4 years and I'm looking for a season abroad. I'm RSA certified with expertise in craft cocktails and high-volume service. I thrive in fast-paced environments and love the energy of après-ski culture.",
    availability: "Nov 2025 – Apr 2026 (full season)",
    languages: ["English", "Mandarin"],
  },
  {
    id: "a6",
    jobId: "j2",
    name: "Isabella Rossi",
    email: "isabella.r@example.com",
    location: "Milan, Italy",
    skills: ["RSA Certified", "Barista", "Italian", "English", "Spanish"],
    experience: 6,
    status: "rejected",
    appliedAt: "Mar 2, 2026",
    coverLetter: "With 6 years in Italian hospitality, I bring a strong cocktail and espresso background. I've worked seasons at alpine bars in the Dolomites and am looking to experience the Canadian scene.",
    availability: "Dec 2025 – Mar 2026",
    languages: ["Italian", "English", "Spanish"],
  },
  {
    id: "a7",
    jobId: "j2",
    name: "Tom Wilson",
    email: "tom.w@example.com",
    location: "Queenstown, New Zealand",
    skills: ["Cocktail Making", "Wine Knowledge", "English"],
    experience: 3,
    status: "reviewed",
    appliedAt: "Mar 11, 2026",
    coverLetter: "I've spent 3 seasons bartending in Queenstown's famous après-ski scene. I know what makes a great mountain bar experience — fast service, great energy, and knowing every guest by name by week two.",
    availability: "Nov 2025 – Apr 2026 (full season)",
    languages: ["English"],
  },
  // j3 — Housekeeping
  {
    id: "a8",
    jobId: "j3",
    name: "Ana Santos",
    email: "ana.s@example.com",
    location: "Lisbon, Portugal",
    skills: ["Hotel Management Diploma", "Attention to Detail", "Portuguese", "English"],
    experience: 2,
    status: "pending",
    appliedAt: "Mar 15, 2026",
    coverLetter: "I recently graduated with a Hotel Management Diploma and have completed internships at two 5-star hotels in Lisbon. I'm eager to gain international experience and the Fairmont Chateau Whistler would be an incredible opportunity.",
    availability: "Nov 2025 – Apr 2026 (full season)",
    languages: ["Portuguese", "English", "Spanish"],
  },
  {
    id: "a9",
    jobId: "j3",
    name: "Jake Thompson",
    email: "jake.t@example.com",
    location: "Queenstown, New Zealand",
    skills: ["First Aid", "Customer Service", "English"],
    experience: 2,
    status: "interview_scheduled",
    appliedAt: "Mar 5, 2026",
    coverLetter: "I have 2 seasons of hotel experience in New Zealand's ski region. I'm reliable, detail-oriented, and take pride in maintaining high standards. I'm looking for a full-season role with staff housing.",
    availability: "Nov 2025 – Apr 2026 (full season)",
    languages: ["English"],
  },
  // j4 — Chef de Partie
  {
    id: "a10",
    jobId: "j4",
    name: "Ollie Hansen",
    email: "ollie.h@example.com",
    location: "Oslo, Norway",
    skills: ["Culinary Arts Diploma", "French Cuisine", "Norwegian", "English"],
    experience: 4,
    status: "reviewed",
    appliedAt: "Mar 9, 2026",
    coverLetter: "I trained in French cuisine in Lyon and have worked at mountain restaurants in Norway and Switzerland. I'm passionate about using local alpine ingredients and creating memorable dining experiences for guests.",
    availability: "Dec 2025 – Mar 2026",
    languages: ["Norwegian", "English", "French"],
  },
  {
    id: "a11",
    jobId: "j4",
    name: "Claire Bonnet",
    email: "claire.b@example.com",
    location: "Lyon, France",
    skills: ["Le Cordon Bleu", "Pastry", "French", "English"],
    experience: 5,
    status: "pending",
    appliedAt: "Mar 13, 2026",
    coverLetter: "A Le Cordon Bleu graduate with 5 years in high-end alpine restaurants across the French Alps. I specialize in both savoury and pastry sections and am comfortable running a busy service in a mountain restaurant setting.",
    availability: "Dec 2025 – Mar 2026",
    languages: ["French", "English"],
  },
  // j5 — Lift Operator
  {
    id: "a12",
    jobId: "j5",
    name: "Hiroshi Tanaka",
    email: "hiroshi.t@example.com",
    location: "Niseko, Japan",
    skills: ["Customer Service", "Japanese", "English", "Hospitality"],
    experience: 3,
    status: "accepted",
    appliedAt: "Mar 14, 2026",
    coverLetter: "I have 3 seasons of lift operations experience in Niseko. I'm safety-focused, highly punctual, and enjoy helping guests have a smooth experience getting up the mountain.",
    availability: "Nov 2025 – Apr 2026 (full season)",
    languages: ["Japanese", "English"],
  },
  {
    id: "a13",
    jobId: "j5",
    name: "Ryan O'Brien",
    email: "ryan.o@example.com",
    location: "Denver, USA",
    skills: ["Lift Maintenance", "First Aid", "English", "Spanish"],
    experience: 5,
    status: "accepted",
    appliedAt: "Mar 3, 2026",
    coverLetter: "I've been working lift operations at Colorado resorts for 5 years, including maintenance and safety inspections. I hold current First Aid certification and have an excellent safety record.",
    availability: "Nov 2025 – Apr 2026 (full season)",
    languages: ["English", "Spanish"],
  },
];

/* ─── Style helpers ──────────────────────────────────────── */

const LISTING_STATUS_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  active: { bg: "bg-green-50 border-green-200", text: "text-green-700", label: "Active" },
  paused: { bg: "bg-yellow-50 border-yellow-200", text: "text-yellow-700", label: "Paused" },
  closed: { bg: "bg-gray-50 border-gray-200", text: "text-gray-500", label: "Closed" },
};

const APPLICANT_STATUS_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  pending: { bg: "bg-blue-50", text: "text-blue-700", label: "Pending" },
  reviewed: { bg: "bg-yellow-50", text: "text-yellow-700", label: "Reviewed" },
  interview_scheduled: { bg: "bg-purple-50", text: "text-purple-700", label: "Interview" },
  accepted: { bg: "bg-green-50", text: "text-green-700", label: "Accepted" },
  rejected: { bg: "bg-red-50", text: "text-red-500", label: "Declined" },
};

type FilterTab = "all" | "active" | "paused" | "closed";

/* ─── Page component ─────────────────────────────────────── */

export default function ManageListingsPage() {
  const [filter, setFilter] = useState<FilterTab>("all");
  const [expandedListing, setExpandedListing] = useState<string | null>(null);
  const [selectedApplicant, setSelectedApplicant] = useState<string | null>(null);
  const [applicants, setApplicants] = useState(demoApplicants);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [applicantSort, setApplicantSort] = useState<"newest" | "oldest" | "experience" | "name">("newest");
  const [applicantStatusFilter, setApplicantStatusFilter] = useState<"all" | ApplicantStatus>("all");
  const [listings, setListings] = useState<DemoListing[]>(demoListings);
  const [pageLoading, setPageLoading] = useState(true);

  // Fetch real listings from Supabase
  useEffect(() => {
    (async () => {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { setPageLoading(false); return; }

        const { data: bp } = await supabase
          .from("business_profiles")
          .select("id")
          .eq("user_id", user.id)
          .single();
        if (!bp) { setPageLoading(false); return; }

        const { data: jobs } = await supabase
          .from("job_posts")
          .select("*, resorts(name, country)")
          .eq("business_id", bp.id)
          .order("created_at", { ascending: false });

        if (jobs && jobs.length > 0) {
          const mapped: DemoListing[] = jobs.map((j: Record<string, unknown>) => {
            const resort = j.resorts as { name: string; country: string } | null;
            const posType = j.position_type === "full_time" ? "Full-time" : j.position_type === "part_time" ? "Part-time" : "Casual";
            return {
              id: j.id as string,
              title: j.title as string,
              resort: resort?.name || "",
              location: resort ? `${resort.name}, ${resort.country}` : "",
              status: (j.status as string) === "draft" ? "paused" : (j.status as string) as "active" | "paused" | "closed",
              pay: (j.pay_amount as string) || (j.salary_range as string) || "",
              type: posType,
              posted: new Date(j.created_at as string).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
              startDate: j.start_date ? new Date(j.start_date as string).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "",
              endDate: j.end_date ? new Date(j.end_date as string).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "",
              housing: j.accommodation_included as boolean,
              skiPass: j.ski_pass_included as boolean,
              urgent: j.urgently_hiring as boolean,
            };
          });
          setListings(mapped);
        }
      } catch {
        // Fallback to demo data
      }
      setPageLoading(false);
    })();
  }, []);

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
    paused: searchFiltered.filter((l) => l.status === "paused").length,
    closed: searchFiltered.filter((l) => l.status === "closed").length,
  };

  const getApplicantsForJob = (jobId: string) => {
    let result = applicants.filter((a) => a.jobId === jobId);

    // Apply status filter
    if (applicantStatusFilter !== "all") {
      result = result.filter((a) => a.status === applicantStatusFilter);
    }

    // Apply sort
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

  // Unfiltered count for the applicant toolbar
  const getRawApplicantsForJob = (jobId: string) => applicants.filter((a) => a.jobId === jobId);

  const handleStatusChange = async (applicantId: string, newStatus: ApplicantStatus) => {
    setActionLoading(applicantId + newStatus);
    await new Promise((r) => setTimeout(r, 600));
    setApplicants((prev) =>
      prev.map((a) => (a.id === applicantId ? { ...a, status: newStatus } : a))
    );
    setActionLoading(null);
  };

  const toggleListing = (id: string) => {
    setExpandedListing(expandedListing === id ? null : id);
    setSelectedApplicant(null);
    setApplicantSort("newest");
    setApplicantStatusFilter("all");
  };

  const activeApplicant = applicants.find((a) => a.id === selectedApplicant);

  if (pageLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-secondary/30 border-t-secondary" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-primary">Manage Listings</h1>
          <p className="mt-1 text-sm text-foreground/60">
            View, edit, and manage all your job postings.
          </p>
        </div>
        <Link
          href="/business/post-job"
          className="rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary/90"
        >
          + Post New Job
        </Link>
      </div>

      {/* Search bar */}
      <div className="relative mt-6">
        <svg className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search listings, resorts, applicants..."
          className="w-full rounded-lg border border-accent bg-white py-2.5 pl-10 pr-4 text-sm text-primary focus:border-secondary focus:outline-none focus:ring-1 focus:ring-secondary"
        />
      </div>

      {/* Filter tabs */}
      <div className="mt-4 flex gap-2">
        {(["all", "active", "paused", "closed"] as FilterTab[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setFilter(tab)}
            className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors ${
              filter === tab
                ? "border-primary bg-primary text-white"
                : "border-accent bg-white text-foreground/70 hover:bg-accent/20"
            }`}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)} ({counts[tab]})
          </button>
        ))}
      </div>

      {/* Listings */}
      <div className="mt-6 space-y-4">
        {filtered.map((listing) => {
          const style = LISTING_STATUS_STYLES[listing.status];
          const isExpanded = expandedListing === listing.id;
          const jobApplicants = getApplicantsForJob(listing.id);
          const rawJobApplicants = getRawApplicantsForJob(listing.id);

          return (
            <div key={listing.id} className="rounded-xl border border-accent bg-white overflow-hidden">
              {/* Listing header — clickable */}
              <button
                onClick={() => toggleListing(listing.id)}
                className="w-full p-5 text-left transition-colors hover:bg-accent/5"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2.5">
                      <Link
                        href={`/business/manage-listings/${listing.id}`}
                        onClick={(e) => e.stopPropagation()}
                        className="font-semibold text-primary hover:text-secondary hover:underline"
                      >
                        {listing.title}
                      </Link>
                      <span
                        className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-medium ${style.bg} ${style.text}`}
                      >
                        {style.label}
                      </span>
                      {listing.urgent && (
                        <span className="inline-flex rounded-full border border-red-200 bg-red-50 px-2 py-0.5 text-xs font-medium text-red-600">
                          Urgently Hiring
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-sm text-foreground/60">
                      {listing.resort} · {listing.location}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-foreground/50">
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
                <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1.5 text-sm text-foreground/60">
                  <span>{listing.pay}</span>
                  <span>{listing.type}</span>
                  <span>{listing.startDate} – {listing.endDate}</span>
                  {listing.housing && (
                    <span className="inline-flex rounded-full bg-blue-50 px-2 py-0.5 text-xs text-blue-700">Housing</span>
                  )}
                  {listing.skiPass && (
                    <span className="inline-flex rounded-full bg-purple-50 px-2 py-0.5 text-xs text-purple-700">Ski Pass</span>
                  )}
                </div>
              </button>

              {/* Expanded: applicant list + detail */}
              {isExpanded && (
                <div className="border-t border-accent">
                  {rawJobApplicants.length === 0 ? (
                    <div className="p-8 text-center">
                      <p className="text-sm text-foreground/50">No applicants yet for this listing.</p>
                    </div>
                  ) : (
                    <div className="flex">
                      {/* Applicant list */}
                      <div className={`border-r border-accent ${selectedApplicant ? "w-2/5" : "w-full"}`}>
                        <div className="px-4 py-3 border-b border-accent/50 bg-accent/5 space-y-2.5">
                          <div className="flex items-center justify-between">
                            <p className="text-xs font-semibold uppercase tracking-wider text-foreground/50">
                              Applicants ({jobApplicants.length}{applicantStatusFilter !== "all" ? ` of ${rawJobApplicants.length}` : ""})
                            </p>
                            <select
                              value={applicantSort}
                              onChange={(e) => setApplicantSort(e.target.value as typeof applicantSort)}
                              className="rounded-md border border-accent bg-white px-2 py-1 text-xs text-primary focus:border-secondary focus:outline-none focus:ring-1 focus:ring-secondary"
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
                                { value: "rejected", label: "Declined" },
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
                                    : "bg-white border border-accent text-foreground/60 hover:bg-accent/20"
                                }`}
                              >
                                {pill.label}
                              </button>
                            ))}
                          </div>
                        </div>
                        <div className="divide-y divide-accent/50">
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
                                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-secondary/20 text-xs font-bold text-primary">
                                    {initials}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                      <p className="font-medium text-primary text-sm truncate">{applicant.name}</p>
                                      <span className={`inline-flex rounded-full px-1.5 py-0.5 text-[10px] font-medium ${aStyle.bg} ${aStyle.text}`}>
                                        {aStyle.label}
                                      </span>
                                    </div>
                                    <p className="text-xs text-foreground/50 truncate">{applicant.location} · {applicant.experience}y exp</p>
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
                            <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${APPLICANT_STATUS_STYLES[activeApplicant.status].bg} ${APPLICANT_STATUS_STYLES[activeApplicant.status].text}`}>
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
                            <div className="rounded-lg bg-accent/20 p-3 text-center">
                              <p className="text-lg font-bold text-primary">{activeApplicant.experience}</p>
                              <p className="text-[10px] uppercase tracking-wider text-foreground/50">Years Exp.</p>
                            </div>
                            <div className="rounded-lg bg-accent/20 p-3 text-center">
                              <p className="text-lg font-bold text-primary">{activeApplicant.languages.length}</p>
                              <p className="text-[10px] uppercase tracking-wider text-foreground/50">Languages</p>
                            </div>
                            <div className="rounded-lg bg-accent/20 p-3 text-center">
                              <p className="text-lg font-bold text-primary">{activeApplicant.skills.length}</p>
                              <p className="text-[10px] uppercase tracking-wider text-foreground/50">Skills</p>
                            </div>
                          </div>

                          {/* Skills */}
                          <div className="mt-5">
                            <h4 className="text-xs font-semibold uppercase tracking-wider text-foreground/50">Skills & Certifications</h4>
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
                                <span key={lang} className="inline-flex rounded-full bg-blue-50 px-2.5 py-0.5 text-xs text-blue-700">
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
                            <div className="mt-2 rounded-lg bg-accent/10 p-4">
                              <p className="text-sm leading-relaxed text-foreground/80">{activeApplicant.coverLetter}</p>
                            </div>
                          </div>

                          {/* Applied date */}
                          <p className="mt-4 text-xs text-foreground/40">Applied {activeApplicant.appliedAt}</p>

                          {/* Action buttons */}
                          <div className="mt-5 border-t border-accent pt-4">
                            <h4 className="text-xs font-semibold uppercase tracking-wider text-foreground/50 mb-3">Actions</h4>
                            <div className="flex flex-wrap gap-2">
                              {activeApplicant.status !== "rejected" && (
                                <button
                                  onClick={() => handleStatusChange(activeApplicant.id, "rejected")}
                                  disabled={actionLoading !== null}
                                  className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-100 disabled:opacity-50"
                                >
                                  {actionLoading === activeApplicant.id + "rejected" ? "Declining…" : "Decline"}
                                </button>
                              )}
                              {activeApplicant.status !== "interview_scheduled" && activeApplicant.status !== "accepted" && activeApplicant.status !== "rejected" && (
                                <button
                                  onClick={() => handleStatusChange(activeApplicant.id, "interview_scheduled")}
                                  disabled={actionLoading !== null}
                                  className="rounded-lg border border-purple-200 bg-purple-50 px-4 py-2 text-sm font-medium text-purple-700 transition-colors hover:bg-purple-100 disabled:opacity-50"
                                >
                                  {actionLoading === activeApplicant.id + "interview_scheduled" ? "Requesting…" : "Request Interview"}
                                </button>
                              )}
                              {activeApplicant.status !== "accepted" && activeApplicant.status !== "rejected" && (
                                <button
                                  onClick={() => handleStatusChange(activeApplicant.id, "accepted")}
                                  disabled={actionLoading !== null}
                                  className="rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-green-700 disabled:opacity-50"
                                >
                                  {actionLoading === activeApplicant.id + "accepted" ? "Accepting…" : "Mark Successful"}
                                </button>
                              )}
                              {activeApplicant.status === "rejected" && (
                                <button
                                  onClick={() => handleStatusChange(activeApplicant.id, "pending")}
                                  disabled={actionLoading !== null}
                                  className="rounded-lg border border-accent bg-white px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent/20 disabled:opacity-50"
                                >
                                  {actionLoading === activeApplicant.id + "pending" ? "Reverting…" : "Undo Decline"}
                                </button>
                              )}
                              {activeApplicant.status === "accepted" && (
                                <button
                                  onClick={() => handleStatusChange(activeApplicant.id, "reviewed")}
                                  disabled={actionLoading !== null}
                                  className="rounded-lg border border-accent bg-white px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent/20 disabled:opacity-50"
                                >
                                  {actionLoading === activeApplicant.id + "reviewed" ? "Reverting…" : "Undo Accept"}
                                </button>
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
    </div>
  );
}
