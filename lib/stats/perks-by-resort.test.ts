import { test } from "node:test";
import assert from "node:assert/strict";
import { MIN_LISTINGS } from "./figures";
import {
  canQuotePass, canQuoteMeals, passState, mealsState,
  publishablePerks, bestForPasses, totals, type ResortPerks,
} from "./perks-by-resort";

function resort(over: Partial<ResortPerks> = {}): ResortPerks {
  return {
    resort: "Niseko United", resortId: "3", country: "Japan", jobCount: 97,
    saysPass: 23, saysMeals: 23, saysBoth: 7, saysHousing: 59,
    pctSaysPass: 23.71, pctSaysMeals: 23.71, ...over,
  };
}

/**
 * ⚠️ THE RULE THIS WHOLE MODULE EXISTS FOR. `ski_pass_included` is
 * NOT NULL DEFAULT false and the importer omits it when the advert is silent,
 * so `false` cannot be told from "never mentioned" — 295 of 299 falses never
 * mention a pass at all. "16% say a pass is included" is true; "84% do not
 * include a pass" is not supported, and nothing here may return it.
 */
test("there is no way to ask this data for the inverse", () => {
  const r = resort();
  // The type carries no "without" field, and the states never imply one.
  assert.ok(!("pctWithout" in r));
  assert.ok(!("hasPass" in r));
  const keys = Object.keys(r);
  assert.deepEqual(keys.filter((k) => /without|lacks|missing|no[A-Z]/.test(k)), []);
});

test("a share is quoted only where enough listings actually say yes", () => {
  assert.equal(canQuotePass(resort({ saysPass: MIN_LISTINGS })), true);
  assert.equal(canQuotePass(resort({ saysPass: MIN_LISTINGS - 1 })), false);
  assert.equal(canQuoteMeals(resort({ saysMeals: 2 })), false);
});

test("a resort nobody mentions a pass at is 'none', not 'no pass'", () => {
  const s = passState(resort({ resort: "Revelstoke", jobCount: 25, saysPass: 0, pctSaysPass: 0 }));
  assert.deepEqual(s, { kind: "none", jobCount: 25 });
});

test("a handful of yeses is reported as a count, never as a share", () => {
  // Rusutsu: 4 of 5 listings say a pass is included. A percentage from four
  // listings is a statement about four employers.
  const s = passState(resort({ resort: "Rusutsu", jobCount: 5, saysPass: 4, pctSaysPass: 80 }));
  assert.deepEqual(s, { kind: "some", count: 4, jobCount: 5 });
});

test("totals never double-count a listing offering both", () => {
  const t = totals(
    [resort({ saysPass: 23, saysMeals: 23, saysBoth: 7 }), resort({ saysPass: 20, saysMeals: 21, saysBoth: 6 })],
    355,
    295
  );
  assert.equal(t.saysPass, 43);
  assert.equal(t.saysMeals, 44);
  // 43 + 44 - 13, not 87.
  assert.equal(t.saysEither, 74);
});

test("board-wide shares still respect the floor", () => {
  assert.equal(totals([resort({ saysPass: 1, saysMeals: 1, saysBoth: 0 })], 3, 2).pctSaysPass, null);
  assert.equal(totals([resort({ saysPass: 56, saysMeals: 59, saysBoth: 13 })], 355, 295).pctSaysPass, 16);
});

test("resorts are ordered by how often a pass is actually mentioned", () => {
  const out = publishablePerks([
    resort({ resort: "Revelstoke", jobCount: 25, saysPass: 0 }),
    resort({ resort: "Whistler Blackcomb", jobCount: 123, saysPass: 20 }),
    resort({ resort: "Niseko United", jobCount: 97, saysPass: 23 }),
  ]);
  assert.deepEqual(out.map((r) => r.resort), ["Niseko United", "Whistler Blackcomb", "Revelstoke"]);
});

test("a resort where nobody mentions a pass is never held up as a good bet", () => {
  assert.deepEqual(bestForPasses([resort({ saysPass: 0, pctSaysPass: 0 })]), []);
});
