"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

export interface ResortBusiness {
  id: string;
  business_name: string;
  logo_url: string | null;
  industries: string[] | null;
  location: string | null;
  verification_status: string | null;
  description: string | null;
  /** True when the business operates in a nearby town rather than at
   *  the resort. Drives which section the row appears in upstream;
   *  here it gates the "Based in {town}" pill. */
  operates_in_town: boolean | null;
  nearby_town_id: string | null;
  nearby_town_name: string | null;
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

function BusinessRow({ biz, showTown = false }: { biz: ResortBusiness; showTown?: boolean }) {
  const isVerified = biz.verification_status === "verified";
  return (
    <Link
      href={`/business/${biz.id}`}
      className={`group flex items-center gap-3 rounded-lg border p-3 transition-all hover:shadow-sm ${
        isVerified
          ? "border-accent bg-white hover:border-secondary"
          : "border-accent/60 bg-accent/5 hover:border-accent"
      }`}
    >
      {biz.logo_url ? (
        <img
          src={biz.logo_url}
          alt={biz.business_name}
          className="h-10 w-10 shrink-0 rounded-lg object-cover"
        />
      ) : (
        <div
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-xs font-bold ${
            isVerified ? "bg-primary/10 text-primary" : "bg-accent/20 text-foreground/40"
          }`}
        >
          {biz.business_name
            .split(" ")
            .map((w) => w[0])
            .join("")
            .slice(0, 2)
            .toUpperCase()}
        </div>
      )}
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p
            className={`truncate text-sm font-semibold ${
              isVerified ? "text-primary group-hover:text-secondary" : "text-foreground/60"
            }`}
          >
            {biz.business_name}
          </p>
          {isVerified ? (
            <span className="shrink-0 rounded-full bg-green-50 px-1.5 py-0.5 text-[10px] font-medium text-green-700">
              Verified
            </span>
          ) : (
            <span className="shrink-0 rounded-full bg-accent/30 px-1.5 py-0.5 text-[10px] font-medium text-foreground/40">
              Unverified
            </span>
          )}
          {showTown && biz.nearby_town_name && (
            <span className="shrink-0 rounded-full bg-secondary/10 px-1.5 py-0.5 text-[10px] font-medium text-secondary">
              Based in {biz.nearby_town_name}
            </span>
          )}
        </div>
        <p className="truncate text-xs text-foreground/50">
          {Array.isArray(biz.industries) && biz.industries.length > 0
            ? biz.industries
                .map((ind: string) =>
                  ind.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())
                )
                .join(", ")
            : biz.location || ""}
        </p>
      </div>
      <svg
        className="h-4 w-4 shrink-0 text-foreground/30 group-hover:text-secondary"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
      </svg>
    </Link>
  );
}
