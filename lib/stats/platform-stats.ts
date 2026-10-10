/**
 * The counts the public pages quote about the platform.
 *
 * WHY THIS EXISTS. /about shipped in April with "69 Ski Resorts", "12
 * Countries" and "50+ Mountain Towns" typed into the JSX — twice over, plus
 * a fourth copy buried inside a sentence. By September the real figures were
 * 111, 14 and 89, so the page had been quietly understating the platform for
 * five months with nobody to notice. A literal cannot go stale loudly.
 *
 * Every number a public page quotes about our own size should come from
 * here. Adding a resort should be the only thing needed to change the number
 * a visitor reads.
 *
 * WARNING: a page using this must be dynamic. `export const revalidate` does
 * NOT stop Next prerendering at build time, and the Supabase keys are marked
 * Sensitive in Vercel so they are withheld from the build — a build-time
 * query fails with "Invalid API key". That is exactly how sitemap.xml
 * silently shipped without its job and business pages (fixed in 57fb081).
 * Use `export const dynamic = "force-dynamic"`.
 */
export interface PlatformStats {
  /** Resorts with a page. Every row has one: all 111 carry a legacy id
   *  with a matching entry in the static array. */
  resorts: number;
  /** Countries with at least one resort — NOT countries with jobs, which
   *  is a much smaller number (3 against 14). Keep the two apart in copy:
   *  "resorts in 14 countries" is true, "jobs in 14 countries" is not. */
  countries: number;
  towns: number;
  liveJobs: number;
  /** Resorts with at least one live job. Far smaller than `resorts` (18 vs
   *  111 on 2026-10-10), so a sentence about where the JOBS are must use
   *  this and a sentence about coverage must use `resorts`. */
  resortsWithLiveJobs: number;
  /** Every business_profiles row, most of which are unclaimed import
   *  shells. Not the number of business PAGES offered to search engines —
   *  app/sitemap.ts filters those with businessBelongsInSitemap. */
  businessesTotal: number;
  businessesClaimed: number;
  businessesVerified: number;
}

/**
 * Falls back to zero rather than to a guess, and `formatStat` turns zero into
 * a dash. A page should show "—" before it shows a number we invented, which
 * is the whole point of deleting the literals.
 */
export const EMPTY_STATS: PlatformStats = {
  resorts: 0,
  countries: 0,
  towns: 0,
  liveJobs: 0,
  resortsWithLiveJobs: 0,
  businessesTotal: 0,
  businessesClaimed: 0,
  businessesVerified: 0,
};

/** "111" — or "—" when we could not count, never a stale literal. */
export function formatStat(n: number): string {
  return n > 0 ? n.toLocaleString("en-GB") : "—";
}
