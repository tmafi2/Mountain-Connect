/**
 * Guards where worker onboarding sends someone, and what it promises them.
 *
 * TWO BUGS THIS EXISTS FOR, both found 2026-10-08.
 *
 * 1. Onboarding ended by offering "Explore resorts" or "Finish my profile", so
 *    a worker who had just said they wanted a ski season was never shown a
 *    single job. A fortnight of paid traffic produced 10 worker accounts and 3
 *    expressions of interest, and EOIs are the only output that leads to
 *    revenue — they are what makes an unclaimed business claim and pay.
 *
 * 2. The profile card read "Stand out to employers". Businesses CANNOT browse
 *    worker profiles: 00085 limits them to workers who have applied, messaged
 *    or followed them, and the privacy page says so. On top of that, 335 of
 *    the 341 live listings belong to unclaimed imports with nobody behind
 *    them. The identical promise was stripped from the campaign landing page
 *    before launch; it was live here the whole time.
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const ONBOARDING = join(process.cwd(), "app/(public)/onboarding/page.tsx");
const src = readFileSync(ONBOARDING, "utf8");

test("a worker who wants work is sent to the job board", () => {
  assert.match(
    src,
    /browseJobsHref\(/,
    "onboarding must build its exit link with browseJobsHref, which falls back to the unfiltered board",
  );
  assert.match(
    src,
    /handleSave\(lookingForJob \? "jobs" : "explore"\)/,
    "the first card must offer jobs to someone looking for work",
  );
});

test("the job link is never filtered to a country with no live jobs", () => {
  // browseJobsHref only filters when the country is in the list it is given,
  // so onboarding must actually pass that list rather than an empty literal.
  assert.match(
    src,
    /browseJobsHref\(seasonAnswers\?\.destination,\s*countriesWithJobs\)/,
    "the live-country list must be passed, or a USA/Australia/NZ pick lands on an empty board",
  );
  assert.match(src, /\/api\/jobs\/countries/, "the list has to be fetched; onboarding is a client component");
});

test("onboarding never claims a profile makes you visible to employers", () => {
  // Comments are stripped first: the fix deliberately NAMES the banned phrase
  // in a comment at the site where it used to be, so the next person reads why
  // it cannot come back. Only rendered copy counts.
  const copy = src.replace(/\{\/\*[\s\S]*?\*\/\}/g, "").replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
  const forbidden = [
    /stand out to employers/i,
    /get discovered/i,
    /employers (can )?(browse|search|find) (you|your profile)/i,
    /apply with (one|your) profile/i,
  ];
  for (const pattern of forbidden) {
    assert.ok(
      !pattern.test(copy),
      `onboarding copy matches ${pattern} — businesses cannot browse worker profiles (00085)`,
    );
  }
});
