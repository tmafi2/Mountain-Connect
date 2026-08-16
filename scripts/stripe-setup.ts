/**
 * scripts/stripe-setup.ts
 *
 * One-shot: creates the Mountain Connects products, prices and
 * founding-member coupons in whichever Stripe account STRIPE_SECRET_KEY
 * points at (run once for test mode, once for live), then prints the env
 * vars to paste into Vercel / .env.local.
 *
 * Idempotent: looks up existing objects by lookup_key / coupon id first, so
 * re-running never duplicates anything.
 *
 *   npx tsx scripts/stripe-setup.ts
 *
 * Prices are the FULL rate card from lib/tier.ts. Founding pricing is a
 * percent-off coupon with duration "forever" so it stays on a subscription
 * for life — that's what "locked in while continuously subscribed" means.
 */
import { config } from "dotenv";
config({ path: ".env.local" });

import Stripe from "stripe";
import { PRICING, foundingDiscountPct, TIER_FEATURES } from "../lib/tier";

const CURRENCY = "usd";
const SEASON_MONTHS = 6;

async function main() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    console.error("STRIPE_SECRET_KEY missing from .env.local");
    process.exit(1);
  }
  const stripe = new Stripe(key, { apiVersion: "2026-07-29.dahlia" });
  const mode = key.startsWith("sk_live_") ? "LIVE" : "TEST";
  console.log(`\nSetting up Mountain Connects billing in Stripe ${mode} mode…\n`);

  const env: Record<string, string> = {};

  for (const tier of ["standard", "premium"] as const) {
    const name = `Mountain Connects ${TIER_FEATURES[tier].name}`;
    // Product: find by metadata.tier or create
    const existing = await stripe.products.search({ query: `metadata['mc_tier']:'${tier}'`, limit: 1 });
    const product =
      existing.data[0] ??
      (await stripe.products.create({
        name,
        description:
          tier === "standard"
            ? "5 active job listings, Verified badge, basic analytics, interview scheduling."
            : "Unlimited job listings, featured placement, full analytics, applicant insights, priority support.",
        metadata: { mc_tier: tier },
      }));
    console.log(`✓ product ${product.id}  ${name}`);

    for (const interval of ["month", "season"] as const) {
      const lookupKey = `mc_${tier}_${interval}`;
      const amount = PRICING[tier].full[interval] * 100; // cents, FULL price
      const found = await stripe.prices.list({ lookup_keys: [lookupKey], active: true, limit: 1 });
      const price =
        found.data[0] ??
        (await stripe.prices.create({
          product: product.id,
          currency: CURRENCY,
          unit_amount: amount,
          recurring:
            interval === "month"
              ? { interval: "month", interval_count: 1 }
              : { interval: "month", interval_count: SEASON_MONTHS },
          lookup_key: lookupKey,
          nickname: `${TIER_FEATURES[tier].name} — ${interval === "month" ? "monthly" : "season pass"} (full rate)`,
          metadata: { mc_tier: tier, mc_interval: interval },
        }));
      const envKey = `STRIPE_PRICE_${tier.toUpperCase()}_${interval.toUpperCase()}`;
      env[envKey] = price.id;
      console.log(`  ✓ price ${price.id}  $${amount / 100}/${interval === "month" ? "mo" : "season"}  (${lookupKey})`);
    }
  }

  // Founding coupons — one per interval since the discount differs.
  // Use standard's discount % as the canonical (premium's is within 1%).
  for (const interval of ["month", "season"] as const) {
    const id = `mc-founding-${interval}`;
    const pct = foundingDiscountPct("standard", interval);
    let coupon: Stripe.Coupon;
    try {
      coupon = await stripe.coupons.retrieve(id);
    } catch {
      coupon = await stripe.coupons.create({
        id,
        name: `Founding member — ${interval === "month" ? "monthly" : "season pass"} (${pct}% off, locked in)`,
        percent_off: pct,
        duration: "forever",
        metadata: { mc_founding: "true", mc_interval: interval },
      });
    }
    env[`STRIPE_COUPON_FOUNDING_${interval.toUpperCase()}`] = coupon.id;
    console.log(`✓ coupon ${coupon.id}  ${pct}% off forever`);
  }

  console.log(`\n─── Paste into .env.local and Vercel (${mode}) ─────────────────\n`);
  for (const [k, v] of Object.entries(env)) console.log(`${k}=${v}`);
  console.log(`\nStill needed manually:`);
  console.log(`  STRIPE_WEBHOOK_SECRET=whsec_...   ← from Stripe Workbench → Webhooks after adding`);
  console.log(`      endpoint https://www.mountainconnects.com/api/billing/webhook`);
  console.log(`      (or from \`stripe listen --forward-to localhost:3000/api/billing/webhook\` locally)`);
  console.log(`\nAlso enable in Stripe Dashboard → Settings → Billing → Subscriptions and emails:`);
  console.log(`  • "Send emails about upcoming trial expirations" (trial-end reminder, card-network compliance)`);
  console.log(`  • Customer portal: allow cancel + switch plans between the 4 prices above\n`);
}

main().catch((e) => { console.error(e); process.exit(1); });
