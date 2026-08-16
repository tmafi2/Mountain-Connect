import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import { getStripe, isBillingEnabled } from "@/lib/billing/stripe";
import { syncSubscriptionToBusiness } from "@/lib/billing/sync";

/**
 * POST /api/billing/webhook  — Stripe event destination.
 *
 * Register this URL in Stripe (Workbench → Webhooks) with these events:
 *   checkout.session.completed
 *   customer.subscription.created
 *   customer.subscription.updated
 *   customer.subscription.deleted
 *   customer.subscription.trial_will_end
 *   invoice.paid
 *   invoice.payment_failed
 *
 * Every subscription-affecting event funnels into syncSubscriptionToBusiness,
 * which re-fetches the subscription and writes the latest truth. That makes
 * the handler idempotent and safe against out-of-order / duplicate delivery
 * (both of which Stripe explicitly allows).
 *
 * Signature is verified against the RAW body — never parse before verify.
 */
export async function POST(request: Request) {
  if (!isBillingEnabled() || !process.env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Billing not configured" }, { status: 503 });
  }

  const sig = request.headers.get("stripe-signature");
  if (!sig) return NextResponse.json({ error: "Missing signature" }, { status: 400 });

  const rawBody = await request.text();
  const stripe = getStripe();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error("[billing] webhook signature verification failed:", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const admin = createAdminClient();

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        if (session.mode === "subscription" && session.subscription) {
          const subId = typeof session.subscription === "string" ? session.subscription : session.subscription.id;
          await syncSubscriptionToBusiness(admin, subId);
        }
        break;
      }

      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        await syncSubscriptionToBusiness(admin, sub.id);
        break;
      }

      case "customer.subscription.trial_will_end": {
        // Fires ~3 days before trial end. Sync state; the reminder email
        // itself is sent by Stripe's built-in trial reminder (enable in
        // Dashboard → Settings → Billing → Subscriptions and emails) so we
        // don't double up.
        const sub = event.data.object as Stripe.Subscription;
        await syncSubscriptionToBusiness(admin, sub.id);
        break;
      }

      case "invoice.paid":
      case "invoice.payment_failed": {
        // Invoice events carry the subscription id; sync it so
        // past_due / active flips land promptly.
        const invoice = event.data.object as Stripe.Invoice;
        const subRef = (invoice as unknown as { subscription?: string | { id: string } | null }).subscription
          ?? (invoice.parent?.subscription_details?.subscription as string | { id: string } | null | undefined);
        const subId = typeof subRef === "string" ? subRef : subRef?.id;
        if (subId) await syncSubscriptionToBusiness(admin, subId);
        break;
      }

      default:
        // Not one we act on; acknowledge so Stripe doesn't retry.
        break;
    }
  } catch (err) {
    // Return 500 so Stripe retries — the sync is idempotent, so a retry is safe.
    console.error(`[billing] webhook handler error for ${event.type}:`, err);
    return NextResponse.json({ error: "Handler error" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
