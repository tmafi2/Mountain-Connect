/**
 * Turns a work-history entry's dates into the season a skier would say out
 * loud: "2025/26" for a winter that crosses New Year, "2026" for one that does
 * not.
 *
 * WHY A SPLIT YEAR IS THE DEFAULT SHAPE: a northern season runs December to
 * April, so calling it either 2025 or 2026 is wrong by half. Southern seasons
 * (June to October) sit inside one year and read as just that year, which is
 * also how people say them.
 *
 * Nothing here is verified. These dates are what the worker typed about
 * themselves, and every surface built on this must say so.
 */

/** "2025/26", "2026", or null when the dates cannot carry a season. */
export function seasonLabel(
  startDate: string | null | undefined,
  endDate: string | null | undefined,
): string | null {
  const start = toYearMonth(startDate);
  // An unfinished season is still a season: fall back to the start.
  const end = toYearMonth(endDate) ?? start;
  if (!start || !end) return null;
  if (end.year < start.year) return null; // ends before it starts
  if (end.year - start.year > 1) return null; // longer than a season
  if (end.year === start.year) return String(start.year);
  // Crosses New Year: "2025/26". Two digits on the second year is the form
  // every ski town uses on a chairlift sign.
  return `${start.year}/${String(end.year % 100).padStart(2, "0")}`;
}

function toYearMonth(v: string | null | undefined): { year: number; month: number } | null {
  if (typeof v !== "string" || !v.trim()) return null;
  // Accepts "2026-03", "2026-03-14" and anything Date can parse; rejects the
  // rest rather than guessing, because a wrong season on a shared image is
  // worse than no badge.
  const m = v.trim().match(/^(\d{4})-(\d{2})/);
  if (m) {
    const year = Number(m[1]);
    const month = Number(m[2]);
    if (month < 1 || month > 12) return null;
    return { year, month };
  }
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return null;
  return { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1 };
}
