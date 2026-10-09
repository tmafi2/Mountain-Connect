import { test } from "node:test";
import assert from "node:assert/strict";
import { BADGES, earnedBadges, seasonStats, unearnedBadges, type WorkSeason } from "./achievements";

const season = (o: Partial<WorkSeason>): WorkSeason => ({
  start_date: "2024-12-01",
  end_date: "2025-04-01",
  ...o,
});
const ids = (e: readonly WorkSeason[]) => earnedBadges(e).map((b) => b.id);

test("badge ids are unique and stable-looking", () => {
  const seen = new Set(BADGES.map((b) => b.id));
  assert.equal(seen.size, BADGES.length, "duplicate badge id");
  for (const b of BADGES) {
    assert.match(b.id, /^[a-z0-9-]+$/, `${b.id} will end up in analytics and share urls`);
    assert.ok(b.label && b.description, `${b.id} needs a label and description`);
  }
});

test("no seasons earns nothing, and the shelf shows everything left", () => {
  assert.deepEqual(ids([]), []);
  assert.equal(unearnedBadges([]).length, BADGES.length);
});

test("one season earns exactly the entry badge", () => {
  assert.deepEqual(ids([season({ country: "Canada" })]), ["first-season"]);
});

test("entries without readable dates are not seasons", () => {
  const stats = seasonStats([
    { country: "Canada", start_date: null, end_date: null },
    { country: "Japan", start_date: "nonsense", end_date: "also nonsense" },
  ]);
  assert.equal(stats.seasons, 0, "a badge may not rest on an entry with no season");
  assert.equal(stats.distinctCountries, 0, "a country only counts on a real season");
});

test("countries count distinctly", () => {
  const e = [season({ country: "Canada" }), season({ country: "Japan", start_date: "2025-12-01", end_date: "2026-04-01" })];
  assert.ok(ids(e).includes("countries-2"));
  assert.ok(!ids(e).includes("countries-3"));
});

test("consecutive years make a streak; a gap breaks it", () => {
  const run = [
    season({ country: "Canada", start_date: "2023-12-01", end_date: "2024-04-01" }),
    season({ country: "Canada", start_date: "2024-12-01", end_date: "2025-04-01" }),
    season({ country: "Canada", start_date: "2025-12-01", end_date: "2026-04-01" }),
  ];
  assert.equal(seasonStats(run).longestStreak, 3);
  assert.ok(ids(run).includes("back-to-back-3"));

  const gapped = [
    season({ country: "Canada", start_date: "2021-12-01", end_date: "2022-04-01" }),
    season({ country: "Canada", start_date: "2024-12-01", end_date: "2025-04-01" }),
  ];
  assert.equal(seasonStats(gapped).longestStreak, 1);
  assert.ok(!ids(gapped).includes("back-to-back"));
});

test("two seasons inside one year are not back to back", () => {
  const sameYear = [
    season({ country: "Australia", start_date: "2025-06-01", end_date: "2025-10-01" }),
    season({ country: "New Zealand", start_date: "2025-07-01", end_date: "2025-09-01" }),
  ];
  assert.equal(seasonStats(sameYear).longestStreak, 1, "one year cannot be a run of two");
});

test("both hemispheres is earned only by a recognised pair", () => {
  const chasing = [
    season({ country: "Canada" }),
    season({ country: "New Zealand", start_date: "2025-06-01", end_date: "2025-10-01" }),
  ];
  assert.ok(ids(chasing).includes("both-hemispheres"));
});

test("an unrecognised country counts towards NEITHER hemisphere", () => {
  // The outreach helper answers "south" for anything unknown, which is right
  // for picking email copy and would mint a badge off a typo here.
  const typo = [
    season({ country: "Canada" }),
    season({ country: "Candada", start_date: "2025-06-01", end_date: "2025-10-01" }),
  ];
  assert.equal(seasonStats(typo).hemispheres, 1);
  assert.ok(!ids(typo).includes("both-hemispheres"));
});

test("resort badges need distinct resorts, not repeat seasons at one", () => {
  const sameHill = [
    season({ resort_id: "a", start_date: "2023-12-01", end_date: "2024-04-01" }),
    season({ resort_id: "a", start_date: "2024-12-01", end_date: "2025-04-01" }),
  ];
  assert.equal(seasonStats(sameHill).distinctResorts, 1);
  assert.ok(!ids(sameHill).includes("resorts-2"));
});

test("earned and unearned always partition the full set", () => {
  const e = [season({ country: "Canada", resort_id: "x" })];
  assert.equal(earnedBadges(e).length + unearnedBadges(e).length, BADGES.length);
});

/**
 * The shelf is self-declared, so it must never reach a hiring decision. This
 * is the same failure the "Verified" chip was: a trust signal backed by
 * nothing, rendered in front of a business.
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

function filesUnder(dir: string): string[] {
  const out: string[] = [];
  for (const e of readdirSync(dir)) {
    const full = join(dir, e);
    if (statSync(full).isDirectory()) out.push(...filesUnder(full));
    else if (/\.tsx?$/.test(e)) out.push(full);
  }
  return out;
}

test("no business-facing view imports the badge shelf", () => {
  const businessDir = join(process.cwd(), "app/(business)");
  const offenders = filesUnder(businessDir).filter((f) =>
    /BadgeShelf|badges\/achievements/.test(readFileSync(f, "utf8")),
  );
  assert.deepEqual(
    offenders.map((f) => f.replace(process.cwd() + "/", "")),
    [],
    "a self-reported badge may not be shown to someone deciding whether to hire",
  );
});

test("the admin views do not show it either", () => {
  const adminDir = join(process.cwd(), "app/(admin)");
  const offenders = filesUnder(adminDir).filter((f) =>
    /BadgeShelf/.test(readFileSync(f, "utf8")),
  );
  assert.deepEqual(offenders.map((f) => f.replace(process.cwd() + "/", "")), []);
});
