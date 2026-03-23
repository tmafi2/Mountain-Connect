import type { ApplicationStatus } from "@/types/database";

export interface SeedApplicant {
  id: string;
  application_id: string;
  job_id: string;
  job_title: string;
  resort_name: string;
  worker_name: string;
  worker_email: string;
  worker_avatar: string | null;
  worker_location: string;
  worker_skills: string[];
  years_experience: number;
  status: ApplicationStatus;
  applied_at: string;
  interview_status?: "invited" | "scheduled" | "completed" | "cancelled" | null;
}

export const seedApplicants: SeedApplicant[] = [
  {
    id: "w1",
    application_id: "app1",
    job_id: "j1",
    job_title: "Ski Instructor — All Levels",
    resort_name: "Whistler Blackcomb",
    worker_name: "Emma Johansson",
    worker_email: "emma.j@example.com",
    worker_avatar: null,
    worker_location: "Stockholm, Sweden",
    worker_skills: ["CSIA Level 3", "First Aid", "Swedish", "English", "French"],
    years_experience: 5,
    status: "pending",
    applied_at: "2026-03-10T14:30:00Z",
  },
  {
    id: "w2",
    application_id: "app2",
    job_id: "j1",
    job_title: "Ski Instructor — All Levels",
    resort_name: "Whistler Blackcomb",
    worker_name: "Lucas Müller",
    worker_email: "lucas.m@example.com",
    worker_avatar: null,
    worker_location: "Innsbruck, Austria",
    worker_skills: ["CSIA Level 2", "Avalanche Safety", "German", "English"],
    years_experience: 3,
    status: "reviewed",
    applied_at: "2026-03-08T09:15:00Z",
  },
  {
    id: "w3",
    application_id: "app3",
    job_id: "j2",
    job_title: "Bartender — Après Ski Lounge",
    resort_name: "Whistler Blackcomb",
    worker_name: "Sophie Chen",
    worker_email: "sophie.c@example.com",
    worker_avatar: null,
    worker_location: "Melbourne, Australia",
    worker_skills: ["RSA Certified", "Cocktail Making", "English", "Mandarin"],
    years_experience: 4,
    status: "pending",
    applied_at: "2026-03-12T18:45:00Z",
  },
  {
    id: "w4",
    application_id: "app4",
    job_id: "j3",
    job_title: "Lift Operations Crew",
    resort_name: "Whistler Blackcomb",
    worker_name: "Jake Thompson",
    worker_email: "jake.t@example.com",
    worker_avatar: null,
    worker_location: "Queenstown, New Zealand",
    worker_skills: ["First Aid", "Customer Service", "English"],
    years_experience: 2,
    status: "interview_scheduled",
    applied_at: "2026-03-05T11:20:00Z",
    interview_status: "scheduled",
  },
  {
    id: "w5",
    application_id: "app5",
    job_id: "j1",
    job_title: "Ski Instructor — All Levels",
    resort_name: "Whistler Blackcomb",
    worker_name: "Marie Dubois",
    worker_email: "marie.d@example.com",
    worker_avatar: null,
    worker_location: "Chamonix, France",
    worker_skills: ["BASI Level 3", "First Aid", "French", "English", "Spanish"],
    years_experience: 7,
    status: "accepted",
    applied_at: "2026-03-01T08:00:00Z",
    interview_status: "completed",
  },
  {
    id: "w6",
    application_id: "app6",
    job_id: "j5",
    job_title: "Guest Services Agent",
    resort_name: "Revelstoke Mountain Resort",
    worker_name: "Hiroshi Tanaka",
    worker_email: "hiroshi.t@example.com",
    worker_avatar: null,
    worker_location: "Niseko, Japan",
    worker_skills: ["Customer Service", "Japanese", "English", "Hospitality"],
    years_experience: 3,
    status: "pending",
    applied_at: "2026-03-14T06:30:00Z",
  },
  {
    id: "w7",
    application_id: "app7",
    job_id: "j4",
    job_title: "Snowboard Instructor",
    resort_name: "Revelstoke Mountain Resort",
    worker_name: "Ollie Hansen",
    worker_email: "ollie.h@example.com",
    worker_avatar: null,
    worker_location: "Oslo, Norway",
    worker_skills: ["CASI Level 2", "Park Instruction", "Norwegian", "English"],
    years_experience: 4,
    status: "reviewed",
    applied_at: "2026-03-09T15:00:00Z",
  },
  {
    id: "w8",
    application_id: "app8",
    job_id: "j2",
    job_title: "Bartender — Après Ski Lounge",
    resort_name: "Whistler Blackcomb",
    worker_name: "Isabella Rossi",
    worker_email: "isabella.r@example.com",
    worker_avatar: null,
    worker_location: "Milan, Italy",
    worker_skills: ["RSA Certified", "Barista", "Italian", "English", "Spanish"],
    years_experience: 6,
    status: "rejected",
    applied_at: "2026-03-02T12:00:00Z",
  },
];
