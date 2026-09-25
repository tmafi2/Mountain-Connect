import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { rateLimit } from "@/lib/rate-limit";
import { buildEventRow } from "@/lib/analytics/funnel-row";

/**
 * POST /api/campaign-event — the funnel, counted without a cookie banner.
 *
 * GA4 and the Meta Pixel only load once the banner is accepted, and it blocks
 * nothing, so almost nobody answers: 23–24 September GA4 saw 7 people on a
 * page 117 real visitors reached. This records the same events for everybody,
 * which it is allowed to do because it stores nothing that identifies anyone
 * — see 00106 for the columns and why an identifier would defeat the purpose.
 *
 * PUBLIC AND UNAUTHENTICATED, because the visitors it measures are. That makes
 * strict validation the real defence, not the rate limiter: the event must be
 * one of nine known names and every property is capped and character-checked,
 * so the worst an abuser achieves is inflating a count they cannot read.
 *
 * Always answers 204, whatever happened. The caller is a beacon fired as the
 * page unloads; it cannot act on an error, and a failed count must never
 * surface as a failed request on a landing page.
 */

const MAX_BODY_BYTES = 2_000;

const noContent = () => new NextResponse(null, { status: 204 });

export async function POST(request: Request) {
  try {
    const limited = await rateLimit(request, { limit: 60, window: "1 m" });
    if (limited) return noContent();

    const raw = await request.text();
    if (raw.length > MAX_BODY_BYTES) return noContent();

    let body: Record<string, unknown>;
    try {
      body = JSON.parse(raw) as Record<string, unknown>;
    } catch {
      return noContent();
    }

    const row = buildEventRow(body, request.headers.get("user-agent"));
    if (!row) return noContent();

    const admin = createAdminClient();
    const { error } = await admin.from("campaign_events").insert(row);
    if (error) console.error("campaign-event: insert failed:", error.message);
  } catch (err) {
    console.error("campaign-event: unavailable:", err);
  }
  return noContent();
}
