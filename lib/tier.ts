import { LAUNCH_GRACE_PERIOD } from "@/lib/config/launch";

export type BusinessTier = "free" | "premium";

export const TIER_FEATURES = {
  free: {
    name: "Free",
    maxActiveJobs: 1,
    featuredPlacement: false,
    canFeatureJobs: false,
    analytics: false,
    applicantInsights: false,
    premiumBadge: false,
    prioritySupport: false,
    price: "$0",
    priceNote: "Forever free",
  },
  premium: {
    name: "Premium",
    maxActiveJobs: Infinity,
    featuredPlacement: true,
    canFeatureJobs: true,
    analytics: true,
    applicantInsights: true,
    premiumBadge: true,
    prioritySupport: true,
    price: "$29",
    priceNote: "per month",
  },
} as const;

/**
 * Get the effective tier — during grace period, everyone gets premium.
 */
export function getEffectiveTier(tier: BusinessTier): BusinessTier {
  if (LAUNCH_GRACE_PERIOD) return "premium";
  return tier;
}

/**
 * Check if a business can post a new job.
 */
export function canPostJob(tier: BusinessTier, activeJobCount: number): boolean {
  const effective = getEffectiveTier(tier);
  const limit = TIER_FEATURES[effective].maxActiveJobs;
  return activeJobCount < limit;
}

/**
 * Get the maximum number of active jobs for a tier.
 */
export function getJobLimit(tier: BusinessTier): number {
  const effective = getEffectiveTier(tier);
  return TIER_FEATURES[effective].maxActiveJobs;
}

/**
 * Check if a business can access analytics.
 */
export function canAccessAnalytics(tier: BusinessTier): boolean {
  return TIER_FEATURES[getEffectiveTier(tier)].analytics;
}

/**
 * Check if a business can feature jobs.
 */
export function canFeatureJobs(tier: BusinessTier): boolean {
  return TIER_FEATURES[getEffectiveTier(tier)].canFeatureJobs;
}

/**
 * Check if a feature is available for a tier.
 */
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

/**
 * Whether to show the grace period messaging.
 */
export function isGracePeriod(): boolean {
  return LAUNCH_GRACE_PERIOD;
}
