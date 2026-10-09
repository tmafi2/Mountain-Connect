/**
 * Nothing may tell a worker, or a business, that a self-declared job has been
 * verified.
 *
 * WHAT WAS WRONG (fixed 2026-10-08): `work_history[].is_verified` was set to
 * true purely because the worker picked the company from our search box —
 * typing it freehand set it false. No employer confirmed anything, and
 * `verified_by_business_id` recorded whoever the WORKER selected, not anyone
 * who agreed. Four places then rendered a green tick and the word "Verified",
 * including the business-facing interview view, which is the worst possible
 * place for a trust signal backed by nothing: it sits in front of the person
 * deciding whether to hire.
 *
 * It had not bitten yet — 0 of 260 entries carried the flag — which is exactly
 * why it was worth fixing before badges were built on top of it.
 *
 * The flag still has a true meaning (the company matched a business on the
 * platform), so it is kept and labelled honestly rather than deleted.
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const FILES = [
  "app/(worker)/profile/edit/page.tsx",
  "app/(business)/business/interviews/[id]/page.tsx",
];

/** Source with every comment form removed, so only rendered text counts. */
function code(path: string): string {
  return readFileSync(join(process.cwd(), path), "utf8")
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, "")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");
}

test("no work-history view renders the word Verified", () => {
  for (const f of FILES) {
    // Standalone word only: isVerifiedBusiness and is_verified are fine as
    // identifiers, it is the rendered copy that lied.
    const hits = code(f).match(/(?<![\w_])Verified(?![\w_])/g) ?? [];
    assert.equal(
      hits.length,
      0,
      `${f} renders "Verified" on a self-declared job — no employer confirmed it`,
    );
  }
});

test("the green tick treatment is gone from these chips", () => {
  for (const f of FILES) {
    const src = code(f);
    // green-100/green-700 was the verified treatment; green elsewhere in these
    // files would be a new decision, so this is deliberately strict.
    assert.ok(
      !/bg-green-100[^"]*text-green-700|text-green-700[^"]*bg-green-100/.test(src),
      `${f} still uses the green "verified" chip treatment`,
    );
  }
});

test("the business search box does not call them verified businesses", () => {
  assert.ok(
    !/Search verified businesses/.test(code(FILES[0])),
    "most businesses on the platform are unclaimed imports and none is vetted by us",
  );
});
