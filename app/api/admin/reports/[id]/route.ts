import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/require-admin";
import { rateLimit } from "@/lib/rate-limit";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const rateLimited = await rateLimit(request, { identifier: "admin" });
  if (rateLimited) return rateLimited;

  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;
  const { admin, user } = auth;

  const { id } = await params;
  const { status, admin_note } = await request.json();

  const VALID_STATUSES = ["open", "resolved", "dismissed"];
  if (!VALID_STATUSES.includes(status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  const updatePayload: Record<string, unknown> = { status };
  if (admin_note !== undefined) updatePayload.admin_note = admin_note;
  if (status === "resolved" || status === "dismissed") {
    updatePayload.resolved_at = new Date().toISOString();
    updatePayload.resolved_by = user.id;
  }

  const { data: updated, error } = await admin
    .from("support_reports")
    .update(updatePayload)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ report: updated });
}
