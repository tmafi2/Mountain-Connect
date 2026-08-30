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

/** How far ahead of expiry the "still hiring?" email goes out. */
export const EXPIRY_WARNING_DAYS = 7;

/** The window a renewal buys, from the moment it is clicked. */
export function nextExpiryFrom(now: Date): Date {
  const d = new Date(now);
  d.setUTCDate(d.getUTCDate() + JOB_POST_LIFESPAN_DAYS);
  return d;
}
