import { test } from "node:test";
import assert from "node:assert/strict";
import { summarise, hasOpenRoles, canQuoteShares, listRoles, EMPTY_HIRING } from "./hiring-by-resort";

const row = (o: Partial<Parameters<typeof summarise>[1][number]> = {}) => ({
  category: "Food & Beverage",
  business_id: "b1",
  accommodation_included: null,
  ski_pass_included: null,
  salary_range: null,
  ...o,
});

test("employers are counted distinctly, not per listing", () => {
  const r = summarise("Whistler", [row({ business_id: "a" }), row({ business_id: "a" }), row({ business_id: "b" })]);
  assert.equal(r.jobCount, 3);
  assert.equal(r.employerCount, 2);
});

test("a listing with no business is not an employer", () => {
  assert.equal(summarise("X", [row({ business_id: null }), row({ business_id: "a" })]).employerCount, 1);
});

// ⚠️ 00114/00115 made these columns tri-state. NULL means the advert did not
// say, and NULL is most of the board — truthiness would be right by accident.
test("a perk is counted only when the advert says yes", () => {
  const rows = [
    row({ accommodation_included: true }),
    row({ accommodation_included: false }),
    row({ accommodation_included: null }),
    row({ accommodation_included: null }),
    row({ accommodation_included: null }),
  ];
  const r = summarise("X", rows);
  assert.equal(r.saysHousing, 1);
  assert.equal(r.pctHousing, 20);
});

test("a share is withheld below the floor, but the count is not", () => {
  const r = summarise("Tiny", [row({ accommodation_included: true }), row()]);
  assert.equal(r.jobCount, 2);
  assert.equal(r.saysHousing, 1, "the count is a fact however few listings there are");
  assert.equal(r.pctHousing, null, "a share from two adverts describes two employers");
  assert.equal(canQuoteShares(r), false);
});

test("roles come back largest first, and only the top few", () => {
  const rows = [
    ...Array(5).fill(row({ category: "Food & Beverage" })),
    ...Array(3).fill(row({ category: "Maintenance" })),
    ...Array(2).fill(row({ category: "Retail" })),
    row({ category: "Ski Instruction" }),
  ];
  const r = summarise("X", rows, 3);
  assert.deepEqual(r.topRoles.map((t) => t.category), ["Food & Beverage", "Maintenance", "Retail"]);
  assert.equal(r.topRoles[0].count, 5);
});

test("uncategorised listings are left out rather than bucketed as Other", () => {
  const r = summarise("X", [row({ category: null }), row({ category: "" }), row({ category: "Retail" })]);
  assert.deepEqual(r.topRoles, [{ category: "Retail", count: 1 }]);
  assert.equal(r.jobCount, 3, "they still count as open roles");
});

// Must agree with pay-by-town: a rate is a rate only when the period is stated.
test("pay is counted from the stated period, never from the number", () => {
  const r = summarise("X", [
    row({ salary_range: "CAD 25/hour" }),
    row({ salary_range: "JPY 3500/hour" }),
    row({ salary_range: "CAD 60000/season" }),
    row({ salary_range: null }),
  ]);
  assert.equal(r.pricedCount, 2);
});

test("a resort with nothing open does not render", () => {
  assert.equal(hasOpenRoles(null), false);
  assert.equal(hasOpenRoles(EMPTY_HIRING), false);
  assert.equal(hasOpenRoles(summarise("X", [row()])), true);
});

test("roles read as a sentence", () => {
  assert.equal(listRoles([]), "");
  assert.equal(listRoles([{ category: "Retail", count: 1 }]), "Retail");
  assert.equal(
    listRoles([{ category: "Food & Beverage", count: 3 }, { category: "Retail", count: 2 }]),
    "Food & Beverage and Retail"
  );
  assert.equal(
    listRoles([{ category: "A", count: 3 }, { category: "B", count: 2 }, { category: "C", count: 1 }]),
    "A, B and C"
  );
});
