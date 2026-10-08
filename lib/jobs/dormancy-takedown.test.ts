/**
 * Guards the unclaimed-dormancy takedown against writing a status the
 * database refuses.
 *
 * THE BUG THIS EXISTS FOR: the sweep ended its cadence with
 * `.update({ status: "inactive" })`, and the job_posts status CHECK allows
 * only active/paused/closed/draft. Every takedown was rejected by Postgres,
 * the error went onto result.errors — a response body nothing reads — and the
 * feature never worked once. It surfaced only when 94 businesses were found
 * past their takedown date with all 210 listings still live, the oldest 23
 * days overdue.
 *
 * TypeScript cannot catch this: "inactive" is a perfectly good string. So the
 * route's source is read and checked against the constraint directly.
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { BILLING_PAUSE_REASONS } from "@/lib/billing/job-parking";

const ROUTE = join(process.cwd(), "app/api/cron/unclaimed-dormancy-sweep/route.ts");
const src = readFileSync(ROUTE, "utf8");

/** Mirrors the job_posts status CHECK. Change both together or neither. */
const LEGAL_STATUSES = ["active", "paused", "closed", "draft"];

test("the sweep writes only a status the CHECK constraint allows", () => {
  const written = [...src.matchAll(/\.update\(\s*\{[^}]*status:\s*"([^"]+)"/g)].map((m) => m[1]);
  assert.ok(written.length > 0, "found no status update in the route — has it moved?");
  for (const s of written) {
    assert.ok(
      LEGAL_STATUSES.includes(s),
      `the sweep writes status="${s}", which the job_posts CHECK rejects (allows ${LEGAL_STATUSES.join("/")})`,
    );
  }
});

test("the takedown's pause reason is not a billing one", () => {
  const reasons = [...src.matchAll(/paused_reason:\s*"([^"]+)"/g)].map((m) => m[1]);
  assert.ok(reasons.length > 0, "the takedown must record WHY it paused a listing");
  for (const r of reasons) {
    assert.ok(
      !(BILLING_PAUSE_REASONS as string[]).includes(r),
      `paused_reason="${r}" is a billing reason, so restoreParkedJobs would republish a dormant unclaimed listing on any upgrade`,
    );
  }
});

test("the off-switch does not depend on .limit(0)", () => {
  // PostgREST does not reliably treat a zero limit as "no rows", so a cap of 0
  // must skip the pass outright. If this guard is ever removed while the cap is
  // 0, the takedown would quietly start running again.
  assert.match(
    src,
    /TAKEDOWN_MAX_BUSINESSES_PER_RUN\s*>\s*0/,
    "a cap of 0 must be checked explicitly, not handed to .limit()",
  );
  assert.match(
    src,
    /!takedownEnabled/,
    "the takedown list must be emptied when the pass is disabled",
  );
});

test("the takedown is capped per run, so a backlog cannot discharge at once", () => {
  assert.match(
    src,
    /TAKEDOWN_MAX_BUSINESSES_PER_RUN\s*=\s*\d+/,
    "the per-run cap constant is gone",
  );
  assert.match(
    src,
    /\.limit\(TAKEDOWN_MAX_BUSINESSES_PER_RUN\)/,
    "the cap is defined but not applied to the takedown query",
  );
  assert.match(
    src,
    /\.order\("dormancy_final_sent_at",\s*\{\s*ascending:\s*true\s*\}\)/,
    "a capped run must take the longest-overdue first, not an arbitrary slice",
  );
});

test("a takedown failure reaches the log, not just the response body", () => {
  assert.match(
    src,
    /console\.error\([^)]*takedown[^)]*failed/i,
    "an update failure must be logged; result.errors alone is what hid this bug",
  );
});
