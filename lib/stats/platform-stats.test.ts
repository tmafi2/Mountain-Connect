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
