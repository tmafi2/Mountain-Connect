import { test } from "node:test";
import assert from "node:assert/strict";
import { currentSeason, formatSeasonWithYear, formatSeasonDays } from "./season";

const on = (iso: string) => new Date(`${iso}T12:00:00Z`);

// ⚠️ The bug: 75 of 111 resorts stored a season that had already ended, and
// /resorts/[id] printed the year. The stored year is now ignored entirely.
test("a season stored years ago still reads as the upcoming one", () => {
  // Livigno as stored: the 2025/26 season, long finished.
  assert.equal(
    formatSeasonWithYear("2025-11-29", "2026-04-19", on("2026-10-11")),
    "Nov 2026 – Apr 2027"
  );
});

test("a northern season crossing the new year keeps both years right", () => {
  const s = currentSeason("2025-12-05", "2026-04-10", on("2026-10-11"))!;
  assert.equal(s.start.getUTCFullYear(), 2026);
  assert.equal(s.end.getUTCFullYear(), 2027, "the end belongs to the following year");
});

test("a southern season inside one year does not gain a second", () => {
  // Australia: June to October, no new-year crossing.
  const s = currentSeason("2026-06-06", "2026-10-04", on("2026-10-11"))!;
  assert.equal(s.start.getUTCFullYear(), 2027, "the 2026 season has finished");
  assert.equal(s.end.getUTCFullYear(), 2027);
});

test("mid-season shows the season you are IN, not the next one", () => {
  // Standing in January, a November-to-April season is running now.
  const s = currentSeason("2025-11-29", "2026-04-19", on("2027-01-15"))!;
  assert.equal(s.start.getUTCFullYear(), 2026);
  assert.equal(s.end.getUTCFullYear(), 2027);
});

test("the day before it ends, it is still this season", () => {
  const s = currentSeason("2026-06-06", "2026-10-04", on("2026-10-03"))!;
  assert.equal(s.end.getUTCFullYear(), 2026, "not rolled forward early");
});

test("no dates, or unparseable ones, give nothing rather than a guess", () => {
  assert.equal(currentSeason(null, "2026-04-19"), null);
  assert.equal(currentSeason("2026-11-29", null), null);
  assert.equal(currentSeason("not a date", "2026-04-19"), null);
  assert.equal(formatSeasonWithYear(null, null), null);
  assert.equal(formatSeasonDays(null, null), null);
});

test("the day-only format carries no year, as /compare always did", () => {
  const out = formatSeasonDays("2025-11-29", "2026-04-19", on("2026-10-11"))!;
  assert.ok(!/\d{4}/.test(out), out);
  assert.equal(out, "29 Nov – 19 Apr");
});
