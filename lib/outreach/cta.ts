/**
 * The link an outreach email points at, carrying its own UTMs.
 *
 * WHY THIS EXISTS. Until 2026-09-22 the call to action was a bare
 * `/signup?role=business`, so a business that clicked an outreach email and
 * one that typed the address in were indistinguishable — outreach had no
 * measurable click-through at all. The obvious fix is Resend's open and
 * click tracking, and it is the wrong one for THIS mail: open tracking is an
 * invisible 1x1 image that Apple Mail Privacy Protection pre-fetches for
 * every recipient (so the number measures mail clients, not interest), and
 * click tracking rewrites every link through a redirect domain. Both are
 * signals filters weigh against unsolicited mail, and we are already
 * carrying a 3.9% bounce rate on a cold list.
 *
 * UTMs cost nothing by comparison. They add no pixel, rewrite no link, and
 * are read by our own analytics under the existing cookie banner, so the
 * privacy policy needs no new promise.
 *
 * The template name goes in `utm_campaign` rather than `utm_content` on
 * purpose: campaign appears in GA4's default acquisition reports, so "which
 * touch produced this click" is answerable without building a custom
 * dimension first.
 *
 * `src` is included so the SIGNUP side is legible too. `/signup` reads these
 * params through lib/campaigns/attribution.ts and writes them to the new
 * account's auth metadata, so a business that signs up from an outreach
 * email carries `signup_source: "outreach"` — which makes the conversion
 * countable in the database as well as in GA4, alongside the 00073 trigger
 * that already flips a matching lead to `signed_up`.
 */

export const OUTREACH_BASE_URL = "https://www.mountainconnects.com";

/** Matches SOURCE_PATTERN in lib/campaigns/attribution.ts, or /signup drops it. */
export const OUTREACH_SIGNUP_SOURCE = "outreach";

export function businessSignupCta(template: string, baseUrl: string = OUTREACH_BASE_URL): string {
  const params = new URLSearchParams({
    role: "business",
    src: OUTREACH_SIGNUP_SOURCE,
    utm_source: OUTREACH_SIGNUP_SOURCE,
    utm_medium: "email",
  });
  // A caller with no template still gets a working, attributable link.
  const clean = template.trim();
  if (clean) params.set("utm_campaign", clean);
  return `${baseUrl}/signup?${params.toString()}`;
}
