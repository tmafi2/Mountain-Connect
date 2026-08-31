import type { BusinessTier } from "@/lib/tier";

/**
 * How long a job post stays live before it lapses.
 *
 * A listing a worker can apply to should be one the business still wants
 * applications for. Left alone, boards fill with roles filled months ago and
 * every application against them wastes somebody's time.
 *
 * 8 weeks is chosen for seasonal hiring: a resort staffing a winter needs
 * about two renewal touchpoints across the season rather than the four a
 * 4-week window would demand.
 *
 * ⚠️ JOB_POST_LIFESPAN_DAYS is duplicated as a literal in migration 00093's
 * trigger, because a trigger cannot import TypeScript. Changing it here does
 * NOT change what the database stamps on newly published posts — that needs
 * a migration too. The database is the authority for new rows; this constant
 * is what the cron and the UI read.
 */
export const JOB_POST_LIFESPAN_DAYS = 56;

/**
 * The free tier's window: four weeks, not eight.
 *
 * The free post is a trial of the paid product, not a permanent free
 * listing. Four weeks is long enough to fill an ordinary role and short
 * enough that a business still hiring has a reason to subscribe — and since
 * 2026-08-30 the free slot never returns, so this is the whole of what a
 * free account gets.
 */
export const FREE_JOB_POST_LIFESPAN_DAYS = 28;

/** How long a post from this tier stays live. */
export function lifespanDaysFor(tier: BusinessTier): number {
  return tier === "free" ? FREE_JOB_POST_LIFESPAN_DAYS : JOB_POST_LIFESPAN_DAYS;
}

/**
 * When a post published now by this tier should lapse.
 *
 * Callers pass the result to the INSERT/UPDATE that publishes the post. The
 * job_posts_stamp_expiry trigger (00093) yields to any expires_at the
 * statement supplies, which is what lets the window vary by tier without
 * teaching the database how to resolve a subscription.
 */
export function expiryForTier(tier: BusinessTier, now: Date = new Date()): Date {
  const d = new Date(now);
  d.setUTCDate(d.getUTCDate() + lifespanDaysFor(tier));
  return d;
}

/** How far ahead of expiry the "still hiring?" email goes out. */
export const EXPIRY_WARNING_DAYS = 7;

/**
 * The window a renewal buys, from the moment it is clicked.
 *
 * Only paid tiers can renew, so this is always the full window — see
 * app/api/jobs/renew/route.ts, which refuses a free business outright.
 */
export function nextExpiryFrom(now: Date): Date {
  const d = new Date(now);
  d.setUTCDate(d.getUTCDate() + JOB_POST_LIFESPAN_DAYS);
  return d;
}
