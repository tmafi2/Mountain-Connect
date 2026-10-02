/**
 * The site's canonical public origin — the one that belongs in any link we
 * put in an email.
 *
 * ⚠️ A BACKGROUND JOB MUST NEVER DERIVE ITS ORIGIN FROM ITS OWN REQUEST.
 * Vercel invokes a cron at the DEPLOYMENT url
 * (mountain-connect-<hash>-<team>.vercel.app), which sits behind Deployment
 * Protection — so `new URL(request.url).origin` builds a link the recipient
 * cannot open. They get Vercel's login wall, whose only button is "Request
 * access", and the owner gets an access-request email from a stranger.
 *
 * That is not hypothetical. `/api/cron/unclaimed-dormancy-sweep` built its
 * claim links that way and sent **127 day-14 warnings and 99 final notices**
 * telling unclaimed businesses their listing was about to be removed, each
 * with a link to a protected deployment. One of them (El Asador Steakhouse,
 * warned 2026-09-28 09:01Z) asked Vercel for access to the deployment that
 * evening, which is how it was found. `/api/cron/job-post-expiry` had the
 * identical line and had not yet sent a single email — its first renewal
 * link, the one a PAYING business clicks, would have been the first casualty.
 *
 * Deriving the origin from the request is only safe when the request comes
 * from a BROWSER on the public site. That is why the admin routes'
 * `resolveOrigin` — the `Origin` header, falling back to this value — is
 * correct and a cron's is not.
 */
export const SITE_ORIGIN = "https://www.mountainconnects.com";
