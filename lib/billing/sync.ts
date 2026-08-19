import type Stripe from "stripe";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getStripe, planForPriceId } from "@/lib/billing/stripe";
import { TIER_FEATURES, type BusinessTier } from "@/lib/tier";
import { restoreParkedJobs } from "@/lib/billing/job-parking";

/**
 * Sync a Stripe subscription's state onto its business_profiles row, and
 * apply the downgrade rule when the business loses access.
 *
 * Designed to be IDEMPOTENT and ORDER-INDEPENDENT: Stripe doesn't
 * guarantee event ordering and may deliver duplicates, so instead of
 * trusting the event payload we always re-fetch the subscription from
 * Stripe and write the latest truth. Calling this twice, or out of order,
 * converges on the same result.
 */

const ENTITLED = new Set(["trialing", "active", "past_due"]);

const toIso = (unix: number | null | undefined) =>
  unix ? new Date(unix * 1000).toISOString() : null;

/** Load fresh subscription state from Stripe and write it to the DB. */
export async function syncSubscriptionToBusiness(
  admin: SupabaseClient,
  subscriptionId: string
): Promise<{ businessId: string | null; status: string; effectiveTier: BusinessTier } | null> {
  const stripe = getStripe();
  const sub = await stripe.subscriptions.retrieve(subscriptionId);

  // Resolve which business this belongs to: metadata first, then customer.
  const businessId =
    (sub.metadata?.business_id as string | undefined) ??
    (await businessIdForCustomer(admin, typeof sub.customer === "string" ? sub.customer : sub.customer.id));
  if (!businessId) {
    console.warn("[billing] subscription with no matching business:", subscriptionId);
    return null;
  }

  const priceId = sub.items.data[0]?.price?.id ?? null;
  const plan = priceId ? planForPriceId(priceId) : null;
  const selectedTier: BusinessTier | null =
    plan?.tier ?? ((sub.metadata?.selected_tier as BusinessTier | undefined) ?? null);
  const billingInterval = plan?.interval ?? (sub.metadata?.billing_interval as "month" | "season" | undefined) ?? null;

  const status = sub.status;
  const entitled = ENTITLED.has(status) && !!selectedTier;
  // A subscription that has genuinely ended (canceled/unpaid/expired) means
  // the business drops to free. incomplete = checkout never finished.
  const effectiveTier: BusinessTier = entitled ? (selectedTier as BusinessTier) : "free";

  // Founding membership: sticky once set, but only granted at creation via
  // checkout metadata. If they lapse (canceled) and come back later, the new
  // subscription won't carry founding_member=true.
  const foundingFromMeta = sub.metadata?.founding_member === "true";

  const currentPeriodEnd = sub.items.data[0]?.current_period_end ?? null;

  const update: Record<string, unknown> = {
    stripe_subscription_id: sub.id,
    stripe_customer_id: typeof sub.customer === "string" ? sub.customer : sub.customer.id,
    subscription_status: status,
    selected_tier: selectedTier,
    billing_interval: billingInterval,
    trial_ends_at: toIso(sub.trial_end),
    current_period_end: toIso(currentPeriodEnd),
    billing_updated_at: new Date().toISOString(),
  };
  if (foundingFromMeta) update.is_founding_member = true;

  // Only drive `tier` from billing when the business isn't admin-set
  // enterprise (that's managed outside Stripe).
  const { data: current } = await admin
    .from("business_profiles")
    .select("tier")
    .eq("id", businessId)
    .single();
  if (current?.tier !== "enterprise") {
    update.tier = effectiveTier;
  }
  if (!entitled) {
    // Lapsed: founding status ends with continuous subscription.
    if (status === "canceled" || status === "unpaid" || status === "incomplete_expired") {
      update.is_founding_member = false;
    }
  }

  await admin.from("business_profiles").update(update).eq("id", businessId);

  // Downgrade rule: when access is lost, pause any jobs over the new limit,
  // keeping the newest live. Never delete.
  //
  // The reverse also has to happen. A business that claimed several imported
  // listings kept one live and parked the rest; the moment they start a trial
  // that parked inventory is what they paid for, so restore it in the same
  // step rather than making them re-publish by hand. restoreParkedJobs only
  // touches rows WE parked — anything the owner paused stays paused.
  if (!entitled && current?.tier !== "enterprise") {
    await enforceJobLimit(admin, businessId, "free");
  } else if (entitled && selectedTier) {
    // Order matters: trim first, then fill the remaining headroom. Doing it
    // the other way round would restore into space enforceJobLimit is about
    // to reclaim, and churn the same rows twice on a downgrade.
    await enforceJobLimit(admin, businessId, selectedTier);
    await restoreParkedJobs(admin, businessId, selectedTier);
  }

  return { businessId, status, effectiveTier };
}

/**
 * Pause active jobs beyond what `tier` allows, newest-first kept live.
 * Free = 1, standard = 5, premium/enterprise = unlimited (no-op).
 */
export async function enforceJobLimit(
  admin: SupabaseClient,
  businessId: string,
  tier: BusinessTier
): Promise<number> {
  const limit = TIER_FEATURES[tier].maxActiveJobs;
  if (!Number.isFinite(limit)) return 0;

  const { data: active } = await admin
    .from("job_posts")
    .select("id")
    .eq("business_id", businessId)
    .eq("status", "active")
    .order("created_at", { ascending: false });

  const over = (active ?? []).slice(limit);
  if (over.length === 0) return 0;

  const ids = over.map((j) => j.id);
  const { error } = await admin
    .from("job_posts")
    .update({ status: "paused", is_active: false, paused_reason: "tier_downgrade" })
    .in("id", ids);
  if (error) {
    console.error("[billing] enforceJobLimit failed:", error);
    return 0;
  }
  console.log(`[billing] paused ${ids.length} job(s) for business ${businessId} (limit ${limit})`);
  return ids.length;
}

async function businessIdForCustomer(admin: SupabaseClient, customerId: string): Promise<string | null> {
  const { data } = await admin
    .from("business_profiles")
    .select("id")
    .eq("stripe_customer_id", customerId)
    .maybeSingle();
  return data?.id ?? null;
}

/** Type guard helper for event.data.object narrowing. */
export function asSubscription(obj: unknown): Stripe.Subscription | null {
  return obj && typeof obj === "object" && (obj as { object?: string }).object === "subscription"
    ? (obj as Stripe.Subscription)
    : null;
}
