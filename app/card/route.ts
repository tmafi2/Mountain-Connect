import { NextRequest, NextResponse, after } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

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
  tyler: "/welcome",
};
const DEFAULT_DESTINATION = "/welcome";

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const rawCode = url.searchParams.get("c");
  const code = (rawCode || "default").toLowerCase().slice(0, 32);

  const destPath = DESTINATIONS[code] || DEFAULT_DESTINATION;
  const dest = new URL(destPath, url.origin);
  dest.searchParams.set("src", "nfc");
  if (rawCode) dest.searchParams.set("c", code);

  // Queue the tap insert to run after the redirect response is sent. Using
  // after() instead of fire-and-forget so the serverless function does not
  // terminate mid-insert on Vercel — the write always completes even if it
  // takes a few hundred ms after the user has already been redirected.
  const userAgent = request.headers.get("user-agent");
  const referrer = request.headers.get("referer");
  const country = request.headers.get("x-vercel-ip-country");
  after(async () => {
    try {
      const admin = createAdminClient();
      await admin.from("nfc_taps").insert({
        card_code: code,
        user_agent: userAgent,
        referrer,
        country,
      });
    } catch (err) {
      console.error("Failed to log NFC tap:", err);
    }
  });

  return NextResponse.redirect(dest, { status: 302 });
}
