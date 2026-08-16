import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { rateLimit } from "@/lib/rate-limit";
import { sendEmail } from "@/lib/email/client";

/**
 * POST /api/location-requests
 *
 * "Missing your resort or town? Let us know." Public (works logged-out —
 * a business owner on the employer page or a worker on explore shouldn't
 * need an account to tell us where they are). Rate-limited by IP, validated,
 * stored in location_requests, and emailed to the admin inbox so demand
 * for new regions is visible at a glance.
 *
 * Body: { kind: "resort"|"town"|"either", locationName, country?, requester:
 *        "worker"|"business"|"other", email, note?, sourcePath? }
 */
const KINDS = new Set(["resort", "town", "either"]);
const REQUESTERS = new Set(["worker", "business", "other"]);
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export async function POST(request: Request) {
  // Tight limit: this is an unauthenticated write. 5/hour per IP is plenty
  // for a real person and useless for a bot.
  const rateLimited = await rateLimit(request, { identifier: "location-request", limit: 5, window: "1 h" });
  if (rateLimited) return rateLimited;

  let body: Record<string, unknown>;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  const kind = String(body.kind ?? "either");
  const locationName = String(body.locationName ?? "").trim();
  const country = String(body.country ?? "").trim() || null;
  const requester = String(body.requester ?? "other");
  const email = String(body.email ?? "").trim().toLowerCase();
  const note = String(body.note ?? "").trim() || null;
  const sourcePath = String(body.sourcePath ?? "").trim().slice(0, 300) || null;
  // Honeypot: real users never fill this hidden field.
  if (typeof body.website === "string" && body.website.length > 0) {
    return NextResponse.json({ ok: true }); // pretend success, drop silently
  }

  if (!KINDS.has(kind)) return NextResponse.json({ error: "Invalid kind" }, { status: 400 });
  if (!REQUESTERS.has(requester)) return NextResponse.json({ error: "Invalid requester" }, { status: 400 });
  if (locationName.length < 2 || locationName.length > 120) {
    return NextResponse.json({ error: "Please tell us the resort or town name" }, { status: 400 });
  }
  if (!EMAIL_RE.test(email) || email.length > 254) {
    return NextResponse.json({ error: "Please enter a valid email so we can let you know" }, { status: 400 });
  }
  if (note && note.length > 1000) return NextResponse.json({ error: "Note is too long" }, { status: 400 });
  if (country && country.length > 80) return NextResponse.json({ error: "Country is too long" }, { status: 400 });

  // Attach the user if they happen to be logged in (optional).
  let userId: string | null = null;
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    userId = user?.id ?? null;
  } catch { /* logged-out is fine */ }

  const admin = createAdminClient();
  const { data: row, error } = await admin
    .from("location_requests")
    .insert({ kind, location_name: locationName, country, requester, email, note, source_path: sourcePath, user_id: userId })
    .select("id")
    .single();
  if (error) {
    console.error("location_requests insert failed:", error);
    return NextResponse.json({ error: "Couldn't save your request. Please try again." }, { status: 500 });
  }

  // How many times has this place been asked for? Useful signal in the alert.
  const { count: sameCount } = await admin
    .from("location_requests")
    .select("id", { count: "exact", head: true })
    .ilike("location_name", locationName);

  // Email the admin inbox (non-blocking for the user — failure to notify
  // shouldn't fail the request; it's already stored).
  const adminEmail = process.env.ADMIN_NOTIFY_EMAIL;
  if (adminEmail) {
    const kindLabel = kind === "either" ? "resort or town" : kind;
    const html = `
      <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#0a1e33;">
        <h2 style="margin:0 0 4px;font-size:18px;">📍 New location request${(sameCount ?? 1) > 1 ? ` <span style="color:#3b9ede;">(#${sameCount} for this place)</span>` : ""}</h2>
        <p style="margin:0 0 16px;color:#4e5d6c;font-size:13px;">Someone asked for a ${kindLabel} we don't cover yet.</p>
        <table style="border-collapse:collapse;font-size:14px;">
          <tr><td style="padding:4px 12px 4px 0;color:#8899a6;">Place</td><td><strong>${escapeHtml(locationName)}</strong>${country ? `, ${escapeHtml(country)}` : ""}</td></tr>
          <tr><td style="padding:4px 12px 4px 0;color:#8899a6;">Type</td><td>${kindLabel}</td></tr>
          <tr><td style="padding:4px 12px 4px 0;color:#8899a6;">From</td><td>${requester} · <a href="mailto:${escapeHtml(email)}">${escapeHtml(email)}</a>${userId ? " (logged in)" : ""}</td></tr>
          ${note ? `<tr><td style="padding:4px 12px 4px 0;color:#8899a6;vertical-align:top;">Note</td><td>${escapeHtml(note)}</td></tr>` : ""}
          ${sourcePath ? `<tr><td style="padding:4px 12px 4px 0;color:#8899a6;">Page</td><td style="color:#8899a6;">${escapeHtml(sourcePath)}</td></tr>` : ""}
        </table>
        <p style="margin:20px 0 0;font-size:12px;color:#8899a6;">Stored in location_requests · id ${row.id}</p>
      </div>`;
    sendEmail({
      from: "Mountain Connects <notifications@mountainconnects.com>",
      to: adminEmail,
      replyTo: email,
      subject: `Location request: ${locationName}${country ? `, ${country}` : ""} (${requester})`,
      html,
    }).catch((e) => console.error("location request admin email failed:", e));
  }

  return NextResponse.json({ ok: true, id: row.id });
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
