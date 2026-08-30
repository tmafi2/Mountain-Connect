import { config } from "dotenv";
config({ path: ".env.local" });

import { createClient } from "@supabase/supabase-js";
import { planExpirySweep, describeSweep } from "../lib/jobs/expiry-sweep";
import { JOB_POST_LIFESPAN_DAYS, EXPIRY_WARNING_DAYS } from "../lib/jobs/expiry";

/**
 * npm run preview:expiry [-- --days N]
 *
 * Runs the real expiry sweep against production and prints the plan without
 * touching anything. Same shape as preview:dormancy.
 *
 * --days N runs the sweep as if it were N days from now, which is the only
 * way to see what the first real expiry wave looks like: every live post was
 * backfilled to the same date by migration 00093, so today the sweep
 * correctly selects nothing at all and proves very little on its own.
 */
async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error("Missing SUPABASE env vars in .env.local");
    process.exit(1);
  }

  const i = process.argv.indexOf("--days");
  const offsetDays = i >= 0 ? Number(process.argv[i + 1]) : 0;
  if (!Number.isFinite(offsetDays)) {
    console.error("--days needs a number");
    process.exit(1);
  }

  const admin = createClient(url, key, { auth: { persistSession: false } });
  const asOf = new Date(Date.now() + offsetDays * 86_400_000);

  console.log(
    `window ${JOB_POST_LIFESPAN_DAYS}d · warning ${EXPIRY_WARNING_DAYS}d out · ` +
      `as of ${asOf.toISOString().slice(0, 10)}` +
      (offsetDays ? ` (${offsetDays > 0 ? "+" : ""}${offsetDays} days from today)` : "")
  );
  console.log("READ ONLY — nothing is written.\n");

  const includeUnclaimed = process.argv.includes("--include-unclaimed");
  if (includeUnclaimed) {
    console.log("--include-unclaimed: scope filter OFF (diagnostic; the cron never does this)\n");
  }
  const report = await planExpirySweep(admin, asOf, "log_only", includeUnclaimed);
  console.log(describeSweep(report));

  if (report.counts.warn + report.counts.renew + report.counts.expire === 0) {
    console.log("\nnothing selected at this date.");
  }
  if (report.errors.length) process.exitCode = 1;
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
