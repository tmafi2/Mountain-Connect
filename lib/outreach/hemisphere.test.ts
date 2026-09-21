import { test } from "node:test";
import assert from "node:assert/strict";
import { hemisphereForCountry, hemisphereForLead } from "./hemisphere";

test("a country decides its own hemisphere", () => {
  for (const south of ["Australia", "New Zealand", "Chile", "Argentina"]) {
    assert.equal(hemisphereForCountry(south), "south", south);
  }
  for (const north of ["Canada", "Japan", "United States", "France"]) {
    assert.equal(hemisphereForCountry(north), "north", north);
  }
});

test("the resort decides when there is one", () => {
  assert.equal(hemisphereForLead({ country: "Canada" }, null), "north");
  assert.equal(hemisphereForLead({ country: "Australia" }, null), "south");
});

/**
 * The case this function exists for. A business in a ski town often belongs
 * to no resort in particular — 32 of the 212 leads on the September 2026
 * Canadian list were like that — and reading the country off the resort
 * alone offered every one of them a June season.
 */
test("a lead with only a town is placed by the town", () => {
  assert.equal(hemisphereForLead(null, { country: "Canada" }), "north");
  assert.equal(hemisphereForLead(undefined, { country: "Canada" }), "north");
  assert.equal(hemisphereForLead({ country: null }, { country: "Canada" }), "north");
});

test("the resort still wins over the town when both are known", () => {
  assert.equal(hemisphereForLead({ country: "Canada" }, { country: "Australia" }), "north");
  assert.equal(hemisphereForLead({ country: "Australia" }, { country: "Canada" }), "south");
});

test("a lead we cannot place at all keeps the original southern copy", () => {
  assert.equal(hemisphereForLead(null, null), "south");
  assert.equal(hemisphereForLead({ country: null }, { country: null }), "south");
  assert.equal(hemisphereForLead(undefined, undefined), "south");
});
