"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { TIER_FEATURES, isGracePeriod, getTierOrder } from "@/lib/tier";
import type { BusinessTier } from "@/lib/tier";

const TIERS: BusinessTier[] = ["free", "standard", "premium", "enterprise"];

const TIER_COLORS: Record<BusinessTier, { border: string; bg: string; badge: string; cta: string }> = {
  free: { border: "border-accent", bg: "bg-white", badge: "bg-accent text-foreground/60", cta: "" },
  standard: { border: "border-secondary", bg: "bg-white", badge: "bg-secondary text-white", cta: "bg-secondary hover:bg-secondary/90" },
  premium: { border: "border-amber-400", bg: "bg-white", badge: "bg-amber-400 text-white", cta: "bg-amber-500 hover:bg-amber-600" },
  enterprise: { border: "border-purple-400", bg: "bg-white", badge: "bg-purple-500 text-white", cta: "bg-purple-600 hover:bg-purple-700" },
};

interface FeatureRow {
  label: string;
  values: Record<BusinessTier, string | boolean>;
}

const FEATURES: FeatureRow[] = [
  { label: "Active job listings", values: { free: "2 per year", standard: "5 active", premium: "Unlimited", enterprise: "Unlimited" } },
  { label: "Featured on employers page", values: { free: false, standard: false, premium: true, enterprise: true } },
  { label: "Feature individual jobs", values: { free: false, standard: false, premium: "Up to 3", enterprise: "Unlimited" } },
  { label: "Analytics dashboard", values: { free: false, standard: "Basic", premium: "Full", enterprise: "Full + export" } },
  { label: "Applicant insights", values: { free: false, standard: false, premium: true, enterprise: true } },
  { label: "Profile badge", values: { free: false, standard: "Verified", premium: "Premium", enterprise: "Enterprise Partner" } },
  { label: "Full profile editing", values: { free: false, standard: true, premium: true, enterprise: true } },
  { label: "Interview scheduling", values: { free: false, standard: true, premium: true, enterprise: true } },
  { label: "Priority support", values: { free: false, standard: false, premium: true, enterprise: "Dedicated manager" } },
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
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-primary">Choose Your Plan</h1>
        <p className="mt-2 text-foreground/60">
          {gracePeriod
            ? "All Premium features are free during our launch period. Choose a plan for when we fully launch."
            : "Find the right plan for your business. Upgrade or downgrade anytime."
          }
        </p>
      </div>

      {gracePeriod && (
        <div className="mt-6 rounded-xl border border-highlight/30 bg-highlight/5 px-6 py-4 text-center">
          <p className="text-sm font-semibold text-primary">
            Launch Period — All Premium features are currently free!
          </p>
          <p className="mt-1 text-xs text-foreground/50">
            We&apos;ll notify you before the launch period ends so you can choose your plan.
          </p>
        </div>
      )}

      {/* Pricing Cards */}
      <div className="mt-10 grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-4">
        {TIERS.map((tier) => {
          const features = TIER_FEATURES[tier];
          const colors = TIER_COLORS[tier];
          const isCurrent = currentTier === tier;
          const isUpgrade = getTierOrder(tier) < getTierOrder(currentTier);
          const isPopular = tier === "standard";

          return (
            <div
              key={tier}
              className={`relative rounded-2xl border-2 p-6 transition-shadow hover:shadow-lg ${
                isCurrent ? `${colors.border} ring-2 ring-offset-2 ring-secondary/30` : colors.border
              } ${colors.bg}`}
            >
              {isPopular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="rounded-full bg-secondary px-4 py-1 text-xs font-bold text-white shadow-sm">
                    Most Popular
                  </span>
                </div>
              )}

              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-primary">{features.name}</h2>
                {isCurrent && (
                  <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold ${colors.badge}`}>
                    Current
                  </span>
                )}
              </div>

              <div className="mt-4">
                <span className="text-3xl font-extrabold text-primary">{features.price}</span>
                {tier !== "enterprise" && (
                  <span className="ml-1 text-sm text-foreground/50">/{features.priceNote}</span>
                )}
                {tier === "enterprise" && (
                  <p className="mt-1 text-sm text-foreground/50">Custom pricing</p>
                )}
              </div>

              <p className="mt-3 text-sm text-foreground/60">
                {tier === "free" && "Get started with the basics. 2 free job listings per year."}
                {tier === "standard" && "Everything a small seasonal business needs to hire effectively."}
                {tier === "premium" && "Full power for established employers. Unlimited jobs and featured placement."}
                {tier === "enterprise" && "For large resort operations with dedicated support and custom features."}
              </p>

              {/* Feature list */}
              <ul className="mt-5 space-y-2.5">
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
                {isCurrent && !gracePeriod ? (
                  <div className="rounded-lg bg-green-50 px-4 py-2.5 text-center text-sm font-medium text-green-700">
                    Your current plan
                  </div>
                ) : isCurrent && gracePeriod ? (
                  <div className="rounded-lg bg-highlight/10 px-4 py-2.5 text-center text-sm text-primary">
                    Free during launch
                  </div>
                ) : tier === "free" ? (
                  <div className="rounded-lg border border-accent/50 px-4 py-2.5 text-center text-sm text-foreground/40">
                    Free forever
                  </div>
                ) : isUpgrade || gracePeriod ? (
                  tier === "enterprise" ? (
                    <a
                      href="mailto:hello@mountainconnects.com?subject=Enterprise Plan Inquiry&body=Hi, I'd like to learn more about the Enterprise plan for my business on Mountain Connects."
                      className={`block w-full rounded-xl py-2.5 text-center text-sm font-bold text-white transition-colors ${colors.cta}`}
                    >
                      Contact Us
                    </a>
                  ) : (
                    <a
                      href={`mailto:hello@mountainconnects.com?subject=Upgrade to ${features.name} Plan&body=Hi, I'd like to upgrade my business to the ${features.name} plan on Mountain Connects.`}
                      className={`block w-full rounded-xl py-2.5 text-center text-sm font-bold text-white transition-colors ${colors.cta}`}
                    >
                      {gracePeriod ? "Pre-select Plan" : `Upgrade to ${features.name}`}
                    </a>
                  )
                ) : (
                  <div className="rounded-lg border border-accent/50 px-4 py-2.5 text-center text-sm text-foreground/40">
                    Contact us to change
                  </div>
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
            <h3 className="font-semibold text-primary">Can I change plans later?</h3>
            <p className="mt-1 text-sm text-foreground/60">Yes, you can upgrade or downgrade at any time. Contact us and we&apos;ll update your plan.</p>
          </div>
          <div className="rounded-xl border border-accent bg-white p-5">
            <h3 className="font-semibold text-primary">What happens to my jobs if I downgrade?</h3>
            <p className="mt-1 text-sm text-foreground/60">Your existing job listings will remain active. You&apos;ll only be limited when posting new jobs. We&apos;ll never delete your existing listings.</p>
          </div>
          <div className="rounded-xl border border-accent bg-white p-5">
            <h3 className="font-semibold text-primary">What does the Free plan include?</h3>
            <p className="mt-1 text-sm text-foreground/60">The Free plan gives you 2 job listings per calendar year, basic profile, and the ability to receive and manage applications.</p>
          </div>
          <div className="rounded-xl border border-accent bg-white p-5">
            <h3 className="font-semibold text-primary">Is there a discount for seasonal or yearly billing?</h3>
            <p className="mt-1 text-sm text-foreground/60">Contact us at hello@mountainconnects.com to discuss seasonal pricing options.</p>
          </div>
          <div className="rounded-xl border border-accent bg-white p-5">
            <h3 className="font-semibold text-primary">What&apos;s included in the Enterprise plan?</h3>
            <p className="mt-1 text-sm text-foreground/60">Enterprise includes everything in Premium plus a dedicated account manager, custom branding, multi-user support, and bulk data export. Pricing is customized to your operation.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
