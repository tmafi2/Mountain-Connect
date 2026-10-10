/**
 * Guards the 1000-row rule across every public read, rather than in the one
 * file where it was first noticed.
 *
 * This project sets PostgREST's db-max-rows and it is silent: a 1377-row
 * table answers with 1000 rows, no error and no truncation flag. Measured
 * against production on 2026-10-10. So an unbounded select is not a bug today
 * — it is a bug that arrives later, with no symptom, on a page that still
 * looks fine.
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fetchAllRows, PAGE_SIZE } from "./fetch-all";

/* ── the helper itself ───────────────────────────────────────────────── */

test("a short page ends the read", async () => {
  const calls: Array<[number, number]> = [];
  const rows = await fetchAllRows<number>(async (from, to) => {
    calls.push([from, to]);
    return { data: [1, 2, 3], error: null };
  }, "test");
  assert.deepEqual(rows, [1, 2, 3]);
  assert.equal(calls.length, 1, "a page shorter than the cap cannot have more behind it");
});

test("a full page is followed by another request", async () => {
  // The exact case the cap creates: 1000 rows back is indistinguishable from
  // "a 1000-row table" until you ask again.
  const pages = [Array.from({ length: PAGE_SIZE }, (_, i) => i), [1, 2]];
  const seen: Array<[number, number]> = [];
  let n = 0;
  const rows = await fetchAllRows<number>(async (from, to) => {
    seen.push([from, to]);
    return { data: pages[n++] ?? [], error: null };
  }, "test");
  assert.equal(rows.length, PAGE_SIZE + 2);
  assert.deepEqual(seen, [[0, 999], [1000, 1999]]);
});

test("an empty table is one request and no rows", async () => {
  let n = 0;
  const rows = await fetchAllRows<number>(async () => (n++, { data: [], error: null }), "test");
  assert.deepEqual(rows, []);
  assert.equal(n, 1);
});

test("an error throws rather than returning a short list", async () => {
  // A partial read that looks like a small table is the whole problem.
  await assert.rejects(
    () => fetchAllRows<number>(async () => ({ data: null, error: { message: "boom" } }), "sitemap"),
    /sitemap: boom/
  );
});

test("a non-progressing read is refused rather than looped forever", async () => {
  await assert.rejects(
    () => fetchAllRows<number>(async () => ({ data: Array(PAGE_SIZE).fill(0), error: null }), "runaway"),
    /refusing to loop/
  );
});

/* ── and nothing public reads rows unbounded ─────────────────────────── */

/**
 * The reads a visitor's page depends on. Each one either pages, counts with a
 * head count, or asks for an explicit `.limit(n)` — the three honest options.
 * A plain `.select(...).eq(...)` with none of them is the silent one.
 */
const WRITE_PATHS = [
  "lib/jobs/expiry-sweep.ts",
  "lib/outreach/suppression.ts",
  "app/api/cron/outreach-drip/route.ts",
  "app/api/cron/unclaimed-dormancy-sweep/route.ts",
  "app/api/cron/publish-scheduled/route.ts",
  "app/api/admin/outreach/leads/route.ts",
  "app/api/admin/outreach/leads/bulk-send/route.ts",
];

const PUBLIC_READS = [
  "app/sitemap.ts",
  "app/(public)/jobs/page.tsx",
  "app/(public)/ski-resort-jobs/page.tsx",
  "app/(public)/ski-resort-jobs/[country]/page.tsx",
  "lib/stats/platform-stats.server.ts",
  "lib/stats/country-job-stats.ts",
  "lib/jobs/live-countries.ts",
];

test("every public read of a growing table is paged, counted or limited", () => {
  const offenders: string[] = [];
  for (const file of PUBLIC_READS) {
    const src = readFileSync(join(process.cwd(), file), "utf8");
    const code = src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
    for (const m of code.matchAll(/\.from\("(job_posts|business_profiles|nearby_towns|blog_posts|resorts)"\)([\s\S]{0,700}?);/g)) {
      const [, table, chain] = m;
      if (!chain.includes(".select(")) continue;
      const bounded =
        chain.includes(".range(") ||
        chain.includes("head: true") ||
        chain.includes(".limit(") ||
        chain.includes(".single()") ||
        chain.includes(".maybeSingle()");
      if (!bounded) offenders.push(`${file} → ${table}`);
    }
  }
  assert.deepEqual(
    offenders,
    [],
    `these stop at 1000 rows with no error:\n  ${offenders.join("\n  ")}`
  );
});

/**
 * The write paths matter more than the pages, because a capped read here does
 * not show a wrong number — it skips rows, and then something acts on what is
 * left as though it were everything:
 *
 *   - the expiry sweep never warns a post, so it never expires
 *   - the dormancy sweep cannot see who applied, so it takes down a listing
 *     somebody wanted
 *   - the drip sees no prior send for a lead and emails them AGAIN
 *   - the suppression list comes back short, so people who unsubscribed are
 *     emailed anyway
 *
 * `outreach_sends` is the one to watch: it gains a row per EMAIL rather than
 * per lead (631 on 2026-10-10, up to 50/day), so it reaches the cap first.
 */
test("every cron and sweep read is paged, counted or limited", () => {
  const offenders: string[] = [];
  for (const file of WRITE_PATHS) {
    const src = readFileSync(join(process.cwd(), file), "utf8");
    const code = src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
    for (const m of code.matchAll(
      /\.from\("(job_posts|business_profiles|outreach_leads|outreach_sends|expressions_of_interest|blog_posts)"\)([\s\S]{0,900}?);/g
    )) {
      const [, table, chain] = m;
      if (!chain.includes(".select(")) continue;
      if (chain.includes(".insert(") || chain.includes(".update(") || chain.includes(".delete(")) continue;
      const bounded =
        chain.includes(".range(") ||
        chain.includes("head: true") ||
        chain.includes(".limit(") ||
        chain.includes(".single()") ||
        chain.includes(".maybeSingle()");
      if (!bounded) offenders.push(`${file} → ${table}`);
    }
  }
  assert.deepEqual(offenders, [], `these skip rows past 1000 with no error:\n  ${offenders.join("\n  ")}`);
});
