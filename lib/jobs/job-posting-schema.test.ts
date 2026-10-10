import { test } from "node:test";
import assert from "node:assert/strict";
import { directApply, employmentTypes, isoCountry } from "./job-posting-schema";

test("country names map to ISO 3166-1 alpha-2", () => {
  assert.equal(isoCountry("Canada"), "CA");
  assert.equal(isoCountry("Japan"), "JP");
  assert.equal(isoCountry("New Zealand"), "NZ");
  // The resorts table spells it "USA", not "United States".
  assert.equal(isoCountry("USA"), "US");
  assert.equal(isoCountry("United States"), "US");
});

test("Georgia is the country, not the US state", () => {
  // Precisely why a code beats a name: this dataset means the Caucasus.
  assert.equal(isoCountry("Georgia"), "GE");
});

test("an unknown country yields null so the caller can fall back to the name", () => {
  assert.equal(isoCountry("Narnia"), null);
  assert.equal(isoCountry(null), null);
  assert.equal(isoCountry(undefined), null);
  assert.equal(isoCountry(""), null);
});

test("every role carries TEMPORARY — this is a seasonal board", () => {
  assert.deepEqual(employmentTypes("full_time"), ["FULL_TIME", "TEMPORARY"]);
  assert.deepEqual(employmentTypes("part_time"), ["PART_TIME", "TEMPORARY"]);
});

test("casual maps to PART_TIME, since schema.org has no casual", () => {
  assert.deepEqual(employmentTypes("casual"), ["PART_TIME", "TEMPORARY"]);
});

test("an unknown or missing position type is TEMPORARY alone, never invented", () => {
  assert.deepEqual(employmentTypes(null), ["TEMPORARY"]);
  assert.deepEqual(employmentTypes(undefined), ["TEMPORARY"]);
  assert.deepEqual(employmentTypes("contract"), ["TEMPORARY"]);
});

/**
 * ⚠️ These pin the INVERSION that was live: the old code emitted
 * directApply: true exactly when the listing sent people off-site, and all 341
 * active listings carry an application_email.
 */
test("a listing that routes people to email does NOT claim directApply", () => {
  assert.equal(directApply({ application_email: "jobs@example.com" }), undefined);
  assert.equal(directApply({ application_url: "https://example.com/apply" }), undefined);
  assert.equal(directApply({ application_email: "a@b.com", application_url: "https://c.d" }), undefined);
});

test("only a listing with no external route claims directApply", () => {
  assert.equal(directApply({}), true);
  assert.equal(directApply({ application_email: null, application_url: null }), true);
  assert.equal(directApply({ application_email: "   ", application_url: "" }), true, "whitespace is not a route");
});
