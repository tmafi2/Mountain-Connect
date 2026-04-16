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

  if (variant === "bottom") {
    return (
      <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
        <Link
          href={userRole ? dashboardHref : "/signup"}
          className="group relative overflow-hidden rounded-xl bg-primary px-10 py-4 text-sm font-bold text-white shadow-xl shadow-primary/20 transition-all hover:shadow-2xl hover:shadow-primary/30"
        >
          <span className="relative z-10">
            {userRole ? "Go to Dashboard" : "Create Free Account"}
          </span>
          <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-secondary/30 to-highlight/30 transition-transform duration-500 group-hover:translate-x-0" />
        </Link>
        <Link
          href="/jobs"
          className="rounded-xl border-2 border-primary/10 px-10 py-4 text-sm font-bold text-primary transition-all hover:border-primary/30 hover:bg-primary/5"
        >
          Browse Jobs
        </Link>
      </div>
    );
  }

  return null;
}
