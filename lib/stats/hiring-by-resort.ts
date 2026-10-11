import { MIN_LISTINGS, share } from "./figures";

/**
 * Who is hiring at one resort right now, for the block on `/resorts/[id]`.
 *
 * ⚠️ IT RENDERS ON 18 PAGES, NOT 111. Only 18 of the 111 resorts have a
 * single open listing and 10 clear the five-listing floor; 93 have none. A
 * "how to get hired at X" block on a resort with no jobs would be the same
 * paragraph 93 times, which is doorway content — the thin-page problem that
 * got `/employers` hidden and put retired business shells in sitemap.xml.
 * Resorts with nothing open render nothing and keep their guide links.
 *
 * ⚠️ COUNTS NEED NO FLOOR; SHARES DO. "20 employers are hiring" is a fact
 * about this resort however few listings there are. "56% advertise housing"
 * from three adverts describes three employers, not a mountain — so every
 * share here goes through `share()` and comes back null below the floor.
 *
 * Split from the `.server` half for the reason in platform-stats.ts: the
 * query drags `next/headers` into any client component that imports it.
 */

export type RoleGroup = { category: string; count: number };

export type ResortHiring = {
  resort: string;
  jobCount: number;
  /** Distinct businesses with something open — the useful number. */
  employerCount: number;
  /** The biggest role groups, largest first. Empty when none are categorised. */
  topRoles: RoleGroup[];

  saysHousing: number;
  pctHousing: number | null;
  saysPass: number;
  pctPass: number | null;

  /** Listings stating an hourly rate — the honest denominator for pay. */
  pricedCount: number;
};

export const EMPTY_HIRING: ResortHiring = {
  resort: "",
  jobCount: 0,
  employerCount: 0,
  topRoles: [],
  saysHousing: 0,
  pctHousing: null,
  saysPass: 0,
  pctPass: null,
  pricedCount: 0,
};

/** Nothing open means nothing to say. The block does not render. */
export function hasOpenRoles(r: ResortHiring | null): r is ResortHiring {
  return r !== null && r.jobCount > 0;
}

/** True when there are enough listings for a share to describe the resort. */
export function canQuoteShares(r: ResortHiring): boolean {
  return r.jobCount >= MIN_LISTINGS;
}

/**
 * Build the view model from already-fetched rows.
 *
 * Kept pure so the floor and the `=== true` reads are testable without a
 * database — the perk columns are tri-state since 00114/00115 and NULL means
 * the advert did not say, which is most of the board.
 */
export function summarise(
  resort: string,
  rows: {
    category: string | null;
    business_id: string | null;
    accommodation_included: boolean | null;
    ski_pass_included: boolean | null;
    salary_range: string | null;
  }[],
  topN = 3
): ResortHiring {
  const counts = new Map<string, number>();
  for (const r of rows) {
    const c = (r.category ?? "").trim();
    if (c) counts.set(c, (counts.get(c) ?? 0) + 1);
  }
  const topRoles = [...counts.entries()]
    .map(([category, count]) => ({ category, count }))
    .sort((a, b) => b.count - a.count || a.category.localeCompare(b.category))
    .slice(0, topN);

  const saysHousing = rows.filter((r) => r.accommodation_included === true).length;
  const saysPass = rows.filter((r) => r.ski_pass_included === true).length;

  return {
    resort,
    jobCount: rows.length,
    employerCount: new Set(rows.map((r) => r.business_id).filter(Boolean)).size,
    topRoles,
    saysHousing,
    pctHousing: share(saysHousing, rows.length),
    saysPass,
    pctPass: share(saysPass, rows.length),
    // ⚠️ Must agree with lib/stats/pay-by-town: a rate is only a rate when
    // the advert states the period, which salary_range spells out.
    pricedCount: rows.filter((r) => /\/hour$/.test(r.salary_range ?? "")).length,
  };
}

/** "Food & Beverage, Maintenance and Hospitality" — for the sentence. */
export function listRoles(roles: RoleGroup[]): string {
  const names = roles.map((r) => r.category);
  if (names.length === 0) return "";
  if (names.length === 1) return names[0];
  return `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
}
