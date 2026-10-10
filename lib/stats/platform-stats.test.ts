import { test } from "node:test";
import assert from "node:assert/strict";
import { formatStat, EMPTY_STATS } from "./platform-stats";

test("a real count is shown plainly", () => {
  assert.equal(formatStat(111), "111");
  assert.equal(formatStat(1), "1");
});

test("a four-figure count stays readable", () => {
  assert.equal(formatStat(1234), "1,234");
});

/**
 * The rule that matters: an unavailable count must never render as a number.
 * Showing "0 resorts", or quietly falling back to a remembered figure, is how
 * "69" survived on the live page for five months.
 */
test("a missing count renders as a dash, not as zero and not as a guess", () => {
  assert.equal(formatStat(0), "—");
  assert.equal(formatStat(-1), "—");
  for (const v of Object.values(EMPTY_STATS)) assert.equal(formatStat(v), "—");
});

/* ── The counters must be in the server HTML ─────────────────────────── */

import { readFileSync } from "node:fs";
import { join } from "node:path";

/** Read a repo file relative to the project root. */
function source(relative: string): string {
  return readFileSync(join(process.cwd(), relative), "utf8");
}

/**
 * The home page stats bar rendered `0` for every counter in its server HTML,
 * because AnimatedCounter opened at zero and only reached the real figure on
 * a client effect. The numbers were queried correctly and thrown away in the
 * render, so the busiest page on the site told crawlers and AI answer
 * engines the platform had zero resorts in zero countries.
 *
 * Nothing about that is visible to a human looking at the page, which is why
 * it survived — and why it needs a test rather than a reader.
 */
test("the animated counter starts at its true value, never at zero", () => {
  const src = source("app/(public)/home/AnimatedCounter.tsx");
  const code = src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
  assert.match(
    code,
    /useState\(\s*target\s*\)/,
    "useState(0) puts a zero in the server html where the real count belongs"
  );
  assert.ok(
    !/useState\(\s*0\s*\)/.test(code),
    "the first render is what a crawler reads — it must carry the number"
  );
});

/**
 * Every page that reads these counts has to be dynamic. `revalidate` alone
 * still prerenders at build time, where Vercel withholds the Sensitive
 * Supabase keys, so the queries fail and the page ships with "—" baked in.
 * That is exactly how sitemap.xml lost its job and business urls.
 */
test("pages that quote platform stats are force-dynamic", () => {
  const pages = [
    "app/(public)/page.tsx",
    "app/(public)/about/page.tsx",
    "app/(public)/login/page.tsx",
  ];
  for (const page of pages) {
    assert.match(
      source(page),
      /export const dynamic = "force-dynamic"/,
      `${page} reads platform stats, so it must opt out of build-time prerender`
    );
  }
});

/**
 * A cached count that failed is worse than an uncached one: `unstable_cache`
 * stores what the function RETURNS, so returning zeros on error would pin
 * "—" across the site for the full hour. Throwing is not cached.
 */
test("the stats query throws on failure rather than caching zeros", () => {
  const src = source("lib/stats/platform-stats.server.ts");
  assert.match(src, /throw new Error\(/, "a failed query must not be a cacheable value");
  assert.match(src, /unstable_cache/);
  assert.match(src, /revalidate: TTL_SECONDS/);
});

/**
 * This project caps every PostgREST select at 1000 rows, silently: a 1377-row
 * table answers with 1000 rows, no error and no truncation flag. Measured
 * against production on 2026-10-10, along with the two ways out — a head
 * count returns the true 1377, and .range() pages past the cap.
 *
 * So `rows.length` is not a count here. It is a count that goes wrong with no
 * symptom the moment a table crosses the line, which is this module's whole
 * reason for existing. Nothing is near the cap today (111 resorts, 341 live
 * jobs, 243 businesses), so this guards a number that is currently right.
 */
test("counts come from head counts or paged reads, never from one capped select", () => {
  const src = source("lib/stats/platform-stats.server.ts");
  const code = src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

  assert.match(code, /count: "exact" as const, head: true/, "pure counts belong in a head count");
  assert.match(code, /\.range\(from, to\)/, "row reads must page");

  // Every select that is NOT a head count and NOT inside the paging helper
  // would be a single capped read.
  const selects = [...code.matchAll(/\.select\(([^)]*)\)/g)].map((m) => m[1]);
  const unguarded = selects.filter((args) => !args.includes("head") && !args.includes("country") && !args.includes("resort_id"));
  assert.deepEqual(unguarded, [], `these selects read rows without a head count or paging: ${unguarded.join(", ")}`);
});
