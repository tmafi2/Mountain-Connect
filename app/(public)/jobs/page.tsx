import { createPublicClient } from "@/lib/supabase/public";
import { type JobListing } from "@/lib/data/jobs";
import type { Metadata } from "next";
import JobsClient from "./JobsClient";
import { SSR_JOB_COUNT } from "./JobsStaticList";
import { SITE_ORIGIN } from "@/lib/config/site";
import CampaignCapture from "./CampaignCapture";

// Cache the rendered HTML for 2 minutes. Public job listings change
// gradually; serving from edge cache makes the page feel instant.
export const revalidate = 120;

/* ⚠️ NO FIGURE HERE ON PURPOSE. This is a static `metadata` export, which
   cannot await the live counts, and a number typed into metadata is a number
   that goes stale silently — nobody reads their own meta tags. This said
   "80+ resorts" / "69 resorts in 12 countries" while the real figures were
   111 and 14, and Bing's AI was quoting it back to searchers. A vaguer true
   line beats a precise false one. See lib/stats/platform-stats.ts. */
export async function generateMetadata({ searchParams }: JobsPageProps): Promise<Metadata> {
  const params = await searchParams;
  const isFiltered = FILTER_PARAMS.some((k) => typeof params[k] === "string" && params[k] !== "");

  return {
    title: "Ski Resort Jobs Hiring Now",
    description:
      "Browse open ski resort jobs in Australia, New Zealand, Canada, Japan, the US, and Europe. Filter by role, location, pay, housing, and visa support.",
    // Every filtered view is the same board sliced differently, so they all
    // point at the unfiltered one.
    alternates: { canonical: `${SITE_ORIGIN}/jobs` },
    // ⚠️ noindex, FOLLOW on param variants. The filters combine into effectively
    // unlimited urls and indexing them would bury /jobs under near-duplicates —
    // but the links out of them lead to individual listings, which we very much
    // want crawled. The sitemap lists only /jobs and the job urls themselves.
    ...(isFiltered && { robots: { index: false, follow: true } }),
  };
}

interface JobsPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

/** Params the client filters on. Any of them makes the view a slice. */
const FILTER_PARAMS = ["country", "town", "resort", "category", "accommodation", "open"] as const;

export default async function FindAJobPage({ searchParams }: JobsPageProps) {
  const params = await searchParams;
  // Fetch all active jobs server-side — no loading spinner needed
  let jobs: JobListing[] = [];

  try {
    const supabase = createPublicClient();
    // Show every active job regardless of the business's verification status.
    // We still expose the verified state on each row so the UI can badge them.
    const { data } = await supabase
      .from("job_posts")
      .select(
        "*, business_profiles!inner(business_name, verification_status, logo_url), resorts(name, country), nearby_towns(name, slug), business_venues(name, slug, is_primary)"
      )
      .eq("status", "active");

    if (data && data.length > 0) {
      jobs = data.map((j: Record<string, unknown>) => {
        const bp = j.business_profiles as {
          business_name: string;
          verification_status: string;
          logo_url: string | null;
        } | null;
        const resort = j.resorts as { name: string; country: string } | null;
        const nearbyTown = j.nearby_towns as {
          name: string;
          slug: string;
        } | null;
        const venue = j.business_venues as {
          name: string;
          slug: string;
          is_primary: boolean;
        } | null;
        const posType = (j.position_type as string) || "full_time";

        return {
          id: j.id as string,
          business_id: j.business_id as string,
          resort_id: j.resort_id as string,
          title: j.title as string,
          description: j.description as string,
          requirements: (j.requirements as string) || null,
          accommodation_included: j.accommodation_included as boolean,
          salary_range: (j.salary_range as string) || null,
          start_date: (j.start_date as string) || null,
          end_date: (j.end_date as string) || null,
          is_active: true,
          created_at: j.created_at as string,
          business_name: bp?.business_name || "Unknown Business",
          business_verified: bp?.verification_status === "verified",
          business_logo_url: bp?.logo_url || null,
          resort_name: resort?.name || "",
          resort_country: resort?.country || "",
          nearby_town_id: (j.nearby_town_id as string) || null,
          nearby_town_name: nearbyTown?.name || null,
          nearby_town_slug: nearbyTown?.slug || null,
          category: (j.category as string) || "Other",
          position_type: posType as "full_time" | "part_time" | "casual",
          pay_amount:
            (j.pay_amount as string) || (j.salary_range as string) || "",
          pay_currency: (j.pay_currency as string) || "USD",
          housing_details: (j.housing_details as string) || null,
          meal_perks: (j.meal_perks as boolean) || false,
          ski_pass_included: (j.ski_pass_included as boolean) || false,
          language_required: (j.language_required as string) || "English",
          visa_sponsorship: (j.visa_sponsorship as boolean) || false,
          urgently_hiring: (j.urgently_hiring as boolean) || false,
          positions_available: (j.positions_available as number) || 1,
          accommodation_type: (j.accommodation_type as string) || null,
          accommodation_cost: (j.accommodation_cost as string) || null,
          status: ((j.status as string) || "active") as
            | "active"
            | "paused"
            | "closed"
            | "draft",
          how_to_apply: (j.how_to_apply as string) || null,
          application_email: (j.application_email as string) || null,
          application_url: (j.application_url as string) || null,
          featured_until: (j.featured_until as string) || null,
          applications_count: 0,
          venue_id: (j.venue_id as string) || null,
          venue_name: venue?.name ?? null,
          venue_slug: venue?.slug ?? null,
          venue_is_primary: venue?.is_primary ?? null,
        };
      });
    }
  } catch (err) {
    console.error("Failed to fetch jobs server-side:", err);
  }

  /**
   * The first page, filtered and sorted HERE so it reaches the HTML.
   *
   * /ski-resort-jobs/[country] and the town pages link to ?country= and
   * ?town=, so those variants have to render their own slice — otherwise a
   * crawler following those links lands on an unfiltered board or, before
   * this, on nothing at all.
   */
  const country = typeof params.country === "string" ? params.country : null;
  const townSlug = typeof params.town === "string" ? params.town : null;

  /**
   * ⚠️ A TOWN IS NOT A FIELD ON A JOB. Only 1 of 341 active listings has
   * `nearby_town_id` set, so filtering on the job's own town returns nothing.
   * A town is connected to jobs through its RESORTS —
   * nearby_towns → resort_nearby_towns.town_id → resorts → job_posts — which
   * is how whistler-village reaches 112 listings. The client component
   * resolves it the same way at runtime; this is the server half.
   */
  let townResortIds: string[] | null = null;
  if (townSlug) {
    try {
      const supabase = createPublicClient();
      const { data: town } = await supabase
        .from("nearby_towns")
        .select("id, resort_nearby_towns(resort_id)")
        .eq("slug", townSlug)
        .maybeSingle();
      const links = (town?.resort_nearby_towns ?? []) as Array<{ resort_id: string }>;
      townResortIds = links.map((l) => l.resort_id).filter(Boolean);
    } catch (err) {
      // A town we cannot resolve falls back to the unfiltered first page
      // rather than an empty one — showing every job is wrong-ish, showing
      // none is useless.
      console.error(`jobs: could not resolve town "${townSlug}":`, err);
    }
  }

  const ssrJobs = jobs
    .filter((j) => (country ? j.resort_country === country : true))
    .filter((j) => (townResortIds && townResortIds.length > 0 ? townResortIds.includes(j.resort_id ?? "") : true))
    .sort((a, b) => String(b.created_at ?? "").localeCompare(String(a.created_at ?? "")))
    .slice(0, SSR_JOB_COUNT);

  return (
    <>
      <CampaignCapture />
      <JobsClient initialJobs={jobs} ssrJobs={ssrJobs} />
    </>
  );
}
