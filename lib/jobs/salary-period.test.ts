/**
 * The pay period in JobPosting structured data is read from `salary_range`,
 * never inferred from how big the number is.
 *
 * ⚠️ THE TRAP THIS PINS: "a big number means annual" is the obvious rule and
 * it is wrong. JPY 3500/hour is about USD 23 — a magnitude threshold would
 * mislabel every Japanese listing as a yearly salary. 152 of 165 priced
 * listings on the board are /hour, and a good share of those are yen.
 *
 * Mirrors the logic in app/(public)/jobs/[id]/page.tsx. If that changes, this
 * must change with it — the page builds the object inline, so there is no
 * shared function to import.
 */

import { test } from "node:test";
import assert from "node:assert/strict";

const SALARY_UNITS: Record<string, string> = {
  hour: "HOUR", hr: "HOUR", hourly: "HOUR",
  day: "DAY", daily: "DAY",
  week: "WEEK", weekly: "WEEK",
  month: "MONTH", monthly: "MONTH",
  year: "YEAR", yr: "YEAR", annum: "YEAR", annually: "YEAR",
};
const payPeriod = (salaryRange: string | null | undefined): string | null => {
  const unit = salaryRange?.toLowerCase().match(/\/\s*([a-z]+)/)?.[1];
  return unit ? SALARY_UNITS[unit] ?? null : null;
};

test("a yen hourly wage is HOUR, not YEAR — magnitude is not the signal", () => {
  assert.equal(payPeriod("JPY 3500/hour"), "HOUR");
  assert.equal(payPeriod("JPY 1500/hour"), "HOUR");
});

test("ordinary hourly and annual ranges read correctly", () => {
  assert.equal(payPeriod("CAD 25/hour"), "HOUR");
  assert.equal(payPeriod("CAD 20-25/hr"), "HOUR");
  assert.equal(payPeriod("AUD 65000/year"), "YEAR");
  assert.equal(payPeriod("USD 4000/month"), "MONTH");
});

test("a season or a total has no schema.org unit, so it yields null", () => {
  // The caller omits baseSalary entirely on null. Saying nothing about pay is
  // neutral; claiming 60,000 an hour is a quality problem.
  assert.equal(payPeriod("CAD 60000/season"), null);
  assert.equal(payPeriod("NZD 9000/total"), null);
});

test("missing or unparseable ranges yield null rather than a guess", () => {
  assert.equal(payPeriod(null), null);
  assert.equal(payPeriod(undefined), null);
  assert.equal(payPeriod(""), null);
  assert.equal(payPeriod("competitive"), null);
  assert.equal(payPeriod("CAD 25"), null, "no unit means no claim about the period");
});
