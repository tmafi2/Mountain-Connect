"use client";

import { useMemo, useState } from "react";
import BusinessRow, { type BusinessRowData } from "@/components/business/BusinessRow";

interface Props {
  townName: string;
  businesses: BusinessRowData[];
}

/**
 * Renders the "Businesses in <town>" section. Verified-only by default
 * with a per-visit toggle to reveal unverified — same UX rule as the
 * resort page split.
 */
export default function TownBusinesses({ townName, businesses }: Props) {
  const [showUnverified, setShowUnverified] = useState(false);

  const visible = useMemo(
    () =>
      showUnverified ? businesses : businesses.filter((b) => b.verification_status === "verified"),
    [businesses, showUnverified]
  );

  const hidden = businesses.length - visible.length;

  if (businesses.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-accent/60 bg-accent/5 px-4 py-3 text-xs text-foreground/50">
        No businesses listed in {townName} yet.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {hidden > 0 && (
        <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-accent/60 bg-accent/5 px-3 py-2 text-xs text-foreground/70">
          <input
            type="checkbox"
            checked={showUnverified}
            onChange={(e) => setShowUnverified(e.target.checked)}
            className="h-4 w-4 rounded border-accent text-secondary focus:ring-secondary/30"
          />
          <span>
            Show unverified businesses
            <span className="ml-1 text-foreground/40">({hidden} hidden)</span>
          </span>
        </label>
      )}

      {visible.length === 0 ? (
        <p className="rounded-lg border border-dashed border-accent/60 bg-accent/5 px-4 py-3 text-xs text-foreground/50">
          No verified businesses in {townName} yet — toggle above to see unverified entries.
        </p>
      ) : (
        <div className="space-y-2">
          {visible.map((b) => (
            <BusinessRow key={b.id} biz={b} />
          ))}
        </div>
      )}
    </div>
  );
}
