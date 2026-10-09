/**
 * Guards the campaign hero's proof line and its two CTAs.
 *
 * WHY: until 2026-10-08 the hero read "Seasonal jobs. Mountain towns. New
 * people. New places." — atmosphere with no number anywhere, so a cold visitor
 * never learned the jobs existed. 88% left before touching the quiz, stable
 * across 700+ visitors. The fix puts live counts in the hero and makes jobs
 * the primary action.
 *
 * Three things could silently undo it, and none is a type error: someone
 * typing a number into the copy (which is how /about understated the platform
 * for five months), the zero-state printing a dash on an advert, and the
 * mobile `Browse jobs` link being hidden again.
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

test("the job board is the primary action and the quiz the secondary", () => {
  assert.match(HERO_TSX, /BrowseJobsLink[\s\S]{0,200}BTN_PRIMARY/, "jobs must carry the primary button style");
  assert.match(HERO_TSX, /FindMySeasonButton[\s\S]{0,200}BTN_GHOST/, "the quiz must be the secondary style");
});

test("the deep link is only filtered when the counts are real", () => {
  // Filtering to Canada+accommodation while the counts failed would risk
  // sending someone to a board that does not match a number they never saw.
  assert.match(HERO_TSX, /proof \? "\/jobs\?country=Canada&accommodation=yes" : "\/jobs"/);
});

test("Browse jobs is not hidden on phones", () => {
  const link = HEADER_TSX.match(/className="[^"]*"/g)?.filter((c) => /inline-block/.test(c)) ?? [];
  assert.ok(link.length > 0, "the Browse jobs link lost its class");
  for (const c of link) {
    assert.ok(
      !/\bhidden\b/.test(c),
      "Browse jobs is hidden below the sm breakpoint again — 379 of 407 visitors are on a phone",
    );
  }
});
