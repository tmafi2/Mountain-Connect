import { NextRequest, NextResponse, after } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { parseUserAgent } from "@/lib/utils/user-agent";

/**
 * GET /connect/tyler.vcf
 *
 * Serves Tyler's contact card as a vCard 3.0 file. The Content-Type makes
 * iOS and Android open their native Add Contact sheet. Logs a
 * vcard_download event to nfc_taps so the admin dashboard can report how
 * many people actually saved the contact after tapping the card.
 */
export async function GET(request: NextRequest) {
  const headers = request.headers;
  const userAgent = headers.get("user-agent");
  const country = headers.get("x-vercel-ip-country");
  const city = headers.get("x-vercel-ip-city");
  const region = headers.get("x-vercel-ip-country-region");
  const timezone = headers.get("x-vercel-ip-timezone");
  const lat = headers.get("x-vercel-ip-latitude");
  const lon = headers.get("x-vercel-ip-longitude");
  const referrer = headers.get("referer");
  const { os, browser, deviceType } = parseUserAgent(userAgent);

  after(async () => {
    try {
      const admin = createAdminClient();
      await admin.from("nfc_taps").insert({
        event_type: "vcard_download",
        card_code: "tyler",
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
      console.error("Failed to log vCard download:", err);
    }
  });

  const vcard = [
    "BEGIN:VCARD",
    "VERSION:3.0",
    "FN:Tyler Mafi",
    "N:Mafi;Tyler;;;",
    "TITLE:Founder",
    "ORG:Mountain Connects",
    "EMAIL;TYPE=WORK:tyler@mountainconnects.com",
    "TEL;TYPE=CELL:+61468939113",
    "URL:https://www.mountainconnects.com",
    "NOTE:Connecting seasonal workers with ski resorts worldwide.",
    "END:VCARD",
    "",
  ].join("\r\n");

  return new NextResponse(vcard, {
    headers: {
      "Content-Type": "text/vcard; charset=utf-8",
      "Content-Disposition": 'attachment; filename="tyler-mafi.vcf"',
      "Cache-Control": "public, max-age=3600",
    },
  });
}
