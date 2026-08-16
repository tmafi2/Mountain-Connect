/**
 * scripts/send-paid-plans-announcement.ts
 *
 * Sends the one-off "paid plans are coming, here's your founding rate"
 * email to every pre-billing business (anyone with a courtesy window).
 *
 *   npx tsx scripts/send-paid-plans-announcement.ts            # DRY RUN — lists recipients, sends nothing
 *   npx tsx scripts/send-paid-plans-announcement.ts --send     # actually sends
 *   npx tsx scripts/send-paid-plans-announcement.ts --send --only you@example.com   # send to ONE address (test)
 *
 * Safety:
 *  - Dry-run by default.
 *  - Skips businesses with no email, and obvious test/preview accounts.
 *  - Records each send in business_profiles.paid_plans_notice_sent_at so a
 *    re-run never emails anyone twice. (Column added on first --send.)
 *  - Sends sequentially with a small delay to stay well inside Resend limits.
 */
import { config } from "dotenv";
config({ path: ".env.local" });

import { createClient } from "@supabase/supabase-js";
import { sendPaidPlansAnnouncementEmail } from "../lib/email/send";

const SEND = process.argv.includes("--send");
const onlyIdx = process.argv.indexOf("--only");
const ONLY = onlyIdx >= 0 ? process.argv[onlyIdx + 1]?.toLowerCase() : null;
const ORIGIN = process.env.NEXT_PUBLIC_BASE_URL || "https://www.mountainconnects.com";
const TEST_PATTERN = /preview|test|example\.com|zz-/i;


/**
 * Only greet by first name when full_name genuinely looks like a person.
 * Many business accounts store the business name in users.full_name (e.g.
 * "Aldo's Cafe"), which would render as "Hi Aldo's," — worse than "Hi team".
 * Rules: 2+ words, first word alphabetic, no business-y tokens, and the
 * first word isn't just the start of the business name.
 */
function personFirstName(fullName: string | null | undefined, businessName: string | null | undefined): string | undefined {
  if (!fullName) return undefined;
  const words = fullName.trim().split(/\s+/);
  if (words.length < 2) return undefined;
  const first = words[0];
  if (!/^[A-Za-z][a-z'\-]+$/.test(first)) return undefined;
  if (/\b(cafe|café|bar|hotel|lodge|hire|shop|services?|pty|ltd|inc|co|group|team|admin|info|sales|bookings|recruitment)\b/i.test(fullName)) return undefined;
  const biz = (businessName ?? "").toLowerCase();
  if (biz && biz.startsWith(first.toLowerCase())) return undefined;
  return first;
}

async function main() {
  const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false },
  });

  const { data: rows, error } = await db
    .from("business_profiles")
    .select("id, business_name, email, grace_period_ends_at, paid_plans_notice_sent_at, users:user_id(full_name)")
    .not("grace_period_ends_at", "is", null)
    .order("business_name");
  if (error) {
    if (/paid_plans_notice_sent_at/.test(error.message)) {
      console.error("Column paid_plans_notice_sent_at doesn't exist yet. Run migration 00083 first (supabase db push).");
      process.exit(1);
    }
    throw error;
  }

  type Row = {
    id: string; business_name: string | null; email: string | null;
    grace_period_ends_at: string; paid_plans_notice_sent_at: string | null;
    users: { full_name: string | null } | { full_name: string | null }[] | null;
  };
  const all = (rows ?? []) as unknown as Row[];

  const skipped: string[] = [];
  const targets = all.filter((b) => {
    const email = (b.email ?? "").trim().toLowerCase();
    if (!email) { skipped.push(`${b.business_name} — no email`); return false; }
    if (TEST_PATTERN.test(email) || TEST_PATTERN.test(b.business_name ?? "")) { skipped.push(`${b.business_name} — test/preview account`); return false; }
    if (b.paid_plans_notice_sent_at) { skipped.push(`${b.business_name} — already sent ${b.paid_plans_notice_sent_at.slice(0, 10)}`); return false; }
    if (ONLY && email !== ONLY) return false;
    return true;
  });

  console.log(`\n${SEND ? "SENDING" : "DRY RUN"} — paid-plans announcement${ONLY ? ` (only ${ONLY})` : ""}\n`);
  console.log(`${targets.length} recipient(s):`);
  for (const b of targets) {
    const u = Array.isArray(b.users) ? b.users[0] : b.users;
    const first = personFirstName(u?.full_name, b.business_name) ?? null;
    console.log(`  • ${(b.business_name ?? "?").padEnd(32)} ${b.email!.padEnd(38)} courtesy→${b.grace_period_ends_at.slice(0, 10)}  ${first ? `(Hi ${first})` : "(Hi team)"}`);
  }
  if (skipped.length) { console.log(`\n${skipped.length} skipped:`); for (const s of skipped) console.log(`  – ${s}`); }

  if (!SEND) { console.log(`\nDry run only. Re-run with --send to send.\n`); return; }

  let ok = 0, fail = 0;
  for (const b of targets) {
    const u = Array.isArray(b.users) ? b.users[0] : b.users;
    const first = personFirstName(u?.full_name, b.business_name);
    try {
      await sendPaidPlansAnnouncementEmail({
        to: b.email!,
        businessName: b.business_name ?? "there",
        contactPersonName: first,
        courtesyEndsAt: new Date(b.grace_period_ends_at),
        plansUrl: `${ORIGIN}/business/upgrade`,
        dashboardUrl: `${ORIGIN}/business/dashboard`,
      });
      await db.from("business_profiles").update({ paid_plans_notice_sent_at: new Date().toISOString() }).eq("id", b.id);
      ok++; console.log(`  ✓ sent → ${b.email}`);
    } catch (e) {
      fail++; console.log(`  ✗ FAILED → ${b.email}: ${e instanceof Error ? e.message : e}`);
    }
    await new Promise((r) => setTimeout(r, 400));
  }
  console.log(`\nDone: ${ok} sent, ${fail} failed.\n`);
}

main().catch((e) => { console.error(e); process.exit(1); });
