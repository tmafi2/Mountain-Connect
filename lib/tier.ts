import { LAUNCH_GRACE_PERIOD } from "@/lib/config/launch";

export type BusinessTier = "free" | "standard" | "premium" | "enterprise";

/* ─── Pricing ─────────────────────────────────────────────────
 *
 * Two price points per paid plan: `full` is the real long-term rate card,
 * `founding` is what businesses actually pay while founding-member pricing
 * is open. Founding members keep their rate for as long as they stay
 * continuously subscribed; if they lapse and return they pay `full`.
 *
 * Both are offered monthly or as a season pass. The season pass carries the
 * bigger discount on purpose — it's the plan we want businesses on, since a
 * seasonal employer on a monthly plan churns the moment hiring stops.
 *
 * Amounts are in whole dollars (display currency; Stripe prices are set
 * separately per currency). Enterprise is negotiated, no list price.
 */
export type BillingInterval = "month" | "season";
export type PaidTier = "standard" | "premium";

/** Founding-member pricing closes at the end of the first northern season. */
export const FOUNDING_PRICING_ENDS = new Date("2027-04-30T23:59:59Z");

export function isFoundingPricingOpen(now: Date = new Date()): boolean {
  return now < FOUNDING_PRICING_ENDS;
}

export const PRICING: Record<
  PaidTier,
  Record<"founding" | "full", Record<BillingInterval, number>>
> = {
  standard: {
    founding: { month: 39, season: 149 },
    full: { month: 49, season: 219 },
  },
  premium: {
    founding: { month: 79, season: 299 },
    full: { month: 99, season: 449 },
  },
};

/** Percentage saved on the season pass vs paying monthly for a ~6-month season. */
export function seasonSavingsPct(tier: PaidTier, rate: "founding" | "full" = "founding"): number {
  const p = PRICING[tier][rate];
  return Math.round((1 - p.season / (p.month * 6)) * 100);
}

/** Percentage off the full price that founding members get. */
export function foundingDiscountPct(tier: PaidTier, interval: BillingInterval): number {
  const { founding, full } = PRICING[tier];
  return Math.round((1 - founding[interval] / full[interval]) * 100);
}

export const TIER_FEATURES = {
  free: {
    name: "Free",
    maxActiveJobs: 1,
    yearlyJobLimit: 1,
    featuredPlacement: false,
    canFeatureJobs: false,
    maxFeaturedJobs: 0,
    basicAnalytics: false,
    fullAnalytics: false,
    applicantInsights: false,
    badgeType: null as string | null,
    prioritySupport: false,
    fullProfileEditing: false,
    interviewScheduling: false,
    messaging: false,
    price: "$0",
    priceNote: "Forever free",
  },
  standard: {
    name: "Standard",
    maxActiveJobs: 5,
    yearlyJobLimit: Infinity,
    featuredPlacement: false,
    canFeatureJobs: false,
    maxFeaturedJobs: 0,
    basicAnalytics: true,
    fullAnalytics: false,
    applicantInsights: false,
    badgeType: "Verified" as string | null,
    prioritySupport: false,
    fullProfileEditing: true,
    interviewScheduling: true,
    messaging: true,
    price: "$39",
    priceNote: "per month · founding rate",
  },
  premium: {
    name: "Premium",
    maxActiveJobs: Infinity,
    yearlyJobLimit: Infinity,
    featuredPlacement: true,
    canFeatureJobs: true,
    maxFeaturedJobs: 3,
    basicAnalytics: true,
    fullAnalytics: true,
    applicantInsights: true,
    badgeType: "Premium" as string | null,
    prioritySupport: true,
    fullProfileEditing: true,
    interviewScheduling: true,
    messaging: true,
    price: "$79",
    priceNote: "per month · founding rate",
  },
  enterprise: {
    name: "Enterprise",
    maxActiveJobs: Infinity,
    yearlyJobLimit: Infinity,
    featuredPlacement: true,
    canFeatureJobs: true,
    maxFeaturedJobs: Infinity,
    basicAnalytics: true,
    fullAnalytics: true,
    applicantInsights: true,
    badgeType: "Enterprise Partner" as string | null,
    prioritySupport: true,
    fullProfileEditing: true,
    interviewScheduling: true,
    messaging: true,
    price: "Custom",
    priceNote: "Contact us",
  },
} as const;

/** Tier sort order — higher tiers first. */
const TIER_ORDER: Record<BusinessTier, number> = {
  enterprise: 0,
  premium: 1,
  standard: 2,
  free: 3,
};

/** Get numeric rank for sorting (lower = higher tier). */
export function getTierOrder(tier: BusinessTier): number {
  return TIER_ORDER[tier] ?? 3;
}

/* ─── Effective tier resolution ───────────────────────────────
 *
 * The tier a business actually gets is derived from its billing state, in
 * this order of precedence:
 *
 *   1. Global LAUNCH_GRACE_PERIOD switch  → premium (safety net; retire by
 *      flipping it to false once billing is live)
 *   2. Per-business courtesy window        → premium while
 *      grace_period_ends_at is in the future (existing pre-billing
 *      businesses; set by migration 00080)
 *   3. Live subscription (trialing/active/past_due) → selected_tier
 *      A trial gives access to THE PLAN THEY PICKED, not premium-for-all,
 *      so there is no surprise downgrade on day 30.
 *   4. Admin-set enterprise                → enterprise (negotiated,
 *      managed outside Stripe)
 *   5. Otherwise                            → free
 *
 * `past_due` still grants access: Stripe retries the card for a while and
 * we don't want to yank a live season's job posts over one failed charge.
 * The webhook downgrades on `canceled` / `unpaid`.
 */
export type SubscriptionStatus =
  | "trialing" | "active" | "past_due" | "canceled" | "unpaid"
  | "incomplete" | "incomplete_expired" | "paused";

/** The billing-relevant slice of a business_profiles row. */
export interface BillingState {
  tier: BusinessTier | null | undefined;
  selected_tier?: BusinessTier | null;
  subscription_status?: SubscriptionStatus | string | null;
  grace_period_ends_at?: string | Date | null;
}

const ENTITLED_STATUSES: ReadonlySet<string> = new Set(["trialing", "active", "past_due"]);

export function resolveEffectiveTier(
  state: BillingState,
  now: Date = new Date(),
  globalGrace: boolean = LAUNCH_GRACE_PERIOD
): BusinessTier {
  if (globalGrace) return "premium";

  if (state.grace_period_ends_at) {
    const ends = new Date(state.grace_period_ends_at);
    if (!isNaN(ends.getTime()) && ends > now) return "premium";
  }

  if (
    state.selected_tier &&
    state.subscription_status &&
    ENTITLED_STATUSES.has(state.subscription_status)
  ) {
    return state.selected_tier;
  }

  if (state.tier === "enterprise") return "enterprise";

  return "free";
}

/** Whether a business is inside its pre-billing courtesy window. */
export function isInCourtesyWindow(state: BillingState, now: Date = new Date()): boolean {
  if (!state.grace_period_ends_at) return false;
  const ends = new Date(state.grace_period_ends_at);
  return !isNaN(ends.getTime()) && ends > now;
}

/**
 * Legacy single-arg form kept for existing callers. Treats the passed tier
 * as already-effective (i.e. trusts the `tier` column). New code that has
 * the full row should use resolveEffectiveTier().
 */
export function getEffectiveTier(tier: BusinessTier): BusinessTier {
  if (LAUNCH_GRACE_PERIOD) return "premium";
  return tier;
}

/**
 * Check if a business can post a new job.
 *
 * Free tier: capped by LIVE (status='active') jobs this calendar year —
 * "first job post free". Drafts don't burn the slot; deleting/closing a
 * live post does not refund it within the year.
 * Paid tiers: capped by concurrently active jobs.
 *
 * `tier` here is the EFFECTIVE tier (use resolveEffectiveTier first when
 * you have the billing row). Kept as a pure function so it can run on the
 * client for UI and on the server for enforcement with identical results.
 */
export function canPostJob(
  tier: BusinessTier,
  activeJobCount: number,
  yearlyJobsPosted?: number
): boolean {
  const effective = getEffectiveTier(tier);
  if (effective === "free") {
    // If the caller didn't supply the yearly count, fall back to the active
    // count — never silently grant more than the free limit.
    const used = typeof yearlyJobsPosted === "number" ? yearlyJobsPosted : activeJobCount;
    return used < TIER_FEATURES.free.yearlyJobLimit;
  }
  const limit = TIER_FEATURES[effective].maxActiveJobs;
  return activeJobCount < limit;
}

/** Structured result for the server-side gate so the UI can explain *why*. */
export interface PostGateResult {
  allowed: boolean;
  effectiveTier: BusinessTier;
  activeJobCount: number;
  yearlyLiveJobs: number;
  limit: number;
  /** Set when not allowed. */
  reason?: "free_limit" | "active_limit";
}

export function evaluatePostGate(
  state: BillingState,
  activeJobCount: number,
  yearlyLiveJobs: number,
  now: Date = new Date(),
  globalGrace: boolean = LAUNCH_GRACE_PERIOD
): PostGateResult {
  const effectiveTier = resolveEffectiveTier(state, now, globalGrace);
  const isFree = effectiveTier === "free";
  const limit = isFree ? TIER_FEATURES.free.yearlyJobLimit : TIER_FEATURES[effectiveTier].maxActiveJobs;
  // Gate on the resolved tier directly (not via getEffectiveTier, which
  // would re-apply the global switch and defeat the injected override).
  const allowed = isFree
    ? yearlyLiveJobs < TIER_FEATURES.free.yearlyJobLimit
    : activeJobCount < TIER_FEATURES[effectiveTier].maxActiveJobs;
  return {
    allowed,
    effectiveTier,
    activeJobCount,
    yearlyLiveJobs,
    limit,
    reason: allowed ? undefined : isFree ? "free_limit" : "active_limit",
  };
}

/** Get the maximum number of active jobs for a tier. */
export function getJobLimit(tier: BusinessTier): number {
  const effective = getEffectiveTier(tier);
  return TIER_FEATURES[effective].maxActiveJobs;
}

/** Check if a business can access any analytics. */
export function canAccessAnalytics(tier: BusinessTier): boolean {
  const effective = getEffectiveTier(tier);
  return TIER_FEATURES[effective].basicAnalytics || TIER_FEATURES[effective].fullAnalytics;
}

/** Check if a business can access full analytics (trends, funnel, per-job). */
export function canAccessFullAnalytics(tier: BusinessTier): boolean {
  return TIER_FEATURES[getEffectiveTier(tier)].fullAnalytics;
}

/** Check if a business can feature jobs. */
export function canFeatureJobs(tier: BusinessTier): boolean {
  return TIER_FEATURES[getEffectiveTier(tier)].canFeatureJobs;
}

/** Get the badge label for a tier, or null if none. */
export function getBadgeType(tier: BusinessTier): string | null {
  return TIER_FEATURES[getEffectiveTier(tier)].badgeType;
}

/** Check if a feature is available for a tier. */
export function hasFeature(
  tier: BusinessTier,
  feature: keyof (typeof TIER_FEATURES)["premium"]
): boolean {
  const effective = getEffectiveTier(tier);
  const value = TIER_FEATURES[effective][feature];
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value > 0;
  return !!value;
}

/** Whether the grace period is active. */
export function isGracePeriod(): boolean {
  return LAUNCH_GRACE_PERIOD;
}

/** All valid tier values for validation. */
export const VALID_TIERS: BusinessTier[] = ["free", "standard", "premium", "enterprise"];
