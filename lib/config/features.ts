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
