import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { notExpiredOr } from "./expiry";

test("the clause keeps NULL expiry and excludes anything already past", () => {
  const now = new Date("2026-11-12T12:00:00.000Z");
  assert.equal(notExpiredOr(now), "expires_at.is.null,expires_at.gt.2026-11-12T12:00:00.000Z");
  // A row with no expiry date predates the expiry feature and is still live.
  assert.match(notExpiredOr(now), /expires_at\.is\.null/);
  // `gt`, never `gte`: a row expiring exactly now is gone, which is what
  // isExpired() in expired-gone.ts decides with `<= now`.
  assert.match(notExpiredOr(now), /expires_at\.gt\./);
  assert.ok(!/gte/.test(notExpiredOr(now)), "gte would keep a listing alive on the exact second it expires");
});

/**
 * ⚠️ THE REAL GUARD. The bug was never the clause — it was that the clause
 * was retyped in eight files and missed in three others, including the public
 * job board. This walks every module that reads job_posts publicly and fails
 * if one filters on status without also filtering on expiry.
 */
const PUBLIC_READERS = [
  "app/(public)/jobs/page.tsx",
  "app/sitemap.ts",
  "lib/jobs/live-countries.ts",
  "lib/stats/country-job-stats.ts",
  "lib/stats/pay-by-town.server.ts",
  "lib/stats/perks-by-resort.server.ts",
  "lib/stats/housing-by-resort.server.ts",
  "lib/stats/hiring-by-resort.server.ts",
  "lib/stats/platform-stats.server.ts",
  "lib/blog/live-figures.server.ts",
  "app/(public)/ski-resort-jobs/page.tsx",
  "app/(public)/ski-resort-jobs/[country]/page.tsx",
];

test("every public reader of job_posts filters on expiry, not just status", () => {
  for (const rel of PUBLIC_READERS) {
    const src = readFileSync(join(process.cwd(), rel), "utf8");
    assert.ok(
      /\.eq\(\s*["']status["']\s*,\s*["']active["']\s*\)/.test(src),
      `${rel} no longer filters on status — check this list is still right`,
    );
    assert.ok(
      /notExpiredOr\(/.test(src),
      `${rel} selects active job_posts without excluding expired ones. ` +
        `Middleware serves 410 for those, so this would count or list listings the site refuses to show.`,
    );
  }
});

test("nobody has retyped the clause instead of importing it", () => {
  // One definition, in lib/jobs/expiry.ts. Anything else is the eighth copy.
  const roots = ["lib", "app"];
  const offenders: string[] = [];
  const walk = (dir: string) => {
    for (const entry of readdirSync(join(process.cwd(), dir), { withFileTypes: true })) {
      const rel = join(dir, entry.name);
      if (entry.isDirectory()) { walk(rel); continue; }
      if (!/\.(ts|tsx)$/.test(entry.name)) continue;
      if (rel.endsWith(join("lib", "jobs", "expiry.ts"))) continue;
      // This file asserts the exact string it is policing.
      if (rel.endsWith(join("lib", "jobs", "not-expired.test.ts"))) continue;
      const src = readFileSync(join(process.cwd(), rel), "utf8");
      // The literal shape, ignoring comments that merely quote it.
      const code = src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
      if (/expires_at\.is\.null\s*,\s*expires_at\.gt\./.test(code)) offenders.push(rel);
    }
  };
  for (const r of roots) walk(r);
  assert.deepEqual(offenders, [], `the expiry clause is retyped here instead of imported from lib/jobs/expiry.ts`);
});
