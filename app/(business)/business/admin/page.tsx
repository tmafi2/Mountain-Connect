"use client";

import Link from "next/link";

export default function BusinessAdminRedirectPage() {
  return (
    <div className="mx-auto max-w-lg py-16 text-center">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-50">
        <svg className="h-8 w-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
        </svg>
      </div>

      <h1 className="mt-6 text-2xl font-bold text-primary">Verification Status</h1>
      <p className="mt-3 text-sm leading-relaxed text-foreground/60">
        Business verification is managed by the Mountain Connect admin team.
        You can submit your profile for verification from the{" "}
        <Link href="/business/company-profile" className="font-medium text-primary hover:underline">
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
          className="rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary/90"
        >
          Go to Company Profile
        </Link>
      </div>
    </div>
  );
}
