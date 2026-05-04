import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/require-admin";
import { rateLimit } from "@/lib/rate-limit";

/**
 * GET /api/admin/outreach/leads
 * List all outreach leads with their last-send info, total send count,
 * and resort/town names denormalised. Admin only.
 */
export async function GET(request: Request) {
  const rateLimited = await rateLimit(request, { identifier: "admin" });
  if (rateLimited) return rateLimited;

  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;
  const { admin } = auth;

  const { data: leads, error } = await admin
    .from("outreach_leads")
    .select(
      "id, email, business_name, status, notes, signed_up_at, unsubscribed_at, created_at, resorts(id, name), nearby_towns(id, name)"
    )
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Denormalise the latest send + total count per lead in one extra query
  // so the list view can sort by "needs first email" without N+1s.
  const ids = (leads ?? []).map((l) => l.id as string);
  const sendsByLead = new Map<string, { last: string | null; lastTemplate: string | null; count: number }>();
  if (ids.length > 0) {
    const { data: sends } = await admin
      .from("outreach_sends")
      .select("lead_id, template_name, sent_at")
      .in("lead_id", ids)
      .order("sent_at", { ascending: false });
    for (const s of sends ?? []) {
      const lid = s.lead_id as string;
      const cur = sendsByLead.get(lid);
      if (!cur) {
        sendsByLead.set(lid, {
          last: s.sent_at as string,
          lastTemplate: s.template_name as string,
          count: 1,
        });
      } else {
        cur.count++;
      }
    }
  }

  const enriched = (leads ?? []).map((l) => {
    const s = sendsByLead.get(l.id as string);
    return {
      ...l,
      last_sent_at: s?.last ?? null,
      last_sent_template: s?.lastTemplate ?? null,
      send_count: s?.count ?? 0,
    };
  });

  return NextResponse.json({ leads: enriched });
}

/**
 * POST /api/admin/outreach/leads
 * Create a new lead. Email and businessName required; one of resortId or
 * townId optional. Returns the created row.
 */
export async function POST(request: Request) {
  const rateLimited = await rateLimit(request, { identifier: "admin" });
  if (rateLimited) return rateLimited;

  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;
  const { admin, user } = auth;

  let body: {
    email?: string;
    businessName?: string;
    resortId?: string | null;
    townId?: string | null;
    notes?: string | null;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const email = body.email?.trim().toLowerCase();
  const businessName = body.businessName?.trim();
  if (!email) return NextResponse.json({ error: "Email required" }, { status: 400 });
  if (!businessName) return NextResponse.json({ error: "Business name required" }, { status: 400 });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "Invalid email" }, { status: 400 });
  }
  if (email.length > 200 || businessName.length > 200) {
    return NextResponse.json({ error: "Email or name too long" }, { status: 400 });
  }

  const { data, error } = await admin
    .from("outreach_leads")
    .insert({
      email,
      business_name: businessName,
      resort_id: body.resortId || null,
      town_id: body.townId || null,
      notes: body.notes?.trim() || null,
      added_by: user.id,
    })
    .select("id, email, business_name, status")
    .single();

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json({ error: "A lead with that email already exists" }, { status: 409 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ lead: data });
}
