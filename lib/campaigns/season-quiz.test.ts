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
  destinationsFor,
  type Season,
  type SeasonAnswers,
} from "./season-quiz";

const every: SeasonAnswers[] = DESTINATIONS.flatMap((d) =>
  SEASONS.flatMap((s) => WORK_TYPES.map((w) => ({ destination: d.value, season: s.value, workTypes: [w.value] }))),
);

test("each question offers distinct values and non-empty labels", () => {
  for (const step of QUIZ_STEPS) {
    const values = step.options.map((o) => o.value);
    assert.equal(new Set(values).size, values.length, `duplicate value in ${step.key}`);
    for (const o of step.options) assert.ok(o.label.trim(), `empty label in ${step.key}`);
  }
});

test("the result repeats the answers back as one sentence", () => {
  const copy = resultCopy({ destination: "canada", season: "northern-winter", workTypes: ["hospitality"] });
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
  assert.deepEqual(parseAnswers({ destination: "japan", season: "southern-winter", workTypes: ["retail"] }), {
    season: "southern-winter",
    destination: "japan",
    workTypes: ["retail"],
  });
  assert.equal(parseAnswers({ destination: "japan", season: "exploring" }), null);
  assert.equal(parseAnswers({ destination: "mars", season: "exploring", workTypes: ["retail"] }), null);
  assert.equal(parseAnswers({ destination: "japan", season: "exploring", workTypes: ["<script>"] }), null);
  assert.equal(parseAnswers({ destination: "japan", season: "exploring", workTypes: [] }), null);
  // The first draft's timing answers are not seasons any more.
  assert.equal(parseAnswers({ destination: "japan", season: "winter", workTypes: ["retail"] }), null);
  assert.equal(parseAnswers("canada"), null);
  assert.equal(parseAnswers(null), null);
});

/**
 * Question 3 took ONE answer until 2026-09-22. Every account created before
 * then has a single value in its metadata and cannot be rewritten, so all
 * three shapes have to keep parsing — the old one most of all.
 */
test("a work-type answer parses whether it is one value, a list, or a joined string", () => {
  const base = { destination: "japan", season: "exploring" };
  // The old shape, snake_case, exactly as it sits in auth metadata today.
  assert.deepEqual(parseAnswers({ ...base, work_type: "retail" })?.workTypes, ["retail"]);
  assert.deepEqual(parseAnswers({ ...base, workType: "retail" })?.workTypes, ["retail"]);
  // How several travel in a URL and in metadata.
  assert.deepEqual(parseAnswers({ ...base, work_type: "retail,trades" })?.workTypes, ["retail", "trades"]);
  assert.deepEqual(parseAnswers({ ...base, work_types: ["retail", "trades"] })?.workTypes, ["retail", "trades"]);
  // Junk mixed in is dropped, not fatal; duplicates collapse; order is kept.
  assert.deepEqual(parseAnswers({ ...base, work_type: "trades, mars ,retail,trades" })?.workTypes, ["trades", "retail"]);
  // But nothing valid at all is still an incomplete answer.
  assert.equal(parseAnswers({ ...base, work_type: "mars,venus" }), null);
});

test("profile fields are only filled where an answer translates without guessing", () => {
  assert.deepEqual(profileFieldsFromAnswers({ destination: "canada", season: "northern-winter", workTypes: ["hospitality"] }), {
    preferred_countries: ["Canada"],
    season_preference: "northern_winter",
    preferred_job_types: ["Hospitality", "Food & Beverage", "Bartender"],
  });
  // The season answer names its hemisphere, so it maps even from "Not sure yet".
  assert.equal(
    profileFieldsFromAnswers({ destination: "anywhere", season: "southern-winter", workTypes: ["retail"] }).season_preference,
    "southern_winter",
  );
  // Not sure yet, not sure yet, anything: nothing to record.
  assert.deepEqual(profileFieldsFromAnswers({ destination: "anywhere", season: "exploring", workTypes: ["anything"] }), {});
});

test("several work types become the union of their job types, without duplicates", () => {
  const fields = profileFieldsFromAnswers({
    destination: "canada",
    season: "northern-winter",
    // hospitality and accommodation both offer hotel-ish work; retail adds one.
    workTypes: ["hospitality", "accommodation", "retail"],
  });
  const types = fields.preferred_job_types ?? [];
  assert.deepEqual([...new Set(types)], types, "a job type was listed twice");
  for (const expected of ["Hospitality", "Bartender", "Hotel / Front Desk", "Housekeeping", "Retail"]) {
    assert.ok(types.includes(expected), `${expected} missing from ${JSON.stringify(types)}`);
  }
  // "Anything" contributes nothing, and must not wipe out what sits beside it
  // in a hand-built answer.
  assert.deepEqual(
    profileFieldsFromAnswers({ destination: "canada", season: "northern-winter", workTypes: ["anything", "retail"] })
      .preferred_job_types,
    ["Retail"],
  );
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
  assert.deepEqual(answerLabels({ destination: "canada", season: "northern-winter", workTypes: ["hospitality"] }), [
    "🇨🇦 Canada",
    "Northern",
    "Bars & Restaurants",
  ]);
  // The strip is one line: two fit, beyond that the rest are counted.
  assert.equal(
    answerLabels({ destination: "canada", season: "northern-winter", workTypes: ["hospitality", "retail"] })[2],
    "Bars & Restaurants, Retail",
  );
  assert.equal(
    answerLabels({
      destination: "canada",
      season: "northern-winter",
      workTypes: ["hospitality", "retail", "trades", "mountain-operations"],
    })[2],
    "Bars & Restaurants, Retail +2",
  );
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

test("question 2 offers only the countries that have the chosen hemisphere's winter", () => {
  const shown = (season?: Season) => destinationsFor(season).map((d) => d.value);
  assert.deepEqual(shown("northern-winter"), ["canada", "japan", "usa", "anywhere"]);
  assert.deepEqual(shown("southern-winter"), ["australia", "new-zealand", "anywhere"]);
  // "Not sure yet" in question 1 is what opens the whole list.
  assert.deepEqual(shown("exploring"), DESTINATIONS.map((d) => d.value));
  assert.deepEqual(shown(undefined), DESTINATIONS.map((d) => d.value));
});

test("filtering never offers a country in the wrong hemisphere, and never removes the escape hatch", () => {
  for (const season of SEASONS) {
    const shown = destinationsFor(season.value);
    assert.ok(
      shown.some((d) => d.value === "anywhere"),
      `${season.value} left somebody who has not decided with no answer`,
    );
    if (season.hemisphere) {
      for (const d of shown) {
        assert.ok(
          d.hemisphere === season.hemisphere || d.hemisphere === null,
          `${d.value} (${d.hemisphere}) offered for ${season.value}`,
        );
      }
      // Nothing that belongs is quietly dropped either.
      const belongs = DESTINATIONS.filter((d) => d.hemisphere === season.hemisphere || d.hemisphere === null);
      assert.deepEqual(shown.map((d) => d.value), belongs.map((d) => d.value), season.value);
    }
  }
});

test("the questions are asked hemisphere, then country, then work", () => {
  assert.deepEqual(QUIZ_STEPS.map((q) => q.key), ["season", "destination", "workTypes"]);
  // Only the last one takes more than one answer — the others advance on tap,
  // and a Continue button on those would make a three-tap quiz a six-tap one.
  assert.deepEqual(QUIZ_STEPS.map((q) => !!q.multi), [false, false, true]);
  // Only question 2 depends on an earlier answer.
  const answers = { season: "southern-winter" } as const;
  assert.equal(optionsForStep(QUIZ_STEPS[0], answers), QUIZ_STEPS[0].options);
  assert.equal(optionsForStep(QUIZ_STEPS[2], answers), QUIZ_STEPS[2].options);
  assert.deepEqual(
    optionsForStep(QUIZ_STEPS[1], answers).map((o) => o.value),
    ["australia", "new-zealand", "anywhere"],
  );
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
