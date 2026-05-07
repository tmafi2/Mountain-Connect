"use client";

import { useMemo, useState } from "react";
import BusinessRow, { type BusinessRowData } from "@/components/business/BusinessRow";

export interface ResortBusiness extends BusinessRowData {
  description: string | null;
  /** Legacy flag — kept on the type so server-side passthrough still
   *  compiles, but no longer used to decide which section a business
   *  appears in. nearby_town_id presence is the source of truth. */
  operates_in_town: boolean | null;
  nearby_town_id: string | null;
}

interface ResortBusinessesProps {
  resortName: string;
  atResort: ResortBusiness[];
  nearby: ResortBusiness[];
}

/**
 * Renders the two business sections on a resort page:
 *
 *   1. "Businesses at <resort>"  physically located at the resort
 *   2. "Other businesses nearby" operate in linked towns
 *
 * The verified-only toggle is per-visit by design (see spec):
 * unverified businesses are hidden until the user explicitly opts in,
 * and the choice doesn't persist across navigations.
 */
export default function ResortBusinesses({ resortName, atResort, nearby }: ResortBusinessesProps) {
  const [showUnverified, setShowUnverified] = useState(false);

  const visibleAtResort = useMemo(
    () => (showUnverified ? atResort : atResort.filter((b) => b.verification_status === "verified")),
    [atResort, showUnverified]
  );
  const visibleNearby = useMemo(
    () => (showUnverified ? nearby : nearby.filter((b) => b.verification_status === "verified")),
    [nearby, showUnverified]
  );

  const hiddenAtResort = atResort.length - visibleAtResort.length;
  const hiddenNearby = nearby.length - visibleNearby.length;
  const totalHidden = hiddenAtResort + hiddenNearby;

  // Nothing to show at all — bail so the page doesn't render an empty shell.
  if (atResort.length === 0 && nearby.length === 0) return null;

  return (
    <div className="space-y-6">
      {/* Verified-only toggle — sits above both sections so it's clear
          it controls them together. Hidden when there are no
          unverified rows on the page (nothing to opt into). */}
      {totalHidden > 0 && (
        <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-accent/60 bg-accent/5 px-3 py-2 text-xs text-foreground/70">
          <input
            type="checkbox"
            checked={showUnverified}
            onChange={(e) => setShowUnverified(e.target.checked)}
            className="h-4 w-4 rounded border-accent text-secondary focus:ring-secondary/30"
          />
          <span>
            Show unverified businesses
            <span className="ml-1 text-foreground/40">({totalHidden} hidden)</span>
          </span>
        </label>
      )}

      <Section
        title={`Businesses at ${resortName}`}
        emptyHint="No verified businesses at this resort yet."
        emptyHintNoData="No businesses at this resort yet."
        rawCount={atResort.length}
        showUnverified={showUnverified}
      >
        {visibleAtResort.map((b) => (
          <BusinessRow key={b.id} biz={b} />
        ))}
      </Section>

      <Section
        title="Other businesses nearby"
        subtitle="Operating in towns nearby — click through for details."
        emptyHint="No verified businesses listed nearby yet."
        emptyHintNoData="No businesses listed in nearby towns yet."
        rawCount={nearby.length}
        showUnverified={showUnverified}
      >
        {visibleNearby.map((b) => (
          <BusinessRow key={b.id} biz={b} showTown />
        ))}
      </Section>
    </div>
  );
}

function Section({
  title,
  subtitle,
  emptyHint,
  emptyHintNoData,
  rawCount,
  showUnverified,
  children,
}: {
  title: string;
  subtitle?: string;
  /** Hint shown when filtered list is empty but raw list isn't (i.e.
   *  everything was filtered out by the verified toggle). */
  emptyHint: string;
  /** Hint shown when there's no data at all. */
  emptyHintNoData: string;
  rawCount: number;
  showUnverified: boolean;
  children: React.ReactNode;
}) {
  // children is a React node — we can't introspect length from it,
  // but the parent component ensures we don't render this section if
  // both raw arrays are empty. So if we get here with no rendered rows,
  // either rawCount is 0 (no data) or filter excluded them (toggle off).
  const childrenArr = Array.isArray(children) ? children : [children];
  const isEmptyRender = childrenArr.length === 0;
  return (
    <div>
      <p className="mb-1 text-sm font-medium text-foreground/60">{title}</p>
      {subtitle && <p className="mb-3 text-xs text-foreground/40">{subtitle}</p>}
      {isEmptyRender ? (
        <p className="rounded-lg border border-dashed border-accent/60 bg-accent/5 px-4 py-3 text-xs text-foreground/50">
          {rawCount === 0 ? emptyHintNoData : showUnverified ? emptyHintNoData : emptyHint}
        </p>
      ) : (
        <div className="space-y-2">{children}</div>
      )}
    </div>
  );
}

