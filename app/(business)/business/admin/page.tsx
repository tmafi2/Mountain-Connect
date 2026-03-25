"use client";

import Link from "next/link";

export default function BusinessAdminRedirectPage() {
  return (
    <div className="mx-auto max-w-lg">
      {/* Corporate gradient header */}
      <div
        className="relative mb-8 overflow-hidden rounded-2xl bg-gradient-to-r from-[#0a1e33] via-[#0f2942] to-[#132d4a] px-8 py-8 text-center"
        style={{
          backgroundImage:
            "radial-gradient(circle at 1px 1px, rgba(255,255,255,0.03) 1px, transparent 0)",
          backgroundSize: "32px 32px",
        }}
      >
        <div className="pointer-events-none absolute -right-6 -top-6 h-32 w-32 rounded-3xl bg-secondary/8 blur-2xl" style={{ transform: "rotate(12deg)" }} />
        <div className="pointer-events-none absolute -left-6 bottom-0 h-24 w-24 rounded-2xl bg-secondary/5 blur-xl" style={{ transform: "rotate(-8deg)" }} />

        <div className="relative mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10">
          <svg className="h-7 w-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-white">Verification Status</h1>
        <p className="mt-1.5 text-sm text-white/50">Business credentialing &amp; trust</p>
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
