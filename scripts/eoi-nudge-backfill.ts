/**
 * scripts/eoi-nudge-backfill.ts
 *
 * Preview / backfill missed first-applicant and 5+ EOI threshold nudges.
 *
 * Usage:
 *   npx tsx scripts/eoi-nudge-backfill.ts              # preview only (no sends)
 *   npx tsx scripts/eoi-nudge-backfill.ts --send       # actually send + stamp flags
 *   npx tsx scripts/eoi-nudge-backfill.ts --send --first-only
 *   npx tsx scripts/eoi-nudge-backfill.ts --send --threshold-only
 *
 * What it finds:
 *   • Pass 1 — Unclaimed businesses with >= 1 EOI where
 *     first_applicant_email_sent_at IS NULL
 *   • Pass 2 — Unclaimed businesses with >= 5 EOIs where
 *     eoi_nudge_sent_at IS NULL
 *
 * Pass 2 is a strict superset of pass 1, but each guards a different
 * sent-at column so we send (and stamp) them independently.
 */
import { config } from "dotenv";
config({ path: ".env.local" });

import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";
import { firstApplicantNudgeEmail } from "../lib/email/templates/first-applicant-nudge";
import { eoiThresholdNudgeEmail } from "../lib/email/templates/eoi-threshold-nudge";

const FROM = "Tyler @ Mountain Connects <tyler@mountainconnects.com>";
const REPLY_TO = "tyler@mountainconnects.com";
const BASE = "https://www.mountainconnects.com";
const THRESHOLD = 5;

const args = new Set(process.argv.slice(2));
const SEND = args.has("--send");
const FIRST_ONLY = args.has("--first-only");
const THRESHOLD_ONLY = args.has("--threshold-only");

interface BizRow {
  id: string;
  business_name: string;
  email: string | null;
  claim_token: string | null;
  first_applicant_email_sent_at: string | null;
  eoi_nudge_sent_at: string | null;
}

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const resendKey = process.env.RESEND_API_KEY;
  if (!url || !key) {
    console.error("Missing SUPABASE env vars in .env.local");
    process.exit(1);
  }
  if (SEND && !resendKey) {
    console.error("Missing RESEND_API_KEY in .env.local — required for --send");
    process.exit(1);
  }

  const admin = createClient(url, key, { auth: { persistSession: false } });
  const resend = SEND ? new Resend(resendKey!) : null;

  console.log(`Mode: ${SEND ? "SEND" : "PREVIEW (no sends)"}`);
  console.log("");

  // Load every unclaimed business that could be in scope: has email, has
  // claim token, at least one of the two sent-at flags is null. Pulling
  // them all and computing counts client-side is fine — there's a few
  // hundred at most.
  const { data: businesses, error: bizErr } = await admin
    .from("business_profiles")
    .select(
      "id, business_name, email, claim_token, first_applicant_email_sent_at, eoi_nudge_sent_at"
    )
    .eq("is_claimed", false)
    .not("email", "is", null)
    .not("claim_token", "is", null);

  if (bizErr) {
    console.error("Query failed:", bizErr.message);
    process.exit(1);
  }

  const candidates = (businesses ?? []) as BizRow[];
  console.log(`Found ${candidates.length} unclaimed businesses with email + claim_token`);
  console.log("");

  // Count BOTH expressions_of_interest AND applications against each
  // unclaimed business. Originally the threshold logic only saw EOIs,
  // but two apply paths (jobs list modal + saved-jobs apply) bypass the
  // unclaimed check and write straight to the applications table. Either
  // form of interest should nudge the business to claim and respond.
  const bizIds = candidates.map((b) => b.id);

  const [{ data: eois, error: eoiErr }, { data: apps, error: appErr }] = await Promise.all([
    admin
      .from("expressions_of_interest")
      .select("id, job_posts!inner(business_id)")
      .in("job_posts.business_id", bizIds),
    admin
      .from("applications")
      .select("id, job_posts!inner(business_id)")
      .in("job_posts.business_id", bizIds),
  ]);

  if (eoiErr) {
    console.error("EOI query failed:", eoiErr.message);
    process.exit(1);
  }
  if (appErr) {
    console.error("Applications query failed:", appErr.message);
    process.exit(1);
  }

  const eoiCountByBiz = new Map<string, number>();
  for (const row of (eois ?? []) as Array<{ job_posts: { business_id: string } }>) {
    const bid = row.job_posts.business_id;
    eoiCountByBiz.set(bid, (eoiCountByBiz.get(bid) ?? 0) + 1);
  }
  const appCountByBiz = new Map<string, number>();
  for (const row of (apps ?? []) as Array<{ job_posts: { business_id: string } }>) {
    const bid = row.job_posts.business_id;
    appCountByBiz.set(bid, (appCountByBiz.get(bid) ?? 0) + 1);
  }
  const totalCount = (id: string) => (eoiCountByBiz.get(id) ?? 0) + (appCountByBiz.get(id) ?? 0);

  // Build the two pass lists. Threshold takes precedence — if a business
  // qualifies for both (e.g. they're sitting at 8 with no nudge ever
  // sent), only send the louder threshold email and stamp BOTH flags.
  // Otherwise they'd get two emails about the same situation.
  const thresholdPass = candidates.filter(
    (b) => !b.eoi_nudge_sent_at && totalCount(b.id) >= THRESHOLD
  );
  const thresholdIds = new Set(thresholdPass.map((b) => b.id));
  const firstPass = candidates.filter(
    (b) => !b.first_applicant_email_sent_at && totalCount(b.id) >= 1 && !thresholdIds.has(b.id)
  );

  // ─── Pass 1: first-applicant nudge ───────────────────────────
  if (!THRESHOLD_ONLY) {
    console.log("=== Pass 1: first-applicant nudge (count >= 1) ===");
    console.log(`Eligible: ${firstPass.length}`);
    for (const b of firstPass) {
      const eoi = eoiCountByBiz.get(b.id) ?? 0;
      const app = appCountByBiz.get(b.id) ?? 0;
      console.log(`  - ${b.business_name.padEnd(45)} ${b.email.padEnd(35)}  ${eoi} EOI + ${app} app = ${eoi + app}`);
    }
    if (SEND && resend) {
      console.log("");
      console.log("Sending...");
      for (const b of firstPass) {
        const count = totalCount(b.id);
        // Use the punchier threshold copy whenever we're sending to a
        // backlog (>=2 interested). The first-applicant wording only
        // really fits when there is genuinely just one.
        const useFirstCopy = count === 1;
        await sendOne({
          admin,
          resend,
          biz: b,
          jobTitle: await firstActiveJobTitle(admin, b.id),
          flagsToStamp: ["first_applicant_email_sent_at"],
          buildEmail: ({ businessName, jobTitle, claimUrl }) =>
            useFirstCopy
              ? firstApplicantNudgeEmail({ businessName, jobTitle, claimUrl })
              : eoiThresholdNudgeEmail({ businessName, jobTitle, eoiCount: count, claimUrl }),
        });
      }
    }
    console.log("");
  }

  // ─── Pass 2: 5+ threshold nudge ──────────────────────────────
  if (!FIRST_ONLY) {
    console.log(`=== Pass 2: threshold nudge (count >= ${THRESHOLD}) ===`);
    console.log(`Eligible: ${thresholdPass.length}`);
    for (const b of thresholdPass) {
      const eoi = eoiCountByBiz.get(b.id) ?? 0;
      const app = appCountByBiz.get(b.id) ?? 0;
      console.log(`  - ${b.business_name.padEnd(45)} ${b.email.padEnd(35)}  ${eoi} EOI + ${app} app = ${eoi + app}`);
    }
    if (SEND && resend) {
      console.log("");
      console.log("Sending...");
      for (const b of thresholdPass) {
        const count = totalCount(b.id);
        // Stamp both flags so the inline trigger doesn't later send the
        // first-applicant email to a business we've already louder-nudged.
        const flagsToStamp: Array<"eoi_nudge_sent_at" | "first_applicant_email_sent_at"> = [
          "eoi_nudge_sent_at",
        ];
        if (!b.first_applicant_email_sent_at) flagsToStamp.push("first_applicant_email_sent_at");
        await sendOne({
          admin,
          resend,
          biz: b,
          jobTitle: await firstActiveJobTitle(admin, b.id),
          flagsToStamp,
          buildEmail: ({ businessName, jobTitle, claimUrl }) =>
            eoiThresholdNudgeEmail({ businessName, jobTitle, eoiCount: count, claimUrl }),
        });
      }
    }
    console.log("");
  }

  if (!SEND) {
    console.log("Preview only. Re-run with --send to actually send + stamp the flags.");
  }
}

async function firstActiveJobTitle(
  admin: ReturnType<typeof createClient>,
  businessId: string
): Promise<string> {
  const { data } = await admin
    .from("job_posts")
    .select("title")
    .eq("business_id", businessId)
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return ((data?.title as string) ?? "your role").trim();
}

async function sendOne({
  admin,
  resend,
  biz,
  jobTitle,
  flagsToStamp,
  buildEmail,
}: {
  admin: ReturnType<typeof createClient>;
  resend: Resend;
  biz: BizRow;
  jobTitle: string;
  flagsToStamp: Array<"first_applicant_email_sent_at" | "eoi_nudge_sent_at">;
  buildEmail: (p: { businessName: string; jobTitle: string; claimUrl: string }) => {
    subject: string;
    html: string;
  };
}) {
  if (!biz.email || !biz.claim_token) return;
  const claimUrl = `${BASE}/claim/${biz.claim_token}`;
  const { subject, html } = buildEmail({
    businessName: biz.business_name,
    jobTitle,
    claimUrl,
  });
  try {
    const result = await resend.emails.send({
      from: FROM,
      replyTo: REPLY_TO,
      to: biz.email,
      subject,
      html,
    });
    if (result.error) {
      console.log(`  ✗ ${biz.business_name.padEnd(45)} Resend error: ${JSON.stringify(result.error)}`);
      return;
    }
    // Stamp all relevant flags so the inline trigger doesn't re-fire.
    const stamp: Record<string, string> = {};
    const now = new Date().toISOString();
    for (const f of flagsToStamp) stamp[f] = now;
    const { error: updErr } = await admin
      .from("business_profiles")
      .update(stamp)
      .eq("id", biz.id);
    if (updErr) {
      console.log(`  ⚠ ${biz.business_name.padEnd(45)} sent but flag update failed: ${updErr.message}`);
    } else {
      console.log(`  ✓ ${biz.business_name.padEnd(45)} → ${result.data?.id ?? "(no id)"}`);
    }
    await new Promise((r) => setTimeout(r, 600));
  } catch (err) {
    console.log(`  ✗ ${biz.business_name.padEnd(45)} ${err instanceof Error ? err.message : String(err)}`);
  }
}

main();
