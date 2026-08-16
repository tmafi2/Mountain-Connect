"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  TIER_FEATURES,
  PRICING,
  isGracePeriod,
  isFoundingPricingOpen,
  FOUNDING_PRICING_ENDS,
  resolveEffectiveTier,
  isInCourtesyWindow,
  seasonSavingsPct,
  foundingDiscountPct,
  type BusinessTier,
  type BillingInterval,
  type PaidTier,
  type BillingState,
} from "@/lib/tier";

const TIERS: BusinessTier[] = ["free", "standard", "premium", "enterprise"];
const PAID: ReadonlySet<string> = new Set(["standard", "premium"]);

const TIER_COLORS: Record<BusinessTier, { border: string; badge: string; cta: string }> = {
  free: { border: "border-accent", badge: "bg-accent text-foreground/60", cta: "" },
  standard: { border: "border-secondary", badge: "bg-secondary text-white", cta: "bg-secondary hover:bg-secondary/90" },
  premium: { border: "border-amber-400", badge: "bg-amber-400 text-white", cta: "bg-amber-500 hover:bg-amber-600" },
  enterprise: { border: "border-purple-400", badge: "bg-purple-500 text-white", cta: "bg-purple-600 hover:bg-purple-700" },
};

interface FeatureRow {
  label: string;
  values: Record<BusinessTier, string | boolean>;
}

const FEATURES: FeatureRow[] = [
  { label: "Job listings", values: { free: "1 free post", standard: "5 active", premium: "Unlimited", enterprise: "Unlimited" } },
  { label: "Featured on employers page", values: { free: false, standard: false, premium: true, enterprise: true } },
  { label: "Feature individual jobs", values: { free: false, standard: false, premium: "Up to 3", enterprise: "Unlimited" } },
  { label: "Analytics dashboard", values: { free: false, standard: "Basic", premium: "Full", enterprise: "Full + export" } },
  { label: "Applicant insights", values: { free: false, standard: false, premium: true, enterprise: true } },
  { label: "Profile badge", values: { free: false, standard: "Verified", premium: "Premium", enterprise: "Enterprise Partner" } },
  { label: "Full profile editing", values: { free: false, standard: true, premium: true, enterprise: true } },
  { label: "Interview scheduling", values: { free: false, standard: true, premium: true, enterprise: true } },
  { label: "Priority support", values: { free: false, standard: false, premium: true, enterprise: "Dedicated manager" } },
];

const fmtDate = (d: Date | string) =>
  new Date(d).toLocaleDateString("en-AU", { day: "numeric", month: "long", year: "numeric" });

export default function UpgradePage() {
  const [billing, setBilling] = useState<BillingState & { trial_ends_at?: string | null; billing_interval?: string | null; is_founding_member?: boolean } | null>(null);
  const [loading, setLoading] = useState(true);
  const [interval, setInterval] = useState<BillingInterval>("season");
  const [checkingOut, setCheckingOut] = useState<PaidTier | null>(null);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);

  const gracePeriod = isGracePeriod();
  const foundingOpen = isFoundingPricingOpen();

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { setLoading(false); return; }
      supabase
        .from("business_profiles")
        .select("tier, selected_tier, subscription_status, grace_period_ends_at, trial_ends_at, billing_interval, is_founding_member")
        .eq("user_id", user.id)
        .single()
        .then(({ data }) => {
          setBilling(data ? (data as typeof billing) : { tier: "free" });
          setLoading(false);
        });
    });
  }, []);

  const startCheckout = async (tier: PaidTier) => {
    setCheckingOut(tier);
    setCheckoutError(null);
    try {
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tier, interval }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.url) {
        window.location.href = data.url;
        return;
      }
      setCheckoutError(data.error || "Couldn't start checkout. Please try again.");
    } catch {
      setCheckoutError("Couldn't start checkout. Please try again.");
    } finally {
      setCheckingOut(null);
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-primary" />
      </div>
    );
  }

  const state: BillingState = billing ?? { tier: "free" };
  const effectiveTier = resolveEffectiveTier(state);
  const inCourtesy = isInCourtesyWindow(state);
  const subscribedTier = state.subscription_status && ["trialing", "active", "past_due"].includes(state.subscription_status) ? state.selected_tier : null;
  const isTrialing = state.subscription_status === "trialing";

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-primary">Choose Your Plan</h1>
        <p className="mt-2 text-foreground/60">
          Your first job post is free, forever. Pick a plan when you&apos;re ready to post more.
        </p>
      </div>

      {/* Status banner: global launch grace, per-business courtesy window, or active trial */}
      {gracePeriod ? (
        <div className="mt-6 rounded-xl border border-highlight/30 bg-highlight/5 px-6 py-4 text-center">
          <p className="text-sm font-semibold text-primary">Launch Period — all Premium features are currently free</p>
          <p className="mt-1 text-xs text-foreground/50">We&apos;ll email you before this ends so you can lock in a founding-member rate.</p>
        </div>
      ) : inCourtesy && state.grace_period_ends_at ? (
        <div className="mt-6 rounded-xl border border-highlight/30 bg-highlight/5 px-6 py-4 text-center">
          <p className="text-sm font-semibold text-primary">
            You have Premium access until {fmtDate(state.grace_period_ends_at)}
          </p>
          <p className="mt-1 text-xs text-foreground/50">
            As an early business you keep full access until then. Choose a plan any time to lock in founding-member pricing.
          </p>
        </div>
      ) : isTrialing && billing?.trial_ends_at ? (
        <div className="mt-6 rounded-xl border border-green-200 bg-green-50 px-6 py-4 text-center">
          <p className="text-sm font-semibold text-green-800">
            You&apos;re on a free trial of {TIER_FEATURES[(subscribedTier ?? "standard") as BusinessTier].name} until {fmtDate(billing.trial_ends_at)}
          </p>
          <p className="mt-1 text-xs text-green-700/70">Your card won&apos;t be charged until then. Cancel anytime from Manage billing.</p>
        </div>
      ) : null}

      {/* Founding-member banner */}
      {foundingOpen && (
        <div className="mt-4 flex flex-col items-center gap-1 rounded-xl border border-amber-200 bg-amber-50 px-6 py-4 text-center">
          <p className="text-sm font-bold text-amber-900">
            🏔️ Founding-member pricing — locked in for as long as you stay subscribed
          </p>
          <p className="text-xs text-amber-800/70">
            Available until {fmtDate(FOUNDING_PRICING_ENDS)}. After that, new subscribers pay the full rate.
          </p>
        </div>
      )}

      {/* Monthly / Season toggle */}
      <div className="mt-8 flex justify-center">
        <div className="inline-flex rounded-full border border-accent bg-white p-1 text-sm">
          <button
            type="button"
            onClick={() => setInterval("month")}
            className={`rounded-full px-4 py-1.5 font-medium transition-colors ${interval === "month" ? "bg-primary text-white" : "text-foreground/60 hover:text-primary"}`}
          >
            Monthly
          </button>
          <button
            type="button"
            onClick={() => setInterval("season")}
            className={`rounded-full px-4 py-1.5 font-medium transition-colors ${interval === "season" ? "bg-primary text-white" : "text-foreground/60 hover:text-primary"}`}
          >
            Season pass
            <span className={`ml-1.5 rounded-full px-1.5 py-0.5 text-[10px] font-bold ${interval === "season" ? "bg-white/20 text-white" : "bg-green-100 text-green-700"}`}>
              Save {seasonSavingsPct("standard")}%
            </span>
          </button>
        </div>
      </div>

      {checkoutError && (
        <div className="mx-auto mt-4 max-w-xl rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-center text-sm text-red-700">
          {checkoutError}
        </div>
      )}

      {/* Pricing Cards */}
      <div className="mt-8 grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-4">
        {TIERS.map((tier) => {
          const features = TIER_FEATURES[tier];
          const colors = TIER_COLORS[tier];
          const isPaid = PAID.has(tier);
          const isCurrentSub = subscribedTier === tier;
          const isEffective = effectiveTier === tier && !isPaid;
          const isPopular = tier === "standard";

          const price = isPaid ? PRICING[tier as PaidTier] : null;
          const payNow = price ? (foundingOpen ? price.founding[interval] : price.full[interval]) : null;
          const fullPrice = price ? price.full[interval] : null;
          const showStrike = foundingOpen && price !== null;

          return (
            <div
              key={tier}
              className={`relative flex flex-col rounded-2xl border-2 bg-white p-6 transition-shadow hover:shadow-lg ${
                isCurrentSub ? `${colors.border} ring-2 ring-offset-2 ring-secondary/30` : colors.border
              }`}
            >
              {isPopular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="rounded-full bg-secondary px-4 py-1 text-xs font-bold text-white shadow-sm">Most Popular</span>
                </div>
              )}

              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-primary">{features.name}</h2>
                {(isCurrentSub || (isEffective && tier === "free" && !subscribedTier)) && (
                  <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold ${colors.badge}`}>Current</span>
                )}
              </div>

              {/* Price block */}
              <div className="mt-4 min-h-[64px]">
                {tier === "free" && (
                  <>
                    <span className="text-3xl font-extrabold text-primary">$0</span>
                    <p className="mt-0.5 text-xs text-foreground/50">Forever free · no card needed</p>
                  </>
                )}
                {tier === "enterprise" && (
                  <>
                    <span className="text-3xl font-extrabold text-primary">Custom</span>
                    <p className="mt-0.5 text-xs text-foreground/50">Tailored to your operation</p>
                  </>
                )}
                {isPaid && payNow !== null && (
                  <>
                    <div className="flex items-baseline gap-2">
                      {showStrike && (
                        <span className="text-lg font-semibold text-foreground/35 line-through">${fullPrice}</span>
                      )}
                      <span className="text-3xl font-extrabold text-primary">${payNow}</span>
                      <span className="text-sm text-foreground/50">USD / {interval === "month" ? "month" : "season"}</span>
                    </div>
                    <p className="mt-0.5 text-xs text-foreground/50">
                      {interval === "season"
                        ? `One payment covers your whole hiring season`
                        : `Billed monthly · cancel anytime`}
                    </p>
                    {showStrike && (
                      <span className="mt-1.5 inline-block rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800">
                        Founding rate · {foundingDiscountPct(tier as PaidTier, interval)}% off
                      </span>
                    )}
                  </>
                )}
              </div>

              <p className="mt-3 text-sm text-foreground/60">
                {tier === "free" && "Post your first job free. Applicant tracking and messaging included."}
                {tier === "standard" && "For pubs, cafés and lodges hiring a handful of roles each season."}
                {tier === "premium" && "For hotels and operators hiring at scale. Unlimited jobs and top placement."}
                {tier === "enterprise" && "For resort companies and multi-venue groups with dedicated support."}
              </p>

              {/* Feature list */}
              <ul className="mt-5 flex-1 space-y-2.5">
                {FEATURES.map((f) => {
                  const val = f.values[tier];
                  const available = val !== false;
                  return (
                    <li key={f.label} className="flex items-start gap-2 text-sm">
                      {available ? (
                        <svg className="mt-0.5 h-4 w-4 shrink-0 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      ) : (
                        <svg className="mt-0.5 h-4 w-4 shrink-0 text-foreground/15" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      )}
                      <span className={available ? "text-foreground/70" : "text-foreground/30"}>
                        {f.label}
                        {typeof val === "string" && <span className="ml-1 text-xs text-foreground/40">({val})</span>}
                      </span>
                    </li>
                  );
                })}
              </ul>

              {/* CTA */}
              <div className="mt-6">
                {tier === "free" ? (
                  <div className="rounded-lg border border-accent/50 px-4 py-2.5 text-center text-sm text-foreground/40">
                    {subscribedTier ? "Included" : "Your current plan"}
                  </div>
                ) : tier === "enterprise" ? (
                  <a
                    href="mailto:hello@mountainconnects.com?subject=Enterprise Plan Inquiry&body=Hi, I'd like to learn more about the Enterprise plan for my business on Mountain Connects."
                    className={`block w-full rounded-xl py-2.5 text-center text-sm font-bold text-white transition-colors ${colors.cta}`}
                  >
                    Talk to us
                  </a>
                ) : isCurrentSub ? (
                  <a
                    href="/api/billing/portal"
                    className="block w-full rounded-lg bg-green-50 px-4 py-2.5 text-center text-sm font-medium text-green-700 hover:bg-green-100"
                  >
                    {isTrialing ? "Trialing · Manage billing" : "Your plan · Manage billing"}
                  </a>
                ) : (
                  <button
                    type="button"
                    onClick={() => startCheckout(tier as PaidTier)}
                    disabled={checkingOut !== null}
                    className={`block w-full rounded-xl py-2.5 text-center text-sm font-bold text-white transition-colors disabled:opacity-60 ${colors.cta}`}
                  >
                    {checkingOut === tier
                      ? "Redirecting…"
                      : subscribedTier
                        ? `Switch to ${features.name}`
                        : "Start 30-day free trial"}
                  </button>
                )}
                {isPaid && !isCurrentSub && (
                  <p className="mt-2 text-center text-[11px] text-foreground/40">
                    Card required · no charge for 30 days · cancel anytime
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* FAQ */}
      <div className="mt-16">
        <h2 className="text-center text-lg font-bold text-primary">Frequently Asked Questions</h2>
        <div className="mt-6 space-y-4">
          <div className="rounded-xl border border-accent bg-white p-5">
            <h3 className="font-semibold text-primary">How does the free trial work?</h3>
            <p className="mt-1 text-sm text-foreground/60">
              Pick Standard or Premium and you get 30 days of that plan free. We take a card up front but don&apos;t charge it until the trial ends — cancel any time before then and you pay nothing. If you cancel, you drop back to the free plan and keep your most recent job post live.
            </p>
          </div>
          <div className="rounded-xl border border-accent bg-white p-5">
            <h3 className="font-semibold text-primary">What is founding-member pricing?</h3>
            <p className="mt-1 text-sm text-foreground/60">
              Businesses that subscribe before {fmtDate(FOUNDING_PRICING_ENDS)} pay our launch rate — and keep it for as long as they stay continuously subscribed, even after the full price applies to new signups.
            </p>
          </div>
          <div className="rounded-xl border border-accent bg-white p-5">
            <h3 className="font-semibold text-primary">Monthly or season pass — which should I choose?</h3>
            <p className="mt-1 text-sm text-foreground/60">
              Most seasonal businesses hire hard for a few months then go quiet. A season pass is one payment that covers the whole hiring season and works out around {seasonSavingsPct("standard")}% cheaper than paying monthly. Monthly is there if you only need a few weeks.
            </p>
          </div>
          <div className="rounded-xl border border-accent bg-white p-5">
            <h3 className="font-semibold text-primary">What happens to my jobs if I downgrade or cancel?</h3>
            <p className="mt-1 text-sm text-foreground/60">
              We never delete your listings. If you drop below your plan&apos;s limit, your most recent job stays live and the rest are paused — you can reactivate them any time by upgrading again.
            </p>
          </div>
          <div className="rounded-xl border border-accent bg-white p-5">
            <h3 className="font-semibold text-primary">Can I change plans later?</h3>
            <p className="mt-1 text-sm text-foreground/60">Yes — upgrade, downgrade or switch between monthly and season pass any time from Manage billing. Changes are prorated.</p>
          </div>
          <div className="rounded-xl border border-accent bg-white p-5">
            <h3 className="font-semibold text-primary">What&apos;s included in Enterprise?</h3>
            <p className="mt-1 text-sm text-foreground/60">Everything in Premium plus a dedicated account manager, multi-venue and multi-user support, and bulk data export. Pricing is tailored to your operation — get in touch.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
