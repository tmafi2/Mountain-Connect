import { NextRequest, NextResponse, after } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { parseUserAgent } from "@/lib/utils/user-agent";

/**
 * GET /card?c=<code>
 *
 * Redirect target for physical NFC cards. Logs a row in nfc_taps, then
 * 302-redirects to a card-specific destination on the site. Keeping the
 * card pointed at this route means we can change destinations any time
 * without re-programming physical cards.
 *
 * Supported card codes (extend here as new batches are printed):
 *   biz    — business-facing card   → /welcome?view=business
 *   worker — worker-facing card     → /welcome?view=worker
 *   tyler  — generic personal card  → /welcome
 *   (any unknown / missing code)    → /welcome
 */
const DESTINATIONS: Record<string, string> = {
  biz: "/welcome?view=business",
  worker: "/welcome?view=worker",
  tyler: "/connect/tyler",
};
const DEFAULT_DESTINATION = "/welcome";

// CTA click targets — ?cta=hiring or ?cta=worker. The CTA takes precedence
// over the card destination so we can reuse /card as a lightweight tracking
// redirect for in-page buttons (e.g. the I'm hiring / Looking for work
// buttons on the Tyler contact card).
const CTA_DESTINATIONS: Record<string, string> = {
  hiring: "/welcome?view=business",
  worker: "/welcome?view=worker",
};

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const rawCode = url.searchParams.get("c");
  const code = (rawCode || "default").toLowerCase().slice(0, 32);
  const rawCta = url.searchParams.get("cta");
  const cta = rawCta ? rawCta.toLowerCase().slice(0, 32) : null;

  // CTA click wins over card destination — used by in-page buttons that
  // want to log a conversion and redirect in one step.
  const destPath = cta && CTA_DESTINATIONS[cta]
    ? CTA_DESTINATIONS[cta]
    : DESTINATIONS[code] || DEFAULT_DESTINATION;
  const dest = new URL(destPath, url.origin);
  dest.searchParams.set("src", cta ? "contact-card" : "nfc");
  if (rawCode) dest.searchParams.set("c", code);

  // Queue the tap insert to run after the redirect response is sent. Using
  // after() instead of fire-and-forget so the serverless function does not
  // terminate mid-insert on Vercel — the write always completes even if it
  // takes a few hundred ms after the user has already been redirected.
  const headers = request.headers;
  const userAgent = headers.get("user-agent");
  const referrer = headers.get("referer");
  const country = headers.get("x-vercel-ip-country");
  const city = headers.get("x-vercel-ip-city");
  const region = headers.get("x-vercel-ip-country-region");
  const timezone = headers.get("x-vercel-ip-timezone");
  const lat = headers.get("x-vercel-ip-latitude");
  const lon = headers.get("x-vercel-ip-longitude");
  const { os, browser, deviceType } = parseUserAgent(userAgent);

  const eventType = cta ? `cta_${cta}` : "tap";

  after(async () => {
    try {
      const admin = createAdminClient();
      await admin.from("nfc_taps").insert({
        event_type: eventType,
        card_code: code,
        user_agent: userAgent,
        referrer,
        country,
        city: city ? decodeURIComponent(city) : null,
        region,
        timezone,
        latitude: lat ? parseFloat(lat) : null,
        longitude: lon ? parseFloat(lon) : null,
        os,
        browser,
        device_type: deviceType,
      });
    } catch (err) {
      console.error("Failed to log NFC tap:", err);
    }
  });

  return NextResponse.redirect(dest, { status: 302 });
}
