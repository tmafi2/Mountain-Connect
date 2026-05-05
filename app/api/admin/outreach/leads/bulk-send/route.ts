import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/require-admin";
import { rateLimit } from "@/lib/rate-limit";
import {
  sendWinterOutreachEmail,
  sendWinterFollowup1Email,
  sendWinterFollowup2Email,
  sendWinterFollowup3Email,
  sendWinterFollowupFinalEmail,
} from "@/lib/email/send";
import { OUTREACH_SEQUENCE } from "@/lib/outreach/sequence";

const BASE_URL = "https://www.mountainconnects.com";
const MAX_LEADS_PER_BATCH = 100;

interface SendOutcome {
  leadId: string;
  email: string;
  business_name: string;
  status: "sent" | "skipped" | "failed";
  message?: string;
  resendId?: string;
}

interface LeadRow {
  id: string;
  email: string;
  business_name: string;
  status: string;
  unsubscribe_token: string;
  resorts: { name: string } | null;
  nearby_towns: { name: string } | null;
}

/**
 * POST /api/admin/outreach/leads/bulk-send
 * Body: { leadIds: string[], template: string }
 *
 * Fans out the same funnel-sequence template to multiple leads at once.
 * Standalone templates (sales-dropin) are intentionally excluded — those
 * are 1:1 personal sends that need per-lead context (contact name, etc.)
 * and shouldn't be blasted in bulk.
 *
 * Per-lead behaviour mirrors the single-lead /send route: skip leads
 * that aren't active, record an outreach_sends row on success, surface
 * Resend errors per-lead. Sends run in parallel via Promise.allSettled
 * so one bad address doesn't block the rest.
 */
export async function POST(request: Request) {
  const rateLimited = await rateLimit(request, { identifier: "admin" });
  if (rateLimited) return rateLimited;

  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;
  const { admin, user } = auth;

  let body: { leadIds?: string[]; template?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const leadIds = Array.isArray(body.leadIds) ? body.leadIds.filter((x) => typeof x === "string") : [];
  const template = body.template?.trim();

  if (leadIds.length === 0) return NextResponse.json({ error: "No leads selected" }, { status: 400 });
  if (leadIds.length > MAX_LEADS_PER_BATCH) {
    return NextResponse.json(
      { error: `Too many leads (${leadIds.length}). Cap is ${MAX_LEADS_PER_BATCH} per batch.` },
      { status: 400 }
    );
  }
  if (!template) return NextResponse.json({ error: "Missing template" }, { status: 400 });

  // Bulk send is funnel-only on purpose — see docstring.
  const sequenceTemplate = OUTREACH_SEQUENCE.find((s) => s.template === template);
  if (!sequenceTemplate) {
    return NextResponse.json(
      { error: `Template "${template}" is not a funnel template — bulk-send only supports the sequence` },
      { status: 400 }
    );
  }

  const { data: leads, error: leadsErr } = await admin
    .from("outreach_leads")
    .select("id, email, business_name, status, unsubscribe_token, resorts(name), nearby_towns(name)")
    .in("id", leadIds);

  if (leadsErr) return NextResponse.json({ error: leadsErr.message }, { status: 500 });

  const leadById = new Map<string, LeadRow>();
  for (const l of (leads ?? []) as unknown as LeadRow[]) leadById.set(l.id, l);

  // Process every requested ID even if the DB didn't return it, so the
  // admin sees a clear "not found" outcome rather than a silent miss.
  const outcomes: SendOutcome[] = await Promise.all(
    leadIds.map(async (id) => {
      const lead = leadById.get(id);
      if (!lead) {
        return { leadId: id, email: "", business_name: "", status: "skipped", message: "Lead not found" };
      }
      if (lead.status !== "active") {
        return {
          leadId: id,
          email: lead.email,
          business_name: lead.business_name,
          status: "skipped",
          message: `Lead is ${lead.status}`,
        };
      }

      const locationName = lead.nearby_towns?.name || lead.resorts?.name;
      const unsubscribeUrl = `${BASE_URL}/unsubscribe/${lead.unsubscribe_token}`;
      const ctaUrl = `${BASE_URL}/signup`;
      const common = {
        to: lead.email,
        businessName: lead.business_name,
        ctaUrl,
        unsubscribeUrl,
        locationName,
      };

      try {
        let resendId: string | undefined;
        switch (template) {
          case "winter-outreach":
            resendId = (await sendWinterOutreachEmail(common))?.data?.id ?? undefined;
            break;
          case "winter-followup-1":
            resendId = (await sendWinterFollowup1Email(common))?.data?.id ?? undefined;
            break;
          case "winter-followup-2":
            resendId = (await sendWinterFollowup2Email(common))?.data?.id ?? undefined;
            break;
          case "winter-followup-3":
            resendId = (await sendWinterFollowup3Email(common))?.data?.id ?? undefined;
            break;
          case "winter-followup-final":
            resendId = (await sendWinterFollowupFinalEmail(common))?.data?.id ?? undefined;
            break;
          default:
            return {
              leadId: id,
              email: lead.email,
              business_name: lead.business_name,
              status: "failed",
              message: `No send handler wired for template "${template}"`,
            };
        }

        await admin.from("outreach_sends").insert({
          lead_id: id,
          template_name: template,
          sent_by: user.id,
          status: "sent",
          resend_id: resendId ?? null,
        });

        return {
          leadId: id,
          email: lead.email,
          business_name: lead.business_name,
          status: "sent",
          resendId,
        };
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        // Record the failure too so it shows up in the lead's history.
        await admin.from("outreach_sends").insert({
          lead_id: id,
          template_name: template,
          sent_by: user.id,
          status: "failed",
          error_message: msg,
        });
        return {
          leadId: id,
          email: lead.email,
          business_name: lead.business_name,
          status: "failed",
          message: msg,
        };
      }
    })
  );

  const summary = {
    total: outcomes.length,
    sent: outcomes.filter((o) => o.status === "sent").length,
    skipped: outcomes.filter((o) => o.status === "skipped").length,
    failed: outcomes.filter((o) => o.status === "failed").length,
  };

  return NextResponse.json({ summary, outcomes });
}
