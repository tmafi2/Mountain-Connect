import { test } from "node:test";
import assert from "node:assert/strict";
import { formatHousingCost, housingDeductedLabel, hasHousingCostInfo } from "./housing-cost";

test("a stated cost reads with its currency code and period", () => {
  assert.equal(formatHousingCost({ amount: 60000, currency: "JPY", period: "month" }), "JPY ¥60,000/month");
  assert.equal(formatHousingCost({ amount: 150, currency: "CAD", period: "week" }), "CAD $150/week");
});

test("the code is shown as well as the symbol", () => {
  // "$" is CAD, AUD, NZD and USD on this board, and the resort's country is
  // not always on screen next to the figure.
  assert.match(formatHousingCost({ amount: 150, currency: "CAD", period: "week" })!, /^CAD/);
  assert.match(formatHousingCost({ amount: 150, currency: "AUD", period: "week" })!, /^AUD/);
});

test("free is free, not zero", () => {
  assert.equal(formatHousingCost({ amount: 0, currency: "CAD", period: "week" }), "Free (week)");
  assert.equal(formatHousingCost({ amount: 0 }), "Free");
});

/**
 * The rule the whole feature rests on. `pay_currency DEFAULT 'USD'` made a
 * placeholder read as a fact on 177 listings; nothing here may do that again.
 */
test("not stated renders as nothing at all, never as a reassuring phrase", () => {
  for (const missing of [null, undefined]) {
    assert.equal(formatHousingCost({ amount: missing }), null);
    assert.equal(housingDeductedLabel(missing), null);
    assert.equal(hasHousingCostInfo({ amount: missing }, missing), false);
  }
  // An amount with no currency still says something true; it just says less.
  assert.equal(formatHousingCost({ amount: 150, period: "week" }), "150/week");
});

test("deduction has three states and only two of them speak", () => {
  assert.equal(housingDeductedLabel(true), "Deducted from pay");
  assert.equal(housingDeductedLabel(false), "Paid separately");
  assert.equal(housingDeductedLabel(null), null);
});

test("a nonsense amount is refused rather than rendered", () => {
  assert.equal(formatHousingCost({ amount: -50, currency: "CAD" }), null);
  assert.equal(formatHousingCost({ amount: Number.NaN }), null);
});

test("deduction alone is worth showing", () => {
  // A post can say "rent is deducted" without naming a figure.
  assert.equal(hasHousingCostInfo({ amount: null }, true), true);
});
