import { isInAppBrowser } from "@/lib/utils/in-app-browser";

/**
 * A consent-free count of who actually reaches a campaign landing page.
 *
 * WHY. On 20–22 Sept the ad reported 115 landing page views and GA4 saw 6
 * people on the same page. Both GA4 and the Meta pixel load only after the
 * cookie banner is accepted, so everything we measure is measured on the
 * minority who consent — while Meta counts the page load natively inside
 * Instagram's in-app browser and needs nothing from us. The six we could see
 * converted at 33%. What the other 109 did is, with the current
 * instrumentation, unanswerable: "bounced instantly" and "ignored the cookie
 * banner" produce identical data and need opposite fixes.
 *
 * A server-side count settles it, because a request is a request whether or
 * not anyone consents to anything.
 *
 * ⚠️ WHAT IS DELIBERATELY NOT RECORDED: no IP address, no raw user agent, no
 * cookie, no identifier of any kind. A row is a timestamp, which page, which
 * ad, and two booleans. That is a counter, not tracking — which is what keeps
 * it outside the consent banner and out of the privacy policy's promises. Do
 * not add a field that could single out a person; the moment you do, this
 * needs consent and it stops working for exactly the traffic it exists to
 * measure.
 */

export const CAMPAIGN_PATHS = new Set(["/go-for-a-season"]);

/** Cheap heuristics. Mail scanners and crawlers fetch ad URLs too. */
const BOT = /bot\b|crawler|spider|slurp|facebookexternalhit|headless|phantom|curl\/|wget\/|python-requests|axios\/|lighthouse|pingdom|uptime|monitor|preview/i;

const MAX_UTM = 120;

export interface CampaignVisit {
  path: string;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  utm_content: string | null;
  in_app_browser: boolean;
  likely_bot: boolean;
}

export function looksLikeBot(userAgent: string | null | undefined): boolean {
  if (!userAgent) return true; // a real browser always sends one
  return BOT.test(userAgent);
}

export function isCampaignPath(pathname: string): boolean {
  return CAMPAIGN_PATHS.has(pathname.replace(/\/+$/, "") || "/");
}

function utm(params: URLSearchParams, key: string): string | null {
  const raw = params.get(key);
  if (!raw) return null;
  const clean = raw.replace(/[\u0000-\u001f\u007f]/g, "").trim().slice(0, MAX_UTM);
  return clean || null;
}

export function visitFromRequest(url: URL, userAgent: string | null | undefined): CampaignVisit {
  return {
    path: url.pathname.replace(/\/+$/, "") || "/",
    utm_source: utm(url.searchParams, "utm_source"),
    utm_medium: utm(url.searchParams, "utm_medium"),
    utm_campaign: utm(url.searchParams, "utm_campaign"),
    utm_content: utm(url.searchParams, "utm_content"),
    in_app_browser: isInAppBrowser(userAgent),
    likely_bot: looksLikeBot(userAgent),
  };
}

/**
 * Fire-and-forget. Called from middleware via event.waitUntil so it never
 * delays the response, and it swallows every error: a missed count is a
 * missed count, but a landing page that fails because its counter did is a
 * lost ad click.
 *
 * A plain fetch rather than the Supabase client — middleware runs on the edge
 * runtime and this is one INSERT with no session to manage.
 */
export async function recordCampaignVisit(visit: CampaignVisit): Promise<void> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return;

  try {
    await fetch(`${url}/rest/v1/campaign_visits`, {
      method: "POST",
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
        Prefer: "return=minimal",
      },
      body: JSON.stringify(visit),
    });
  } catch {
    // Deliberately silent — see above.
  }
}
