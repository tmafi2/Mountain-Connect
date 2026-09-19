import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import * as path from "node:path";
import { resorts } from "@/lib/data/resorts";
import {
  DESTINATIONS,
  QUIZ_STEPS,
  SEASONS,
  WORK_TYPES,
  answerLabels,
  browseJobsHref,
  optionsForStep,
  parseAnswers,
  profileFieldsFromAnswers,
  resultCopy,
  seasonOptionsFor,
  type Destination,
  type SeasonAnswers,
} from "./season-quiz";

const every: SeasonAnswers[] = DESTINATIONS.flatMap((d) =>
  SEASONS.flatMap((s) => WORK_TYPES.map((w) => ({ destination: d.value, season: s.value, workType: w.value }))),
);

test("each question offers distinct values and non-empty labels", () => {
  for (const step of QUIZ_STEPS) {
    const values = step.options.map((o) => o.value);
    assert.equal(new Set(values).size, values.length, `duplicate value in ${step.key}`);
    for (const o of step.options) assert.ok(o.label.trim(), `empty label in ${step.key}`);
  }
});

test("the result repeats the answers back as one sentence", () => {
  const copy = resultCopy({ destination: "canada", season: "northern-winter", workType: "hospitality" });
  assert.equal(copy.heading, "Canada is calling");
  assert.equal(copy.emoji, "🇨🇦");
  assert.equal(copy.summary, "You're chasing a Northern Hemisphere winter and you're interested in hospitality work.");
});

test(`every one of the ${every.length} answer combinations reads as a finished sentence`, () => {
  for (const a of every) {
    const { heading, summary } = resultCopy(a);
    assert.ok(heading.length > 0, JSON.stringify(a));
    assert.match(summary, /^You're .+ and .+\.$/, JSON.stringify(a));
    assert.doesNotMatch(summary + heading, /undefined|null/, JSON.stringify(a));
  }
});

test("parseAnswers accepts only complete, known answers", () => {
  assert.deepEqual(parseAnswers({ destination: "japan", season: "southern-winter", workType: "retail" }), {
    destination: "japan",
    season: "southern-winter",
    workType: "retail",
  });
  // Auth metadata is stored snake_case.
  assert.equal(parseAnswers({ destination: "japan", season: "exploring", work_type: "retail" })?.workType, "retail");
  assert.equal(parseAnswers({ destination: "japan", season: "exploring" }), null);
  assert.equal(parseAnswers({ destination: "mars", season: "exploring", workType: "retail" }), null);
  assert.equal(parseAnswers({ destination: "japan", season: "exploring", workType: "<script>" }), null);
  // The first draft's timing answers are not seasons any more.
  assert.equal(parseAnswers({ destination: "japan", season: "winter", workType: "retail" }), null);
  assert.equal(parseAnswers("canada"), null);
  assert.equal(parseAnswers(null), null);
});

test("profile fields are only filled where an answer translates without guessing", () => {
  assert.deepEqual(profileFieldsFromAnswers({ destination: "canada", season: "northern-winter", workType: "hospitality" }), {
    preferred_countries: ["Canada"],
    season_preference: "northern_winter",
    preferred_job_types: ["Hospitality", "Food & Beverage", "Bartender"],
  });
  // The season answer names its hemisphere, so it maps even from "Anywhere".
  assert.equal(
    profileFieldsFromAnswers({ destination: "anywhere", season: "southern-winter", workType: "retail" }).season_preference,
    "southern_winter",
  );
  // Anywhere, just exploring, anything: nothing to record.
  assert.deepEqual(profileFieldsFromAnswers({ destination: "anywhere", season: "exploring", workType: "anything" }), {});
});

/** Each season value must land in the worker_profiles.season_preference CHECK. */
test("season answers map onto the profile's season_preference values", () => {
  const allowed = new Set(["northern_winter", "southern_winter", "both", "year_round"]);
  for (const s of SEASONS) {
    if (s.seasonPreference) assert.ok(allowed.has(s.seasonPreference), s.value);
  }
  assert.deepEqual(
    SEASONS.map((s) => s.value),
    ["northern-winter", "southern-winter", "exploring"],
  );
});

test("phone labels are shorter than desktop labels, and the signup strip uses them", () => {
  for (const step of QUIZ_STEPS) {
    for (const o of step.options) {
      if (o.shortLabel) assert.ok(o.shortLabel.length < o.label.length, `${o.value}: "${o.shortLabel}"`);
    }
  }
  assert.deepEqual(answerLabels({ destination: "canada", season: "northern-winter", workType: "hospitality" }), [
    "🇨🇦 Canada",
    "Northern Winter",
    "Bars & Restaurants",
  ]);
});

/**
 * /jobs?country= and worker_profiles.preferred_countries both match the
 * country exactly as resorts.country spells it ("USA", not "United States").
 * A drifted spelling would silently filter the job board to nothing.
 */
test("every destination country is spelled the way the resort data spells it", () => {
  const resortCountries = new Set(resorts.map((r) => r.country));
  for (const d of DESTINATIONS) {
    if (d.country) assert.ok(resortCountries.has(d.country), `${d.country} is not a resorts.country value`);
  }
});

/**
 * Onboarding writes these into preferred_job_types. The profile editor draws
 * its chips from JOB_TYPE_OPTIONS, so a value missing from that list would be
 * saved but never shown as selected — invisible to the worker it belongs to.
 */
test("every pre-filled job type is one the profile editor offers", () => {
  const editor = readFileSync(path.join(process.cwd(), "app", "(worker)", "profile", "edit", "page.tsx"), "utf8");
  const block = editor.match(/const JOB_TYPE_OPTIONS = \[([\s\S]*?)\];/)?.[1];
  assert.ok(block, "JOB_TYPE_OPTIONS not found in the profile editor");
  const offered = new Set([...block.matchAll(/"([^"]+)"/g)].map((m) => m[1]));
  assert.ok(offered.size >= 10, `expected the editor's job types, found ${offered.size}`);
  for (const w of WORK_TYPES) {
    for (const jobType of w.jobTypes) assert.ok(offered.has(jobType), `"${jobType}" (${w.value}) is not offered`);
  }
});

test("question 2 leads with the winter the destination actually has", () => {
  const order = (d?: Destination) => seasonOptionsFor(d).map((s) => s.value);
  for (const d of ["canada", "japan", "usa"] as const) {
    assert.deepEqual(order(d), ["northern-winter", "southern-winter", "exploring"], d);
  }
  for (const d of ["australia", "new-zealand"] as const) {
    assert.deepEqual(order(d), ["southern-winter", "northern-winter", "exploring"], d);
  }
  // No destination to match: the default order.
  assert.deepEqual(order("anywhere"), ["northern-winter", "southern-winter", "exploring"]);
  assert.deepEqual(order(undefined), ["northern-winter", "southern-winter", "exploring"]);
});

test("reordering never drops or repeats an option, and only question 2 moves", () => {
  const all = SEASONS.map((s) => s.value).sort();
  for (const d of DESTINATIONS) {
    const shown = seasonOptionsFor(d.value);
    assert.deepEqual(shown.map((s) => s.value).sort(), all, d.value);
    // Every real destination names a hemisphere, so a new one cannot slip in
    // without deciding which winter it leads with.
    if (d.value !== "anywhere") assert.equal(shown[0].hemisphere, d.hemisphere, d.value);
  }
  const answers = { destination: "australia" } as const;
  assert.equal(optionsForStep(QUIZ_STEPS[0], answers), QUIZ_STEPS[0].options);
  assert.equal(optionsForStep(QUIZ_STEPS[2], answers), QUIZ_STEPS[2].options);
  assert.equal(optionsForStep(QUIZ_STEPS[1], answers)[0].value, "southern-winter");
});

test("browse jobs filters to the destination only when it has live jobs", () => {
  const live = ["Canada", "Japan"];
  assert.equal(browseJobsHref("canada", live), "/jobs?country=Canada");
  assert.equal(browseJobsHref("australia", live), "/jobs");
  assert.equal(browseJobsHref("anywhere", live), "/jobs");
  assert.equal(browseJobsHref(undefined, live), "/jobs");
  assert.equal(browseJobsHref("new-zealand", ["New Zealand"]), "/jobs?country=New%20Zealand");
  assert.equal(browseJobsHref("canada", []), "/jobs");
});
