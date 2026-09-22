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
  resorts: number;
  countries: number;
  towns: number;
  liveJobs: number;
}

/**
 * Falls back to zero rather than to a guess, and `formatStat` turns zero into
 * a dash. A page should show "—" before it shows a number we invented, which
 * is the whole point of deleting the literals.
 */
export const EMPTY_STATS: PlatformStats = { resorts: 0, countries: 0, towns: 0, liveJobs: 0 };

/** "111" — or "—" when we could not count, never a stale literal. */
export function formatStat(n: number): string {
  return n > 0 ? n.toLocaleString("en-GB") : "—";
}
