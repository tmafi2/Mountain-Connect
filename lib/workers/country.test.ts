import { test } from "node:test";
import assert from "node:assert/strict";
import {
  resolveCountry,
  countriesWanted,
  countriesEligible,
  countriesListed,
  unplaceableWanted,
  WORKER_COUNTRIES,
} from "./country";

/**
 * Every raw value below was read out of production on 2026-11-12 — the
 * complete set of distinct `preferred_countries` elements (50 of them) and
 * `work_authorizations[].country` values (43). Nothing here is invented, and
 * nothing resolves a value we have never actually been given.
 */

const NOW = new Date("2026-11-12T00:00:00Z");

/* ─── resolveCountry ──────────────────────────────────────── */

test("canonical names pass through, whatever the case", () => {
  for (const [raw, want] of [
    ["Australia", "Australia"],
    ["canada", "Canada"],
    ["france", "France"],
    ["japan", "Japan"],
    ["austria", "Austria"],
    ["spain", "Spain"],
    ["New zealand", "New Zealand"],
  ] as const) {
    assert.equal(resolveCountry(raw), want, raw);
  }
});

test("the USA and NZ families collapse to one country", () => {
  for (const raw of ["USA", "Usa", "US", "United States", "America"]) {
    assert.equal(resolveCountry(raw), "United States", raw);
  }
  assert.equal(resolveCountry("NZ"), "New Zealand");
  assert.equal(resolveCountry("AUS"), "Australia");
});

test("misspellings and other languages resolve", () => {
  assert.equal(resolveCountry("switcherland"), "Switzerland");
  assert.equal(resolveCountry("Swizterland"), "Switzerland");
  assert.equal(resolveCountry("Australie"), "Australia");
  assert.equal(resolveCountry("España"), "Spain");
  assert.equal(resolveCountry("Francia"), "France");
  assert.equal(resolveCountry("Suiza"), "Switzerland");
  assert.equal(resolveCountry("Italia"), "Italy");
  assert.equal(resolveCountry("Korea"), "South Korea");
});

test("Australian state codes resolve to Australia", () => {
  // One worker, living in Byron Bay, answered the free-text box with these.
  for (const code of ["NSW", "QLD", "VIC", "SA", "WA"]) {
    assert.equal(resolveCountry(code), "Australia", code);
  }
});

test("Georgia is the country, and it is in the list", () => {
  // Typed by a Hungarian worker alongside Japan, Armenia and Azerbaijan, so
  // it is the Caucasus one — and we carry a resort there.
  assert.equal(resolveCountry("Georgia"), "Georgia");
  for (const name of ["Armenia", "Azerbaijan", "Bangladesh", "Niue"]) {
    assert.equal(resolveCountry(name), name, name);
  }
});

test("values that are not countries resolve to null, not to a guess", () => {
  for (const raw of ["Europe", "Job", "waiter", "Country not listed", "", "   "]) {
    assert.equal(resolveCountry(raw), null, JSON.stringify(raw));
  }
  assert.equal(resolveCountry(null), null);
  assert.equal(resolveCountry(42), null);
  assert.equal(resolveCountry(["Canada"]), null);
});

test("an unknown country is null rather than the nearest match", () => {
  assert.equal(resolveCountry("Wakanda"), null);
  assert.equal(resolveCountry("Austr"), null);
});

/* ─── splitting ───────────────────────────────────────────── */

test("several countries in one stored value are all recovered", () => {
  assert.deepEqual(
    countriesWanted(["Austria, France, Italy, Germany"]),
    ["Austria", "France", "Italy", "Germany"],
  );
  assert.deepEqual(
    countriesWanted(["España, Francia, Suiza, Italia"]),
    ["Spain", "France", "Switzerland", "Italy"],
  );
  assert.deepEqual(countriesWanted(["France, Canada"]), ["France", "Canada"]);
});

test("country names containing 'and' are never split", () => {
  // The reason splitValues takes commas and slashes only. All four are real
  // entries in the list.
  for (const name of ["Finland", "Thailand", "New Zealand", "Andorra", "Iceland"]) {
    assert.deepEqual(countriesWanted([name]), [name], name);
  }
});

/* ─── countriesWanted ─────────────────────────────────────── */

test("preferences deduplicate across case and alias", () => {
  assert.deepEqual(countriesWanted(["Canada", "canada", "CANADA"]), ["Canada"]);
  assert.deepEqual(countriesWanted(["USA", "United States", "America"]), ["United States"]);
  assert.deepEqual(countriesWanted(["NSW", "QLD", "Australia"]), ["Australia"]);
});

test("junk input yields nothing rather than throwing", () => {
  assert.deepEqual(countriesWanted(null), []);
  assert.deepEqual(countriesWanted([]), []);
  assert.deepEqual(countriesWanted("Canada"), []);
  assert.deepEqual(countriesWanted([null, 7, {}, "Canada"]), ["Canada"]);
});

test("unplaceable preferences are counted, not hidden", () => {
  assert.equal(unplaceableWanted(["Europe", "New zealand", "Australia"]), 1);
  assert.equal(unplaceableWanted(["waiter", "Job", "Bangladesh"]), 2);
  assert.equal(unplaceableWanted(["Canada", "Japan"]), 0);
  assert.equal(unplaceableWanted(null), 0);
});

/* ─── countriesEligible ───────────────────────────────────── */

test("a citizen and a live visa are eligible", () => {
  assert.deepEqual(
    countriesEligible({ work_authorizations: [{ country: "Australia", visa_status: "citizen", visa_expiry: "n/a" }] }, NOW),
    ["Australia"],
  );
  assert.deepEqual(
    countriesEligible({ work_authorizations: [{ country: "Canada", visa_status: "working_holiday", visa_expiry: "2027-04-01" }] }, NOW),
    ["Canada"],
  );
  assert.deepEqual(
    countriesEligible({ work_authorizations: [{ country: "Japan", visa_status: "work_visa", visa_expiry: "" }] }, NOW),
    ["Japan"],
  );
});

test("an EXPIRED visa is listed but not eligible", () => {
  // 30 of 289 entries carry a date that has already passed.
  const profile = { work_authorizations: [{ country: "Canada", visa_status: "working_holiday", visa_expiry: "2024-06-30" }] };
  assert.deepEqual(countriesEligible(profile, NOW), []);
  assert.deepEqual(countriesListed(profile), ["Canada"]);
});

test("no_visa is listed but not eligible", () => {
  // 17 of 289. The worker said they would need sponsorship.
  const profile = { work_authorizations: [{ country: "Japan", visa_status: "no_visa", visa_expiry: "" }] };
  assert.deepEqual(countriesEligible(profile, NOW), []);
  assert.deepEqual(countriesListed(profile), ["Japan"]);
});

test("a country added with NO status picked is listed but not eligible", () => {
  // 25 of 289 — the country was chosen and the dropdown left alone. This is
  // the case a truthiness check on the column would get wrong.
  const profile = { work_authorizations: [{ country: "Italy", visa_status: "", visa_expiry: "" }] };
  assert.deepEqual(countriesEligible(profile, NOW), []);
  assert.deepEqual(countriesListed(profile), ["Italy"]);
});

test("one worker's eligible and ineligible countries are separated", () => {
  const profile = {
    work_authorizations: [
      { country: "Australia", visa_status: "citizen", visa_expiry: "n/a" },
      { country: "Canada", visa_status: "working_holiday", visa_expiry: "2024-01-01" },
      { country: "Japan", visa_status: "no_visa", visa_expiry: "" },
      { country: "Italy", visa_status: "", visa_expiry: "" },
    ],
  };
  assert.deepEqual(countriesEligible(profile, NOW), ["Australia"]);
  assert.deepEqual(countriesListed(profile), ["Australia", "Canada", "Japan", "Italy"]);
});

test("dirty authorization values still resolve", () => {
  // Real rows: "AUS", "NZ", "New zealand" and a comma-joined pair.
  assert.deepEqual(
    countriesEligible({ work_authorizations: [{ country: "AUS", visa_status: "citizen", visa_expiry: "n/a" }] }, NOW),
    ["Australia"],
  );
  assert.deepEqual(
    countriesEligible({ work_authorizations: [{ country: "Canada, Australia", visa_status: "working_holiday", visa_expiry: "2027-01-01" }] }, NOW),
    ["Canada", "Australia"],
  );
  // The picker's own escape hatch is not a country.
  assert.deepEqual(
    countriesEligible({ work_authorizations: [{ country: "Country not listed", visa_status: "citizen", visa_expiry: "n/a" }] }, NOW),
    [],
  );
});

test("empty and malformed authorizations yield nothing", () => {
  assert.deepEqual(countriesEligible({}, NOW), []);
  assert.deepEqual(countriesEligible({ work_authorizations: [] }, NOW), []);
  assert.deepEqual(countriesEligible({ work_authorizations: "nope" }, NOW), []);
  assert.deepEqual(countriesEligible({ work_authorizations: [null, 3, "x"] }, NOW), []);
  assert.deepEqual(countriesListed({ work_authorizations: [{ visa_status: "citizen" }] }), []);
});

/* ─── the list itself ─────────────────────────────────────── */

test("the country list has no duplicate names or codes", () => {
  const names = WORKER_COUNTRIES.map((c) => c.name);
  const codes = WORKER_COUNTRIES.map((c) => c.code);
  assert.equal(new Set(names).size, names.length, "duplicate name");
  assert.equal(new Set(codes).size, codes.length, "duplicate code");
});

test("every resort country on the board is offerable", () => {
  // A worker must be able to say they can work where we actually have jobs.
  for (const country of ["Canada", "Japan", "Italy", "New Zealand", "USA", "Australia",
                         "France", "Austria", "Switzerland", "Chile", "Andorra",
                         "Argentina", "Georgia", "Sweden"]) {
    assert.ok(resolveCountry(country), `no country row for resort country ${country}`);
  }
});
