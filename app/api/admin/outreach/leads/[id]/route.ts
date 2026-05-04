import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/require-admin";
import { rateLimit } from "@/lib/rate-limit";

/**
 * PATCH /api/admin/outreach/leads/[id]
 * Edit a lead's name, location, notes, or status. Status changes flow
 * through here too (e.g. manually marking signed_up or unsubscribed).
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const rateLimited = await rateLimit(request, { identifier: "admin" });
  if (rateLimited) return rateLimited;

  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;
  const { admin } = auth;

  const { id } = await params;

  let body: {
    businessName?: string;
    resortId?: string | null;
    townId?: string | null;
    notes?: string | null;
    status?: "active" | "signed_up" | "unsubscribed";
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const update: Record<string, unknown> = {};
  if (body.businessName !== undefined) update.business_name = body.businessName.trim();
  if (body.resortId !== undefined) update.resort_id = body.resortId || null;
  if (body.townId !== undefined) update.town_id = body.townId || null;
  if (body.notes !== undefined) update.notes = body.notes?.trim() || null;
  if (body.status !== undefined) {
    if (!["active", "signed_up", "unsubscribed"].includes(body.status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }
    update.status = body.status;
    if (body.status === "unsubscribed") update.unsubscribed_at = new Date().toISOString();
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }

  const { data, error } = await admin
    .from("outreach_leads")
    .update(update)
    .eq("id", id)
    .select("id, email, business_name, status")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ lead: data });
}

/**
 * DELETE /api/admin/outreach/leads/[id]
 * Hard delete the lead and (via cascade) any sends. Use sparingly —
 * usually it's better to mark unsubscribed so the audit trail stays.
 */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const rateLimited = await rateLimit(request, { identifier: "admin" });
  if (rateLimited) return rateLimited;

  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;
  const { admin } = auth;

  const { id } = await params;
  const { error } = await admin.from("outreach_leads").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
