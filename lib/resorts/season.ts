/**
 * When a resort's season actually runs, projected onto the current year.
 *
 * ⚠️ 75 OF 111 RESORTS HAD A season_end IN THE PAST. Canada 16, USA 12,
 * Australia 12, Japan 8 — public pages quoting a season that finished in
 * April. The stored dates are real published dates for the season they were
 * entered in, and nothing has ever updated them since.
 *
 * ⚠️ BUMPING THE YEARS IS NOT THE FIX. A migration that rewrites 2026 to
 * 2027 is wrong again in twelve months, and the next person has no way to
 * know it is due — the same trap as 00108 buying seven days and reading as
 * a reprieve, and as every stale literal this codebase has chased. So the
 * YEAR IN THE COLUMN IS IGNORED. Only the month and day are read, and the
 * season is projected onto whichever occurrence has not finished yet.
 *
 * That makes a stored date a PATTERN, not an appointment — which is what a
 * field called "season_start" was always being used as.
 */

export type Season = { start: Date; end: Date };

const atYear = (d: Date, year: number) =>
  new Date(Date.UTC(year, d.getUTCMonth(), d.getUTCDate()));

/**
 * The season occurrence that has not ended yet — the one running now, or the
 * next one if the last has finished.
 *
 * Handles both hemispheres without being told which: a northern season
 * (November to April) crosses the new year and a southern one (June to
 * October) does not, and the only thing that distinguishes them is whether
 * the end falls before the start in the calendar.
 */
export function currentSeason(
  startISO: string | null | undefined,
  endISO: string | null | undefined,
  today: Date = new Date()
): Season | null {
  if (!startISO || !endISO) return null;
  const s0 = new Date(startISO);
  const e0 = new Date(endISO);
  if (Number.isNaN(s0.getTime()) || Number.isNaN(e0.getTime())) return null;

  const crossesNewYear =
    e0.getUTCMonth() < s0.getUTCMonth() ||
    (e0.getUTCMonth() === s0.getUTCMonth() && e0.getUTCDate() < s0.getUTCDate());

  // Try this year's occurrence and the next; take the first that has not
  // finished. Starting a year back covers a season that began in December
  // and is still running in January.
  for (const year of [today.getUTCFullYear() - 1, today.getUTCFullYear(), today.getUTCFullYear() + 1]) {
    const start = atYear(s0, year);
    const end = atYear(e0, crossesNewYear ? year + 1 : year);
    if (end >= today) return { start, end };
  }
  return null;
}

const MONTH = { month: "short", timeZone: "UTC" } as const;
const DAY_MONTH = { day: "numeric", month: "short", timeZone: "UTC" } as const;

/** "Nov 2026 – Apr 2027" — the year is now always the upcoming one. */
export function formatSeasonWithYear(
  startISO: string | null | undefined,
  endISO: string | null | undefined,
  today: Date = new Date()
): string | null {
  const s = currentSeason(startISO, endISO, today);
  if (!s) return null;
  const f = (d: Date) =>
    `${d.toLocaleDateString("en-GB", MONTH)} ${d.getUTCFullYear()}`;
  return `${f(s.start)} – ${f(s.end)}`;
}

/** "29 Nov – 19 Apr" — no year, for places that never showed one. */
export function formatSeasonDays(
  startISO: string | null | undefined,
  endISO: string | null | undefined,
  today: Date = new Date()
): string | null {
  const s = currentSeason(startISO, endISO, today);
  if (!s) return null;
  const f = (d: Date) => d.toLocaleDateString("en-GB", DAY_MONTH);
  return `${f(s.start)} – ${f(s.end)}`;
}
