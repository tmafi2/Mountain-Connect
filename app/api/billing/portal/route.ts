import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getStripe, isBillingEnabled, siteOrigin } from "@/lib/billing/stripe";

/**
 * GET /api/billing/portal
 *
 * Redirects the business owner to the Stripe Customer Portal where they
 * can update their card, switch plans (prorated), or cancel. Linked from
 * the upgrade page and the dashboard plan panel.
 */
export async function GET() {
  const origin = siteOrigin();

  if (!isBillingEnabled()) {
    return NextResponse.redirect(`${origin}/business/upgrade?billing=unavailable`);
  }

  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.redirect(`${origin}/login`);

    const { data: business } = await supabase
      .from("business_profiles")
      .select("stripe_customer_id")
      .eq("user_id", user.id)
      .single();

    if (!business?.stripe_customer_id) {
      // No Stripe customer yet — nothing to manage; send them to plans.
      return NextResponse.redirect(`${origin}/business/upgrade`);
    }

    const stripe = getStripe();
    const session = await stripe.billingPortal.sessions.create({
      customer: business.stripe_customer_id,
      return_url: `${origin}/business/dashboard`,
    });
    return NextResponse.redirect(session.url);
  } catch (err) {
    console.error("billing/portal error:", err);
    return NextResponse.redirect(`${origin}/business/upgrade?billing=error`);
  }
}
