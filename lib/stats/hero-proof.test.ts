/**
 * Guards the campaign hero's proof line and its ONE call to action.
 *
 * WHY THE PROOF LINE: until 2026-10-08 the hero read "Seasonal jobs. Mountain
 * towns. New people. New places." — atmosphere with no number anywhere, so a
 * cold visitor never learned the jobs existed. 88% left before touching the
 * quiz, stable across 700+ visitors. Live counts in the hero fixed that and
 * they stay.
 *
 * WHY ONE BUTTON: the same 2026-10-08 change also added a "See the jobs"
 * PRIMARY button and demoted the quiz to a ghost button beside it. Measured
 * from `campaign_events` on 2026-11-09 — quiz starts 15.6% → 5.4%,
 * browse-jobs clicks 8.6% → 19.2%, and signups 5 → 0 across 501 views. The
 * second button was removed on 2026-11-12. **This file asserted the opposite
 * until that day**, which is correct: it was guarding a decision, and the
 * decision changed. If the jobs CTA ever comes back, change these tests
 * deliberately rather than deleting them.
 *
 * Four things could silently undo all this, and none is a type error: a
 * number typed into the copy (how /about understated the platform for five
 * months), the zero-state printing a dash on an advert, a second button
 * creeping back into the hero, and the mobile `Browse jobs` link in the
 * HEADER being hidden again.
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { HERO } from "../../app/(campaign)/go-for-a-season/content";
import { NO_COUNTRY_STATS } from "./country-job-stats";

const read = (p: string) => readFileSync(join(process.cwd(), p), "utf8");
const HERO_TSX = read("app/(campaign)/go-for-a-season/Hero.tsx");
const HEADER_TSX = read("app/(campaign)/CampaignHeader.tsx");

test("the proof line is a template, never a typed-in number", () => {
  assert.ok(HERO.proof.includes("{jobs}"), "the job count must be substituted");
  assert.ok(HERO.proof.includes("{accommodation}"), "the accommodation count must be substituted");
  assert.ok(
    !/\d/.test(HERO.proof.replace(/\{jobs\}|\{accommodation\}/g, "")),
    `a digit is hardcoded in the hero proof line: ${HERO.proof}`,
  );
});

test("an uncounted hero shows no line at all, never a dash", () => {
  assert.deepEqual(NO_COUNTRY_STATS, { liveJobs: 0, withAccommodation: 0 });
  // The component must guard on BOTH counts before rendering the line.
  assert.match(
    HERO_TSX,
    /stats\.liveJobs > 0 && stats\.withAccommodation > 0/,
    "the proof line must be suppressed when either count is zero",
  );
  // Looks for an em dash used as a VALUE (formatStat's zero-state), not for
  // one appearing in prose or a comment.
  // All three comment forms. The fix deliberately names the banned thing in a
  // comment at the site where it would be reintroduced, so only code counts.
  const code = HERO_TSX
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, "")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");
  assert.ok(!/formatStat\(/.test(code), "formatStat renders '—' at zero; this hero must render nothing");
  assert.ok(!/["'`]\s*\u2014\s*["'`]/.test(code), "an em dash on an advert reads as broken; render nothing instead");
});

/** Hero source with every comment removed, so a note that NAMES the banned
 *  thing at the site where it would be reintroduced does not trip the check. */
const HERO_CODE = HERO_TSX
  .replace(/\{\/\*[\s\S]*?\*\/\}/g, "")
  .replace(/\/\*[\s\S]*?\*\//g, "")
  .replace(/^\s*\/\/.*$/gm, "");

test("the quiz is the hero's primary action", () => {
  assert.match(HERO_CODE, /FindMySeasonButton[\s\S]{0,200}BTN_PRIMARY/, "the quiz must carry the primary button style");
});

test("the hero offers exactly ONE action", () => {
  // The measured failure was two buttons competing for the same tap, not the
  // wording on either of them. Any second CTA here is the same bug again.
  assert.ok(
    !/BrowseJobsLink/.test(HERO_CODE),
    "a jobs CTA is back in the hero — it cut quiz starts by two thirds on 501 views; see the note above",
  );
  assert.ok(
    !/BTN_GHOST/.test(HERO_CODE),
    "a secondary button is back in the hero; the hero has one action and it is the quiz",
  );
  assert.ok(!("jobsCta" in HERO), "HERO.jobsCta was retired with the button it labelled");
});

test("the HEADER's Browse jobs link is not hidden on phones", () => {
  // Deliberately kept, and it is now the only jobs route above the fold. It
  // is a quiet text link rather than a button, so it does not compete with
  // the quiz the way the removed hero CTA did.
  const link = HEADER_TSX.match(/className="[^"]*"/g)?.filter((c) => /inline-block/.test(c)) ?? [];
  assert.ok(link.length > 0, "the Browse jobs link lost its class");
  for (const c of link) {
    assert.ok(
      !/\bhidden\b/.test(c),
      "Browse jobs is hidden below the sm breakpoint again — 379 of 407 visitors are on a phone",
    );
  }
});
