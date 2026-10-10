import { test } from "node:test";
import assert from "node:assert/strict";
import { MIN_LISTINGS } from "./figures";
import {
  canDescribeHousing, canQuoteCost, weeklyCost, costSummary, costState,
  publishableResorts, bestForHousing, type ResortHousing,
} from "./housing-by-resort";

function resort(over: Partial<ResortHousing> = {}): ResortHousing {
  return {
    resort: "Niseko United", resortId: "3", country: "Japan", towns: ["Hirafu / Kutchan"],
    jobCount: 97, offeringCount: 59, pctOffering: 60.82,
    commonType: "Staff housing", typedCount: 57,
    chargedCount: 10, medianWeeklyCost: 4615.38, currency: "JPY",
    freeCount: 1, deductionStatedCount: 2, deductedCount: 2,
    passCount: 23, mealsCount: 23, pctWithPass: 23.71, pctWithMeals: 23.71, ...over,
  };
}

test("a resort needs enough listings before it describes anything", () => {
  assert.equal(canDescribeHousing(resort({ jobCount: MIN_LISTINGS })), true);
  assert.equal(canDescribeHousing(resort({ jobCount: 4, pctOffering: null })), false);
});

/**
 * ⚠️ THE RULE THIS FILE EXISTS FOR. At Rusutsu four listings say staff
 * accommodation is free and one charges ¥35,000 a month. A median across all
 * five is 0, which publishes "staff housing at Rusutsu is free" while one in
 * five charges — true on average and wrong for the person reading it.
 */
test("free listings never drag a cost median toward zero", () => {
  const rusutsu = resort({
    resort: "Rusutsu", jobCount: 5, chargedCount: 1, freeCount: 4,
    medianWeeklyCost: null, currency: "JPY",
  });
  // One charged listing is below the floor, so no cost is quoted at all.
  assert.equal(canQuoteCost(rusutsu), false);
  assert.equal(weeklyCost(rusutsu), null);
  // And the summary does not claim it is free either — 4 is below the floor.
  assert.equal(costSummary(rusutsu), null);
});

test("a cost is quoted only from listings that actually charge", () => {
  assert.equal(canQuoteCost(resort({ chargedCount: MIN_LISTINGS })), true);
  assert.equal(canQuoteCost(resort({ chargedCount: MIN_LISTINGS - 1 })), false);
  // A median with no currency cannot be published: "¥" and "$" are not
  // interchangeable and this page never converts.
  assert.equal(canQuoteCost(resort({ currency: null })), false);
});

test("where both facts are real, both are stated", () => {
  const s = costSummary(resort({ chargedCount: 10, freeCount: 1 }));
  // ⚠️ No decimals on yen: 38 hundredths of a yen is not a unit that exists,
  // and this figure is DERIVED (a weekly median built from monthly rents),
  // which is exactly where spurious precision creeps in.
  assert.ok(s?.includes("JPY ¥4,615"), s ?? "");
  assert.ok(!s?.includes("4,615.38"), s ?? "");
  assert.ok(s?.includes("1 of 11 listings"), s ?? "");
});

test("a resort where every stated cost is free says so, above the floor", () => {
  const s = costSummary(resort({ chargedCount: 0, freeCount: 6, medianWeeklyCost: null }));
  assert.ok(s?.startsWith("free in 6 of the 6"), s ?? "");
});

test("a resort with few housing listings is kept, not hidden", () => {
  // "3% of listings here include accommodation" is exactly what somebody
  // choosing between Revelstoke and Big White needs. Leaving it off would
  // read as no data rather than as bad news.
  const revelstoke = resort({
    resort: "Revelstoke", jobCount: 25, offeringCount: 1, pctOffering: 4,
    chargedCount: 0, freeCount: 0, medianWeeklyCost: null, commonType: null, typedCount: 2,
  });
  assert.equal(publishableResorts([revelstoke]).length, 1);
  assert.equal(canDescribeHousing(revelstoke), true);
  assert.equal(costSummary(revelstoke), null);
});

test("resorts below the listing floor are left off entirely", () => {
  assert.deepEqual(publishableResorts([resort({ jobCount: 4 })]), []);
});

test("the lead picks the resorts most likely to house you", () => {
  const best = bestForHousing([
    resort({ resort: "Revelstoke", jobCount: 25, pctOffering: 4 }),
    resort({ resort: "Niseko United", jobCount: 97, pctOffering: 60.82 }),
    resort({ resort: "Big White", jobCount: 23, pctOffering: 60.87 }),
  ], 2);
  assert.deepEqual(best.map((r) => r.resort), ["Big White", "Niseko United"]);
});

test("a resort offering no housing is not advertised as a good bet", () => {
  const none = resort({ resort: "Nowhere", jobCount: 10, offeringCount: 0, pctOffering: 0 });
  assert.deepEqual(bestForHousing([none]), []);
});

/**
 * The cost cell got this wrong twice, which is why the branch now lives in a
 * tested function instead of in JSX.
 */
test("the cost column never contradicts itself or ducks the floor", () => {
  const base = { chargedCount: 0, freeCount: 0, medianWeeklyCost: null, currency: "JPY" };

  // Rusutsu: it first read "Not stated — only 5 of 5 say". All five DO say.
  assert.deepEqual(
    costState(resort({ ...base, resort: "Rusutsu", jobCount: 5, chargedCount: 1, freeCount: 4 })),
    { kind: "mostly-free", free: 4, stating: 5 }
  );

  // Madarao: the fix for Rusutsu then claimed "Mostly free" from THREE
  // listings, quietly below the floor the rest of the page keeps.
  assert.deepEqual(
    costState(resort({ ...base, resort: "Madarao Kogen", jobCount: 14, freeCount: 3 })),
    { kind: "too-few", stating: 3, jobCount: 14 }
  );

  // Silence is its own state, and must not read as "free".
  assert.deepEqual(costState(resort({ ...base, jobCount: 25 })), { kind: "silent" });

  // And a real figure still comes through.
  const niseko = costState(resort({ chargedCount: 10, freeCount: 1, medianWeeklyCost: 4615.38, currency: "JPY" }));
  assert.equal(niseko.kind, "quoted");
});
