import { LAUNCH_GRACE_PERIOD } from "@/lib/config/launch";

export type BusinessTier = "free" | "standard" | "premium" | "enterprise";

export const TIER_FEATURES = {
  free: {
    name: "Free",
    maxActiveJobs: 2,
    yearlyJobLimit: 2,
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
    price: "$29",
    priceNote: "per month",
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
    price: "$49",
    priceNote: "per month",
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

/** During grace period, everyone gets premium-level access (not enterprise). */
export function getEffectiveTier(tier: BusinessTier): BusinessTier {
  if (LAUNCH_GRACE_PERIOD) return "premium";
  return tier;
}

/** Check if a business can post a new job. Free tier uses yearly limit, others use active count. */
export function canPostJob(
  tier: BusinessTier,
  activeJobCount: number,
  yearlyJobsPosted?: number
): boolean {
  const effective = getEffectiveTier(tier);
  if (effective === "free" && typeof yearlyJobsPosted === "number") {
    return yearlyJobsPosted < TIER_FEATURES.free.yearlyJobLimit;
  }
  const limit = TIER_FEATURES[effective].maxActiveJobs;
  return activeJobCount < limit;
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
