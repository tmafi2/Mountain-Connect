import { MIN_LISTINGS, money, share } from "./figures";

/**
 * What open listings say about staff accommodation, by resort.
 *
 * Split from `housing-by-resort.server.ts` for the reason in
 * platform-stats.ts: the query half pulls in `next/headers`, and dragging
 * that into a client component 500s the route in a way typecheck misses.
 *
 * ⚠️ FREE AND CHARGED HOUSING ARE COUNTED SEPARATELY, NEVER AVERAGED. At
 * Rusutsu four listings say accommodation is free and one charges ¥35,000 a
 * month. A median across all five is 0, which would publish "staff housing at
 * Rusutsu is free" while one in five charges — the kind of true-on-average
 * statement that is wrong for the person reading it. They are two different
 * facts and the type keeps them apart.
 */

export type ResortHousing = {
  resort: string;
  /** Static legacy id, so the page can link at /resorts/<id>. */
  resortId: string | null;
  country: string;
  towns: string[];
  jobCount: number;

  /** Listings whose advert says accommodation is included. */
  offeringCount: number;
  /** Share of all listings offering it, or null below the floor. */
  pctOffering: number | null;

  /** The most common `accommodation_type`, where enough listings state one. */
  commonType: string | null;
  typedCount: number;

  /** Listings stating a cost ABOVE zero, and the median of those per week. */
  chargedCount: number;
  medianWeeklyCost: number | null;
  currency: string | null;

  /** Listings explicitly saying accommodation is free. */
  freeCount: number;

  /** Listings that say whether the rent comes out of wages. */
  deductionStatedCount: number;
  deductedCount: number;

  passCount: number;
  mealsCount: number;
  pctWithPass: number | null;
  pctWithMeals: number | null;
};

/** True when enough listings offer housing to describe the resort at all. */
export function canDescribeHousing(r: ResortHousing): boolean {
  return r.jobCount >= MIN_LISTINGS && r.pctOffering !== null;
}

/**
 * True when enough listings state a CHARGE to publish a cost.
 *
 * Counted on charged listings only — the free ones are a separate fact, and
 * including them would drag a median toward zero.
 */
export function canQuoteCost(r: ResortHousing): boolean {
  return r.chargedCount >= MIN_LISTINGS && r.medianWeeklyCost !== null && r.currency !== null;
}

/** "about JPY ¥4,615 a week", or null when it cannot be said. */
export function weeklyCost(r: ResortHousing): string | null {
  if (!canQuoteCost(r)) return null;
  return money(r.medianWeeklyCost, r.currency);
}

/**
 * How the housing cost reads when some listings are free and some are not.
 *
 * Returns null rather than a sentence when neither fact clears the floor,
 * which is the normal case: 23 of 355 open listings state a cost at all.
 */
export function costSummary(r: ResortHousing): string | null {
  const charged = weeklyCost(r);
  const freeShare = share(r.freeCount, r.chargedCount + r.freeCount);
  if (charged && r.freeCount > 0) {
    return `about ${charged} a week where it is charged — ${r.freeCount} of ${
      r.chargedCount + r.freeCount
    } listings that mention a cost say it is free`;
  }
  if (charged) return `about ${charged} a week`;
  if (r.freeCount >= MIN_LISTINGS && freeShare !== null) {
    return `free in ${r.freeCount} of the ${r.chargedCount + r.freeCount} listings that mention it`;
  }
  return null;
}

/**
 * Resorts worth putting on the page, most listings first.
 *
 * A resort where few listings include housing stays on — "3% of listings here
 * include accommodation" is exactly what somebody choosing between Revelstoke
 * and Big White needs, and leaving it off would read as no data rather than
 * as bad news.
 */
export function publishableResorts(resorts: ResortHousing[]): ResortHousing[] {
  return resorts
    .filter((r) => r.jobCount >= MIN_LISTINGS)
    .sort((a, b) => b.jobCount - a.jobCount || a.resort.localeCompare(b.resort));
}

/** The resorts where most listings include housing, for the lead paragraph. */
export function bestForHousing(resorts: ResortHousing[], take = 3): ResortHousing[] {
  return publishableResorts(resorts)
    .filter((r) => canDescribeHousing(r) && (r.pctOffering ?? 0) > 0)
    .sort((a, b) => (b.pctOffering ?? 0) - (a.pctOffering ?? 0))
    .slice(0, take);
}

/**
 * What the cost column should say, as a decision rather than as JSX.
 *
 * ⚠️ THIS LIVES HERE BECAUSE THE CELL GOT IT WRONG TWICE. First it rendered
 * "Not stated — only 5 of 5 say" for Rusutsu, which contradicts itself: all
 * five DO say, four of them that housing is free. Then the fix said "Mostly
 * free" for Madarao on the strength of THREE listings, quietly below the
 * five-listing floor the rest of the page keeps. A branch with four outcomes
 * belongs somewhere it can be tested, not in a component.
 */
export type CostState =
  | { kind: "quoted"; cost: string; listings: number }
  | { kind: "mostly-free"; free: number; stating: number }
  | { kind: "too-few"; stating: number; jobCount: number }
  | { kind: "silent" };

export function costState(r: ResortHousing): CostState {
  const quoted = weeklyCost(r);
  if (quoted) return { kind: "quoted", cost: quoted, listings: r.chargedCount };

  const stating = r.chargedCount + r.freeCount;
  if (stating === 0) return { kind: "silent" };

  // ⚠️ The floor applies here too. "Mostly free" is a claim about the resort,
  // and a claim from three listings is the thing MIN_LISTINGS exists to stop.
  if (stating >= MIN_LISTINGS && r.freeCount > r.chargedCount) {
    return { kind: "mostly-free", free: r.freeCount, stating };
  }
  return { kind: "too-few", stating, jobCount: r.jobCount };
}
