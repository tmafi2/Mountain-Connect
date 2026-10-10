import { MIN_LISTINGS, round2, share } from "./figures";

/**
 * What open listings SAY about season passes and staff meals.
 *
 * ⚠️ READ THE NAMES. Every field here is `saysX`, not `hasX`, and that is the
 * whole design. `job_posts.ski_pass_included` and `meal_perks` are
 * `BOOLEAN NOT NULL DEFAULT false`, and the import route omits the field when
 * the advert does not mention a pass — so `false` means "said no" OR "never
 * mentioned it", with no way to tell them apart.
 *
 * Measured on 2026-10-10: of the 299 open listings with `ski_pass_included =
 * false`, only FOUR mention a pass anywhere in their text. So the false
 * values are overwhelmingly silence, not refusal.
 *
 * ⚠️ THEREFORE THE INVERSE IS NEVER COMPUTED OR PUBLISHED. "16% include a
 * pass" is true. "84% do not include a pass" is NOT something this data
 * supports, and any helper returning it would be a lie with a percentage sign
 * on it. There is deliberately no `pctWithout` on this type.
 */

export type ResortPerks = {
  resort: string;
  resortId: string | null;
  country: string;
  jobCount: number;
  /** Listings whose advert states a season or lift pass is included. */
  saysPass: number;
  /** Listings whose advert states meals or staff food are included. */
  saysMeals: number;
  /** Listings stating both. */
  saysBoth: number;
  /** Listings stating accommodation is included — the third thing asked about. */
  saysHousing: number;
  /** Share of listings that SAY a pass, or null below the floor. */
  pctSaysPass: number | null;
  pctSaysMeals: number | null;
};

export type PerkTotals = {
  listings: number;
  saysPass: number;
  saysMeals: number;
  saysEither: number;
  /** Listings with no pass recorded that never mention one in their text. */
  silentOnPass: number;
  pctSaysPass: number | null;
  pctSaysMeals: number | null;
};

/** True when a resort has enough listings to describe at all. */
export function canDescribePerks(r: ResortPerks): boolean {
  return r.jobCount >= MIN_LISTINGS;
}

/**
 * True when enough listings SAY a pass to quote a share for that resort.
 *
 * Counted on the listings that say yes — not on the resort's total — because
 * a share built from two positives is a statement about two employers.
 */
export function canQuotePass(r: ResortPerks): boolean {
  return r.saysPass >= MIN_LISTINGS && r.pctSaysPass !== null;
}

export function canQuoteMeals(r: ResortPerks): boolean {
  return r.saysMeals >= MIN_LISTINGS && r.pctSaysMeals !== null;
}

/**
 * What the pass column should say.
 *
 * ⚠️ "none" IS NOT "no pass here". It means no advert said so, which is a
 * fact about the adverts. The wording has to carry that or a reader fills the
 * gap with the stronger claim.
 */
export type PerkState =
  | { kind: "quoted"; pct: number; count: number; jobCount: number }
  | { kind: "some"; count: number; jobCount: number }
  | { kind: "none"; jobCount: number };

export function passState(r: ResortPerks): PerkState {
  if (canQuotePass(r)) {
    return { kind: "quoted", pct: r.pctSaysPass as number, count: r.saysPass, jobCount: r.jobCount };
  }
  if (r.saysPass > 0) return { kind: "some", count: r.saysPass, jobCount: r.jobCount };
  return { kind: "none", jobCount: r.jobCount };
}

export function mealsState(r: ResortPerks): PerkState {
  if (canQuoteMeals(r)) {
    return { kind: "quoted", pct: r.pctSaysMeals as number, count: r.saysMeals, jobCount: r.jobCount };
  }
  if (r.saysMeals > 0) return { kind: "some", count: r.saysMeals, jobCount: r.jobCount };
  return { kind: "none", jobCount: r.jobCount };
}

/** Resorts worth listing, most listings first. */
export function publishablePerks(resorts: ResortPerks[]): ResortPerks[] {
  return resorts
    .filter(canDescribePerks)
    .sort((a, b) => b.saysPass - a.saysPass || b.jobCount - a.jobCount || a.resort.localeCompare(b.resort));
}

/** The resorts whose adverts most often mention a pass. */
export function bestForPasses(resorts: ResortPerks[], take = 2): ResortPerks[] {
  return publishablePerks(resorts)
    .filter(canQuotePass)
    .sort((a, b) => (b.pctSaysPass ?? 0) - (a.pctSaysPass ?? 0))
    .slice(0, take);
}

/** Board-wide totals, which are the figures the headline question needs. */
export function totals(resorts: ResortPerks[], listings: number, silentOnPass: number): PerkTotals {
  const saysPass = resorts.reduce((n, r) => n + r.saysPass, 0);
  const saysMeals = resorts.reduce((n, r) => n + r.saysMeals, 0);
  const saysBoth = resorts.reduce((n, r) => n + r.saysBoth, 0);
  return {
    listings,
    saysPass,
    saysMeals,
    // Inclusion-exclusion, so a listing offering both is not counted twice.
    saysEither: saysPass + saysMeals - saysBoth,
    silentOnPass,
    pctSaysPass: share(saysPass, listings),
    pctSaysMeals: share(saysMeals, listings),
  };
}

export { round2 };
