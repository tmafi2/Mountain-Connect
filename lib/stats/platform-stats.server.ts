import { unstable_cache } from "next/cache";
import { createPublicClient } from "@/lib/supabase/public";
// Every row, not the first thousand — this project caps selects at 1000
// silently. See lib/supabase/fetch-all.ts.
import { fetchAllRows } from "@/lib/supabase/fetch-all";
import { EMPTY_STATS, type PlatformStats } from "./platform-stats";

/**
 * The query half, kept apart from the types and the formatter because
 * AboutClient is a client component: importing this file from one pulls
 * `next/headers` into the browser bundle and the route 500s. Typecheck does
 * not catch it — only rendering the page does.
 */

/** One hour. These move by a handful of rows a week; a crawler hitting the
 *  home page does not need a fresh count, and the page is force-dynamic for
 *  other reasons, so without this every request ran the queries again. */
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
  const notExpired = `expires_at.is.null,expires_at.gt.${new Date().toISOString()}`;
  const head = { count: "exact" as const, head: true };

  // The same filter twice, once as a count and once as rows. `select` has to
  // come before the filters, so these cannot share a builder — and each one
  // carries its own bound (head count / range) rather than relying on the
  // caller to add it, so no read here is unbounded where it is written.
  const liveJobCount = () =>
    supabase
      .from("job_posts")
      .select("id", { count: "exact", head: true })
      .eq("status", "active")
      .or(notExpired);
  const liveJobRows = (from: number, to: number) =>
    supabase
      .from("job_posts")
      .select("resort_id")
      .eq("status", "active")
      .or(notExpired)
      .range(from, to);

  const [resortRows, towns, jobCount, jobResortIds, bizTotal, bizClaimed, bizVerified] =
    await Promise.all([
      // Bounded by how many resorts exist (111) and needed in full for the
      // distinct-country count, but paged on the same rule as the rest.
      fetchAllRows<{ country: string | null }>(
        (from, to) => supabase.from("resorts").select("country").range(from, to),
        "platform-stats: resorts"
      ),
      supabase.from("nearby_towns").select("id", head),
      liveJobCount(),
      // No COUNT(DISTINCT) over PostgREST, so these rows are genuinely
      // needed — and therefore genuinely need paging.
      fetchAllRows<{ resort_id: string | null }>(
        (from, to) => liveJobRows(from, to),
        "platform-stats: live job resorts"
      ),
      supabase.from("business_profiles").select("id", head),
      supabase.from("business_profiles").select("id", head).eq("is_claimed", true),
      supabase.from("business_profiles").select("id", head).eq("verification_status", "verified"),
    ]);

  const failed = [towns, jobCount, bizTotal, bizClaimed, bizVerified].find((r) => r.error);
  if (failed?.error) {
    throw new Error(`platform-stats: query failed: ${failed.error.message}`);
  }

  const countries = new Set(resortRows.map((r) => (r.country ?? "").trim()).filter(Boolean));
  const jobResorts = new Set(jobResortIds.map((j) => j.resort_id).filter(Boolean));

  return {
    resorts: resortRows.length,
    countries: countries.size,
    towns: towns.count ?? 0,
    liveJobs: jobCount.count ?? 0,
    resortsWithLiveJobs: jobResorts.size,
    businessesTotal: bizTotal.count ?? 0,
    businessesClaimed: bizClaimed.count ?? 0,
    businessesVerified: bizVerified.count ?? 0,
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
