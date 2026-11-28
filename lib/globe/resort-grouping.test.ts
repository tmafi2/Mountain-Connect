import { test } from "node:test";
import assert from "node:assert/strict";
import { groupLabelFor, groupResorts, type GroupableResort } from "./resort-grouping";
import { resorts } from "../data/resorts";

const forCountry = (country: string): GroupableResort[] =>
  resorts
    .filter((r) => r.country === country)
    .map((r) => ({
      id: r.id,
      name: r.name,
      country: r.country,
      state_province: r.state_province,
    }));

/**
 * ⚠️ THIS FEATURE NEEDS NO NEW DATA, AND THAT IS WORTH ASSERTING RATHER THAN
 * ASSUMING. Grouping the panel by region is only presentation while every
 * resort states its region; the day one does not, groupResorts falls back to
 * a flat list for that whole country, and this is what notices.
 */
test("every resort on the board states a region", () => {
  const missing = resorts.filter((r) => !r.state_province).map((r) => r.name);
  assert.deepEqual(missing, [], `resorts with no state_province:\n${missing.join("\n")}`);
});

test("Canada groups into its provinces, biggest first", () => {
  const groups = groupResorts(forCountry("Canada"));
  assert.ok(groups.length > 1, "Canada came back as one flat list");
  assert.equal(groups[0].label, "British Columbia");
  assert.deepEqual(
    [...groups.map((g) => g.label)].sort(),
    ["Alberta", "British Columbia", "Manitoba", "Ontario", "Quebec"],
  );
  // Nothing lost and nothing duplicated.
  assert.equal(
    groups.reduce((n, g) => n + g.resorts.length, 0),
    forCountry("Canada").length,
  );
  for (let i = 1; i < groups.length; i++) {
    assert.ok(groups[i - 1].resorts.length >= groups[i].resorts.length, "not biggest first");
  }
});

test("Japan groups into prefectures and Italy into regions", () => {
  assert.ok(groupResorts(forCountry("Japan")).some((g) => g.label === "Hokkaido"));
  assert.ok(groupResorts(forCountry("Italy")).some((g) => g.label === "South Tyrol"));
});

/**
 * ⚠️ NEW ZEALAND IS THE ONE COUNTRY WHERE THE REGION IS NOT THE ANSWER. The
 * data holds Canterbury, Otago and Manawatu-Whanganui; a New Zealander asks
 * which ISLAND a field is on, because that is what decides the drive, the
 * season and the town. The map is explicit and falls back to the region name
 * for anything not in it, so a region added later cannot be quietly filed
 * under the wrong island.
 */
test("New Zealand groups by island, not by region", () => {
  const labels = groupResorts(forCountry("New Zealand")).map((g) => g.label);
  assert.ok(labels.includes("South Island"), `got ${labels.join(", ")}`);
  assert.ok(
    labels.every((l) => l === "North Island" || l === "South Island"),
    `an NZ region was not mapped to an island: ${labels.join(", ")}`,
  );
});

test("an unmapped New Zealand region keeps its own name rather than guessing", () => {
  assert.equal(
    groupLabelFor({
      id: "x",
      name: "Somewhere New",
      country: "New Zealand",
      state_province: "Chatham Islands",
    }),
    "Chatham Islands",
  );
});

test("only New Zealand is remapped", () => {
  assert.equal(
    groupLabelFor({ id: "y", name: "y", country: "Canada", state_province: "Otago" }),
    "Otago",
  );
});

/**
 * ⚠️ ONE GROUP IS NO GROUPING. Andorra's single resort has state_province
 * "Andorra", so a heading would print the country's name inside a panel
 * already titled with the country's name. Austria's five are all in Tyrol.
 * A heading every item shares costs a line and says nothing.
 */
test("a country with one region prints no headings at all", () => {
  for (const country of ["Andorra", "Austria", "Sweden", "Georgia", "Argentina"]) {
    const groups = groupResorts(forCountry(country));
    assert.equal(groups.length, 1, `${country} was split into ${groups.length} groups`);
    assert.equal(groups[0].label, "", `${country} printed a heading`);
  }
});

test("a country with a region missing falls back to one flat list", () => {
  const mixed: GroupableResort[] = [
    { id: "1", name: "Bravo", country: "Testland", state_province: "North" },
    { id: "2", name: "Alpha", country: "Testland", state_province: null },
    { id: "3", name: "Charlie", country: "Testland", state_province: "South" },
  ];
  const groups = groupResorts(mixed);
  // A headless group beside headed ones reads as a rendering fault rather
  // than as missing data, so the whole country goes flat.
  assert.equal(groups.length, 1);
  assert.equal(groups[0].label, "");
  assert.deepEqual(groups[0].resorts.map((r) => r.name), ["Alpha", "Bravo", "Charlie"]);
});

test("resorts are alphabetical inside each group", () => {
  for (const g of groupResorts(forCountry("Canada"))) {
    const names = g.resorts.map((r) => r.name);
    assert.deepEqual(names, [...names].sort((a, b) => a.localeCompare(b)), g.label);
  }
});

test("an empty country is not a crash", () => {
  assert.deepEqual(groupResorts([]), [{ label: "", resorts: [] }]);
});
