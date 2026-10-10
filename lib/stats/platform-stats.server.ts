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
 *  other reasons, so without this every request ran the queries again. */
const TTL_SECONDS = 3600;

/**
 * ⚠️ THIS PROJECT RETURNS AT MOST 1000 ROWS PER SELECT.
 *
 * PostgREST's db-max-rows is set, and it is silent: ask for a 1377-row table
 * and you get 1000 rows and no error, no warning, no truncation flag. So
 * `rows.length` is not a count — it is a count that becomes wrong, without a
 * symptom, the moment a table crosses the line. Measured against this project
 * on 2026-10-10, not assumed.
 *
 * That is precisely the failure this module exists to prevent, so:
 *   - anything that is only a COUNT uses { count: "exact", head: true },
 *     which the database computes and the cap does not touch (verified:
 *     head returns 1377 where a select returns 1000)
 *   - anything needing the rows themselves pages with .range()
 *
 * Today every table here is far below the cap — 111 resorts, 341 live jobs,
 * 243 businesses — so none of this changes a number. It stops the numbers
 * going quietly wrong later, which is the only way this bug ever arrives.
 */
const PAGE = 1000;

/** Every row, not the first thousand. Throws rather than returning a short
 *  list, so a failure can never be mistaken for a small table. */
async function fetchAll<T>(
  build: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>
): Promise<T[]> {
  const all: T[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await build(from, from + PAGE - 1);
    if (error) throw new Error(error.message);
    const page = data ?? [];
    all.push(...page);
    if (page.length < PAGE) return all;
  }
}

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
  // come before the filters, so these cannot share a builder.
  const liveJobCount = () =>
    supabase.from("job_posts").select("id", head).eq("status", "active").or(notExpired);
  const liveJobRows = () =>
    supabase.from("job_posts").select("resort_id").eq("status", "active").or(notExpired);

  const [resortRows, towns, jobCount, jobResortIds, bizTotal, bizClaimed, bizVerified] =
    await Promise.all([
      // Bounded by how many resorts exist (111) and needed in full for the
      // distinct-country count, but paged on the same rule as the rest.
      fetchAll<{ country: string | null }>((from, to) =>
        supabase.from("resorts").select("country").range(from, to)
      ),
      supabase.from("nearby_towns").select("id", head),
      liveJobCount(),
      // No COUNT(DISTINCT) over PostgREST, so these rows are genuinely
      // needed — and therefore genuinely need paging.
      fetchAll<{ resort_id: string | null }>((from, to) => liveJobRows().range(from, to)),
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
