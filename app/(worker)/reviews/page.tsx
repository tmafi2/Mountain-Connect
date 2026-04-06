"use client";

import Link from "next/link";

export default function WorkerReviewsPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <div className="flex flex-col items-center justify-center rounded-2xl border border-accent/30 bg-white p-12 text-center shadow-sm">
        <div className="relative mx-auto mb-6 h-20 w-20">
          <div className="absolute inset-0 animate-pulse rounded-full bg-secondary/20" />
          <div className="absolute inset-2 flex items-center justify-center rounded-full bg-gradient-to-br from-secondary to-primary text-3xl shadow-lg">
            <svg className="h-8 w-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.562.562 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.562.562 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
            </svg>
          </div>
        </div>

        <h1 className="text-2xl font-bold text-primary">Reviews</h1>
        <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-amber-50 px-4 py-1.5 text-sm font-semibold text-amber-700">
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Coming Soon
        </div>
        <p className="mt-4 max-w-md text-sm leading-relaxed text-foreground/60">
          Soon you&apos;ll be able to review businesses you&apos;ve worked with and help other seasonal workers make informed decisions about where to work.
        </p>

        <Link
          href="/dashboard"
          className="mt-8 rounded-xl bg-primary px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-primary/90 hover:shadow-md"
        >
          Back to Dashboard
        </Link>
      </div>
    </div>
  );
}
