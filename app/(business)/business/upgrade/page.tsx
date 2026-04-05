"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { TIER_FEATURES, isGracePeriod } from "@/lib/tier";
import type { BusinessTier } from "@/lib/tier";

const FEATURES_LIST = [
  { key: "maxActiveJobs", label: "Active job listings", freeValue: "1", premiumValue: "Unlimited" },
  { key: "featuredPlacement", label: "Featured on employers page", freeValue: false, premiumValue: true },
  { key: "premiumBadge", label: "Premium badge on profile", freeValue: false, premiumValue: true },
  { key: "canFeatureJobs", label: "Feature job listings", freeValue: false, premiumValue: true },
  { key: "analytics", label: "Analytics dashboard", freeValue: false, premiumValue: true },
  { key: "applicantInsights", label: "Applicant insights", freeValue: false, premiumValue: true },
  { key: "prioritySupport", label: "Priority support", freeValue: false, premiumValue: true },
];

export default function UpgradePage() {
  const [currentTier, setCurrentTier] = useState<BusinessTier>("free");
  const [loading, setLoading] = useState(true);
  const gracePeriod = isGracePeriod();

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        supabase
          .from("business_profiles")
          .select("tier")
          .eq("user_id", user.id)
          .single()
          .then(({ data }) => {
            if (data?.tier) setCurrentTier(data.tier as BusinessTier);
            setLoading(false);
          });
      } else {
        setLoading(false);
      }
    });
  }, []);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-primary" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-primary">Choose Your Plan</h1>
        <p className="mt-2 text-foreground/60">
          {gracePeriod
            ? "All features are free during our launch period. Choose a plan for when we fully launch."
            : "Upgrade to Premium to unlock the full power of Mountain Connect."
          }
        </p>
      </div>

      {gracePeriod && (
        <div className="mt-6 rounded-xl border border-highlight/30 bg-highlight/5 px-6 py-4 text-center">
          <p className="text-sm font-semibold text-primary">
            🎉 Launch Period — All Premium features are currently free!
          </p>
          <p className="mt-1 text-xs text-foreground/50">
            We&apos;ll notify you before the launch period ends so you can choose your plan.
          </p>
        </div>
      )}

      {/* Pricing cards */}
      <div className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-2">
        {/* Free Plan */}
        <div className={`rounded-2xl border p-8 ${currentTier === "free" && !gracePeriod ? "border-primary bg-primary/5" : "border-accent bg-white"}`}>
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-primary">Free</h2>
            {currentTier === "free" && (
              <span className="rounded-full bg-accent px-3 py-1 text-xs font-semibold text-foreground/60">
                Current Plan
              </span>
            )}
          </div>
          <div className="mt-4">
            <span className="text-4xl font-extrabold text-primary">$0</span>
            <span className="ml-1 text-foreground/50">/forever</span>
          </div>
          <p className="mt-3 text-sm text-foreground/60">
            Get started with the basics. Perfect for small businesses testing the waters.
          </p>

          <ul className="mt-6 space-y-3">
            {FEATURES_LIST.map((f) => (
              <li key={f.key} className="flex items-center gap-2 text-sm">
                {f.freeValue === false ? (
                  <svg className="h-4 w-4 text-foreground/20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                ) : (
                  <svg className="h-4 w-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                )}
                <span className={f.freeValue === false ? "text-foreground/30" : "text-foreground/70"}>
                  {f.label} {typeof f.freeValue === "string" ? `(${f.freeValue})` : ""}
                </span>
              </li>
            ))}
          </ul>
        </div>

        {/* Premium Plan */}
        <div className={`rounded-2xl border-2 p-8 relative ${currentTier === "premium" ? "border-secondary bg-secondary/5" : "border-secondary/50 bg-white"}`}>
          <div className="absolute -top-3 left-1/2 -translate-x-1/2">
            <span className="rounded-full bg-secondary px-4 py-1 text-xs font-bold text-white">
              Most Popular
            </span>
          </div>
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-primary">Premium</h2>
            {currentTier === "premium" && (
              <span className="rounded-full bg-secondary/10 px-3 py-1 text-xs font-semibold text-secondary">
                Current Plan
              </span>
            )}
          </div>
          <div className="mt-4">
            <span className="text-4xl font-extrabold text-primary">{TIER_FEATURES.premium.price}</span>
            <span className="ml-1 text-foreground/50">/{TIER_FEATURES.premium.priceNote}</span>
          </div>
          <p className="mt-3 text-sm text-foreground/60">
            Everything you need to hire seasonal workers effectively and stand out from the crowd.
          </p>

          <ul className="mt-6 space-y-3">
            {FEATURES_LIST.map((f) => (
              <li key={f.key} className="flex items-center gap-2 text-sm">
                <svg className="h-4 w-4 text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span className="text-foreground/70">
                  {f.label} {typeof f.premiumValue === "string" ? `(${f.premiumValue})` : ""}
                </span>
              </li>
            ))}
          </ul>

          {currentTier !== "premium" && (
            <a
              href="mailto:hello@mountainconnects.com?subject=Upgrade to Premium&body=Hi, I'd like to upgrade my business to the Premium plan on Mountain Connect."
              className="mt-8 block w-full rounded-xl bg-secondary py-3 text-center text-sm font-bold text-white transition-colors hover:bg-secondary/90"
            >
              Contact Us to Upgrade
            </a>
          )}

          {currentTier === "premium" && !gracePeriod && (
            <div className="mt-8 rounded-lg bg-green-50 px-4 py-3 text-center text-sm text-green-700">
              You&apos;re on the Premium plan. All features unlocked!
            </div>
          )}

          {gracePeriod && currentTier !== "premium" && (
            <div className="mt-8 rounded-lg bg-highlight/10 px-4 py-3 text-center text-sm text-primary">
              Currently free during launch period
            </div>
          )}
        </div>
      </div>

      {/* FAQ */}
      <div className="mt-16">
        <h2 className="text-center text-lg font-bold text-primary">Frequently Asked Questions</h2>
        <div className="mt-6 space-y-4">
          <div className="rounded-xl border border-accent bg-white p-5">
            <h3 className="font-semibold text-primary">Can I change plans later?</h3>
            <p className="mt-1 text-sm text-foreground/60">Yes, you can upgrade or downgrade at any time. Contact us and we&apos;ll update your plan.</p>
          </div>
          <div className="rounded-xl border border-accent bg-white p-5">
            <h3 className="font-semibold text-primary">What happens to my jobs if I downgrade?</h3>
            <p className="mt-1 text-sm text-foreground/60">Your existing job listings will remain active. You&apos;ll only be limited when posting new jobs. We&apos;ll never delete your existing listings.</p>
          </div>
          <div className="rounded-xl border border-accent bg-white p-5">
            <h3 className="font-semibold text-primary">Is there a discount for seasonal/yearly plans?</h3>
            <p className="mt-1 text-sm text-foreground/60">Contact us at hello@mountainconnects.com to discuss seasonal pricing options.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
