import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  sendWinterOutreachEmail,
  sendWinterFollowup1Email,
  sendWinterFollowup2Email,
  sendWinterFollowup3Email,
  sendWinterFollowupFinalEmail,
} from "@/lib/email/send";
import { OUTREACH_SEQUENCE, findNextStep } from "@/lib/outreach/sequence";

const BASE_URL = "https://www.mountainconnects.com";

/**
 * GET /api/cron/outreach-drip
 *
 * Daily cron that progresses active outreach leads through the
 * configured drip sequence. For each active lead with at least one
 * prior send, looks up the next sequence step and fires it if the
 * configured delay has elapsed since the last send.
 *
 * Step 0 is manual (admin clicks "Send →" on the row), so this cron
 * only handles steps 1+. If the sequence has only step 0 configured,
 * the cron is effectively a no-op.
 *
 * Skips signed_up and unsubscribed leads. Each send is recorded in
 * outreach_sends so subsequent runs can compute "next step due".
 */
export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // If the sequence is just step 0, nothing to do — exit early.
  if (OUTREACH_SEQUENCE.length < 2) {
    return NextResponse.json({
      sent: 0,
      skipped: 0,
      note: "Sequence has only manual step 0; no follow-ups configured.",
    });
  }

  const admin = createAdminClient();
  const result = { sent: 0, skipped: 0, errors: [] as string[] };

  // Pull every active lead with at least one prior send. We grab the
  // most recent send per lead via a single ordered query and reduce in
  // memory — keeps it simple for the few hundred leads we'd realistically
  // have. If this grows past ~10k leads, switch to a per-lead query.
  const { data: leads, error: leadsErr } = await admin
    .from("outreach_leads")
    .select("id, email, business_name, unsubscribe_token, resorts(name), nearby_towns(name)")
    .eq("status", "active");
  if (leadsErr) {
    return NextResponse.json({ error: leadsErr.message }, { status: 500 });
  }

  if (!leads || leads.length === 0) {
    return NextResponse.json(result);
  }

  const leadIds = leads.map((l) => l.id as string);
  const { data: sends } = await admin
    .from("outreach_sends")
    .select("lead_id, template_name, sent_at, status")
    .in("lead_id", leadIds)
    .eq("status", "sent")
    .order("sent_at", { ascending: false });

  const lastSendByLead = new Map<string, { template: string; at: number }>();
  for (const s of sends ?? []) {
    const lid = s.lead_id as string;
    if (!lastSendByLead.has(lid)) {
      lastSendByLead.set(lid, {
        template: s.template_name as string,
        at: new Date(s.sent_at as string).getTime(),
      });
    }
  }

  const now = Date.now();
  const DAY_MS = 24 * 60 * 60 * 1000;

  for (const lead of leads) {
    const last = lastSendByLead.get(lead.id as string);
    if (!last) {
      // Never sent — step 0 is manual, skip.
      result.skipped++;
      continue;
    }

    const next = findNextStep(last.template);
    if (!next) {
      // End of sequence or last template no longer in config.
      result.skipped++;
      continue;
    }

    const dueAt = last.at + next.delayDaysAfterPrevious * DAY_MS;
    if (dueAt > now) {
      result.skipped++;
      continue;
    }

    // Due — fire the template.
    const resort = lead.resorts as { name: string } | null;
    const town = lead.nearby_towns as { name: string } | null;
    const locationName = town?.name || resort?.name;
    const unsubscribeUrl = `${BASE_URL}/unsubscribe/${lead.unsubscribe_token}`;
    const ctaUrl = `${BASE_URL}/signup`;

    try {
      let resendId: string | undefined;
      const common = {
        to: lead.email as string,
        businessName: lead.business_name as string,
        ctaUrl,
        unsubscribeUrl,
        locationName,
      };
      if (next.template === "winter-outreach") {
        const r = await sendWinterOutreachEmail(common);
        resendId = r?.data?.id;
      } else if (next.template === "winter-followup-1") {
        const r = await sendWinterFollowup1Email(common);
        resendId = r?.data?.id;
      } else if (next.template === "winter-followup-2") {
        const r = await sendWinterFollowup2Email(common);
        resendId = r?.data?.id;
      } else if (next.template === "winter-followup-3") {
        const r = await sendWinterFollowup3Email(common);
        resendId = r?.data?.id;
      } else if (next.template === "winter-followup-final") {
        const r = await sendWinterFollowupFinalEmail(common);
        resendId = r?.data?.id;
      } else {
        // Add new template branches as templates land in the sequence.
        result.errors.push(`Lead ${lead.id}: no send handler for template "${next.template}"`);
        continue;
      }

      await admin.from("outreach_sends").insert({
        lead_id: lead.id,
        template_name: next.template,
        status: "sent",
        resend_id: resendId ?? null,
      });
      result.sent++;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`outreach-drip send failed for lead ${lead.id}:`, err);
      await admin.from("outreach_sends").insert({
        lead_id: lead.id,
        template_name: next.template,
        status: "failed",
        error_message: msg,
      });
      result.errors.push(`${lead.id}: ${msg}`);
    }
  }

  return NextResponse.json(result);
}
