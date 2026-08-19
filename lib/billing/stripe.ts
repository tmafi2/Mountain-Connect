import Stripe from "stripe";
import type { BillingInterval, PaidTier } from "@/lib/tier";

/**
 * Stripe client + price map. The ONLY module that reads Stripe env vars.
 *
 * Billing is USD-only for now. Every paid plan × interval maps to one
 * Stripe Price. Founding vs full pricing is handled by a Stripe Coupon
 * applied at checkout (see FOUNDING_COUPON_ID) rather than separate
 * prices, so a founding member's subscription carries the discount for
 * its lifetime and "full price" is simply the undiscounted Price.
 *
 * Required env (Vercel + .env.local):
 *   STRIPE_SECRET_KEY               sk_test_... / sk_live_...
 *   STRIPE_WEBHOOK_SECRET           whsec_...   (from `stripe listen` or dashboard)
 *   STRIPE_PRICE_STANDARD_MONTH     price_...
 *   STRIPE_PRICE_STANDARD_SEASON    price_...
 *   STRIPE_PRICE_PREMIUM_MONTH      price_...
 *   STRIPE_PRICE_PREMIUM_SEASON     price_...
 *   STRIPE_COUPON_FOUNDING_MONTH    <coupon id>  founding discount for monthly plans
 *   STRIPE_COUPON_FOUNDING_SEASON   <coupon id>  founding discount for season passes
 *                                   (both optional; if unset, no discount applied)
 *
 * `scripts/stripe-setup.ts` creates the products/prices/coupon and prints
 * these values — run it once per Stripe mode (test, then live).
 *
 * If STRIPE_SECRET_KEY is missing, isBillingEnabled() is false and every
 * billing route returns a clear 503 instead of crashing. That lets the
 * whole billing UI ship and be exercised before Stripe is configured.
 */

let _stripe: Stripe | null = null;

export function isBillingEnabled(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY);
}

export function getStripe(): Stripe {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error("STRIPE_SECRET_KEY is not set — billing is not enabled");
  }
  if (!_stripe) {
    _stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      // Pin to a fixed API version so Stripe-side changes never silently
      // alter webhook payload shapes underneath us.
      apiVersion: "2026-07-29.dahlia",
      typescript: true,
      appInfo: { name: "Mountain Connects", url: "https://www.mountainconnects.com" },
    });
  }
  return _stripe;
}

export const BILLING_CURRENCY = "usd" as const;
// Single source lives in ./trial so client components can read it without
// pulling the Stripe SDK into the browser bundle.
export { TRIAL_DAYS } from "./trial";

const PRICE_ENV: Record<PaidTier, Record<BillingInterval, string>> = {
  standard: { month: "STRIPE_PRICE_STANDARD_MONTH", season: "STRIPE_PRICE_STANDARD_SEASON" },
  premium: { month: "STRIPE_PRICE_PREMIUM_MONTH", season: "STRIPE_PRICE_PREMIUM_SEASON" },
};

export function getPriceId(tier: PaidTier, interval: BillingInterval): string {
  const key = PRICE_ENV[tier][interval];
  const id = process.env[key];
  if (!id) throw new Error(`Missing Stripe price env var ${key}`);
  return id;
}

/** Reverse lookup: which (tier, interval) does a Stripe price id belong to? */
export function planForPriceId(priceId: string): { tier: PaidTier; interval: BillingInterval } | null {
  for (const tier of ["standard", "premium"] as const) {
    for (const interval of ["month", "season"] as const) {
      if (process.env[PRICE_ENV[tier][interval]] === priceId) return { tier, interval };
    }
  }
  return null;
}

/**
 * Founding pricing = a percent-off coupon with duration "forever", so the
 * discount lives on the subscription for its whole life ("locked in while
 * continuously subscribed"). Monthly and season carry different discounts
 * (~20% vs ~32%), hence one coupon per interval.
 */
export function getFoundingCouponId(interval: BillingInterval): string | null {
  return (
    (interval === "season"
      ? process.env.STRIPE_COUPON_FOUNDING_SEASON
      : process.env.STRIPE_COUPON_FOUNDING_MONTH) || null
  );
}

/** Season pass = one payment covering ~6 months. Modelled as a 6-month recurring price. */
export const SEASON_INTERVAL_MONTHS = 6;

export function siteOrigin(): string {
  return process.env.NEXT_PUBLIC_BASE_URL || "https://www.mountainconnects.com";
}
