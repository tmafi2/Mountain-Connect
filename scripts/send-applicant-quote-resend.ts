/**
 * scripts/send-applicant-quote-resend.ts
 *
 * A one-off second email to unclaimed businesses that have applications
 * waiting — this time showing them what an applicant actually wrote.
 *
 *   npx tsx scripts/send-applicant-quote-resend.ts                    # DRY RUN
 *   npx tsx scripts/send-applicant-quote-resend.ts --send
 *   npx tsx scripts/send-applicant-quote-resend.ts --preview-to me@x.com
 *   npx tsx scripts/send-applicant-quote-resend.ts --send --limit 10
 *
 * ⚠️ QUOTE-ONLY, AND THAT IS THE WHOLE JUSTIFICATION. Every business this
 * could reach has ALREADY had an applicant email — first_applicant_email_sent_at
 * is set on all 51 of them — and none claimed. So this is a second cold email
 * to an address that ignored the first one, and the only thing that makes it
 * worth sending is that it carries something the first one did not: the
 * applicant's own words. A business whose letters all fail the sanitiser
 * would receive a near-identical repeat, so it is skipped rather than sent a
 * weaker version.
 *
 * ⚠️ ITALY IS EXCLUDED by default. Those 27 were emailed on 2026-11-09 and a
 * second email days later reads as pressure. Pass --include-italy once enough
 * time has passed.
 *
 * ⚠️ IT DOES NOT TOUCH THE CADENCE FLAGS. first_applicant_email_sent_at and
 * eoi_nudge_sent_at stay exactly as they are. Clearing them to "allow" a
 * re-send would re-arm the automatic cadence and destroy the record of what
 * was sent when; this keeps its own ledger instead.
 *
 * ⚠️ ONE DOMAIN, ONE REPUTATION. lib/outreach/pacing.ts caps the outreach
 * cron at 50 sends per rolling 23 hours because this domain carries a 3.9%
 * bounce history (00104) and shares its reputation with every transactional
 * email the platform sends. This script does not share that budget, so do not
 * run it on a day the outreach drip has already gone out.
 */
import { config } from "dotenv";
config({ path: ".env.local" });

import { createClient } from "@supabase/supabase-js";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { sendEoiThresholdNudgeEmail, sendFirstApplicantNudgeEmail } from "../lib/email/send";
import { coverLetterExcerpt } from "../lib/email/cover-letter-excerpt";
import { hasUnsubscribed } from "../lib/outreach/suppression";
import { SITE_ORIGIN } from "../lib/config/site";

const SEND = process.argv.includes("--send");
const INCLUDE_ITALY = process.argv.includes("--include-italy");
const previewIdx = process.argv.indexOf("--preview-to");
const PREVIEW_TO = previewIdx >= 0 ? process.argv[previewIdx + 1] : null;
const limitIdx = process.argv.indexOf("--limit");
const LIMIT = limitIdx >= 0 ? Number(process.argv[limitIdx + 1]) : Infinity;

/** Same cutoff the live cadence uses to pick between the two emails. */
const THRESHOLD = 5;
const DELAY_MS = 1500;
const TEST_PATTERN = /preview|test|example\.com|zz-/i;
const LEDGER = join(homedir(), ".mountain-connect", "applicant-quote-resend.json");

function loadLedger(): Record<string, string> {
  try {
    return JSON.parse(readFileSync(LEDGER, "utf8")) as Record<string, string>;
  } catch {
    return {};
  }
}
function saveLedger(l: Record<string, string>) {
  mkdirSync(dirname(LEDGER), { recursive: true });
  writeFileSync(LEDGER, JSON.stringify(l, null, 2));
}

interface Target {
  id: string;
  name: string;
  email: string;
  token: string;
  country: string;
  jobTitle: string;
  apps: number;
  quote: string;
}

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Missing Supabase env");
  const db = createClient(url, key, { auth: { persistSession: false } });

  const { data: jobs, error: jErr } = await db
    .from("job_posts")
    .select(
      "id, title, created_at, resorts!inner(country), business_profiles!inner(id, business_name, email, is_claimed, claim_token)",
    )
    .eq("status", "active");
  if (jErr) throw jErr;

  const byBiz = new Map<string, Omit<Target, "quote" | "apps"> & { apps: number; quote?: string }>();
  const jobToBiz = new Map<string, string>();
  for (const j of jobs ?? []) {
    const b = j.business_profiles as unknown as {
      id: string; business_name: string | null; email: string | null;
      is_claimed: boolean | null; claim_token: string | null;
    };
    const r = j.resorts as unknown as { country: string };
    if (!b || b.is_claimed || !b.email || !b.claim_token) continue;
    if (TEST_PATTERN.test(b.email) || TEST_PATTERN.test(b.business_name ?? "")) continue;
    if (!byBiz.has(b.id)) {
      byBiz.set(b.id, {
        id: b.id, name: b.business_name ?? "", email: b.email, token: b.claim_token,
        country: r?.country ?? "", jobTitle: j.title as string, apps: 0,
      });
    }
    jobToBiz.set(j.id as string, b.id);
  }

  // All applications, newest first. Fetched whole rather than filtered by a
  // few hundred job ids — that `in(...)` builds a URL long enough to fail
  // quietly, which is how an earlier version of this count came back zero.
  const { data: eois, error: eErr } = await db
    .from("expressions_of_interest")
    .select("job_post_id, message, share_with_employer, created_at")
    .order("created_at", { ascending: false });
  if (eErr) throw eErr;

  for (const e of eois ?? []) {
    const bid = jobToBiz.get(e.job_post_id as string);
    if (!bid) continue;
    const b = byBiz.get(bid)!;
    b.apps++;
    if (!b.quote) {
      const q = coverLetterExcerpt({
        message: e.message as string | null,
        consent: e.share_with_employer as boolean | null,
      });
      if (q) b.quote = q;
    }
  }

  const ledger = loadLedger();
  const skipped: string[] = [];
  const targets: Target[] = [];

  for (const b of byBiz.values()) {
    if (b.apps === 0) continue;
    if (!INCLUDE_ITALY && b.country === "Italy") {
      skipped.push(`${b.name}: Italy, emailed 2026-11-09 (use --include-italy)`);
      continue;
    }
    if (!b.quote) {
      skipped.push(`${b.name}: ${b.apps} application(s) but none quotable — would repeat the last email`);
      continue;
    }
    if (ledger[b.id]) {
      skipped.push(`${b.name}: already sent ${ledger[b.id].slice(0, 10)}`);
      continue;
    }
    if (await hasUnsubscribed(db, b.email)) {
      skipped.push(`${b.name}: unsubscribed`);
      continue;
    }
    targets.push(b as Target);
  }

  targets.sort((a, b) => b.apps - a.apps);

  if (PREVIEW_TO) {
    const shapes = [targets.find((t) => t.apps >= THRESHOLD), targets.find((t) => t.apps < THRESHOLD)]
      .filter((t, i, a): t is Target => Boolean(t) && a.indexOf(t) === i);
    if (!shapes.length) throw new Error("No target to build a preview from");
    console.log(`\nPREVIEW — ${shapes.length} email(s) to ${PREVIEW_TO}. No business is contacted.\n`);
    for (const t of shapes) {
      await sendOne({ ...t, email: PREVIEW_TO });
      console.log(`  sent  ${t.apps} application(s) · as ${t.name} (${t.country})`);
      await new Promise((r) => setTimeout(r, DELAY_MS));
    }
    console.log("\nLedger untouched. Nothing sent to any business.\n");
    return;
  }

  const batch = targets.slice(0, LIMIT);
  console.log(`\nApplicant-quote re-send — ${SEND ? "SENDING" : "DRY RUN"}\n`);
  console.log(`unclaimed businesses with applications   ${[...byBiz.values()].filter((b) => b.apps > 0).length}`);
  console.log(`skipped                                  ${skipped.length}`);
  console.log(`to send this run                         ${batch.length}\n`);
  for (const s of skipped) console.log(`  skip  ${s}`);
  if (skipped.length) console.log("");

  let sent = 0;
  for (const t of batch) {
    const line = `${t.apps} application(s) · ${t.country} · ${t.name}`;
    if (!SEND) {
      console.log(`  would send  ${line}`);
      continue;
    }
    try {
      await sendOne(t);
      ledger[t.id] = new Date().toISOString();
      saveLedger(ledger);
      sent++;
      console.log(`  sent        ${line}`);
    } catch (err) {
      console.error(`  FAILED      ${line}`, err);
    }
    await new Promise((r) => setTimeout(r, DELAY_MS));
  }
  console.log(SEND ? `\n${sent} sent. Ledger: ${LEDGER}\n` : `\nNothing sent. Re-run with --send.\n`);
}

/** Threshold copy above five, first-applicant copy below — as the live cadence does. */
async function sendOne(t: Target) {
  const claimUrl = `${SITE_ORIGIN}/claim/${t.token}`;
  if (t.apps >= THRESHOLD) {
    return sendEoiThresholdNudgeEmail({
      to: t.email, businessName: t.name, jobTitle: t.jobTitle,
      eoiCount: t.apps, claimUrl, coverLetterExcerpt: t.quote,
    });
  }
  return sendFirstApplicantNudgeEmail({
    to: t.email, businessName: t.name, jobTitle: t.jobTitle,
    claimUrl, coverLetterExcerpt: t.quote,
  });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
