"use client";

import Link from "next/link";

export default function BusinessAdminRedirectPage() {
  return (
    <div className="mx-auto max-w-lg">
      {/* Corporate gradient header */}
      <div
        className="relative -mx-6 -mt-6 mb-8 overflow-hidden rounded-2xl px-8 py-10 sm:px-10 sm:py-12">
        <div className="absolute inset-0 bg-gradient-to-br from-[#0a1e33] via-[#0f2942] to-[#132d4a]" />
        <div className="pointer-events-none absolute -right-12 -top-12 h-48 w-48 rounded-3xl bg-secondary/8 blur-2xl rotate-12" />
        <div className="pointer-events-none absolute bottom-0 left-1/3 h-32 w-64 rounded-full bg-secondary/6 blur-3xl" />
        <div className="pointer-events-none absolute right-0 bottom-0 h-24 w-24 rounded-2xl bg-highlight/5 blur-xl" />
        <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: "radial-gradient(circle at 1px 1px, white 1px, transparent 0)", backgroundSize: "32px 32px" }} />

        <div className="relative">
          <div className="flex items-center gap-2 mb-1">
            <svg className="h-4 w-4 text-secondary/70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            <span className="text-xs font-medium uppercase tracking-widest text-secondary/70">Account Status</span>
          </div>
          <h1 className="text-2xl font-bold text-white">Verification Status</h1>
          <p className="mt-1 text-sm text-white/50">View your business verification status and manage your account.</p>
        </div>
      </div>

      {/* Content card */}
      <div className="rounded-2xl border border-accent/40 bg-white p-8 shadow-sm">
        <p className="text-sm leading-relaxed text-foreground/70">
          Business verification is managed by the Mountain Connect admin team.
          You can submit your profile for verification from the{" "}
          <Link href="/business/company-profile" className="font-semibold text-primary hover:text-secondary transition-colors hover:underline">
            Company Profile
          </Link>{" "}
          page.
        </p>
        <p className="mt-4 text-sm text-foreground/50">
          Once submitted, our team will review your business within 1–2 business days.
          You&apos;ll receive a notification when your verification status is updated.
        </p>

        <div className="mt-8 flex justify-center gap-3">
          <Link
            href="/business/company-profile"
            className="rounded-xl bg-primary px-6 py-2.5 text-sm font-semibold text-white transition-all hover:bg-primary/90 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-primary/20"
          >
            Go to Company Profile
          </Link>
        </div>
      </div>
    </div>
  );
}
