import { test } from "node:test";
import assert from "node:assert/strict";
import { industriesWorked, industriesWanted } from "./industry";

/**
 * Every case below is a REAL row shape from production, not an invented one.
 * The titles are taken from the 268 work-history entries on the board as of
 * 2026-11-11, chosen because each one broke an earlier draft of the mapping.
 */

test("a readable title beats the worker's own category", () => {
  // 6 real lift operators are filed under `outdoor`, alongside fruit pickers.
  assert.deepEqual(
    industriesWorked([{ title: "Lift Operator", category: "outdoor" }]),
    ["Lift Operations"],
  );
  assert.deepEqual(
    industriesWorked([{ title: "Ski Instructor", category: "outdoor" }]),
    ["Ski Instruction"],
  );
});

test("an unreadable `outdoor` title does NOT become lift or resort work", () => {
  // All four unclassifiable `outdoor` titles in prod are farm work.
  for (const title of ["Raspberry Picker", "Grain Handler", "Farm Worker", "Grape Harvest Worker"]) {
    assert.deepEqual(industriesWorked([{ title, category: "outdoor" }]), ["Other"], title);
  }
});

test("an unreadable `instruction` title does NOT become Ski Instruction", () => {
  for (const title of ["Packing Operator", "Personal Trainer", "Tutor"]) {
    assert.deepEqual(industriesWorked([{ title, category: "instruction" }]), ["Other"], title);
  }
});

test("the fallback recovers titles the classifier misses", () => {
  // The classifier misses the space in "House keeper"; the stored category
  // is what rescues it.
  assert.deepEqual(
    industriesWorked([{ title: "House keeper", category: "cleaning_housekeeping" }]),
    ["Housekeeping"],
  );
  assert.deepEqual(
    industriesWorked([{ title: "Customer service", category: "retail" }]),
    ["Retail"],
  );
});

test("one worker can hold several industries, deduplicated", () => {
  const got = industriesWorked([
    { title: "Housekeeper", category: "cleaning_housekeeping" },
    { title: "Room Attendant", category: "hospitality" },
    { title: "Bartender", category: "food_beverage" },
  ]);
  assert.ok(got.includes("Housekeeping"));
  assert.ok(got.includes("Food & Beverage"));
  assert.equal(new Set(got).size, got.length, "no duplicates");
});

test("junk and empty history yield nothing rather than Other", () => {
  assert.deepEqual(industriesWorked(null), []);
  assert.deepEqual(industriesWorked([]), []);
  assert.deepEqual(industriesWorked("not an array"), []);
  assert.deepEqual(industriesWorked([null, 42, "x"]), []);
  // A title with no readable signal AND no stored category contributes
  // nothing — it must not silently count as "Other" experience.
  assert.deepEqual(industriesWorked([{ title: "e" }]), []);
});

test("preferred job types map onto the board's categories", () => {
  assert.deepEqual(industriesWanted(["Bartender"]), ["Food & Beverage"]);
  assert.deepEqual(industriesWanted(["Lift Operator"]), ["Lift Operations"]);
  assert.deepEqual(industriesWanted(["Ski Patrol"]), ["Resort Operations"]);
  assert.deepEqual(industriesWanted(["Hotel / Front Desk"]), ["Hospitality"]);
});

test("several preferences collapsing to one category appear once", () => {
  assert.deepEqual(
    industriesWanted(["Food & Beverage", "Bartender", "Chef / Cook"]),
    ["Food & Beverage"],
  );
});

test('"full_time" is dropped, not counted as a preference', () => {
  // 00099 moved this value out of the column, but an old client could still
  // send it. It is a position_type and must never read as a stated industry.
  assert.deepEqual(industriesWanted(["full_time"]), []);
  assert.deepEqual(industriesWanted(["full_time", "Retail"]), ["Retail"]);
});

test("unknown preference values are ignored rather than bucketed", () => {
  assert.deepEqual(industriesWanted(["Something New"]), []);
  assert.deepEqual(industriesWanted(null), []);
});
