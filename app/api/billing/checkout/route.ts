import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { rateLimit } from "@/lib/rate-limit";
import { isFoundingPricingOpen, type BillingInterval, type PaidTier } from "@/lib/tier";
import {
  getStripe,
  isBillingEnabled,
  getPriceId,
  getFoundingCouponId,
  siteOrigin,
  TRIAL_DAYS,
} from "@/lib/billing/stripe";

/**
 * POST /api/billing/checkout
 * Body: { tier: "standard" | "premium", interval: "month" | "season" }
 *
 * Creates a Stripe Checkout Session for a subscription with a 30-day free
 * trial. The card is collected up front (Checkout's default
 * payment_method_collection = "always") and not charged until the trial
 * ends. Founding-member pricing is applied as a coupon while the founding
 * window is open, so the discount lives on the subscription for its
 * lifetime.
 *
 * Returns { url } to redirect to. 503 with a clear message if billing
 * isn't configured yet.
 */
export async function POST(request: Request) {
  const rateLimited = await rateLimit(request, { identifier: "billing-checkout", limit: 10, window: "1 m" });
  if (rateLimited) return rateLimited;

  if (!isBillingEnabled()) {
    return NextResponse.json(
      { error: "Online billing isn't switched on yet. Email hello@mountainconnects.com and we'll set you up." },
      { status: 503 }
    );
  }

  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    let body: { tier?: string; interval?: string };
    try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

    const tier = body.tier as PaidTier;
    const interval = (body.interval ?? "season") as BillingInterval;
    if (tier !== "standard" && tier !== "premium") {
      return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
    }
    if (interval !== "month" && interval !== "season") {
      return NextResponse.json({ error: "Invalid billing interval" }, { status: 400 });
    }

    const { data: business } = await supabase
      .from("business_profiles")
      .select("id, business_name, email, stripe_customer_id, subscription_status, stripe_subscription_id")
      .eq("user_id", user.id)
      .single();
    if (!business) return NextResponse.json({ error: "Business profile not found" }, { status: 404 });

    // Already on a live subscription? Plan changes go through the portal
    // (prorated), not a fresh checkout that would create a 2nd subscription.
    if (
      business.stripe_subscription_id &&
      business.subscription_status &&
      ["trialing", "active", "past_due"].includes(business.subscription_status)
    ) {
      return NextResponse.json(
        { error: "You already have an active plan. Use Manage billing to change it.", portal: true },
        { status: 409 }
      );
    }

    const stripe = getStripe();
    const admin = createAdminClient();

    // Reuse the Stripe customer if we have one, otherwise create + persist.
    let customerId = business.stripe_customer_id as string | null;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: business.email || user.email || undefined,
        name: business.business_name || undefined,
        metadata: { business_id: business.id, user_id: user.id },
      });
      customerId = customer.id;
      await admin
        .from("business_profiles")
        .update({ stripe_customer_id: customerId, billing_updated_at: new Date().toISOString() })
        .eq("id", business.id);
    }

    const foundingOpen = isFoundingPricingOpen();
    const couponId = foundingOpen ? getFoundingCouponId(interval) : null;
    const origin = siteOrigin();

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      line_items: [{ price: getPriceId(tier, interval), quantity: 1 }],
      // Card is collected now (default "always"), charged at trial end.
      subscription_data: {
        trial_period_days: TRIAL_DAYS,
        metadata: {
          business_id: business.id,
          selected_tier: tier,
          billing_interval: interval,
          founding_member: foundingOpen ? "true" : "false",
        },
      },
      ...(couponId ? { discounts: [{ coupon: couponId }] } : { allow_promotion_codes: true }),
      metadata: { business_id: business.id, selected_tier: tier, billing_interval: interval },
      client_reference_id: business.id,
      success_url: `${origin}/business/dashboard?billing=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/business/upgrade?billing=cancelled`,
      billing_address_collection: "auto",
    });

    if (!session.url) {
      return NextResponse.json({ error: "Stripe did not return a checkout URL" }, { status: 502 });
    }
    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error("billing/checkout error:", err);
    const msg = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
