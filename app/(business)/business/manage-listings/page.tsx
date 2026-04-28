import { createClient } from "@/lib/supabase/server";
import ManageListingsClient from "./ManageListingsClient";
import type { ListingItem, ApplicantItem, ApplicantStatus } from "./ManageListingsClient";

export const dynamic = "force-dynamic";

/* --- Demo data (shown when not logged in) --- */

const demoListings: ListingItem[] = [
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
    title: "Bartender — Apres Ski Bar",
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
    pay: "\u20AC2,400/month",
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

const demoApplicants: ApplicantItem[] = [
  {
    id: "a1", applicationId: "demo-a1", jobId: "j1",
    name: "Emma Johansson", email: "emma.j@example.com", location: "Stockholm, Sweden",
    skills: ["CSIA Level 3", "First Aid", "Swedish", "English", "French"], experience: 5,
    status: "pending", appliedAt: "Mar 10, 2026",
    coverLetter: "I've been teaching skiing for 5 seasons across Sweden and Canada. I hold a CSIA Level 3 certification and I'm passionate about helping beginners discover the joy of skiing. I'm fluent in three languages which helps me connect with international guests. I'm available for the full season and excited about the opportunity at Whistler Blackcomb.",
    availability: "Nov 2025 – Apr 2026 (full season)", languages: ["Swedish", "English", "French"],
    avatar: null, nationality: null,
  },
  {
    id: "a2", applicationId: "demo-a2", jobId: "j1",
    name: "Lucas Muller", email: "lucas.m@example.com", location: "Innsbruck, Austria",
    skills: ["CSIA Level 2", "Avalanche Safety", "German", "English"], experience: 3,
    status: "reviewed", appliedAt: "Mar 8, 2026",
    coverLetter: "Coming from the Austrian Alps, I bring 3 seasons of instruction experience with a specialty in intermediate to advanced technique. I also hold an Avalanche Safety certification. I'm looking to broaden my experience internationally and Whistler would be the perfect fit.",
    availability: "Dec 2025 – Apr 2026", languages: ["German", "English"],
    avatar: null, nationality: null,
  },
  {
    id: "a3", applicationId: "demo-a3", jobId: "j1",
    name: "Marie Dubois", email: "marie.d@example.com", location: "Chamonix, France",
    skills: ["BASI Level 3", "First Aid", "French", "English", "Spanish"], experience: 7,
    status: "accepted", appliedAt: "Mar 1, 2026",
    coverLetter: "With 7 years of instruction across France, Spain, and Canada, I bring deep expertise in all-mountain teaching. I hold BASI Level 3 and have consistently received top guest ratings. I'm looking forward to joining the Whistler Blackcomb team for another season.",
    availability: "Nov 2025 – Apr 2026 (full season)", languages: ["French", "English", "Spanish"],
    avatar: null, nationality: null,
  },
  {
    id: "a4", applicationId: "demo-a4", jobId: "j1",
    name: "Kenji Nakamura", email: "kenji.n@example.com", location: "Nagano, Japan",
    skills: ["SAJ Level 2", "Children's Instruction", "Japanese", "English"], experience: 4,
    status: "pending", appliedAt: "Mar 14, 2026",
    coverLetter: "I specialize in children's ski instruction and have taught at several major resorts in Japan. I'm excited about the opportunity to work at Whistler where I can also help with the growing number of Japanese guests visiting the resort.",
    availability: "Dec 2025 – Mar 2026", languages: ["Japanese", "English"],
    avatar: null, nationality: null,
  },
  {
    id: "a5", applicationId: "demo-a5", jobId: "j2",
    name: "Sophie Chen", email: "sophie.c@example.com", location: "Melbourne, Australia",
    skills: ["RSA Certified", "Cocktail Making", "English", "Mandarin"], experience: 4,
    status: "pending", appliedAt: "Mar 12, 2026",
    coverLetter: "I've worked in Melbourne's top cocktail bars for 4 years and I'm looking for a season abroad. I'm RSA certified with expertise in craft cocktails and high-volume service. I thrive in fast-paced environments and love the energy of apres-ski culture.",
    availability: "Nov 2025 – Apr 2026 (full season)", languages: ["English", "Mandarin"],
    avatar: null, nationality: null,
  },
  {
    id: "a6", applicationId: "demo-a6", jobId: "j2",
    name: "Isabella Rossi", email: "isabella.r@example.com", location: "Milan, Italy",
    skills: ["RSA Certified", "Barista", "Italian", "English", "Spanish"], experience: 6,
    status: "rejected", appliedAt: "Mar 2, 2026",
    coverLetter: "With 6 years in Italian hospitality, I bring a strong cocktail and espresso background. I've worked seasons at alpine bars in the Dolomites and am looking to experience the Canadian scene.",
    availability: "Dec 2025 – Mar 2026", languages: ["Italian", "English", "Spanish"],
    avatar: null, nationality: null,
  },
  {
    id: "a7", applicationId: "demo-a7", jobId: "j2",
    name: "Tom Wilson", email: "tom.w@example.com", location: "Queenstown, New Zealand",
    skills: ["Cocktail Making", "Wine Knowledge", "English"], experience: 3,
    status: "reviewed", appliedAt: "Mar 11, 2026",
    coverLetter: "I've spent 3 seasons bartending in Queenstown's famous apres-ski scene. I know what makes a great mountain bar experience — fast service, great energy, and knowing every guest by name by week two.",
    availability: "Nov 2025 – Apr 2026 (full season)", languages: ["English"],
    avatar: null, nationality: null,
  },
  {
    id: "a8", applicationId: "demo-a8", jobId: "j3",
    name: "Ana Santos", email: "ana.s@example.com", location: "Lisbon, Portugal",
    skills: ["Hotel Management Diploma", "Attention to Detail", "Portuguese", "English"], experience: 2,
    status: "pending", appliedAt: "Mar 15, 2026",
    coverLetter: "I recently graduated with a Hotel Management Diploma and have completed internships at two 5-star hotels in Lisbon. I'm eager to gain international experience and the Fairmont Chateau Whistler would be an incredible opportunity.",
    availability: "Nov 2025 – Apr 2026 (full season)", languages: ["Portuguese", "English", "Spanish"],
    avatar: null, nationality: null,
  },
  {
    id: "a9", applicationId: "demo-a9", jobId: "j3",
    name: "Jake Thompson", email: "jake.t@example.com", location: "Queenstown, New Zealand",
    skills: ["First Aid", "Customer Service", "English"], experience: 2,
    status: "interview_scheduled", appliedAt: "Mar 5, 2026",
    coverLetter: "I have 2 seasons of hotel experience in New Zealand's ski region. I'm reliable, detail-oriented, and take pride in maintaining high standards. I'm looking for a full-season role with staff housing.",
    availability: "Nov 2025 – Apr 2026 (full season)", languages: ["English"],
    avatar: null, nationality: null,
  },
  {
    id: "a10", applicationId: "demo-a10", jobId: "j4",
    name: "Ollie Hansen", email: "ollie.h@example.com", location: "Oslo, Norway",
    skills: ["Culinary Arts Diploma", "French Cuisine", "Norwegian", "English"], experience: 4,
    status: "reviewed", appliedAt: "Mar 9, 2026",
    coverLetter: "I trained in French cuisine in Lyon and have worked at mountain restaurants in Norway and Switzerland. I'm passionate about using local alpine ingredients and creating memorable dining experiences for guests.",
    availability: "Dec 2025 – Mar 2026", languages: ["Norwegian", "English", "French"],
    avatar: null, nationality: null,
  },
  {
    id: "a11", applicationId: "demo-a11", jobId: "j4",
    name: "Claire Bonnet", email: "claire.b@example.com", location: "Lyon, France",
    skills: ["Le Cordon Bleu", "Pastry", "French", "English"], experience: 5,
    status: "pending", appliedAt: "Mar 13, 2026",
    coverLetter: "A Le Cordon Bleu graduate with 5 years in high-end alpine restaurants across the French Alps. I specialize in both savoury and pastry sections and am comfortable running a busy service in a mountain restaurant setting.",
    availability: "Dec 2025 – Mar 2026", languages: ["French", "English"],
    avatar: null, nationality: null,
  },
  {
    id: "a12", applicationId: "demo-a12", jobId: "j5",
    name: "Hiroshi Tanaka", email: "hiroshi.t@example.com", location: "Niseko, Japan",
    skills: ["Customer Service", "Japanese", "English", "Hospitality"], experience: 3,
    status: "accepted", appliedAt: "Mar 14, 2026",
    coverLetter: "I have 3 seasons of lift operations experience in Niseko. I'm safety-focused, highly punctual, and enjoy helping guests have a smooth experience getting up the mountain.",
    availability: "Nov 2025 – Apr 2026 (full season)", languages: ["Japanese", "English"],
    avatar: null, nationality: null,
  },
  {
    id: "a13", applicationId: "demo-a13", jobId: "j5",
    name: "Ryan O'Brien", email: "ryan.o@example.com", location: "Denver, USA",
    skills: ["Lift Maintenance", "First Aid", "English", "Spanish"], experience: 5,
    status: "accepted", appliedAt: "Mar 3, 2026",
    coverLetter: "I've been working lift operations at Colorado resorts for 5 years, including maintenance and safety inspections. I hold current First Aid certification and have an excellent safety record.",
    availability: "Nov 2025 – Apr 2026 (full season)", languages: ["English", "Spanish"],
    avatar: null, nationality: null,
  },
];

/* --- Server-side data fetching --- */

async function fetchListingsData(): Promise<{
  listings: ListingItem[];
  applicants: ApplicantItem[];
  businessVerified: boolean;
}> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      // Not logged in — show demo data
      return { listings: demoListings, applicants: demoApplicants, businessVerified: true };
    }

    const { data: bp } = await supabase
      .from("business_profiles")
      .select("id, verification_status")
      .eq("user_id", user.id)
      .single();

    if (!bp) {
      return { listings: [], applicants: [], businessVerified: false };
    }

    const businessVerified = bp.verification_status === "verified";

    // Fire jobs + applications in parallel. The applications query uses
    // an inner join on job_posts to scope by business_id without needing
    // the jobs query to resolve first — saves a round-trip.
    const [jobsResult, appsResult] = await Promise.all([
      supabase
        .from("job_posts")
        .select("*, resorts(name, country)")
        .eq("business_id", bp.id)
        .order("created_at", { ascending: false }),
      supabase
        .from("applications")
        .select(
          "*, worker_profiles(id, first_name, last_name, avatar_url, profile_photo_url, nationality, location_current, skills, years_seasonal_experience, languages, references), job_posts!inner(business_id)"
        )
        .eq("job_posts.business_id", bp.id),
    ]);

    const jobs = jobsResult.data;

    if (!jobs || jobs.length === 0) {
      return { listings: [], applicants: [], businessVerified };
    }

    // Map jobs to ListingItem format
    const listings: ListingItem[] = jobs.map((j: Record<string, unknown>) => {
      const resort = j.resorts as { name: string; country: string } | null;
      const posType = j.position_type === "full_time" ? "Full-time" : j.position_type === "part_time" ? "Part-time" : "Casual";
      return {
        id: j.id as string,
        title: j.title as string,
        resort: resort?.name || "",
        location: resort ? `${resort.name}, ${resort.country}` : "",
        status: (j.status as string) as "active" | "paused" | "closed" | "draft",
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

    const appData = appsResult.data;

    let applicants: ApplicantItem[] = [];

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

      applicants = appData.map((a: Record<string, unknown>) => {
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
          avatar: (wp?.avatar_url as string) || (wp?.profile_photo_url as string) || null,
          nationality: (wp?.nationality as string) || null,
          skills: (wp?.skills as string[]) || [],
          experience: (wp?.years_seasonal_experience as number) || 0,
          status: statusMap[a.status as string] || "pending",
          appliedAt: a.applied_at as string,
          coverLetter: (a.cover_letter as string) || "",
          availability: "",
          languages: langs.map((l) => l.language),
        };
      });
    }

    return { listings, applicants, businessVerified };
  } catch {
    // On error, return empty
    return { listings: [], applicants: [], businessVerified: false };
  }
}

/* --- Page component (server) --- */

export default async function ManageListingsPage() {
  const { listings, applicants, businessVerified } = await fetchListingsData();

  return (
    <ManageListingsClient
      initialListings={listings}
      initialApplicants={applicants}
      businessVerified={businessVerified}
    />
  );
}
