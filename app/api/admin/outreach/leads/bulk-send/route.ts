import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/require-admin";
import { rateLimit } from "@/lib/rate-limit";
import { sendWinterSequenceBatch } from "@/lib/email/send";
import { OUTREACH_SEQUENCE } from "@/lib/outreach/sequence";

const BASE_URL = "https://www.mountainconnects.com";
const MAX_LEADS_PER_REQUEST = 500;
const RESEND_BATCH_SIZE = 100;

type WinterTemplate =
  | "winter-outreach"
  | "winter-followup-1"
  | "winter-followup-2"
  | "winter-followup-3"
  | "winter-followup-final";

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
 * Body: { leadIds: string[], template: WinterTemplate, retryLeadIds?: string[] }
 *
 * Fans out the same funnel-sequence template to multiple leads at
 * once via Resend's batch API. One API call covers 100 emails, so
 * 100 leads = 1 API request (vs the previous Promise.all that fired
 * 100 separate sends and got rate-limited by Resend after the first
 * few — the original second-email run only landed 5 deliveries
 * before throttling).
 *
 * Skipped leads (non-active status, not found, no email) are filed
 * as skipped/failed in outreach_sends and surfaced in the response
 * outcomes so the admin can retry.
 *
 * Standalone templates (sales-dropin) are excluded — those are 1:1
 * personal sends and shouldn't be blasted in bulk.
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

  const leadIds = Array.isArray(body.leadIds)
    ? body.leadIds.filter((x): x is string => typeof x === "string")
    : [];
  const template = body.template?.trim();

  if (leadIds.length === 0) {
    return NextResponse.json({ error: "No leads selected" }, { status: 400 });
  }
  if (leadIds.length > MAX_LEADS_PER_REQUEST) {
    return NextResponse.json(
      {
        error: `Too many leads (${leadIds.length}). Cap is ${MAX_LEADS_PER_REQUEST} per request.`,
      },
      { status: 400 }
    );
  }
  if (!template) {
    return NextResponse.json({ error: "Missing template" }, { status: 400 });
  }

  // Bulk send is funnel-only on purpose — see docstring.
  const sequenceTemplate = OUTREACH_SEQUENCE.find((s) => s.template === template);
  if (!sequenceTemplate) {
    return NextResponse.json(
      {
        error: `Template "${template}" is not a funnel template — bulk-send only supports the sequence`,
      },
      { status: 400 }
    );
  }

  const { data: leads, error: leadsErr } = await admin
    .from("outreach_leads")
    .select(
      "id, email, business_name, status, unsubscribe_token, resorts(name), nearby_towns(name)"
    )
    .in("id", leadIds);

  if (leadsErr) {
    return NextResponse.json({ error: leadsErr.message }, { status: 500 });
  }

  const leadById = new Map<string, LeadRow>();
  for (const l of (leads ?? []) as unknown as LeadRow[]) leadById.set(l.id, l);

  // Walk the requested IDs and split into 'sendable' vs 'skipped'.
  // Skipped reasons get returned in the outcomes so the admin sees
  // why a lead didn't get the email.
  const skippedOutcomes: SendOutcome[] = [];
  const sendable: { lead: LeadRow }[] = [];

  for (const id of leadIds) {
    const lead = leadById.get(id);
    if (!lead) {
      skippedOutcomes.push({
        leadId: id,
        email: "",
        business_name: "",
        status: "skipped",
        message: "Lead not found",
      });
      continue;
    }
    if (lead.status !== "active") {
      skippedOutcomes.push({
        leadId: id,
        email: lead.email,
        business_name: lead.business_name,
        status: "skipped",
        message: `Lead is ${lead.status}`,
      });
      continue;
    }
    if (!lead.email) {
      skippedOutcomes.push({
        leadId: id,
        email: "",
        business_name: lead.business_name,
        status: "skipped",
        message: "Lead has no email",
      });
      continue;
    }
    sendable.push({ lead });
  }

  // Send the active leads in 100-recipient batches via Resend's
  // batch API. Each batch is a single API call, so 500 leads needs
  // 5 calls — way under any rate limit.
  const sentOutcomes: SendOutcome[] = [];
  const ctaUrl = `${BASE_URL}/signup`;

  for (let i = 0; i < sendable.length; i += RESEND_BATCH_SIZE) {
    const chunk = sendable.slice(i, i + RESEND_BATCH_SIZE);
    const recipients = chunk.map(({ lead }) => ({
      to: lead.email,
      businessName: lead.business_name,
      ctaUrl,
      unsubscribeUrl: `${BASE_URL}/unsubscribe/${lead.unsubscribe_token}`,
      locationName: lead.nearby_towns?.name || lead.resorts?.name,
    }));

    try {
      const sentEmails = await sendWinterSequenceBatch({
        template: template as WinterTemplate,
        recipients,
      });
      // Resend returns the email ids in input order. Map them back
      // to the corresponding lead so the outreach_sends row carries
      // the Resend id for later webhook reconciliation.
      const sendsRows = chunk.map(({ lead }, idx) => ({
        lead_id: lead.id,
        template_name: template,
        sent_by: user.id,
        status: "sent" as const,
        resend_id: sentEmails[idx]?.id ?? null,
      }));
      if (sendsRows.length > 0) {
        await admin.from("outreach_sends").insert(sendsRows);
      }
      for (let j = 0; j < chunk.length; j++) {
        const { lead } = chunk[j];
        sentOutcomes.push({
          leadId: lead.id,
          email: lead.email,
          business_name: lead.business_name,
          status: "sent",
          resendId: sentEmails[j]?.id,
        });
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(
        `outreach bulk-send: batch ${i}-${i + chunk.length} failed: ${msg}`
      );
      const failedRows = chunk.map(({ lead }) => ({
        lead_id: lead.id,
        template_name: template,
        sent_by: user.id,
        status: "failed" as const,
        error_message: msg,
      }));
      if (failedRows.length > 0) {
        await admin.from("outreach_sends").insert(failedRows);
      }
      for (const { lead } of chunk) {
        sentOutcomes.push({
          leadId: lead.id,
          email: lead.email,
          business_name: lead.business_name,
          status: "failed",
          message: msg,
        });
      }
    }
  }

  // Preserve original leadId order in the response so the UI can
  // line outcomes up with what the admin selected.
  const outcomeMap = new Map<string, SendOutcome>();
  for (const o of [...skippedOutcomes, ...sentOutcomes]) outcomeMap.set(o.leadId, o);
  const outcomes = leadIds.map(
    (id) =>
      outcomeMap.get(id) ?? {
        leadId: id,
        email: "",
        business_name: "",
        status: "failed" as const,
        message: "Missing outcome",
      }
  );

  const summary = {
    total: outcomes.length,
    sent: outcomes.filter((o) => o.status === "sent").length,
    skipped: outcomes.filter((o) => o.status === "skipped").length,
    failed: outcomes.filter((o) => o.status === "failed").length,
  };

  return NextResponse.json({ summary, outcomes });
}
