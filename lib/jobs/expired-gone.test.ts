import { test } from "node:test";
import assert from "node:assert/strict";
import { isExpired, jobIdFromPath } from "./expired-gone";

const NOW = new Date("2026-10-10T12:00:00Z");

test("only a /jobs/<uuid> path yields an id", () => {
  assert.equal(
    jobIdFromPath("/jobs/216fcb39-4ba3-457c-a2a4-4434efa27498"),
    "216fcb39-4ba3-457c-a2a4-4434efa27498",
  );
  assert.equal(jobIdFromPath("/jobs/216fcb39-4ba3-457c-a2a4-4434efa27498/"), "216fcb39-4ba3-457c-a2a4-4434efa27498");
});

test("the board, filtered views and anything else yield null", () => {
  // The 410 check must never fire on the index or cost a lookup there.
  assert.equal(jobIdFromPath("/jobs"), null);
  assert.equal(jobIdFromPath("/jobs/"), null);
  assert.equal(jobIdFromPath("/jobs/not-a-uuid"), null);
  assert.equal(jobIdFromPath("/jobs/216fcb39-4ba3-457c-a2a4-4434efa27498/apply"), null);
  assert.equal(jobIdFromPath("/ski-resort-jobs/canada"), null);
  assert.equal(jobIdFromPath("/"), null);
});

test("a listing the sweep has already expired is gone", () => {
  assert.equal(isExpired({ status: "paused", paused_reason: "expired" }, NOW), true);
});

test("past its date but not yet swept is also gone", () => {
  // The sweep runs once a day, so there is always a window where the date has
  // passed and the row still says active.
  assert.equal(isExpired({ status: "active", expires_at: "2026-10-09T00:00:00Z" }, NOW), true);
});

test("a live listing is not gone", () => {
  assert.equal(isExpired({ status: "active", expires_at: "2026-12-01T00:00:00Z" }, NOW), false);
  assert.equal(isExpired({ status: "active", expires_at: null }, NOW), false);
  assert.equal(isExpired({ status: "active" }, NOW), false);
});

test("ONLY expiry produces gone — other pauses are 404, not 410", () => {
  // 410 says "this was here and is permanently finished". An owner-paused or
  // billing-parked listing may well come back, and a draft was never public.
  assert.equal(isExpired({ status: "paused", paused_reason: "claim_gated", expires_at: null }, NOW), false);
  assert.equal(isExpired({ status: "paused", paused_reason: "tier_downgrade", expires_at: null }, NOW), false);
  assert.equal(isExpired({ status: "paused", paused_reason: "stale_cleanup", expires_at: null }, NOW), false);
  assert.equal(isExpired({ status: "draft", expires_at: null }, NOW), false);
  assert.equal(isExpired({ status: "closed", expires_at: null }, NOW), false);
});

test("an unreadable expires_at does not mint a 410", () => {
  // new Date("nonsense") is Invalid Date, and every comparison with it is
  // false — which is the safe direction, but pin it so nobody 'fixes' it.
  assert.equal(isExpired({ status: "active", expires_at: "nonsense" }, NOW), false);
});
