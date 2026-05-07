"use client";

import Link from "next/link";

export interface BusinessRowData {
  id: string;
  business_name: string;
  logo_url: string | null;
  industries: string[] | null;
  location: string | null;
  verification_status: string | null;
  /** When the business is associated with a nearby town we surface a
   *  "Based in <town>" pill — only honoured if `showTown` is true on
   *  the parent. Used on resort pages' "nearby" section. */
  nearby_town_name?: string | null;
}

interface Props {
  biz: BusinessRowData;
  /** Show the "Based in {town}" pill. Off by default — town pages and
   *  the at-resort section don't need it (the surrounding section
   *  title already supplies that context). */
  showTown?: boolean;
}

/**
 * Compact row used on the resort and town pages. Card style, links to
 * the business profile, and visually de-emphasises unverified rows so
 * verified businesses get the lion's share of attention.
 */
export default function BusinessRow({ biz, showTown = false }: Props) {
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
                .map((ind) => ind.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase()))
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
