/**
 * scripts/send-claim-invite-it.ts
 *
 * Sends the Italian claim invitation to unclaimed businesses whose listings
 * are at Italian resorts.
 *
 *   npx tsx scripts/send-claim-invite-it.ts                         # DRY RUN — lists recipients, sends nothing
 *   npx tsx scripts/send-claim-invite-it.ts --send                  # actually sends
 *   npx tsx scripts/send-claim-invite-it.ts --send --only a@b.it    # send to ONE of the real recipients
 *   npx tsx scripts/send-claim-invite-it.ts --preview-to me@x.com   # send yourself a copy, nobody else
 *   npx tsx scripts/send-claim-invite-it.ts --send --limit 10       # cap this run
 *
 * ⚠️ --only FILTERS THE REAL RECIPIENT LIST, so it matches nothing for an
 * address that is not one of the businesses. To post yourself a copy use
 * --preview-to: it sends exactly one email, to that address, built from the
 * top candidate's real data, and never touches the ledger.
 *
 * WHY THIS EXISTS. All 27 Italian businesses have had the English claim
 * invite, 7 the English first-applicant nudge and 5 the English
 * five-applicant nudge. None has claimed, while their listings took 187
 * applications in 30 days. Language is the cheapest untested explanation,
 * and this tests it on the warmest audience there is before any ad spend.
 *
 * Safety:
 *  - Dry-run by default; --send is the only thing that sends.
 *  - Skips businesses that are claimed, have no email, no claim token, or no
 *    live listing, plus obvious test accounts.
 *  - Records every send in a local ledger so a re-run never emails anyone
 *    twice. A local file rather than a new column: this is a one-off test on
 *    27 rows, and it is not worth a migration against a live table.
 *  - Sends sequentially with a delay.
 *
 * ⚠️ ONE DOMAIN, ONE REPUTATION. lib/outreach/pacing.ts caps the outreach
 * cron at 50 sends per rolling 23 hours for a reason — this domain carries a
 * 3.9% bounce history (migration 00104) and shares its reputation with every
 * transactional email the platform sends. This script does NOT share that
 * budget, so do not run it on a day the outreach drip has already gone out.
 */
import { config } from "dotenv";
config({ path: ".env.local" });

import { createClient } from "@supabase/supabase-js";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { sendClaimInviteItEmail } from "../lib/email/send";
import { SITE_ORIGIN } from "../lib/config/site";

const SEND = process.argv.includes("--send");
const onlyIdx = process.argv.indexOf("--only");
const ONLY = onlyIdx >= 0 ? process.argv[onlyIdx + 1]?.toLowerCase() : null;
const limitIdx = process.argv.indexOf("--limit");
const LIMIT = limitIdx >= 0 ? Number(process.argv[limitIdx + 1]) : Infinity;
const previewIdx = process.argv.indexOf("--preview-to");
const PREVIEW_TO = previewIdx >= 0 ? process.argv[previewIdx + 1] : null;

const TEST_PATTERN = /preview|test|example\.com|zz-/i;
const DELAY_MS = 1500;
const LEDGER = join(homedir(), ".mountain-connect", "claim-invite-it-sent.json");

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

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Missing Supabase env (NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY)");
  const db = createClient(url, key, { auth: { persistSession: false } });

  const { data: italianResorts, error: rErr } = await db
    .from("resorts")
    .select("id")
    .eq("country", "Italy");
  if (rErr) throw rErr;
  const resortIds = (italianResorts ?? []).map((r) => r.id as string);
  if (resortIds.length === 0) throw new Error("No Italian resorts found — refusing to continue");

  // Live Italian listings, with the business attached. One row per listing;
  // grouped into one email per BUSINESS below, because a business with six
  // roles should get one note, not six.
  const { data: jobs, error: jErr } = await db
    .from("job_posts")
    .select("id, title, created_at, business_id, business_profiles!inner(id, business_name, email, is_claimed, claim_token)")
    .eq("status", "active")
    .in("resort_id", resortIds);
  if (jErr) throw jErr;

  type Biz = {
    id: string;
    name: string;
    email: string;
    claimToken: string;
    titles: string[];
    jobIds: string[];
  };
  const byBusiness = new Map<string, Biz>();
  const skipped: string[] = [];

  for (const row of jobs ?? []) {
    const b = row.business_profiles as unknown as {
      id: string;
      business_name: string | null;
      email: string | null;
      is_claimed: boolean | null;
      claim_token: string | null;
    };
    if (!b) continue;
    if (b.is_claimed) continue;
    if (!b.email) { skipped.push(`${b.business_name ?? b.id}: no email`); continue; }
    if (!b.claim_token) { skipped.push(`${b.business_name ?? b.id}: no claim token`); continue; }
    if (TEST_PATTERN.test(b.email) || TEST_PATTERN.test(b.business_name ?? "")) {
      skipped.push(`${b.business_name ?? b.id}: looks like a test account`);
      continue;
    }
    const existing = byBusiness.get(b.id);
    if (existing) {
      existing.titles.push(row.title as string);
      existing.jobIds.push(row.id as string);
    } else {
      byBusiness.set(b.id, {
        id: b.id,
        name: b.business_name ?? "",
        email: b.email,
        claimToken: b.claim_token,
        titles: [row.title as string],
        jobIds: [row.id as string],
      });
    }
  }

  // Applications waiting on each business's listings. The count is the whole
  // argument of the email, so it is read now rather than carried from an
  // earlier query — it moves every day.
  const allJobIds = [...byBusiness.values()].flatMap((b) => b.jobIds);
  const applicantsByJob = new Map<string, number>();
  if (allJobIds.length) {
    const { data: eois, error: eErr } = await db
      .from("expressions_of_interest")
      .select("job_post_id")
      .in("job_post_id", allJobIds);
    if (eErr) throw eErr;
    for (const e of eois ?? []) {
      const k = e.job_post_id as string;
      applicantsByJob.set(k, (applicantsByJob.get(k) ?? 0) + 1);
    }
  }

  const ledger = loadLedger();
  let candidates = [...byBusiness.values()].map((b) => ({
    ...b,
    applicants: b.jobIds.reduce((n, id) => n + (applicantsByJob.get(id) ?? 0), 0),
  }));
  if (ONLY) candidates = candidates.filter((b) => b.email.toLowerCase() === ONLY);

  const alreadySent = candidates.filter((b) => ledger[b.id]);
  candidates = candidates.filter((b) => !ledger[b.id]);
  // Most applications first: the strongest version of this email goes out
  // while the subject line is still true.
  candidates.sort((a, b) => b.applicants - a.applicants);
  const batch = candidates.slice(0, LIMIT);

  // A copy for whoever is about to send this, before 27 strangers get it.
  // Real data, so the figures and the pluralisation are exercised, but it
  // never reaches a business and never records a send.
  if (PREVIEW_TO) {
    const top = candidates[0] ?? alreadySent[0];
    if (!top) throw new Error("No candidate to build a preview from");
    console.log(`\nPREVIEW — one email to ${PREVIEW_TO}, built from ${top.name}. No business is contacted.\n`);
    await sendClaimInviteItEmail({
      to: PREVIEW_TO,
      businessName: top.name,
      jobTitle: top.titles[0],
      listingCount: top.titles.length,
      applicantCount: top.applicants,
      claimUrl: `${SITE_ORIGIN}/claim/${top.claimToken}`,
      source: "Facebook",
    });
    console.log(`  sent to ${PREVIEW_TO}  (${top.applicants} applicants · ${top.titles.length} listings)`);
    console.log(`\nLedger untouched. Nothing sent to any business.\n`);
    return;
  }

  console.log(`\nItalian claim invite — ${SEND ? "SENDING" : "DRY RUN"}\n`);
  console.log(`unclaimed Italian businesses with a live listing   ${byBusiness.size}`);
  console.log(`already sent (local ledger)                        ${alreadySent.length}`);
  console.log(`skipped                                            ${skipped.length}`);
  console.log(`to send this run                                   ${batch.length}\n`);

  for (const s of skipped) console.log(`  skip  ${s}`);
  if (skipped.length) console.log("");

  let sent = 0;
  for (const b of batch) {
    const claimUrl = `${SITE_ORIGIN}/claim/${b.claimToken}`;
    const line = `${b.applicants} applicant(s) · ${b.titles.length} listing(s) · ${b.name} <${b.email}>`;
    if (!SEND) {
      console.log(`  would send  ${line}`);
      continue;
    }
    try {
      await sendClaimInviteItEmail({
        to: b.email,
        businessName: b.name,
        jobTitle: b.titles[0],
        listingCount: b.titles.length,
        applicantCount: b.applicants,
        claimUrl,
        source: "Facebook",
      });
      ledger[b.id] = new Date().toISOString();
      saveLedger(ledger);
      sent++;
      console.log(`  sent        ${line}`);
    } catch (err) {
      console.error(`  FAILED      ${line}`, err);
    }
    await new Promise((r) => setTimeout(r, DELAY_MS));
  }

  if (SEND) {
    console.log(`\n${sent} sent. Ledger: ${LEDGER}\n`);
  } else {
    console.log(`\nNothing sent. Re-run with --send to actually send.\n`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
