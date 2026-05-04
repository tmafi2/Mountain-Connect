import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/require-admin";
import { rateLimit } from "@/lib/rate-limit";
import { sendWinterOutreachEmail, sendSalesDropinEmail } from "@/lib/email/send";
import { allManualTemplates } from "@/lib/outreach/sequence";

const BASE_URL = "https://www.mountainconnects.com";

/**
 * POST /api/admin/outreach/leads/[id]/send
 * Body: { template: string }
 *
 * Manually fires a specific template to a single lead. Used by the
 * "Send →" button on the admin outreach page (typically for the first
 * email; follow-ups go through the cron). Records the send in
 * outreach_sends so the cron knows where the lead is in the sequence.
 *
 * Refuses to send when the lead is signed_up or unsubscribed so the
 * UI can't accidentally email a sign-up.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const rateLimited = await rateLimit(request, { identifier: "admin" });
  if (rateLimited) return rateLimited;

  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;
  const { admin, user } = auth;

  const { id } = await params;

  let body: { template?: string; contactPersonName?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const template = body.template?.trim();
  if (!template) return NextResponse.json({ error: "Missing template" }, { status: 400 });
  if (!allManualTemplates().find((t) => t.template === template)) {
    return NextResponse.json({ error: "Unknown template" }, { status: 400 });
  }

  // Pull the lead with location names denormalised so we can personalise.
  const { data: lead, error: leadErr } = await admin
    .from("outreach_leads")
    .select(
      "id, email, business_name, status, unsubscribe_token, resorts(name), nearby_towns(name)"
    )
    .eq("id", id)
    .single();

  if (leadErr || !lead) {
    return NextResponse.json({ error: "Lead not found" }, { status: 404 });
  }
  if (lead.status !== "active") {
    return NextResponse.json(
      { error: `Lead is ${lead.status}, refusing to send` },
      { status: 400 }
    );
  }

  const resort = lead.resorts as { name: string } | null;
  const town = lead.nearby_towns as { name: string } | null;
  const locationName = town?.name || resort?.name;
  const unsubscribeUrl = `${BASE_URL}/unsubscribe/${lead.unsubscribe_token}`;
  const ctaUrl = `${BASE_URL}/signup`;

  // Fire the right template. Add new branches as templates are added
  // to lib/outreach/sequence.ts.
  let sendResult: { id?: string; error?: string };
  try {
    if (template === "winter-outreach") {
      const result = await sendWinterOutreachEmail({
        to: lead.email,
        businessName: lead.business_name,
        ctaUrl,
        unsubscribeUrl,
        locationName,
      });
      sendResult = { id: result?.data?.id };
    } else if (template === "sales-dropin") {
      const result = await sendSalesDropinEmail({
        to: lead.email,
        businessName: lead.business_name,
        contactPersonName: body.contactPersonName?.trim() || undefined,
        locationName,
        ctaUrl,
        unsubscribeUrl,
      });
      sendResult = { id: result?.data?.id };
    } else {
      return NextResponse.json(
        { error: `Template "${template}" has no send handler wired up` },
        { status: 500 }
      );
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    // Record the failure so the admin sees what happened in the lead row.
    await admin.from("outreach_sends").insert({
      lead_id: id,
      template_name: template,
      sent_by: user.id,
      status: "failed",
      error_message: msg,
    });
    return NextResponse.json({ error: msg }, { status: 502 });
  }

  // Record the successful send so the drip cron can take over from here.
  const { error: sendErr } = await admin.from("outreach_sends").insert({
    lead_id: id,
    template_name: template,
    sent_by: user.id,
    status: "sent",
    resend_id: sendResult.id ?? null,
  });
  if (sendErr) {
    console.error("Failed to record outreach send:", sendErr);
  }

  return NextResponse.json({ success: true, resendId: sendResult.id ?? null });
}
