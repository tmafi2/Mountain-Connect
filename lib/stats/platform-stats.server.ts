import { unstable_cache } from "next/cache";
import { createPublicClient } from "@/lib/supabase/public";
import { EMPTY_STATS, type PlatformStats } from "./platform-stats";

/**
 * The query half, kept apart from the types and the formatter because
 * AboutClient is a client component: importing this file from one pulls
 * `next/headers` into the browser bundle and the route 500s. Typecheck does
 * not catch it — only rendering the page does.
 */

/** One hour. These move by a handful of rows a week; a crawler hitting the
 *  home page does not need a fresh count, and the page is force-dynamic for
 *  other reasons, so without this every request ran five queries. */
const TTL_SECONDS = 3600;

/**
 * Counts, or an exception.
 *
 * ⚠️ IT THROWS RATHER THAN RETURNING ZEROS, and that is what makes caching
 * safe. `unstable_cache` stores whatever the function RETURNS, so a single
 * bad minute — a withheld key during a build, a Supabase JWT wobble — would
 * pin "—" across every page for the next hour. A thrown error is not cached,
 * so the next request tries again. Same reasoning as app/sitemap.ts throwing
 * instead of publishing a short sitemap.
 *
 * Uses the cookie-free public client: `unstable_cache` cannot be used with
 * anything that reads cookies, and every table here is public by design
 * (resorts, nearby_towns, job_posts, business_profiles).
 */
async function queryStats(): Promise<PlatformStats> {
  const supabase = createPublicClient();

  // ⚠️ Must agree with lib/jobs/expired-gone.ts and app/sitemap.ts. The
  // expiry sweep runs once a day, so there is always a window where a row
  // still says active and /jobs/<id> already answers 410. Counting those
  // would quote a number bigger than the board actually shows.
  const liveJobFilter = `expires_at.is.null,expires_at.gt.${new Date().toISOString()}`;

  const [resortRows, townCount, jobRows, bizRows] = await Promise.all([
    supabase.from("resorts").select("id, country"),
    supabase.from("nearby_towns").select("id", { count: "exact", head: true }),
    // resort_id comes back so we can count DISTINCT resorts with a live job
    // without a second round trip.
    supabase.from("job_posts").select("resort_id").eq("status", "active").or(liveJobFilter),
    supabase.from("business_profiles").select("is_claimed, verification_status"),
  ]);

  const failed = [resortRows, townCount, jobRows, bizRows].find((r) => r.error);
  if (failed?.error) {
    throw new Error(`platform-stats: query failed: ${failed.error.message}`);
  }

  const resorts = (resortRows.data ?? []) as { id: string; country: string | null }[];
  const jobs = (jobRows.data ?? []) as { resort_id: string | null }[];
  const businesses = (bizRows.data ?? []) as {
    is_claimed: boolean | null;
    verification_status: string | null;
  }[];

  const countries = new Set(resorts.map((r) => (r.country ?? "").trim()).filter(Boolean));
  const jobResorts = new Set(jobs.map((j) => j.resort_id).filter(Boolean));

  return {
    resorts: resorts.length,
    countries: countries.size,
    towns: townCount.count ?? 0,
    liveJobs: jobs.length,
    resortsWithLiveJobs: jobResorts.size,
    businessesTotal: businesses.length,
    businessesClaimed: businesses.filter((b) => b.is_claimed).length,
    businessesVerified: businesses.filter((b) => b.verification_status === "verified").length,
  };
}

const cachedStats = unstable_cache(queryStats, ["platform-stats"], {
  revalidate: TTL_SECONDS,
  tags: ["platform-stats"],
});

/**
 * The only place a public page gets a number about our own size.
 *
 * Falls back to EMPTY_STATS, which `formatStat` renders as "—". Never a
 * remembered figure: a stale literal is the exact failure this module was
 * written to end.
 */
export async function getPlatformStats(): Promise<PlatformStats> {
  try {
    return await cachedStats();
  } catch (err) {
    console.error("platform-stats: unavailable:", err);
    return EMPTY_STATS;
  }
}
