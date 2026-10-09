import { test } from "node:test";
import assert from "node:assert/strict";
import { seasonLabel } from "./season-label";

test("a northern winter crossing New Year reads as a split season", () => {
  assert.equal(seasonLabel("2025-12-01", "2026-04-15"), "2025/26");
  assert.equal(seasonLabel("2025-11-20", "2026-05-02"), "2025/26");
});

test("a southern season inside one year reads as that year", () => {
  assert.equal(seasonLabel("2026-06-01", "2026-10-01"), "2026");
});

test("an unfinished season falls back to its start", () => {
  assert.equal(seasonLabel("2026-06-01", null), "2026");
  assert.equal(seasonLabel("2025-12-01", ""), "2025");
});

test("dates that cannot carry a season give no badge rather than a wrong one", () => {
  assert.equal(seasonLabel(null, null), null);
  assert.equal(seasonLabel("", ""), null);
  assert.equal(seasonLabel("not a date", "2026-04-01"), null);
  assert.equal(seasonLabel("2026-13-01", "2026-14-01"), null);
  assert.equal(seasonLabel("2026-04-01", "2025-12-01"), null, "ends before it starts");
  assert.equal(seasonLabel("2023-12-01", "2026-04-01"), null, "too long to be one season");
});

test("the century rolls over without producing a three-digit year", () => {
  assert.equal(seasonLabel("2099-12-01", "2100-04-01"), "2099/00");
});
