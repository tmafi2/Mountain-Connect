"use client";

import Link from "next/link";
import {
  TIER_FEATURES,
  isGracePeriod,
  isFoundingPricingOpen,
  resolveEffectiveTier,
  isInCourtesyWindow,
  type BusinessTier,
} from "@/lib/tier";

/**
 * Dashboard "your plan" panel. Reads the business's billing state and shows
 * the one thing they need to know right now — trial countdown, courtesy
 * window, past-due warning, or a nudge to upgrade — with the right CTA.
 */
export interface PlanPanelBilling {
  tier: BusinessTier | null;
  selected_tier?: BusinessTier | null;
  subscription_status?: string | null;
  grace_period_ends_at?: string | null;
  trial_ends_at?: string | null;
  current_period_end?: string | null;
  billing_interval?: "month" | "season" | string | null;
  is_founding_member?: boolean | null;
}

const daysUntil = (iso: string) =>
  Math.max(0, Math.ceil((new Date(iso).getTime() - Date.now()) / 86_400_000));
const fmt = (iso: string) =>
  new Date(iso).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" });

export default function PlanPanel({ billing, activeJobs }: { billing: PlanPanelBilling; activeJobs: number }) {
  const state = { ...billing, tier: billing.tier ?? "free" };
  const effective = resolveEffectiveTier(state);
  const feat = TIER_FEATURES[effective];
  const limitLabel = Number.isFinite(feat.maxActiveJobs) ? `${activeJobs} of ${feat.maxActiveJobs}` : `${activeJobs}`;
  const status = billing.subscription_status ?? null;
  const planName = billing.selected_tier ? TIER_FEATURES[billing.selected_tier].name : feat.name;

  // Decide the headline + tone once; render below.
  let tone: "info" | "success" | "warn" | "neutral" = "neutral";
  let title = "";
  let detail = "";
  let cta: { href: string; label: string } = { href: "/business/upgrade", label: "View plans" };

  if (isGracePeriod()) {
    tone = "info";
    title = "🎉 Launch period — Premium features are free";
    detail = isFoundingPricingOpen()
      ? "We'll email you before this ends. Lock in a founding-member rate any time."
      : "We'll email you before this ends.";
  } else if (isInCourtesyWindow(state) && billing.grace_period_ends_at) {
    const d = daysUntil(billing.grace_period_ends_at);
    tone = d <= 7 ? "warn" : "info";
    title = `Premium access for ${d} more day${d === 1 ? "" : "s"}`;
    detail = `As an early business you keep full access until ${fmt(billing.grace_period_ends_at)}. Pick a plan before then to keep posting without interruption — founding rates are locked in for good.`;
    cta = { href: "/business/upgrade", label: "Choose a plan" };
  } else if (status === "trialing" && billing.trial_ends_at) {
    const d = daysUntil(billing.trial_ends_at);
    tone = d <= 3 ? "warn" : "success";
    title = `${planName} free trial — ${d} day${d === 1 ? "" : "s"} left`;
    detail = `Your card will be charged on ${fmt(billing.trial_ends_at)} unless you cancel before then. ${billing.is_founding_member ? "Founding-member rate locked in." : ""}`.trim();
    cta = { href: "/api/billing/portal", label: "Manage billing" };
  } else if (status === "past_due") {
    tone = "warn";
    title = "Payment failed — please update your card";
    detail = `We couldn't charge your card for the ${planName} plan. Update it to keep your listings live; we'll retry automatically for a few days.`;
    cta = { href: "/api/billing/portal", label: "Update card" };
  } else if (status === "active" && billing.selected_tier) {
    tone = "success";
    title = `${planName} plan${billing.is_founding_member ? " · Founding member" : ""}`;
    detail = billing.current_period_end
      ? `${billing.billing_interval === "season" ? "Season pass renews" : "Renews"} ${fmt(billing.current_period_end)}. Active listings: ${limitLabel}.`
      : `Active listings: ${limitLabel}.`;
    cta = { href: "/api/billing/portal", label: "Manage billing" };
  } else if (effective === "enterprise") {
    tone = "success";
    title = "Enterprise plan";
    detail = "Unlimited listings, dedicated support. Contact us for any changes.";
    cta = { href: "mailto:hello@mountainconnects.com?subject=Enterprise plan", label: "Contact us" };
  } else {
    // Free (incl. lapsed / cancelled)
    tone = "neutral";
    const lapsed = status === "canceled" || status === "unpaid";
    title = lapsed ? "Your plan has ended — you're on Free" : "Free plan";
    detail = lapsed
      ? "Your most recent job stays live; extras are paused. Re-subscribe any time to bring them back."
      : "Your first job post is free. Pick a plan to post more — both come with a 30-day free trial.";
    cta = { href: "/business/upgrade", label: lapsed ? "Re-subscribe" : "See plans" };
  }

  const toneClass = {
    info: "border-secondary/20 bg-secondary/5",
    success: "border-green-200 bg-green-50",
    warn: "border-amber-300 bg-amber-50",
    neutral: "border-accent/60 bg-white/70",
  }[tone];
  const ctaClass = {
    info: "bg-secondary hover:bg-secondary/90 text-white",
    success: "bg-green-600 hover:bg-green-700 text-white",
    warn: "bg-amber-500 hover:bg-amber-600 text-white",
    neutral: "bg-primary hover:bg-primary/90 text-white",
  }[tone];

  return (
    <div className={`mb-4 flex flex-col gap-3 rounded-xl border px-5 py-4 sm:flex-row sm:items-center sm:justify-between ${toneClass}`}>
      <div className="min-w-0">
        <p className="text-sm font-semibold text-primary">{title}</p>
        {detail && <p className="mt-0.5 text-xs text-foreground/60">{detail}</p>}
      </div>
      <Link
        href={cta.href}
        className={`shrink-0 rounded-lg px-4 py-2 text-center text-xs font-semibold transition-colors ${ctaClass}`}
      >
        {cta.label}
      </Link>
    </div>
  );
}
