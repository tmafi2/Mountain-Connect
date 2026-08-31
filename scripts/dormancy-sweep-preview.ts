import { config } from "dotenv";
config({ path: ".env.local" });
import { createClient } from "@supabase/supabase-js";

/**
 * npm run preview:dormancy [-- --days N]
 *
 * Runs the dormancy sweep's real queries against production and prints what
 * it WOULD do. Read-only: nothing is written, nothing is sent.
 *
 * This exists because the sweep is invisible until it acts, and it spent its
 * whole life silently doing nothing — CRON_SECRET was unset, so every
 * scheduled invocation was rejected with a 401. "It sent no emails" and "it
 * was never invoked" look identical from the outside. This tells them apart:
 * if the sweep is running and this says zero, zero is the right answer.
 *
 * --days N looks ahead, which matters because an empty result today is
 * usually just "nobody is due yet" rather than anything being broken.
 */
const FIRST_WARNING_DAYS = 14;
const FINAL_AFTER_DAYS = 7;
const TAKEDOWN_AFTER_DAYS = 7;
const DAY = 86_400_000;

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) { console.error("Missing SUPABASE env vars in .env.local"); process.exit(1); }

  const i = process.argv.indexOf("--days");
  const offset = i >= 0 ? Number(process.argv[i + 1]) : 0;
  if (!Number.isFinite(offset)) { console.error("--days needs a number"); process.exit(1); }

  const admin = createClient(url, key, { auth: { persistSession: false } });

  // Model the hour the cron ACTUALLY runs, not the hour you happen to run
  // this. Eligibility is "created_at + 14 days", so a business imported at
  // 10:00 is not due at 02:00 on the fourteenth day but is by 09:00 on the
  // fifteenth. Simulating wall-clock time reports zero on a day the sweep
  // will genuinely send, which is exactly the false negative this script is
  // supposed to rule out.
  const CRON_HOUR_UTC = 9;
  const target = new Date(Date.now() + offset * DAY);
  target.setUTCHours(CRON_HOUR_UTC, 0, 0, 0);
  const asOf = target.getTime();

  console.log(
    `as of ${new Date(asOf).toISOString().slice(0, 16).replace("T", " ")} UTC (the 09:00 sweep)` +
    (offset ? `  (${offset > 0 ? "+" : ""}${offset} days)` : "  (today)") +
    `   cadence ${FIRST_WARNING_DAYS} → +${FINAL_AFTER_DAYS} → +${TAKEDOWN_AFTER_DAYS}`
  );
  console.log("READ ONLY — nothing is written, nothing is sent.\n");

  // Pass 1 — first warning. Only businesses with a LIVE listing qualify.
  const { data: warn } = await admin
    .from("business_profiles")
    .select("business_name, email, created_at, job_posts!inner(id)")
    .eq("is_claimed", false)
    .is("dormancy_warning_sent_at", null)
    .lte("created_at", new Date(asOf - FIRST_WARNING_DAYS * DAY).toISOString())
    .eq("job_posts.status", "active");

  const seen = new Set<string>();
  const warnRows = (warn ?? []).filter((b) => {
    const k = b.business_name as string;
    if (seen.has(k)) return false;
    seen.add(k); return true;
  });

  console.log(`PASS 1 — first warning ("removed in two weeks"): ${warnRows.length}`);
  for (const b of warnRows.slice(0, 25)) {
    const age = Math.floor((asOf - new Date(b.created_at as string).getTime()) / DAY);
    console.log(`   ${String(b.business_name).slice(0, 40).padEnd(42)} ${String(b.email).slice(0, 34).padEnd(36)} ${age}d`);
  }
  if (warnRows.length > 25) console.log(`   … and ${warnRows.length - 25} more`);

  // Pass 2 — final notice, timed from the first warning.
  const { data: final } = await admin
    .from("business_profiles")
    .select("business_name, email, dormancy_warning_sent_at")
    .eq("is_claimed", false)
    .not("dormancy_warning_sent_at", "is", null)
    .is("dormancy_final_sent_at", null)
    .lte("dormancy_warning_sent_at", new Date(asOf - FINAL_AFTER_DAYS * DAY).toISOString());
  console.log(`\nPASS 2 — final notice: ${(final ?? []).length}`);
  for (const b of final ?? []) console.log(`   ${b.business_name}  ${b.email}`);

  // Pass 3 — takedown, timed from the final notice.
  const { data: down } = await admin
    .from("business_profiles")
    .select("business_name")
    .eq("is_claimed", false)
    .not("dormancy_final_sent_at", "is", null)
    .lte("dormancy_final_sent_at", new Date(asOf - TAKEDOWN_AFTER_DAYS * DAY).toISOString());
  console.log(`\nPASS 3 — listings taken down: ${(down ?? []).length}`);
  for (const b of down ?? []) console.log(`   ${b.business_name}`);

  if (!warnRows.length && !(final ?? []).length && !(down ?? []).length) {
    console.log("\nNothing due at this date. Try --days 2 to see the next wave.");
  }
}
main().catch((e) => { console.error(e); process.exit(1); });
