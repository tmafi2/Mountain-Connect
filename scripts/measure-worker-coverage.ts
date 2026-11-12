/**
 * What the admin's worker filters can actually see.
 *
 *   npx tsx scripts/measure-worker-coverage.ts
 *
 * Read-only. Runs the SAME functions the admin page runs — lib/workers/
 * industry.ts and lib/workers/country.ts — over every production worker
 * profile, and prints the coverage each filter has.
 *
 * ⚠️ IT EXISTS BECAUSE THE COVERAGE IS LOW AND THE PAGE SAYS SO OUT LOUD.
 * /admin/workers prints lines like "208 of 401 workers list where they can
 * work". Those are not literals typed into the JSX — the page computes them
 * from the rows it loaded, for the same reason /about's "69 Ski Resorts"
 * went stale for five months. This script is how you check the figures a
 * commit message or a conversation quotes, without opening the admin.
 *
 * ⚠️ `countriesEligible` IS NOT "the column mentions Canada". It asks
 * resolveEligibilityFor, so an expired visa, an explicit no_visa and a
 * country added with no status picked are all counted as LISTED but not
 * ELIGIBLE. The gap between those two numbers is the point of the report.
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { industriesWorked, industriesWanted } from "../lib/workers/industry";
import {
  countriesEligible,
  countriesListed,
  countriesWanted,
  unplaceableWanted,
} from "../lib/workers/country";

for (const line of readFileSync(".env.local", "utf8").split("\n")) {
  const m = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
}
for (const name of ["NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"]) {
  if (!process.env[name]?.trim()) {
    // Names only; no value is ever printed.
    console.error(`Missing ${name} in .env.local`);
    process.exit(1);
  }
}

const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
  auth: { persistSession: false },
});

/** Paged — the project's selects are silently capped at 1000 rows. */
async function allProfiles() {
  const rows: Record<string, unknown>[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await db
      .from("worker_profiles")
      .select("id, work_history, preferred_job_types, work_authorizations, preferred_countries, visa_status, visa_expiry_date, work_eligible_countries")
      .order("created_at", { ascending: false })
      .range(from, from + 999);
    if (error) throw new Error(error.message);
    rows.push(...(data ?? []));
    if (!data || data.length < 1000) return rows;
  }
}

function tally(lists: string[][]) {
  const counts = new Map<string, number>();
  for (const list of lists) for (const v of list) counts.set(v, (counts.get(v) ?? 0) + 1);
  return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
}

function report(label: string, lists: string[][], total: number) {
  const withAny = lists.filter((l) => l.length > 0).length;
  const pct = ((withAny / total) * 100).toFixed(0);
  console.log(`\n${label}: ${withAny} of ${total} workers (${pct}%)`);
  for (const [v, n] of tally(lists)) console.log(`   ${String(n).padStart(4)}  ${v}`);
}

(async () => {
  const profiles = await allProfiles();
  const total = profiles.length;
  console.log(`${total} worker profiles`);

  report("Has worked (industry)", profiles.map((p) => industriesWorked(p.work_history)), total);
  report("Looking for (industry)", profiles.map((p) => industriesWanted(p.preferred_job_types)), total);

  const eligible = profiles.map((p) => countriesEligible(p));
  const listed = profiles.map((p) => countriesListed(p));
  report("Eligible to work in (country)", eligible, total);

  // The gap this script exists to show.
  const listedOnly = profiles.filter((_, i) => listed[i].length > 0 && eligible[i].length === 0).length;
  const anyListed = listed.filter((l) => l.length > 0).length;
  console.log(
    `\n   ${anyListed} workers list a country; ${listedOnly} of them have NO eligible country` +
      ` (expired visa, needs sponsorship, or no status picked)`,
  );

  report("Wants to work in (country)", profiles.map((p) => countriesWanted(p.preferred_countries)), total);
  const unplaceable = profiles.reduce((n, p) => n + unplaceableWanted(p.preferred_countries), 0);
  const unplaceableWorkers = profiles.filter((p) => unplaceableWanted(p.preferred_countries) > 0).length;
  console.log(`\n   ${unplaceable} stated preferences on ${unplaceableWorkers} workers could not be placed on a country`);
})().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
