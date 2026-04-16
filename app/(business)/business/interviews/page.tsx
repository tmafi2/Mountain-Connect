import { createClient } from "@/lib/supabase/server";
import InterviewsClient from "./InterviewsClient";
import type { Interview } from "./InterviewsClient";

export const dynamic = "force-dynamic";

const demoInterviews: Interview[] = [
  {
    id: "int1",
    job_title: "Ski Instructor — All Levels",
    worker_name: "Emma Johansson",
    worker_email: "emma.j@example.com",
    worker_location: "Stockholm, Sweden",
    worker_skills: ["CSIA Level 3", "First Aid", "Swedish", "English", "French"],
    years_experience: 5,
    languages: ["Swedish", "English", "French"],
    cover_letter:
      "I've been teaching skiing for 5 seasons across Sweden and Canada. I hold a CSIA Level 3 certification and I'm passionate about helping beginners.",
    status: "scheduled",
    scheduled_date: "2026-03-26",
    scheduled_start_time: "10:00",
    scheduled_end_time: "10:30",
    timezone: "America/Vancouver",
    worker_resume_url: "/resumes/emma-johansson-resume.pdf",
    worker_avatar_url: "flag:\u{1F1F8}\u{1F1EA}",
    worker_user_id: null,
    worker_profile_id: null,
    is_instant: false,
    room_expires_at: null,
  },
  {
    id: "int2",
    job_title: "Bartender — Apr\u00e8s Ski Lounge",
    worker_name: "Sophie Chen",
    worker_email: "sophie.c@example.com",
    worker_location: "Melbourne, Australia",
    worker_skills: ["RSA Certified", "Cocktail Making", "English", "Mandarin"],
    years_experience: 4,
    languages: ["English", "Mandarin"],
    cover_letter:
      "I've worked in Melbourne's top cocktail bars for 4 years. I'm RSA certified with expertise in craft cocktails and high-volume service.",
    status: "invited",
    scheduled_date: null,
    scheduled_start_time: null,
    scheduled_end_time: null,
    timezone: null,
    worker_resume_url: "/resumes/sophie-chen-resume.pdf",
    worker_avatar_url: "flag:\u{1F1E6}\u{1F1FA}",
    worker_user_id: null,
    worker_profile_id: null,
    is_instant: false,
    room_expires_at: null,
  },
  {
    id: "int3",
    job_title: "Lift Operations Crew",
    worker_name: "Jake Thompson",
    worker_email: "jake.t@example.com",
    worker_location: "Queenstown, New Zealand",
    worker_skills: ["First Aid", "Customer Service", "English"],
    years_experience: 2,
    languages: ["English"],
    cover_letter:
      "I have 2 seasons of hotel experience in New Zealand's ski region. I'm reliable and detail-oriented.",
    status: "scheduled",
    scheduled_date: "2026-03-28",
    scheduled_start_time: "14:00",
    scheduled_end_time: "14:30",
    timezone: "America/Vancouver",
    worker_resume_url: "/resumes/jake-thompson-resume.pdf",
    worker_avatar_url: "flag:\u{1F1F3}\u{1F1FF}",
    worker_user_id: null,
    worker_profile_id: null,
    is_instant: false,
    room_expires_at: null,
  },
  {
    id: "int4",
    job_title: "Ski Instructor — All Levels",
    worker_name: "Lucas M\u00fcller",
    worker_email: "lucas.m@example.com",
    worker_location: "Innsbruck, Austria",
    worker_skills: ["CSIA Level 2", "Avalanche Safety", "German", "English"],
    years_experience: 3,
    languages: ["German", "English"],
    cover_letter:
      "Coming from the Austrian Alps with 3 seasons of instruction experience specializing in intermediate to advanced technique.",
    status: "scheduled",
    scheduled_date: "2026-03-27",
    scheduled_start_time: "09:00",
    scheduled_end_time: "09:30",
    timezone: "America/Vancouver",
    worker_resume_url: "/resumes/lucas-muller-resume.pdf",
    worker_avatar_url: "flag:\u{1F1E6}\u{1F1F9}",
    worker_user_id: null,
    worker_profile_id: null,
    is_instant: false,
    room_expires_at: null,
  },
  {
    id: "int5",
    job_title: "Guest Services Agent",
    worker_name: "Hiroshi Tanaka",
    worker_email: "hiroshi.t@example.com",
    worker_location: "Niseko, Japan",
    worker_skills: ["Customer Service", "Japanese", "English", "Hospitality"],
    years_experience: 3,
    languages: ["Japanese", "English"],
    cover_letter:
      "I have 3 seasons of guest services experience at resorts in Niseko. I'm bilingual in Japanese and English.",
    status: "invited",
    scheduled_date: null,
    scheduled_start_time: null,
    scheduled_end_time: null,
    timezone: null,
    worker_resume_url: null,
    worker_avatar_url: "flag:\u{1F1EF}\u{1F1F5}",
    worker_user_id: null,
    worker_profile_id: null,
    is_instant: false,
    room_expires_at: null,
  },
  {
    id: "int6",
    job_title: "Ski Instructor — All Levels",
    worker_name: "Marie Dubois",
    worker_email: "marie.d@example.com",
    worker_location: "Chamonix, France",
    worker_skills: ["BASI Level 3", "First Aid", "French", "English", "Spanish"],
    years_experience: 7,
    languages: ["French", "English", "Spanish"],
    cover_letter:
      "With 7 years of instruction across France, Spain, and Canada, I bring deep expertise in all-mountain teaching.",
    status: "completed",
    scheduled_date: "2026-03-15",
    scheduled_start_time: "11:00",
    scheduled_end_time: "11:30",
    timezone: "America/Vancouver",
    worker_resume_url: "/resumes/marie-dubois-resume.pdf",
    worker_avatar_url: "flag:\u{1F1EB}\u{1F1F7}",
    worker_user_id: null,
    worker_profile_id: null,
    is_instant: false,
    room_expires_at: null,
  },
  {
    id: "int7",
    job_title: "Snowboard Instructor",
    worker_name: "Ollie Hansen",
    worker_email: "ollie.h@example.com",
    worker_location: "Oslo, Norway",
    worker_skills: ["CASI Level 2", "Park Instruction", "Norwegian", "English"],
    years_experience: 4,
    languages: ["Norwegian", "English"],
    cover_letter:
      "CASI Level 2 instructor with 4 seasons of experience specializing in park and freestyle instruction.",
    status: "completed",
    scheduled_date: "2026-03-18",
    scheduled_start_time: "15:00",
    scheduled_end_time: "15:30",
    timezone: "America/Vancouver",
    worker_resume_url: "/resumes/ollie-hansen-resume.pdf",
    worker_avatar_url: "flag:\u{1F1F3}\u{1F1F4}",
    worker_user_id: null,
    worker_profile_id: null,
    is_instant: false,
    room_expires_at: null,
  },
  {
    id: "int8",
    job_title: "Bartender — Apr\u00e8s Ski Lounge",
    worker_name: "Isabella Rossi",
    worker_email: "isabella.r@example.com",
    worker_location: "Milan, Italy",
    worker_skills: ["RSA Certified", "Barista", "Italian", "English", "Spanish"],
    years_experience: 6,
    languages: ["Italian", "English", "Spanish"],
    cover_letter:
      "With 6 years in Italian hospitality, I bring a strong cocktail and espresso background.",
    status: "cancelled",
    scheduled_date: "2026-03-20",
    scheduled_start_time: "13:00",
    scheduled_end_time: "13:30",
    timezone: "America/Vancouver",
    worker_resume_url: "/resumes/isabella-rossi-resume.pdf",
    worker_avatar_url: "flag:\u{1F1EE}\u{1F1F9}",
    worker_user_id: null,
    worker_profile_id: null,
    is_instant: false,
    room_expires_at: null,
  },
  {
    id: "int9",
    job_title: "Lift Operations Crew",
    worker_name: "Ana Santos",
    worker_email: "ana.s@example.com",
    worker_location: "Lisbon, Portugal",
    worker_skills: ["Hotel Management Diploma", "Portuguese", "English"],
    years_experience: 2,
    languages: ["Portuguese", "English", "Spanish"],
    cover_letter:
      "I recently graduated with a Hotel Management Diploma and completed internships at two 5-star hotels.",
    status: "scheduled",
    scheduled_date: "2026-04-01",
    scheduled_start_time: "11:00",
    scheduled_end_time: "11:30",
    timezone: "America/Vancouver",
    worker_resume_url: "/resumes/ana-santos-resume.pdf",
    worker_avatar_url: "flag:\u{1F1F5}\u{1F1F9}",
    worker_user_id: null,
    worker_profile_id: null,
    is_instant: false,
    room_expires_at: null,
  },
];

export default async function BusinessInterviewsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    // Not logged in — show demo data
    return <InterviewsClient initialInterviews={demoInterviews} currentUserId={null} />;
  }

  const { data: profile } = await supabase
    .from("business_profiles")
    .select("id")
    .eq("user_id", user.id)
    .single();

  if (!profile) {
    return <InterviewsClient initialInterviews={[]} currentUserId={user.id} />;
  }

  const { data } = await supabase
    .from("interviews")
    .select(`
      id, status, scheduled_date, scheduled_start_time, scheduled_end_time, timezone, business_notes, worker_id, is_instant, room_expires_at,
      applications(cover_letter, job_posts(title)),
      worker_profiles(id, user_id, first_name, last_name, location_current, skills, years_seasonal_experience, languages, cv_url, profile_photo_url, users(email))
    `)
    .eq("business_id", profile.id)
    .order("created_at", { ascending: false });

  let interviews: Interview[] = [];

  if (data && data.length > 0) {
    const validStatuses = ["scheduled", "invited", "completed", "cancelled", "missed", "reschedule_requested", "rescheduled", "live", "declined"];

    interviews = data.map((iv: Record<string, unknown>) => {
      const wp = iv.worker_profiles as Record<string, unknown> | null;
      const app = iv.applications as Record<string, unknown> | null;
      const jp = app?.job_posts as { title: string } | null;
      const wpUser = wp?.users as { email: string } | null;
      const langs = (wp?.languages as { language: string }[] | null) || [];
      const statusVal = iv.status as string;
      return {
        id: iv.id as string,
        job_title: jp?.title || "Unknown Position",
        worker_name: `${(wp?.first_name as string) || ""} ${(wp?.last_name as string) || ""}`.trim() || "Unknown",
        worker_email: wpUser?.email || "",
        worker_location: (wp?.location_current as string) || "",
        worker_skills: (wp?.skills as string[]) || [],
        years_experience: (wp?.years_seasonal_experience as number) || 0,
        languages: langs.map((l) => typeof l === "string" ? l : l.language),
        cover_letter: (app?.cover_letter as string) || "",
        status: (validStatuses.includes(statusVal) ? statusVal : "invited") as Interview["status"],
        scheduled_date: iv.scheduled_date as string | null,
        scheduled_start_time: iv.scheduled_start_time ? (iv.scheduled_start_time as string).slice(0, 5) : null,
        scheduled_end_time: iv.scheduled_end_time ? (iv.scheduled_end_time as string).slice(0, 5) : null,
        timezone: iv.timezone as string | null,
        worker_resume_url: (wp?.cv_url as string) || null,
        worker_avatar_url: (wp?.profile_photo_url as string) || null,
        worker_user_id: (wp?.user_id as string) || null,
        worker_profile_id: (wp?.id as string) || null,
        is_instant: (iv.is_instant as boolean) || false,
        room_expires_at: (iv.room_expires_at as string) || null,
      };
    });
  }

  return <InterviewsClient initialInterviews={interviews} currentUserId={user.id} />;
}
