import { test } from "node:test";
import assert from "node:assert/strict";
import { regionHierarchy, unmappedCountries } from "./region-hierarchy";
import { resorts } from "./resorts";

const allEntries = regionHierarchy.flatMap((c) =>
  c.countries.flatMap((co) => co.resorts.map((r) => ({ ...r, country: co.name, continent: c.name }))),
);

/**
 * THE regression this file exists for. The hierarchy was hand-written and
 * fell 20 resorts behind `resorts.ts` — 14 Italian, 6 Canadian — which took
 * them off the globe, out of the explore grid and out of the header nav. The
 * globe showed Italy with 3 resorts when it had 17.
 *
 * Membership is derived now, so this should be impossible; the test is here
 * because "should be impossible" is what the last version believed too.
 */
test("every resort reaches the hierarchy exactly once", () => {
  assert.equal(
    allEntries.length,
    resorts.length,
    `hierarchy holds ${allEntries.length} resorts, resorts.ts holds ${resorts.length}`,
  );

  const seen = new Map<string, number>();
  for (const e of allEntries) seen.set(e.id, (seen.get(e.id) ?? 0) + 1);

  const duplicated = [...seen.entries()].filter(([, n]) => n > 1).map(([id]) => id);
  assert.deepEqual(duplicated, [], "a resort appears under more than one country");

  const missing = resorts.filter((r) => !seen.has(r.id)).map((r) => `${r.name} (${r.country})`);
  assert.deepEqual(missing, [], "resorts in resorts.ts that never reach the hierarchy");
});

/**
 * An unmapped country lands in a visible "Other" continent rather than being
 * dropped, so the failure mode is embarrassing instead of invisible. This
 * keeps it from ever being either.
 */
test("every country in resorts.ts is mapped to a continent", () => {
  assert.deepEqual(unmappedCountries(), [], "add these to COUNTRY_CONTINENT");
  assert.ok(
    !regionHierarchy.some((c) => c.name === "Other"),
    "an Other continent means a country fell through COUNTRY_CONTINENT",
  );
});

/** The country counts the globe labels and the explore chips both read. */
test("country counts match resorts.ts", () => {
  const expected = new Map<string, number>();
  for (const r of resorts) expected.set(r.country, (expected.get(r.country) ?? 0) + 1);

  for (const continent of regionHierarchy) {
    for (const country of continent.countries) {
      assert.equal(
        country.resorts.length,
        expected.get(country.name),
        `${country.name}: hierarchy says ${country.resorts.length}, resorts.ts says ${expected.get(country.name)}`,
      );
    }
  }
});

/**
 * New Zealand deliberately shows ski-area clusters rather than admin regions —
 * a worker looking for a season thinks "Queenstown", not "Otago". Deriving the
 * sub-region straight from state_province would quietly undo that.
 */
test("New Zealand keeps its editorial clusters, not its admin regions", () => {
  const nz = allEntries.filter((e) => e.country === "New Zealand");
  const states = new Set(nz.map((e) => e.state));
  assert.ok(states.has("Queenstown"), "Queenstown cluster missing");
  assert.ok(states.has("Wanaka"), "Wanaka cluster missing");
  assert.ok(states.has("Ruapehu"), "Ruapehu cluster missing");
  assert.ok(!states.has("Otago"), "Otago is the admin region, not what we show");
  assert.ok(!states.has("Manawatu-Whanganui"), "admin region leaked into the NZ grouping");
});

/**
 * Grouping is chosen per country, never inferred from whether the data
 * happens to carry a state_province — most of the new Italian resorts do, and
 * inferring it would flip Italy from a flat list of 17 into regional headings
 * as a side effect of an import.
 */
test("only the grouped countries carry sub-regions", () => {
  const grouped = new Set(["Australia", "New Zealand", "Japan", "Canada", "USA"]);
  for (const e of allEntries) {
    if (grouped.has(e.country)) {
      assert.ok(e.state, `${e.name} (${e.country}) should have a sub-region`);
    } else {
      assert.equal(e.state, undefined, `${e.name} (${e.country}) should render in a flat list`);
    }
  }
});

/** Southern hemisphere first — this platform's audience. */
test("continent order is the curated one", () => {
  assert.deepEqual(
    regionHierarchy.map((c) => c.name),
    ["Australia / New Zealand", "Asia", "North America", "Europe", "South America"],
  );
});
