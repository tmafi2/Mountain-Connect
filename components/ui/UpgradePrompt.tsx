"use client";

import Link from "next/link";
import { isGracePeriod } from "@/lib/tier";

interface UpgradePromptProps {
  feature: string;
  description?: string;
  variant?: "banner" | "card" | "inline";
}

export default function UpgradePrompt({
  feature,
  description,
  variant = "card",
}: UpgradePromptProps) {
  const gracePeriod = isGracePeriod();

  if (gracePeriod) {
    return (
      <div className={`rounded-xl border border-highlight/30 bg-highlight/5 p-5 ${variant === "banner" ? "flex items-center justify-between gap-4" : ""}`}>
        <div>
          <div className="flex items-center gap-2">
            <span className="text-lg">🎉</span>
            <h3 className="text-sm font-semibold text-primary">Launch Bonus — {feature}</h3>
          </div>
          <p className="mt-1 text-sm text-foreground/60">
            {description || `You're enjoying ${feature} for free during our launch period. This will be a Premium feature in the future.`}
          </p>
        </div>
        {variant === "banner" && (
          <Link
            href="/business/upgrade"
            className="shrink-0 rounded-lg bg-highlight/20 px-4 py-2 text-xs font-semibold text-primary hover:bg-highlight/30 transition-colors"
          >
            View Plans
          </Link>
        )}
      </div>
    );
  }

  return (
    <div className={`rounded-xl border border-secondary/30 bg-secondary/5 p-6 text-center ${variant === "inline" ? "py-4" : ""}`}>
      <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-secondary/10">
        <svg className="h-6 w-6 text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
        </svg>
      </div>
      <h3 className="text-lg font-bold text-primary">Upgrade to Premium</h3>
      <p className="mt-2 text-sm text-foreground/60">
        {description || `${feature} is available on the Premium plan. Upgrade to unlock this and more.`}
      </p>
      <Link
        href="/business/upgrade"
        className="mt-4 inline-block rounded-lg bg-secondary px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-secondary/90"
      >
        View Plans & Upgrade
      </Link>
    </div>
  );
}
