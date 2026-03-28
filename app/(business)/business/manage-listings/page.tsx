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
  applicationId: string;
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
    applicationId: "demo-a1",
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
    applicationId: "demo-a2",
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
    applicationId: "demo-a3",
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
    applicationId: "demo-a4",
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
    applicationId: "demo-a5",
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
    applicationId: "demo-a6",
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
    applicationId: "demo-a7",
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
    applicationId: "demo-a8",
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
    applicationId: "demo-a9",
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
    applicationId: "demo-a10",
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
    applicationId: "demo-a11",
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
    applicationId: "demo-a12",
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
    applicationId: "demo-a13",
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

const LISTING_STATUS_STYLES: Record<string, { bg: string; text: string; dot: string; label: string }> = {
  active: { bg: "bg-green-50 border-green-200", text: "text-green-700", dot: "bg-green-500", label: "Active" },
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

type FilterTab = "all" | "active" | "paused" | "closed";

/* ─── Page component ─────────────────────────────────────── */

export default function ManageListingsPage() {
  const [filter, setFilter] = useState<FilterTab>("all");
  const [expandedListing, setExpandedListing] = useState<string | null>(null);
  const [selectedApplicant, setSelectedApplicant] = useState<string | null>(null);
  const [applicants, setApplicants] = useState<typeof demoApplicants>([]);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [applicantSort, setApplicantSort] = useState<"newest" | "oldest" | "experience" | "name">("newest");
  const [applicantStatusFilter, setApplicantStatusFilter] = useState<"all" | ApplicantStatus>("all");
  const [listings, setListings] = useState<DemoListing[]>([]);
  const [pageLoading, setPageLoading] = useState(true);
  const [acceptConfirm, setAcceptConfirm] = useState<DemoApplicant | null>(null);
  const [editingStatus, setEditingStatus] = useState<string | null>(null);

  // Fetch real listings from Supabase
  useEffect(() => {
    (async () => {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          // Not logged in — show demo data
          setListings(demoListings);
          setApplicants(demoApplicants);
          setPageLoading(false);
          return;
        }

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
          // Fetch real applicants for all job listings
          const jobIds = jobs.map((j: Record<string, unknown>) => j.id as string);
          const { data: appData } = await supabase
            .from("applications")
            .select("*, worker_profiles(id, first_name, last_name, location_current, skills, years_seasonal_experience, languages, references)")
            .in("job_post_id", jobIds);

          if (appData && appData.length > 0) {
            const statusMap: Record<string, ApplicantStatus> = {
              new: "pending",
              viewed: "reviewed",
              interview_pending: "interview_scheduled",
              interview: "interview_scheduled",
              offered: "accepted",
              accepted: "accepted",
              rejected: "rejected",
            };

            const mappedApplicants: DemoApplicant[] = appData.map((a: Record<string, unknown>) => {
              const wp = a.worker_profiles as Record<string, unknown> | null;
              const firstName = (wp?.first_name as string) || "";
              const lastName = (wp?.last_name as string) || "";
              const langs = (wp?.languages as { language: string }[]) || [];

              return {
                id: (wp?.id as string) || (a.worker_id as string),
                applicationId: a.id as string,
                jobId: a.job_post_id as string,
                name: [firstName, lastName].filter(Boolean).join(" ") || "Unknown",
                email: "",
                location: (wp?.location_current as string) || "",
                skills: (wp?.skills as string[]) || [],
                experience: (wp?.years_seasonal_experience as number) || 0,
                status: statusMap[a.status as string] || "pending",
                appliedAt: a.applied_at as string,
                coverLetter: (a.cover_letter as string) || "",
                availability: "",
                languages: langs.map((l) => l.language),
              };
            });
            setApplicants(mappedApplicants);
          }

          const mapped: DemoListing[] = jobs.map((j: Record<string, unknown>) => {
            const resort = j.resorts as { name: string; country: string } | null;
            const posType = j.position_type === "full_time" ? "Full-time" : j.position_type === "part_time" ? "Part-time" : "Casual";
            return {
              id: j.id as string,
              title: j.title as string,
              resort: resort?.name || "",
              location: resort ? `${resort.name}, ${resort.country}` : "",
              status: (j.status as string) === "draft" ? "paused" : (j.status as string) as "active" | "paused" | "closed",
              pay: (j.pay_amount as string) ? `${(j.pay_currency as string) || "AUD"} $${j.pay_amount as string}` : (j.salary_range as string) || "",
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
        // On error, keep current state
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
    // Map local status back to database status
    const dbStatusMap: Record<ApplicantStatus, string> = {
      pending: "new",
      reviewed: "viewed",
      interview_scheduled: "interview",
      accepted: "accepted",
      rejected: "rejected",
    };

    setActionLoading(applicantId + newStatus);

    // Optimistic update
    setApplicants((prev) =>
      prev.map((a) => (a.id === applicantId ? { ...a, status: newStatus } : a))
    );

    // Update in database
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

  const activeApplicant = applicants.find((a) => a.id === selectedApplicant);

  if (pageLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-primary" />
      </div>
    );
  }

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
        {(["all", "active", "paused", "closed"] as FilterTab[]).map((tab) => (
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
              {/* Listing header — clickable */}
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
                  <span className="text-xs text-foreground/30">·</span>
                  <span className="text-sm text-foreground/60">{listing.type}</span>
                  <span className="text-xs text-foreground/30">·</span>
                  <span className="text-sm text-foreground/60">{listing.startDate} – {listing.endDate}</span>
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
                                    {actionLoading === activeApplicant.id + "rejected" ? "Updating…" : "Unsuccessful"}
                                  </button>
                                  {activeApplicant.status !== "interview_scheduled" && (
                                    <button
                                      onClick={() => handleStatusChange(activeApplicant.id, "interview_scheduled")}
                                      disabled={actionLoading !== null}
                                      className="rounded-xl border border-purple-200 bg-purple-50 px-4 py-2 text-sm font-medium text-purple-700 transition-all hover:bg-purple-100 hover:-translate-y-0.5 disabled:opacity-50"
                                    >
                                      {actionLoading === activeApplicant.id + "interview_scheduled" ? "Requesting…" : "Request Interview"}
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

      {/* ─── Accept Confirmation Modal ─── */}
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
    </div>
  );
}
