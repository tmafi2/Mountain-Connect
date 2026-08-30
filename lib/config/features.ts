/**
 * Feature visibility switches.
 *
 * These hide a finished feature from the public site without deleting it.
 * Everything behind the switch — routes, components, queries, database rows —
 * stays exactly where it is, so flipping the flag back to `true` and
 * deploying restores the feature with no migration and no rebuild of state.
 *
 * This is the same shape as LAUNCH_GRACE_PERIOD in ./launch.ts: one
 * documented boolean, no per-record state, reversible by a one-line edit.
 */

/**
 * The public employer directory at /employers.
 *
 * Turned off on 2026-08-30. The directory lists every business_profiles row,
 * and at the time of switching that was 99 businesses of which 88 were
 * unverified — overwhelmingly unclaimed shells created by the Facebook
 * import rather than businesses that have signed up. A public directory that
 * is 89% unclaimed placeholders misrepresents who is actually on the
 * platform, so it is hidden until the claimed share is high enough to be
 * worth showing.
 *
 * While false:
 *   - /employers returns 404
 *   - its links are dropped from the header, the footer, /welcome and the
 *     business-page breadcrumbs
 *   - it is dropped from sitemap.xml and disallowed in robots.txt
 *
 * Nothing is deleted. Individual business pages at /business/{id} are
 * unaffected and remain the public face of each business, which is also
 * where the directory linked to — so no business loses its page, only the
 * combined listing goes away.
 *
 * To restore: set this to true and deploy.
 */
export const EMPLOYERS_DIRECTORY_ENABLED = false;

/**
 * How far the job-post expiry sweep is switched on.
 *
 * The sweep can pause every expired listing on the board in one run, so it
 * is rolled out in stages rather than shipped hot:
 *
 *   "log_only"    — computes everything, writes nothing, sends nothing.
 *                   The daily run reports what it WOULD do. This is the
 *                   only way to see which posts the real queries select
 *                   once genuine published_at values exist.
 *   "emails_only" — sends the warning and notice emails, still pauses
 *                   nothing. Businesses hear about it before it bites.
 *   "live"        — emails, auto-renews, and pauses.
 *
 * Each step is a one-line change here plus a deploy, and each is reversible
 * the same way. Phase 1 (migration 00093) put the columns in place; this
 * governs everything that reads them.
 */
export type JobExpiryMode = "log_only" | "emails_only" | "live";

export const JOB_EXPIRY_MODE: JobExpiryMode = "log_only";

/** Emails go out at "emails_only" and beyond. */
export const jobExpirySendsEmail = (m: JobExpiryMode = JOB_EXPIRY_MODE): boolean =>
  m === "emails_only" || m === "live";

/** Posts are actually paused, and auto-renewed, only at "live". */
export const jobExpiryWrites = (m: JobExpiryMode = JOB_EXPIRY_MODE): boolean => m === "live";
