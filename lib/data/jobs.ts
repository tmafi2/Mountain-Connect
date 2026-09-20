import type { JobPost } from "@/types/database";

/* ─── Job listing view model ──────────────────────────────── */
// A job_posts row plus the business, venue, resort and town fields the
// listing queries join onto it. Every value comes from Supabase.
//
// This file also held `seedJobs` — 25 invented listings credited to real
// companies (Vail Resorts, Perisher, Jackson Hole, La Folie Douce…) — and
// four filter constants derived from them. Nothing rendered them: /jobs
// builds its filters from the live rows it fetches. They were deleted on
// 2026-09-20, along with the seed businesses behind the /employers pages
// that showed real companies as verified. Do not add example listings
// here; anything a visitor can reach must come from job_posts.
//
// venue_id is optional because it arrived in migration 00076 and older
// callers predate it; live job_posts queried from Supabase always include it.
export interface JobListing extends Omit<JobPost, "venue_id"> {
  venue_id?: string | null;
  /** Venue display name surfaced on cards when the job lives at a
   *  non-primary venue. Only set on rows hydrated from Supabase. */
  venue_name?: string | null;
  /** Slug used to deep-link to the venue page. */
  venue_slug?: string | null;
  /** True when the job's venue is the business's primary venue —
   *  surfacing the venue label is then redundant. */
  venue_is_primary?: boolean | null;
  business_name: string;
  business_verified: boolean;
  business_logo_url: string | null;
  resort_name: string;
  resort_country: string;
  nearby_town_id: string | null;
  nearby_town_name: string | null;
  nearby_town_slug?: string | null;
  how_to_apply: string | null;
  application_email: string | null;
  application_url: string | null;
  applications_count: number;
}
