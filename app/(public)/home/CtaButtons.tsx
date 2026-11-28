"use client";

import Link from "next/link";

interface CtaButtonsProps {
  userRole?: string | null;
  variant: "hero" | "bottom";
}

/**
 * CTA buttons that change text based on auth state.
 * Kept as a client component only because the parent passes the role
 * and the bottom CTA needs the same logic.
 */
export default function CtaButtons({ userRole, variant }: CtaButtonsProps) {
  const dashboardHref =
    userRole === "business_owner" ? "/business/dashboard" : "/dashboard";

  // ⚠️ INVERTED FOR THE DARK PAGE. These were bg-primary on white and
  // border-primary/10 with primary text — on the particle background that is
  // a navy button on navy, and a second button that had vanished completely.
  // The closing call to action was effectively invisible.
  if (variant === "bottom") {
    return (
      <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
        <Link
          href={userRole ? dashboardHref : "/signup"}
          className="group relative overflow-hidden rounded-xl bg-white px-10 py-4 text-sm font-bold text-primary shadow-xl shadow-black/30 transition-all hover:shadow-2xl"
        >
          <span className="relative z-10">
            {userRole ? "Go to Dashboard" : "Create Free Account"}
          </span>
          <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-secondary/30 to-highlight/30 transition-transform duration-500 group-hover:translate-x-0" />
        </Link>
        <Link
          href="/jobs"
          className="rounded-xl border-2 border-white/25 px-10 py-4 text-sm font-bold text-white transition-all hover:border-white/50 hover:bg-white/10"
        >
          Browse Jobs
        </Link>
      </div>
    );
  }

  return null;
}
