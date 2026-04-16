"use client";

import { useState, useMemo, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

const COUNTRY_FLAGS: Record<string, string> = {
  "Australia": "🇦🇺", "Austria": "🇦🇹", "Argentina": "🇦🇷", "Brazil": "🇧🇷",
  "Canada": "🇨🇦", "Chile": "🇨🇱", "France": "🇫🇷", "Germany": "🇩🇪",
  "Ireland": "🇮🇪", "Italy": "🇮🇹", "Japan": "🇯🇵", "Mexico": "🇲🇽",
  "Netherlands": "🇳🇱", "New Zealand": "🇳🇿", "Norway": "🇳🇴", "Poland": "🇵🇱",
  "Portugal": "🇵🇹", "South Africa": "🇿🇦", "South Korea": "🇰🇷", "Spain": "🇪🇸",
  "Sweden": "🇸🇪", "Switzerland": "🇨🇭", "United Kingdom": "🇬🇧", "USA": "🇺🇸",
  "United States": "🇺🇸",
};

function ApplicantAvatar({ avatar, nationality, name, size = "md" }: { avatar: string | null; nationality: string | null; name: string; size?: "sm" | "md" }) {
  const initials = name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
  const sizeClass = size === "sm" ? "h-6 w-6 text-[10px]" : "h-10 w-10 text-sm";
  const emojiSize = size === "sm" ? "text-sm" : "text-xl";

  return (
    <div className={`flex ${sizeClass} shrink-0 items-center justify-center overflow-hidden rounded-full bg-secondary/10 font-bold text-secondary`}>
      {avatar && avatar.startsWith("flag:") ? (
        <span className={emojiSize}>{avatar.replace("flag:", "")}</span>
      ) : avatar ? (
        <img src={avatar} alt={name} className="h-full w-full object-cover" />
      ) : nationality && COUNTRY_FLAGS[nationality] ? (
        <span className={emojiSize}>{COUNTRY_FLAGS[nationality]}</span>
      ) : (
        initials
      )}
    </div>
  );
}

/* ─── Types ──────────────────────────────────────────────── */

interface ListingDetail {
  id: string;
  title: string;
  status: "active" | "paused" | "closed";
  resort: string;
  location: string;
  businessName: string;
  description: string;
  requirements: string;
  pay: string;
  type: string;
  startDate: string;
  endDate: string;
  posted: string;
  housing: boolean;
  housingDetails: string | null;
  skiPass: boolean;
  meals: boolean;
  language: string;
  visaSponsorship: boolean;
  urgent: boolean;
  showPositions: boolean;
  positionsAvailable: number;
  positionsFilled: number;
  applicants: number;
  interviews: number;
  views: number;
}

type ApplicantStatus = "pending" | "reviewed" | "interview_scheduled" | "accepted" | "rejected";

interface Applicant {
  id: string;
  applicationId: string;
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
  resumeUrl: string | null;
}

type ActiveTab = null | "applicants" | "interviews" | "filled";

/* ─── Status badge styles ────────────────────────────────── */

const STATUS_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  active: { bg: "bg-green-50 border-green-200", text: "text-green-700", label: "Active" },
  draft: { bg: "bg-blue-50 border-blue-200", text: "text-blue-600", label: "Draft" },
  paused: { bg: "bg-yellow-50 border-yellow-200", text: "text-yellow-700", label: "Paused" },
  closed: { bg: "bg-gray-50 border-gray-200", text: "text-gray-500", label: "Closed" },
};

const APPLICANT_STATUS_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  pending: { bg: "bg-blue-50", text: "text-blue-700", label: "Pending" },
  reviewed: { bg: "bg-yellow-50", text: "text-yellow-700", label: "Reviewed" },
  interview_scheduled: { bg: "bg-purple-50", text: "text-purple-700", label: "Interview" },
  accepted: { bg: "bg-green-50", text: "text-green-700", label: "Accepted" },
  rejected: { bg: "bg-red-50", text: "text-red-500", label: "Unsuccessful" },
};

/* ─── Demo data ──────────────────────────────────────────── */

const demoListings: Record<string, ListingDetail> = {
  j1: {
    id: "j1",
    title: "Ski Instructor — All Levels",
    status: "active",
    resort: "Whistler Blackcomb",
    location: "Whistler, Canada",
    businessName: "Whistler Blackcomb Ski School",
    description:
      "Join the Whistler Blackcomb Ski School for the 2025/26 winter season. We are looking for certified ski instructors to teach group and private lessons across all ability levels. You'll work with guests from around the world in one of North America's premier resorts.\n\nAs a ski instructor, you'll be responsible for delivering high-quality lessons, ensuring guest safety on the mountain, and representing the ski school with professionalism and enthusiasm. Our team works in a supportive, fun environment with opportunities for professional development.",
    requirements:
      "• CSIA Level 2+ or equivalent international certification\n• First Aid certification (current)\n• Fluent English required; French or Japanese a plus\n• Must be available November through April\n• Previous teaching experience preferred\n• Strong communication and interpersonal skills",
    pay: "CAD $22–30/hr + tips",
    type: "Full-time",
    startDate: "Nov 20, 2025",
    endDate: "Apr 15, 2026",
    posted: "Sep 1, 2025",
    housing: true,
    housingDetails: "Shared staff housing available at $600/month. Walking distance to village. Includes Wi-Fi, laundry, and communal kitchen.",
    skiPass: true,
    meals: true,
    language: "English",
    visaSponsorship: false,
    urgent: false,
    showPositions: true,
    positionsAvailable: 5,
    positionsFilled: 2,
    applicants: 34,
    interviews: 3,
    views: 1240,
  },
  j2: {
    id: "j2",
    title: "Bartender — Après Ski Bar",
    status: "active",
    resort: "Garibaldi Lift Co.",
    location: "Whistler, Canada",
    businessName: "Garibaldi Lift Co.",
    description:
      "The GLC (Garibaldi Lift Co.) is Whistler's most iconic après-ski bar. We need energetic, experienced bartenders who thrive in a fast-paced, high-volume environment. Great tips and an unforgettable season guaranteed.\n\nYou'll be serving hundreds of skiers and snowboarders daily in one of the busiest bars on the mountain. Expect high energy, great music, and an incredible atmosphere every shift.",
    requirements:
      "• Serving It Right certification (or willing to obtain)\n• 1+ year bar experience in a high-volume setting\n• Must be comfortable working late nights and weekends\n• Cocktail knowledge is an asset\n• Team player with a positive attitude",
    pay: "CAD $17/hr + tips (avg $30–40/hr total)",
    type: "Full-time",
    startDate: "Nov 25, 2025",
    endDate: "Apr 10, 2026",
    posted: "Sep 15, 2025",
    housing: false,
    housingDetails: null,
    skiPass: false,
    meals: true,
    language: "English",
    visaSponsorship: false,
    urgent: true,
    showPositions: true,
    positionsAvailable: 3,
    positionsFilled: 1,
    applicants: 12,
    interviews: 1,
    views: 890,
  },
  j3: {
    id: "j3",
    title: "Housekeeping Team Member",
    status: "active",
    resort: "Fairmont Chateau Whistler",
    location: "Whistler, Canada",
    businessName: "Fairmont Chateau Whistler",
    description:
      "The Fairmont Chateau Whistler is seeking reliable housekeeping staff for the busy winter season. You'll ensure our luxury guest rooms and public areas maintain the Fairmont standard of excellence.\n\nThis is a great opportunity to work at one of Canada's most prestigious mountain hotels while enjoying staff benefits including subsidized accommodation and ski passes.",
    requirements:
      "• Previous hotel housekeeping experience preferred\n• Strong attention to detail\n• Ability to work on your feet for extended periods\n• Some weekend and holiday shifts required\n• Reliable and punctual",
    pay: "CAD $19/hr",
    type: "Full-time",
    startDate: "Nov 15, 2025",
    endDate: "Apr 30, 2026",
    posted: "Oct 1, 2025",
    housing: true,
    housingDetails: "Staff accommodation provided at subsidised rate of $500/month, shared dorms with meals included.",
    skiPass: true,
    meals: true,
    language: "English",
    visaSponsorship: false,
    urgent: false,
    showPositions: true,
    positionsAvailable: 4,
    positionsFilled: 0,
    applicants: 8,
    interviews: 0,
    views: 560,
  },
  j4: {
    id: "j4",
    title: "Chef de Partie",
    status: "paused",
    resort: "Le Refuge Alpine",
    location: "Chamonix, France",
    businessName: "Le Refuge Alpine Restaurant",
    description:
      "Le Refuge Alpine is a highly regarded mountain restaurant in Chamonix, known for its modern take on traditional Savoyard cuisine. We're looking for an experienced Chef de Partie to join our kitchen brigade for the winter season.\n\nYou'll be responsible for running your section during busy service periods, preparing mise en place, and maintaining the highest standards of food quality and hygiene.",
    requirements:
      "• Culinary diploma or equivalent experience\n• 2+ years experience in a professional kitchen\n• Knowledge of French cuisine is a strong advantage\n• Food safety certification\n• Able to work under pressure during peak service\n• English or French fluency required",
    pay: "€2,400/month",
    type: "Full-time",
    startDate: "Dec 1, 2025",
    endDate: "Mar 31, 2026",
    posted: "Aug 20, 2025",
    housing: true,
    housingDetails: "Private staff apartment provided in Chamonix centre, shared between 2 staff members.",
    skiPass: true,
    meals: true,
    language: "English or French",
    visaSponsorship: false,
    urgent: false,
    showPositions: true,
    positionsAvailable: 2,
    positionsFilled: 1,
    applicants: 6,
    interviews: 2,
    views: 420,
  },
  j5: {
    id: "j5",
    title: "Lift Operator",
    status: "closed",
    resort: "Vail Mountain Resort",
    location: "Vail, USA",
    businessName: "Vail Resorts",
    description:
      "Join the Vail Mountain Resort lift operations team for the 2025/26 season. As a Lift Operator, you'll play a critical role in ensuring the safe and efficient operation of our chairlifts and gondolas.\n\nThis is an outdoor role that requires working in all weather conditions. You'll interact with guests daily, helping them load and unload safely while maintaining a friendly, professional demeanor.",
    requirements:
      "• Must be 18 years or older\n• Ability to work outdoors in extreme cold and variable weather\n• Strong communication skills\n• Previous customer service experience preferred\n• Must pass a background check\n• Available for full season commitment",
    pay: "USD $18–20/hr",
    type: "Full-time",
    startDate: "Nov 10, 2025",
    endDate: "Apr 20, 2026",
    posted: "Jul 10, 2025",
    housing: true,
    housingDetails: "Employee housing available in Vail at $450/month including utilities.",
    skiPass: true,
    meals: false,
    language: "English",
    visaSponsorship: false,
    urgent: false,
    showPositions: true,
    positionsAvailable: 10,
    positionsFilled: 5,
    applicants: 22,
    interviews: 5,
    views: 1890,
  },
};

const demoApplicants: Record<string, Applicant[]> = {
  j1: [
    { id: "a1", name: "Emma Johansson", email: "emma.j@example.com", location: "Stockholm, Sweden", skills: ["CSIA Level 3", "First Aid", "Swedish", "English", "French"], experience: 5, status: "pending", appliedAt: "Mar 10, 2026", coverLetter: "I've been teaching skiing for 5 seasons across Sweden and Canada. I hold a CSIA Level 3 certification and I'm passionate about helping beginners discover the joy of skiing.", availability: "Nov 2025 – Apr 2026 (full season)", languages: ["Swedish", "English", "French"], resumeUrl: "/resumes/emma-johansson-resume.pdf" },
    { id: "a2", name: "Lucas Müller", email: "lucas.m@example.com", location: "Innsbruck, Austria", skills: ["CSIA Level 2", "Avalanche Safety", "German", "English"], experience: 3, status: "reviewed", appliedAt: "Mar 8, 2026", coverLetter: "Coming from the Austrian Alps, I bring 3 seasons of instruction experience with a specialty in intermediate to advanced technique.", availability: "Dec 2025 – Apr 2026", languages: ["German", "English"], resumeUrl: "/resumes/lucas-muller-resume.pdf" },
    { id: "a3", name: "Marie Dubois", email: "marie.d@example.com", location: "Chamonix, France", skills: ["BASI Level 3", "First Aid", "French", "English", "Spanish"], experience: 7, status: "accepted", appliedAt: "Mar 1, 2026", coverLetter: "With 7 years of instruction across France, Spain, and Canada, I bring deep expertise in all-mountain teaching.", availability: "Nov 2025 – Apr 2026 (full season)", languages: ["French", "English", "Spanish"], resumeUrl: "/resumes/marie-dubois-resume.pdf" },
    { id: "a4", name: "Kenji Nakamura", email: "kenji.n@example.com", location: "Nagano, Japan", skills: ["SAJ Level 2", "Children's Instruction", "Japanese", "English"], experience: 4, status: "interview_scheduled", appliedAt: "Mar 14, 2026", coverLetter: "I specialize in children's ski instruction and have taught at several major resorts in Japan.", availability: "Dec 2025 – Mar 2026", languages: ["Japanese", "English"], resumeUrl: null },
    { id: "a5", name: "Sofia Rodriguez", email: "sofia.r@example.com", location: "Santiago, Chile", skills: ["CSIA Level 2", "Spanish", "English"], experience: 3, status: "pending", appliedAt: "Mar 16, 2026", coverLetter: "I've instructed at resorts in Chile and Argentina during southern hemisphere winters and want to experience a northern season.", availability: "Nov 2025 – Apr 2026", languages: ["Spanish", "English"], resumeUrl: "/resumes/sofia-rodriguez-resume.pdf" },
  ],
  j2: [
    { id: "a6", name: "Sophie Chen", email: "sophie.c@example.com", location: "Melbourne, Australia", skills: ["RSA Certified", "Cocktail Making", "English", "Mandarin"], experience: 4, status: "pending", appliedAt: "Mar 12, 2026", coverLetter: "I've worked in Melbourne's top cocktail bars for 4 years and I'm looking for a season abroad.", availability: "Nov 2025 – Apr 2026", languages: ["English", "Mandarin"], resumeUrl: "/resumes/sophie-chen-resume.pdf" },
    { id: "a7", name: "Tom Wilson", email: "tom.w@example.com", location: "Queenstown, NZ", skills: ["Cocktail Making", "Wine Knowledge", "English"], experience: 3, status: "interview_scheduled", appliedAt: "Mar 11, 2026", coverLetter: "I've spent 3 seasons bartending in Queenstown's famous après-ski scene.", availability: "Nov 2025 – Apr 2026", languages: ["English"], resumeUrl: "/resumes/tom-wilson-resume.pdf" },
  ],
  j3: [
    { id: "a8", name: "Ana Santos", email: "ana.s@example.com", location: "Lisbon, Portugal", skills: ["Hotel Management Diploma", "Portuguese", "English"], experience: 2, status: "pending", appliedAt: "Mar 15, 2026", coverLetter: "I recently graduated with a Hotel Management Diploma and completed internships at two 5-star hotels.", availability: "Nov 2025 – Apr 2026", languages: ["Portuguese", "English", "Spanish"], resumeUrl: "/resumes/ana-santos-resume.pdf" },
    { id: "a9", name: "Jake Thompson", email: "jake.t@example.com", location: "Queenstown, NZ", skills: ["First Aid", "Customer Service", "English"], experience: 2, status: "interview_scheduled", appliedAt: "Mar 5, 2026", coverLetter: "I have 2 seasons of hotel experience in New Zealand's ski region.", availability: "Nov 2025 – Apr 2026", languages: ["English"], resumeUrl: "/resumes/jake-thompson-resume.pdf" },
  ],
  j4: [
    { id: "a10", name: "Ollie Hansen", email: "ollie.h@example.com", location: "Oslo, Norway", skills: ["Culinary Arts Diploma", "French Cuisine", "Norwegian", "English"], experience: 4, status: "reviewed", appliedAt: "Mar 9, 2026", coverLetter: "I trained in French cuisine in Lyon and have worked at mountain restaurants in Norway and Switzerland.", availability: "Dec 2025 – Mar 2026", languages: ["Norwegian", "English", "French"], resumeUrl: "/resumes/ollie-hansen-resume.pdf" },
    { id: "a11", name: "Claire Bonnet", email: "claire.b@example.com", location: "Lyon, France", skills: ["Le Cordon Bleu", "Pastry", "French", "English"], experience: 5, status: "pending", appliedAt: "Mar 13, 2026", coverLetter: "A Le Cordon Bleu graduate with 5 years in high-end alpine restaurants across the French Alps.", availability: "Dec 2025 – Mar 2026", languages: ["French", "English"], resumeUrl: "/resumes/claire-bonnet-resume.pdf" },
  ],
  j5: [
    { id: "a12", name: "Hiroshi Tanaka", email: "hiroshi.t@example.com", location: "Niseko, Japan", skills: ["Customer Service", "Japanese", "English"], experience: 3, status: "accepted", appliedAt: "Mar 14, 2026", coverLetter: "I have 3 seasons of lift operations experience in Niseko.", availability: "Nov 2025 – Apr 2026", languages: ["Japanese", "English"], resumeUrl: null },
    { id: "a13", name: "Ryan O'Brien", email: "ryan.o@example.com", location: "Denver, USA", skills: ["Lift Maintenance", "First Aid", "English", "Spanish"], experience: 5, status: "accepted", appliedAt: "Mar 3, 2026", coverLetter: "I've been working lift operations at Colorado resorts for 5 years.", availability: "Nov 2025 – Apr 2026", languages: ["English", "Spanish"], resumeUrl: "/resumes/ryan-obrien-resume.pdf" },
  ],
};

/* ─── Helpers ─────────────────────────────────────────────── */

function getInitials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

/* ─── Page ───────────────────────────────────────────────── */

export default function ListingDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const [listing, setListing] = useState(() => demoListings[id] || null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editingPositions, setEditingPositions] = useState(false);
  const [editForm, setEditForm] = useState({
    title: listing?.title || "",
    description: listing?.description || "",
    requirements: listing?.requirements || "",
    pay: listing?.pay || "",
    startDate: listing?.startDate || "",
    endDate: listing?.endDate || "",
    housing: listing?.housing || false,
    housingDetails: listing?.housingDetails || "",
    skiPass: listing?.skiPass || false,
    meals: listing?.meals || false,
    visaSponsorship: listing?.visaSponsorship || false,
    showPositions: listing?.showPositions !== false,
  });

  // New state for tabs and panels
  const [activeTab, setActiveTab] = useState<ActiveTab>(null);
  const [applicants, setApplicants] = useState<Applicant[]>([]);
  const [applicantSearch, setApplicantSearch] = useState("");
  const [applicantStatusFilter, setApplicantStatusFilter] = useState<"all" | ApplicantStatus>("all");
  const [expandedApplicant, setExpandedApplicant] = useState<string | null>(null);
  const [filledSlots, setFilledSlots] = useState<string[]>([]);
  const [acceptConfirm, setAcceptConfirm] = useState<Applicant | null>(null);
  const [editingStatus, setEditingStatus] = useState<string | null>(null);
  const [showAssignDropdown, setShowAssignDropdown] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);

  // Fetch real listing + applicants from Supabase
  useEffect(() => {
    (async () => {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { setPageLoading(false); return; }

        // Fetch the listing
        const { data: jobData } = await supabase
          .from("job_posts")
          .select("*, resorts(name, country), applications(count)")
          .eq("id", id)
          .single();

        if (jobData) {
          const resort = jobData.resorts as { name: string; country: string } | null;
          setListing({
            id: jobData.id,
            title: jobData.title,
            status: (jobData.status || "active") as "active" | "paused" | "closed" | "draft",
            resort: resort?.name || "",
            location: resort ? `${resort.name}, ${resort.country}` : "",
            businessName: "",
            description: jobData.description || "",
            requirements: jobData.requirements || "",
            pay: jobData.pay_amount || jobData.salary_range || "",
            type: jobData.position_type === "full_time" ? "Full-time" : jobData.position_type === "part_time" ? "Part-time" : "Casual",
            startDate: jobData.start_date || "",
            endDate: jobData.end_date || "",
            posted: jobData.created_at,
            housing: jobData.accommodation_included,
            housingDetails: jobData.housing_details || null,
            skiPass: jobData.ski_pass_included || false,
            meals: jobData.meal_perks || false,
            language: jobData.language_required || "English",
            visaSponsorship: jobData.visa_sponsorship || false,
            urgent: jobData.urgently_hiring || false,
            showPositions: jobData.show_positions !== false,
            positionsAvailable: jobData.positions_available || 1,
            positionsFilled: 0,
            applicants: 0, // Updated below after fetching applicants
            interviews: 0,
            views: 0,
          });
          setEditForm({
            title: jobData.title,
            description: jobData.description || "",
            requirements: jobData.requirements || "",
            pay: jobData.pay_amount || jobData.salary_range || "",
            startDate: jobData.start_date || "",
            endDate: jobData.end_date || "",
            housing: jobData.accommodation_included,
            housingDetails: jobData.housing_details || "",
            skiPass: jobData.ski_pass_included || false,
            meals: jobData.meal_perks || false,
            visaSponsorship: jobData.visa_sponsorship || false,
            showPositions: jobData.show_positions !== false,
          });
        }

        // Fetch applicants for this listing
        const { data: appData } = await supabase
          .from("applications")
          .select("*, worker_profiles(id, first_name, last_name, phone, avatar_url, profile_photo_url, nationality, location_current, skills, years_seasonal_experience, languages, references, cv_url)")
          .eq("job_post_id", id);

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

          const mappedApplicants: Applicant[] = appData.map((a: Record<string, unknown>) => {
            const wp = a.worker_profiles as Record<string, unknown> | null;
            const firstName = (wp?.first_name as string) || "";
            const lastName = (wp?.last_name as string) || "";
            const langs = (wp?.languages as { language: string }[]) || [];

            return {
              id: (wp?.id as string) || (a.worker_id as string),
              applicationId: a.id as string,
              name: [firstName, lastName].filter(Boolean).join(" ") || "Unknown",
              email: "",
              location: (wp?.location_current as string) || "",
              avatar: (wp?.avatar_url as string) || (wp?.profile_photo_url as string) || null,
              nationality: (wp?.nationality as string) || null,
              skills: (wp?.skills as string[]) || [],
              experience: (wp?.years_seasonal_experience as number) || 0,
              status: statusMap[a.status as string] || "pending",
              appliedAt: a.applied_at as string,
              coverLetter: (a.cover_letter as string) || "",
              availability: "",
              languages: langs.map((l) => l.language),
              resumeUrl: (a.resume_url as string) || (wp?.cv_url as string) || null,
            };
          });
          setApplicants(mappedApplicants);

          // Update the listing counts with real data
          const interviewCount = mappedApplicants.filter((a) => a.status === "interview_scheduled").length;
          const accepted = mappedApplicants.filter((a) => a.status === "accepted");
          setFilledSlots(accepted.map((a) => a.id));
          setListing((prev) => prev ? {
            ...prev,
            applicants: mappedApplicants.length,
            interviews: interviewCount,
            positionsFilled: accepted.length,
          } : prev);
        }
      } catch (err) {
        console.error("Failed to load listing data:", err);
      }
      setPageLoading(false);
    })();
  }, [id]);

  // Derived data
  const filteredApplicants = useMemo(() => {
    let list = applicants;
    if (applicantStatusFilter !== "all") {
      list = list.filter((a) => a.status === applicantStatusFilter);
    }
    if (applicantSearch.trim()) {
      const q = applicantSearch.toLowerCase();
      list = list.filter(
        (a) =>
          a.name.toLowerCase().includes(q) ||
          a.skills.some((s) => s.toLowerCase().includes(q))
      );
    }
    return list;
  }, [applicants, applicantSearch, applicantStatusFilter]);

  const interviewApplicants = useMemo(
    () => applicants.filter((a) => a.status === "interview_scheduled"),
    [applicants]
  );

  const acceptedApplicants = useMemo(
    () => applicants.filter((a) => a.status === "accepted"),
    [applicants]
  );

  const assignableApplicants = useMemo(
    () => acceptedApplicants.filter((a) => !filledSlots.includes(a.id)),
    [acceptedApplicants, filledSlots]
  );

  if (pageLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary/20 border-t-primary" />
      </div>
    );
  }

  if (!listing) {
    return (
      <div className="mx-auto max-w-3xl py-10 text-center">
        <p className="text-foreground/50">Listing not found.</p>
        <Link href="/business/manage-listings" className="mt-4 inline-block text-sm text-primary hover:underline">
          Back to Manage Listings
        </Link>
      </div>
    );
  }

  const style = STATUS_STYLES[listing.status];

  const handleStatusAction = async (action: "pause" | "resume" | "close" | "reopen" | "publish") => {
    setActionLoading(action);

    const uiStatusMap: Record<string, "active" | "paused" | "closed" | "draft"> = {
      pause: "paused",
      resume: "active",
      close: "closed",
      reopen: "active",
      publish: "active",
    };
    const dbStatusMap: Record<string, string> = {
      pause: "paused",
      resume: "active",
      close: "closed",
      reopen: "active",
      publish: "active",
    };

    try {
      const supabase = createClient();
      await supabase
        .from("job_posts")
        .update({ status: dbStatusMap[action] })
        .eq("id", listing.id);
    } catch (err) {
      console.error("Failed to update status:", err);
    }

    setListing({ ...listing, status: uiStatusMap[action] });
    setActionLoading(null);
  };

  const handleDelete = async () => {
    setActionLoading("delete");
    try {
      const supabase = createClient();
      await supabase.from("job_posts").delete().eq("id", listing.id);
      router.push("/business/manage-listings");
    } catch (err) {
      console.error("Failed to delete listing:", err);
      setActionLoading(null);
      setShowDeleteConfirm(false);
    }
  };

  const handleSaveEdit = async () => {
    setActionLoading("save");
    try {
      const supabase = createClient();
      await supabase
        .from("job_posts")
        .update({
          title: editForm.title,
          description: editForm.description,
          requirements: editForm.requirements || null,
          pay_amount: editForm.pay || null,
          salary_range: editForm.pay || null,
          start_date: editForm.startDate || null,
          end_date: editForm.endDate || null,
          accommodation_included: editForm.housing,
          housing_details: editForm.housing ? editForm.housingDetails : null,
          ski_pass_included: editForm.skiPass,
          meal_perks: editForm.meals,
          visa_sponsorship: editForm.visaSponsorship,
          show_positions: editForm.showPositions,
        })
        .eq("id", listing.id);
    } catch (err) {
      console.error("Failed to save listing:", err);
    }
    setListing({
      ...listing,
      title: editForm.title,
      description: editForm.description,
      requirements: editForm.requirements,
      pay: editForm.pay,
      startDate: editForm.startDate,
      endDate: editForm.endDate,
      housing: editForm.housing,
      housingDetails: editForm.housing ? editForm.housingDetails : null,
      skiPass: editForm.skiPass,
      meals: editForm.meals,
      visaSponsorship: editForm.visaSponsorship,
      showPositions: editForm.showPositions,
    });
    setEditing(false);
    setActionLoading(null);
  };

  const handleApplicantStatusChange = async (applicantId: string, newStatus: ApplicantStatus) => {
    // Map local status back to database status
    const dbStatusMap: Record<ApplicantStatus, string> = {
      pending: "new",
      reviewed: "viewed",
      interview_scheduled: "interview",
      accepted: "accepted",
      rejected: "rejected",
    };

    // Optimistic update
    setApplicants((prev) =>
      prev.map((a) => (a.id === applicantId ? { ...a, status: newStatus } : a))
    );

    // If rejected or status changed away from accepted, remove from filled slots
    if (newStatus === "rejected" || newStatus !== "accepted") {
      setFilledSlots((prev) => prev.filter((sid) => sid !== applicantId));
    }
    if (newStatus === "accepted" && !filledSlots.includes(applicantId)) {
      setFilledSlots((prev) => [...prev, applicantId]);
    }

    // Update in database
    try {
      const applicant = applicants.find((a) => a.id === applicantId);
      if (applicant?.applicationId) {
        const supabase = createClient();
        await supabase
          .from("applications")
          .update({ status: dbStatusMap[newStatus] })
          .eq("id", applicant.applicationId);

        // Send status change email to worker (non-blocking)
        fetch("/api/emails/application-status", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            applicationId: applicant.applicationId,
            newStatus: dbStatusMap[newStatus],
          }),
        }).catch((err) => console.error("Failed to trigger status email:", err));
      }
    } catch (err) {
      console.error("Failed to update application status:", err);
    }

    // Update listing counts
    setListing((prev) => {
      if (!prev) return prev;
      const updated = applicants.map((a) => a.id === applicantId ? { ...a, status: newStatus } : a);
      return {
        ...prev,
        interviews: updated.filter((a) => a.status === "interview_scheduled").length,
        positionsFilled: updated.filter((a) => a.status === "accepted").length,
      };
    });
  };

  const handleTabClick = (tab: ActiveTab) => {
    setActiveTab((prev) => (prev === tab ? null : tab));
  };

  const handleAssignWorker = (applicantId: string) => {
    if (!filledSlots.includes(applicantId)) {
      setFilledSlots((prev) => [...prev, applicantId]);
    }
    setShowAssignDropdown(false);
  };

  const handleRemoveWorker = (applicantId: string) => {
    setFilledSlots((prev) => prev.filter((sid) => sid !== applicantId));
  };

  const statusFilterOptions: { value: "all" | ApplicantStatus; label: string }[] = [
    { value: "all", label: "All" },
    { value: "pending", label: "Pending" },
    { value: "reviewed", label: "Reviewed" },
    { value: "interview_scheduled", label: "Interview" },
    { value: "accepted", label: "Accepted" },
    { value: "rejected", label: "Unsuccessful" },
  ];

  return (
    <div className="mx-auto max-w-3xl">
      {/* Back link */}
      <Link
        href="/business/manage-listings"
        className="mb-4 inline-flex items-center gap-1 text-sm text-foreground/50 hover:text-foreground"
      >
        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Back to Manage Listings
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-primary">{listing.title}</h1>
            <span className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-medium ${style.bg} ${style.text}`}>
              {style.label}
            </span>
            {listing.urgent && (
              <span className="inline-flex rounded-full border border-red-200 bg-red-50 px-2.5 py-0.5 text-xs font-medium text-red-600">
                Urgently Hiring
              </span>
            )}
          </div>
          <p className="mt-1 text-sm text-foreground/60">
            {listing.businessName} · {listing.location}
          </p>
        </div>
      </div>

      {/* Action bar */}
      <div className="mt-5 flex flex-wrap gap-2">
        <Link
          href={`/business/post-job/${listing.id}`}
          className="rounded-lg border border-accent bg-white px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent/20"
        >
          Edit Listing
        </Link>
        {listing.status === "draft" && (
          <>
            <button
              onClick={() => handleStatusAction("publish")}
              disabled={actionLoading !== null}
              className="rounded-lg border border-green-200 bg-green-50 px-4 py-2 text-sm font-medium text-green-700 transition-colors hover:bg-green-100 disabled:opacity-50"
            >
              {actionLoading === "publish" ? "Publishing…" : "Publish Listing"}
            </button>
          </>
        )}
        {listing.status === "active" && (
          <>
            <button
              onClick={() => handleStatusAction("pause")}
              disabled={actionLoading !== null}
              className="rounded-lg border border-yellow-200 bg-yellow-50 px-4 py-2 text-sm font-medium text-yellow-700 transition-colors hover:bg-yellow-100 disabled:opacity-50"
            >
              {actionLoading === "pause" ? "Pausing…" : "Pause Listing"}
            </button>
            <button
              onClick={() => handleStatusAction("close")}
              disabled={actionLoading !== null}
              className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-100 disabled:opacity-50"
            >
              {actionLoading === "close" ? "Closing…" : "Close Listing"}
            </button>
          </>
        )}
        {listing.status === "paused" && (
          <>
            <button
              onClick={() => handleStatusAction("resume")}
              disabled={actionLoading !== null}
              className="rounded-lg border border-green-200 bg-green-50 px-4 py-2 text-sm font-medium text-green-700 transition-colors hover:bg-green-100 disabled:opacity-50"
            >
              {actionLoading === "resume" ? "Resuming…" : "Resume Listing"}
            </button>
            <button
              onClick={() => handleStatusAction("close")}
              disabled={actionLoading !== null}
              className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-100 disabled:opacity-50"
            >
              {actionLoading === "close" ? "Closing…" : "Close Listing"}
            </button>
          </>
        )}
        {listing.status === "closed" && (
          <button
            onClick={() => handleStatusAction("reopen")}
            disabled={actionLoading !== null}
            className="rounded-lg border border-green-200 bg-green-50 px-4 py-2 text-sm font-medium text-green-700 transition-colors hover:bg-green-100 disabled:opacity-50"
          >
            {actionLoading === "reopen" ? "Reopening…" : "Reopen Listing"}
          </button>
        )}

        {/* Delete button — always available */}
        {!showDeleteConfirm ? (
          <button
            onClick={() => setShowDeleteConfirm(true)}
            disabled={actionLoading !== null}
            className="ml-auto rounded-lg border border-red-200 bg-white px-4 py-2 text-sm font-medium text-red-500 transition-colors hover:bg-red-50 disabled:opacity-50"
          >
            Delete Listing
          </button>
        ) : (
          <div className="ml-auto flex items-center gap-2 rounded-lg border border-red-300 bg-red-50 px-4 py-2">
            <span className="text-sm text-red-700">Delete permanently?</span>
            <button
              onClick={handleDelete}
              disabled={actionLoading === "delete"}
              className="rounded-md bg-red-600 px-3 py-1 text-xs font-medium text-white transition-colors hover:bg-red-700 disabled:opacity-50"
            >
              {actionLoading === "delete" ? "Deleting…" : "Yes, Delete"}
            </button>
            <button
              onClick={() => setShowDeleteConfirm(false)}
              disabled={actionLoading === "delete"}
              className="rounded-md border border-red-200 bg-white px-3 py-1 text-xs font-medium text-red-600 transition-colors hover:bg-red-50 disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
        )}
      </div>

      {/* Stats — Clickable tab cards */}
      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <button
          onClick={() => handleTabClick("applicants")}
          className={`rounded-xl border bg-white p-4 text-center transition-colors ${
            activeTab === "applicants" ? "border-secondary ring-1 ring-secondary" : "border-accent hover:border-secondary/50"
          }`}
        >
          <p className="text-2xl font-bold text-primary">{listing.applicants}</p>
          <p className="text-xs uppercase tracking-wider text-foreground/50">Applicants</p>
        </button>
        <button
          onClick={() => handleTabClick("interviews")}
          className={`rounded-xl border bg-white p-4 text-center transition-colors ${
            activeTab === "interviews" ? "border-secondary ring-1 ring-secondary" : "border-accent hover:border-secondary/50"
          }`}
        >
          <p className="text-2xl font-bold text-primary">{listing.interviews}</p>
          <p className="text-xs uppercase tracking-wider text-foreground/50">Interviews</p>
        </button>
        <div className="rounded-xl border border-accent bg-white p-4 text-center">
          <p className="text-2xl font-bold text-primary">{listing.views.toLocaleString()}</p>
          <p className="text-xs uppercase tracking-wider text-foreground/50">Views</p>
        </div>
        <button
          onClick={() => handleTabClick("filled")}
          className={`rounded-xl border bg-white p-4 text-center transition-colors ${
            activeTab === "filled" ? "border-secondary ring-1 ring-secondary" : "border-accent hover:border-secondary/50"
          }`}
        >
          <p className="text-2xl font-bold text-primary">
            {listing.positionsFilled}/{listing.positionsAvailable}
          </p>
          <p className="text-xs uppercase tracking-wider text-foreground/50">Filled</p>
        </button>
      </div>

      {/* ─── Applicants Panel ─────────────────────────────── */}
      {activeTab === "applicants" && (
        <div className="mt-4 rounded-xl border border-accent bg-white p-6">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-foreground/50">Applicants</h2>

          {/* Search */}
          <div className="mt-4">
            <input
              type="text"
              value={applicantSearch}
              onChange={(e) => setApplicantSearch(e.target.value)}
              placeholder="Search by name or skill..."
              className="w-full rounded-lg border border-accent bg-white px-4 py-2.5 text-sm text-primary placeholder:text-foreground/30 focus:border-secondary focus:outline-none focus:ring-1 focus:ring-secondary"
            />
          </div>

          {/* Status filter pills */}
          <div className="mt-3 flex flex-wrap gap-2">
            {statusFilterOptions.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setApplicantStatusFilter(opt.value)}
                className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                  applicantStatusFilter === opt.value
                    ? "bg-secondary text-white"
                    : "bg-accent/10 text-foreground/60 hover:bg-accent/20"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {/* Applicant list */}
          <div className="mt-4 space-y-3">
            {filteredApplicants.length === 0 ? (
              <p className="py-6 text-center text-sm text-foreground/40">No applicants match your filters.</p>
            ) : (
              filteredApplicants.map((applicant) => {
                const isExpanded = expandedApplicant === applicant.id;
                const badge = APPLICANT_STATUS_STYLES[applicant.status];
                return (
                  <div
                    key={applicant.id}
                    className="rounded-lg border border-accent transition-colors hover:border-secondary/30"
                  >
                    {/* Collapsed card */}
                    <div className="flex w-full items-center gap-4 p-4">
                      {/* Avatar */}
                      <button onClick={() => setExpandedApplicant(isExpanded ? null : applicant.id)}>
                        <ApplicantAvatar avatar={applicant.avatar} nationality={applicant.nationality} name={applicant.name} />
                      </button>

                      {/* Info */}
                      <button
                        onClick={() => setExpandedApplicant(isExpanded ? null : applicant.id)}
                        className="min-w-0 flex-1 text-left"
                      >
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-primary">{applicant.name}</span>
                          <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium ${badge.bg} ${badge.text}`}>
                            {badge.label}
                          </span>
                        </div>
                        <div className="mt-0.5 flex items-center gap-3 text-xs text-foreground/60">
                          <span>{applicant.location}</span>
                          <span>{applicant.experience} yr{applicant.experience !== 1 ? "s" : ""} exp</span>
                        </div>
                        <div className="mt-1.5 flex flex-wrap gap-1">
                          {applicant.skills.slice(0, 3).map((skill) => (
                            <span key={skill} className="inline-flex rounded bg-accent/10 px-1.5 py-0.5 text-[10px] text-foreground/60">
                              {skill}
                            </span>
                          ))}
                          {applicant.skills.length > 3 && (
                            <span className="inline-flex rounded bg-accent/10 px-1.5 py-0.5 text-[10px] text-foreground/60">
                              +{applicant.skills.length - 3}
                            </span>
                          )}
                        </div>
                      </button>

                      {/* Quick action icons */}
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => setExpandedApplicant(applicant.id)}
                          title="View Profile"
                          className="rounded-lg p-2 text-foreground/40 hover:bg-secondary/10 hover:text-primary transition-colors"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                        </button>
                        {applicant.resumeUrl ? (
                          <a
                            href={applicant.resumeUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            title="View Resume"
                            className="rounded-lg p-2 text-foreground/40 hover:bg-secondary/10 hover:text-primary transition-colors"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                          </a>
                        ) : (
                          <button
                            onClick={() => setExpandedApplicant(applicant.id)}
                            title="View Resume"
                            className="rounded-lg p-2 text-foreground/30 hover:bg-secondary/10 hover:text-primary transition-colors"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                          </button>
                        )}
                        <button
                          title="Message"
                          className="rounded-lg p-2 text-foreground/40 hover:bg-secondary/10 hover:text-primary transition-colors"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                          </svg>
                        </button>
                      </div>

                      {/* Applied date & expand icon */}
                      <div className="shrink-0 text-right">
                        <span className="text-xs text-foreground/40">Applied {applicant.appliedAt}</span>
                        <button onClick={() => setExpandedApplicant(isExpanded ? null : applicant.id)}>
                          <svg
                            className={`ml-auto mt-1 h-4 w-4 text-foreground/30 transition-transform ${isExpanded ? "rotate-180" : ""}`}
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </button>
                      </div>
                    </div>

                    {/* Expanded details */}
                    {isExpanded && (
                      <div className="border-t border-accent px-4 pb-4 pt-3">
                        <div className="space-y-3 text-sm">
                          {/* Cover letter */}
                          <div>
                            <h4 className="font-medium text-primary">Cover Letter</h4>
                            <p className="mt-1 text-foreground/70">{applicant.coverLetter}</p>
                          </div>

                          {/* Details grid */}
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <h4 className="font-medium text-primary">Languages</h4>
                              <p className="mt-0.5 text-foreground/70">{applicant.languages.join(", ")}</p>
                            </div>
                            <div>
                              <h4 className="font-medium text-primary">Availability</h4>
                              <p className="mt-0.5 text-foreground/70">{applicant.availability}</p>
                            </div>
                            <div>
                              <h4 className="font-medium text-primary">Email</h4>
                              <a href={`mailto:${applicant.email}`} className="mt-0.5 block text-secondary hover:underline">
                                {applicant.email}
                              </a>
                            </div>
                            <div>
                              <h4 className="font-medium text-primary">All Skills</h4>
                              <div className="mt-1 flex flex-wrap gap-1">
                                {applicant.skills.map((skill) => (
                                  <span key={skill} className="inline-flex rounded bg-accent/10 px-1.5 py-0.5 text-xs text-foreground/60">
                                    {skill}
                                  </span>
                                ))}
                              </div>
                            </div>
                          </div>

                          {/* Actions */}
                          <div className="flex flex-wrap gap-2 pt-1">
                            {(applicant.status === "accepted" || applicant.status === "rejected") ? (
                              /* Edit status for accepted/unsuccessful applicants */
                              editingStatus === applicant.id ? (
                                <>
                                  <button
                                    onClick={() => { handleApplicantStatusChange(applicant.id, "pending"); setEditingStatus(null); }}
                                    className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-700 transition-colors hover:bg-blue-100"
                                  >
                                    Move to Pending
                                  </button>
                                  <button
                                    onClick={() => { handleApplicantStatusChange(applicant.id, "reviewed"); setEditingStatus(null); }}
                                    className="rounded-lg border border-yellow-200 bg-yellow-50 px-3 py-1.5 text-xs font-medium text-yellow-700 transition-colors hover:bg-yellow-100"
                                  >
                                    Mark Reviewed
                                  </button>
                                  <button
                                    onClick={() => { handleApplicantStatusChange(applicant.id, "interview_scheduled"); setEditingStatus(null); }}
                                    className="rounded-lg border border-purple-200 bg-purple-50 px-3 py-1.5 text-xs font-medium text-purple-700 transition-colors hover:bg-purple-100"
                                  >
                                    Request Interview
                                  </button>
                                  {applicant.status === "rejected" && (
                                    <button
                                      onClick={() => { setAcceptConfirm(applicant); setEditingStatus(null); }}
                                      className="rounded-lg border border-green-200 bg-green-50 px-3 py-1.5 text-xs font-medium text-green-700 transition-colors hover:bg-green-100"
                                    >
                                      Accept
                                    </button>
                                  )}
                                  {applicant.status === "accepted" && (
                                    <button
                                      onClick={() => { handleApplicantStatusChange(applicant.id, "rejected"); setEditingStatus(null); }}
                                      className="rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-medium text-red-600 transition-colors hover:bg-red-100"
                                    >
                                      Unsuccessful
                                    </button>
                                  )}
                                  <button
                                    onClick={() => setEditingStatus(null)}
                                    className="rounded-lg border border-accent/40 px-3 py-1.5 text-xs font-medium text-foreground/50 transition-colors hover:bg-accent/10"
                                  >
                                    Cancel
                                  </button>
                                </>
                              ) : (
                                <button
                                  onClick={() => setEditingStatus(applicant.id)}
                                  className="rounded-lg border border-accent/40 px-3 py-1.5 text-xs font-medium text-foreground/60 transition-colors hover:bg-accent/10 flex items-center gap-1"
                                >
                                  <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" />
                                  </svg>
                                  Edit Status
                                </button>
                              )
                            ) : (
                              /* Normal actions for pending/reviewed/interview applicants */
                              <>
                                <button
                                  onClick={() => handleApplicantStatusChange(applicant.id, "rejected")}
                                  className="rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-medium text-red-600 transition-colors hover:bg-red-100"
                                >
                                  Unsuccessful
                                </button>
                                {applicant.status !== "interview_scheduled" && (
                                  <button
                                    onClick={() => handleApplicantStatusChange(applicant.id, "interview_scheduled")}
                                    className="rounded-lg border border-purple-200 bg-purple-50 px-3 py-1.5 text-xs font-medium text-purple-700 transition-colors hover:bg-purple-100"
                                  >
                                    Request Interview
                                  </button>
                                )}
                                <button
                                  onClick={() => setAcceptConfirm(applicant)}
                                  className="rounded-lg border border-green-200 bg-green-50 px-3 py-1.5 text-xs font-medium text-green-700 transition-colors hover:bg-green-100"
                                >
                                  Accept
                                </button>
                                {applicant.status === "interview_scheduled" && (
                                  <button
                                    className="rounded-lg bg-secondary px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-secondary/90"
                                  >
                                    Schedule Interview
                                  </button>
                                )}
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* ─── Interviews Panel ─────────────────────────────── */}
      {activeTab === "interviews" && (
        <div className="mt-4 rounded-xl border border-accent bg-white p-6">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-foreground/50">Interviews</h2>

          {interviewApplicants.length === 0 ? (
            <div className="py-10 text-center">
              <p className="text-sm text-foreground/40">No interviews scheduled yet.</p>
              <p className="mt-1 text-xs text-foreground/30">Request interviews from the Applicants tab.</p>
            </div>
          ) : (
            <div className="mt-4 space-y-3">
              {interviewApplicants.map((applicant) => (
                <div key={applicant.id} className="flex items-center gap-4 rounded-lg border border-accent p-4">
                  {/* Avatar */}
                  <ApplicantAvatar avatar={applicant.avatar} nationality={applicant.nationality} name={applicant.name} />

                  {/* Info */}
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-primary">{applicant.name}</p>
                    <p className="text-xs text-foreground/60">{listing.title}</p>
                    <span className="mt-1 inline-flex rounded-full bg-purple-50 px-2 py-0.5 text-[10px] font-medium text-purple-700">
                      Scheduled
                    </span>
                  </div>

                  {/* Actions */}
                  <div className="flex shrink-0 gap-2">
                    <button
                      onClick={() => setAcceptConfirm(applicant)}
                      className="rounded-lg border border-green-200 bg-green-50 px-3 py-1.5 text-xs font-medium text-green-700 transition-colors hover:bg-green-100"
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => handleApplicantStatusChange(applicant.id, "rejected")}
                      className="rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-medium text-red-600 transition-colors hover:bg-red-100"
                    >
                      Unsuccessful
                    </button>
                    <a
                      href="/business/messages"
                      className="rounded-lg border border-accent bg-white px-3 py-1.5 text-xs font-medium text-foreground/60 transition-colors hover:bg-accent/20"
                    >
                      Message
                    </a>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ─── Filled Positions Panel ───────────────────────── */}
      {activeTab === "filled" && (
        <div className="mt-4 rounded-xl border border-accent bg-white p-6">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-foreground/50">Filled Positions</h2>

          <div className="mt-4 space-y-3">
            {/* Assigned workers */}
            {filledSlots.map((slotId) => {
              const worker = applicants.find((a) => a.id === slotId);
              if (!worker) return null;
              return (
                <div key={slotId} className="flex items-center gap-4 rounded-lg border border-green-200 bg-green-50/30 p-4">
                  <ApplicantAvatar avatar={worker.avatar} nationality={worker.nationality} name={worker.name} />
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-primary">{worker.name}</p>
                    <p className="text-xs text-foreground/60">{worker.location}</p>
                    <p className="text-[10px] text-foreground/40">Accepted {worker.appliedAt}</p>
                  </div>
                  <button
                    onClick={() => handleRemoveWorker(slotId)}
                    className="rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-medium text-red-600 transition-colors hover:bg-red-100"
                  >
                    Remove
                  </button>
                </div>
              );
            })}

            {/* Empty slots */}
            {Array.from({ length: Math.max(0, listing.positionsAvailable - filledSlots.length) }).map((_, i) => (
              <div key={`empty-${i}`} className="relative flex items-center gap-4 rounded-lg border border-dashed border-accent p-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent/10 text-foreground/30">
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-foreground/40">Empty Position</p>
                </div>
                {assignableApplicants.length > 0 ? (
                  <div className="relative">
                    <button
                      onClick={() => setShowAssignDropdown(showAssignDropdown === true ? false : true)}
                      className="rounded-lg border border-secondary bg-secondary/5 px-3 py-1.5 text-xs font-medium text-secondary transition-colors hover:bg-secondary/10"
                    >
                      Assign Worker
                    </button>
                    {showAssignDropdown && (
                      <div className="absolute right-0 top-full z-10 mt-1 w-56 rounded-lg border border-accent bg-white py-1 shadow-lg">
                        {assignableApplicants.map((a) => (
                          <button
                            key={a.id}
                            onClick={() => handleAssignWorker(a.id)}
                            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-primary hover:bg-accent/10"
                          >
                            <ApplicantAvatar avatar={a.avatar} nationality={a.nationality} name={a.name} size="sm" />
                            {a.name}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <span className="text-xs text-foreground/30">No accepted applicants to assign</span>
                )}
              </div>
            ))}

            {listing.positionsAvailable === 0 && filledSlots.length === 0 && (
              <p className="py-6 text-center text-sm text-foreground/40">No positions configured for this listing.</p>
            )}
          </div>
        </div>
      )}

      {/* Positions */}
      <div className="mt-4 rounded-xl border border-accent bg-white p-5">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-foreground/50">Positions</h2>
          <button
            onClick={() => setEditingPositions(!editingPositions)}
            className="text-xs font-medium text-secondary hover:underline"
          >
            {editingPositions ? "Done" : "Edit"}
          </button>
        </div>

        {/* Progress bar */}
        <div className="mt-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-foreground/60">
              {listing.positionsFilled} of {listing.positionsAvailable} positions filled
            </span>
            <span className="font-medium text-primary">
              {listing.positionsAvailable - listing.positionsFilled} remaining
            </span>
          </div>
          <div className="mt-2 h-2.5 w-full overflow-hidden rounded-full bg-gray-200">
            <div
              className="h-full rounded-full bg-secondary transition-all"
              style={{
                width: `${listing.positionsAvailable > 0 ? (listing.positionsFilled / listing.positionsAvailable) * 100 : 0}%`,
              }}
            />
          </div>
        </div>

        {editingPositions && (
          <div className="mt-4 grid grid-cols-2 gap-4">
            {/* Positions Available */}
            <div>
              <label className="block text-xs font-medium text-foreground/60">Positions Available</label>
              <div className="mt-1 flex items-center gap-2">
                <button
                  onClick={() =>
                    setListing({
                      ...listing,
                      positionsAvailable: Math.max(listing.positionsFilled, listing.positionsAvailable - 1),
                    })
                  }
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-accent bg-white text-sm font-bold text-foreground/60 hover:bg-accent/20"
                >
                  -
                </button>
                <input
                  type="number"
                  value={listing.positionsAvailable}
                  onChange={(e) => {
                    const val = Math.max(listing.positionsFilled, parseInt(e.target.value) || 0);
                    setListing({ ...listing, positionsAvailable: val });
                  }}
                  className="w-16 rounded-lg border border-accent bg-white px-2 py-1.5 text-center text-sm font-medium text-primary focus:border-secondary focus:outline-none focus:ring-1 focus:ring-secondary"
                />
                <button
                  onClick={() =>
                    setListing({ ...listing, positionsAvailable: listing.positionsAvailable + 1 })
                  }
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-accent bg-white text-sm font-bold text-foreground/60 hover:bg-accent/20"
                >
                  +
                </button>
              </div>
            </div>

            {/* Positions Filled */}
            <div>
              <label className="block text-xs font-medium text-foreground/60">Positions Filled</label>
              <div className="mt-1 flex items-center gap-2">
                <button
                  onClick={() =>
                    setListing({
                      ...listing,
                      positionsFilled: Math.max(0, listing.positionsFilled - 1),
                    })
                  }
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-accent bg-white text-sm font-bold text-foreground/60 hover:bg-accent/20"
                >
                  -
                </button>
                <input
                  type="number"
                  value={listing.positionsFilled}
                  onChange={(e) => {
                    const val = Math.min(listing.positionsAvailable, Math.max(0, parseInt(e.target.value) || 0));
                    setListing({ ...listing, positionsFilled: val });
                  }}
                  className="w-16 rounded-lg border border-accent bg-white px-2 py-1.5 text-center text-sm font-medium text-primary focus:border-secondary focus:outline-none focus:ring-1 focus:ring-secondary"
                />
                <button
                  onClick={() =>
                    setListing({
                      ...listing,
                      positionsFilled: Math.min(listing.positionsAvailable, listing.positionsFilled + 1),
                    })
                  }
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-accent bg-white text-sm font-bold text-foreground/60 hover:bg-accent/20"
                >
                  +
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Show positions publicly toggle */}
        <div className="mt-4 flex items-center justify-between rounded-lg bg-accent/10 px-4 py-3">
          <div>
            <span className="text-sm font-medium text-foreground/70">Visible to applicants</span>
            <p className="text-xs text-foreground/40 mt-0.5">Show position count on the public job listing</p>
          </div>
          <button
            type="button"
            onClick={async () => {
              const newVal = !listing.showPositions;
              setListing({ ...listing, showPositions: newVal });
              try {
                const supabase = createClient();
                await supabase.from("job_posts").update({ show_positions: newVal }).eq("id", listing.id);
              } catch {}
            }}
            className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${listing.showPositions ? 'bg-secondary' : 'bg-gray-200'}`}
          >
            <span className={`inline-block h-4 w-4 rounded-full bg-white transition-transform ${listing.showPositions ? 'translate-x-6' : 'translate-x-1'}`} />
          </button>
        </div>
      </div>

      {/* Edit mode */}
      {editing ? (
        <div className="mt-6 space-y-5 rounded-xl border border-secondary bg-white p-6">
          <h2 className="text-lg font-semibold text-primary">Edit Listing</h2>

          <div>
            <label className="block text-sm font-medium text-foreground">Job Title</label>
            <input
              value={editForm.title}
              onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
              className="mt-1 w-full rounded-lg border border-accent bg-white px-4 py-2.5 text-primary focus:border-secondary focus:outline-none focus:ring-1 focus:ring-secondary"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground">Description</label>
            <textarea
              value={editForm.description}
              onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
              rows={6}
              className="mt-1 w-full rounded-lg border border-accent bg-white px-4 py-2.5 text-primary focus:border-secondary focus:outline-none focus:ring-1 focus:ring-secondary"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground">Requirements</label>
            <textarea
              value={editForm.requirements}
              onChange={(e) => setEditForm({ ...editForm, requirements: e.target.value })}
              rows={5}
              className="mt-1 w-full rounded-lg border border-accent bg-white px-4 py-2.5 text-primary focus:border-secondary focus:outline-none focus:ring-1 focus:ring-secondary"
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground">Pay</label>
              <input
                value={editForm.pay}
                onChange={(e) => setEditForm({ ...editForm, pay: e.target.value })}
                className="mt-1 w-full rounded-lg border border-accent bg-white px-4 py-2.5 text-primary focus:border-secondary focus:outline-none focus:ring-1 focus:ring-secondary"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground">Start Date</label>
              <input
                value={editForm.startDate}
                onChange={(e) => setEditForm({ ...editForm, startDate: e.target.value })}
                className="mt-1 w-full rounded-lg border border-accent bg-white px-4 py-2.5 text-primary focus:border-secondary focus:outline-none focus:ring-1 focus:ring-secondary"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground">End Date</label>
              <input
                value={editForm.endDate}
                onChange={(e) => setEditForm({ ...editForm, endDate: e.target.value })}
                className="mt-1 w-full rounded-lg border border-accent bg-white px-4 py-2.5 text-primary focus:border-secondary focus:outline-none focus:ring-1 focus:ring-secondary"
              />
            </div>
          </div>

          {/* Accommodation & Perks */}
          <div className="space-y-4 rounded-lg border border-accent bg-accent/5 p-4">
            <h3 className="text-sm font-semibold text-foreground">Accommodation & Perks</h3>

            {/* Housing Included */}
            <div className="flex items-center justify-between">
              <span className="text-sm text-foreground/60">Housing Included</span>
              <button
                type="button"
                onClick={() => setEditForm({ ...editForm, housing: !editForm.housing })}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${editForm.housing ? 'bg-secondary' : 'bg-gray-200'}`}
              >
                <span className={`inline-block h-4 w-4 rounded-full bg-white transition-transform ${editForm.housing ? 'translate-x-6' : 'translate-x-1'}`} />
              </button>
            </div>

            {/* Housing Details (conditional) */}
            {editForm.housing && (
              <div>
                <label className="block text-sm font-medium text-foreground">Housing Details</label>
                <textarea
                  value={editForm.housingDetails}
                  onChange={(e) => setEditForm({ ...editForm, housingDetails: e.target.value })}
                  rows={3}
                  placeholder="Describe the housing arrangement, cost, location, amenities..."
                  className="mt-1 w-full rounded-lg border border-accent bg-white px-4 py-2.5 text-primary placeholder:text-foreground/30 focus:border-secondary focus:outline-none focus:ring-1 focus:ring-secondary"
                />
              </div>
            )}

            {/* Ski Pass */}
            <div className="flex items-center justify-between">
              <span className="text-sm text-foreground/60">Ski Pass</span>
              <button
                type="button"
                onClick={() => setEditForm({ ...editForm, skiPass: !editForm.skiPass })}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${editForm.skiPass ? 'bg-secondary' : 'bg-gray-200'}`}
              >
                <span className={`inline-block h-4 w-4 rounded-full bg-white transition-transform ${editForm.skiPass ? 'translate-x-6' : 'translate-x-1'}`} />
              </button>
            </div>

            {/* Meals */}
            <div className="flex items-center justify-between">
              <span className="text-sm text-foreground/60">Meals</span>
              <button
                type="button"
                onClick={() => setEditForm({ ...editForm, meals: !editForm.meals })}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${editForm.meals ? 'bg-secondary' : 'bg-gray-200'}`}
              >
                <span className={`inline-block h-4 w-4 rounded-full bg-white transition-transform ${editForm.meals ? 'translate-x-6' : 'translate-x-1'}`} />
              </button>
            </div>

            {/* Visa Sponsorship */}
            <div className="flex items-center justify-between">
              <span className="text-sm text-foreground/60">Visa Sponsorship</span>
              <button
                type="button"
                onClick={() => setEditForm({ ...editForm, visaSponsorship: !editForm.visaSponsorship })}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${editForm.visaSponsorship ? 'bg-secondary' : 'bg-gray-200'}`}
              >
                <span className={`inline-block h-4 w-4 rounded-full bg-white transition-transform ${editForm.visaSponsorship ? 'translate-x-6' : 'translate-x-1'}`} />
              </button>
            </div>

          </div>

          <div className="flex gap-3 pt-2">
            <button
              onClick={handleSaveEdit}
              disabled={actionLoading !== null}
              className="rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary/90 disabled:opacity-50"
            >
              {actionLoading === "save" ? "Saving…" : "Save Changes"}
            </button>
            <button
              onClick={() => {
                setEditing(false);
                setEditForm({
                  title: listing.title,
                  description: listing.description,
                  requirements: listing.requirements,
                  pay: listing.pay,
                  startDate: listing.startDate,
                  endDate: listing.endDate,
                  housing: listing.housing,
                  housingDetails: listing.housingDetails || "",
                  skiPass: listing.skiPass,
                  meals: listing.meals,
                  visaSponsorship: listing.visaSponsorship,
                });
              }}
              className="rounded-lg border border-accent bg-white px-5 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-accent/20"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* Job details */}
          <div className="mt-6 rounded-xl border border-accent bg-white p-6">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-foreground/50">Job Details</h2>

            <div className="mt-4 grid grid-cols-2 gap-x-8 gap-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-foreground/60">Pay</span>
                <span className="font-medium text-primary">{listing.pay}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-foreground/60">Type</span>
                <span className="font-medium text-primary">{listing.type}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-foreground/60">Start Date</span>
                <span className="font-medium text-primary">{listing.startDate}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-foreground/60">End Date</span>
                <span className="font-medium text-primary">{listing.endDate}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-foreground/60">Language</span>
                <span className="font-medium text-primary">{listing.language}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-foreground/60">Posted</span>
                <span className="font-medium text-primary">{listing.posted}</span>
              </div>
            </div>

            {/* Perks */}
            <div className="mt-5 flex flex-wrap gap-2">
              {listing.housing && (
                <span className="inline-flex rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700">
                  Housing Included
                </span>
              )}
              {listing.skiPass && (
                <span className="inline-flex rounded-full bg-purple-50 px-3 py-1 text-xs font-medium text-purple-700">
                  Ski Pass Included
                </span>
              )}
              {listing.meals && (
                <span className="inline-flex rounded-full bg-green-50 px-3 py-1 text-xs font-medium text-green-700">
                  Meals Included
                </span>
              )}
              {listing.visaSponsorship && (
                <span className="inline-flex rounded-full bg-orange-50 px-3 py-1 text-xs font-medium text-orange-700">
                  Visa Sponsorship
                </span>
              )}
            </div>
          </div>

          {/* Housing details */}
          {listing.housingDetails && (
            <div className="mt-4 rounded-xl border border-accent bg-white p-6">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-foreground/50">Accommodation</h2>
              <p className="mt-3 text-sm leading-relaxed text-foreground/80">{listing.housingDetails}</p>
            </div>
          )}

          {/* Description */}
          <div className="mt-4 rounded-xl border border-accent bg-white p-6">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-foreground/50">Description</h2>
            <div className="mt-3 space-y-3">
              {listing.description.split("\n\n").map((p, i) => (
                <p key={i} className="text-sm leading-relaxed text-foreground/80">{p}</p>
              ))}
            </div>
          </div>

          {/* Requirements */}
          <div className="mt-4 rounded-xl border border-accent bg-white p-6">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-foreground/50">Requirements</h2>
            <div className="mt-3 space-y-1.5">
              {listing.requirements.split("\n").map((line, i) => (
                <p key={i} className="text-sm leading-relaxed text-foreground/80">{line}</p>
              ))}
            </div>
          </div>
        </>
      )}

      {/* ─── Share to Facebook ─── */}
      <div className="mt-6 rounded-xl border border-accent bg-white p-5">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-foreground/50">Share Listing</h2>
        <p className="mt-2 text-sm text-foreground/60">
          Promote this listing on your business Facebook page to reach more candidates.
        </p>
        <button
          onClick={() => {
            const jobUrl = `${window.location.origin}/jobs/${listing.id}`;
            const fbShareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(jobUrl)}&quote=${encodeURIComponent(`We're hiring: ${listing.title} at ${listing.resort}! Apply now on Mountain Connects.`)}`;
            window.open(fbShareUrl, "facebook-share", "width=600,height=400,menubar=no,toolbar=no");
          }}
          className="mt-3 inline-flex items-center gap-2.5 rounded-xl bg-[#1877F2] px-5 py-2.5 text-sm font-semibold text-white transition-all hover:bg-[#166FE5] hover:-translate-y-0.5 hover:shadow-lg"
        >
          <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
          </svg>
          Share on Facebook
        </button>
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
                  handleApplicantStatusChange(acceptConfirm.id, "accepted");
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
