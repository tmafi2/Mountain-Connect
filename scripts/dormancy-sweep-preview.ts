import { config } from "dotenv";
config({ path: ".env.local" });

import { createClient } from "@supabase/supabase-js";

const WARNING_AFTER_DAYS = 14;
const TAKEDOWN_GRACE_DAYS = 7;
const DAY_MS = 24 * 60 * 60 * 1000;

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error("Missing SUPABASE env vars in .env.local");
    process.exit(1);
  }

  const admin = createClient(url, key, { auth: { persistSession: false } });
  const now = Date.now();
  const warningCutoff = new Date(now - WARNING_AFTER_DAYS * DAY_MS).toISOString();
  const takedownCutoff = new Date(now - TAKEDOWN_GRACE_DAYS * DAY_MS).toISOString();

  console.log("=== Pass 1: would-send last-chance warnings ===");
  console.log(`  Criteria: is_claimed=false AND dormancy_warning_sent_at IS NULL AND created_at <= ${warningCutoff.slice(0, 10)}`);

  const { data: toWarn, error: warnErr } = await admin
    .from("business_profiles")
    .select("id, business_name, email, created_at")
    .eq("is_claimed", false)
    .is("dormancy_warning_sent_at", null)
    .lte("created_at", warningCutoff);

  if (warnErr) {
    console.error("  ERROR:", warnErr.message);
  } else {
    console.log(`  Matches: ${toWarn?.length ?? 0}`);
    for (const b of toWarn ?? []) {
      const ageDays = Math.floor((now - new Date(b.created_at).getTime()) / DAY_MS);
      console.log(`   - ${b.business_name.padEnd(40)} ${b.email ?? "(no email)"} — ${ageDays}d old`);
    }
  }

  console.log("");
  console.log("=== Pass 2: would-take-down listings ===");
  console.log(`  Criteria: is_claimed=false AND dormancy_warning_sent_at <= ${takedownCutoff.slice(0, 10)}`);

  const { data: toTakedown, error: tdErr } = await admin
    .from("business_profiles")
    .select("id, business_name, dormancy_warning_sent_at")
    .eq("is_claimed", false)
    .not("dormancy_warning_sent_at", "is", null)
    .lte("dormancy_warning_sent_at", takedownCutoff);

  if (tdErr) {
    console.error("  ERROR:", tdErr.message);
  } else {
    console.log(`  Matches: ${toTakedown?.length ?? 0}`);
    for (const b of toTakedown ?? []) {
      const warnAgo = Math.floor((now - new Date(b.dormancy_warning_sent_at).getTime()) / DAY_MS);
      console.log(`   - ${b.business_name.padEnd(40)} — warned ${warnAgo}d ago`);
    }
  }

  console.log("");
  console.log("=== Schema sanity check ===");
  const { data: cols, error: colErr } = await admin
    .from("business_profiles")
    .select("id, is_claimed, eoi_nudge_sent_at, dormancy_warning_sent_at")
    .limit(1);
  if (colErr) {
    console.error("  ERROR reading new columns:", colErr.message);
    console.error("  → The migration 00065 may not have run on prod.");
  } else {
    console.log("  Columns eoi_nudge_sent_at + dormancy_warning_sent_at exist ✓");
  }
}

main();
