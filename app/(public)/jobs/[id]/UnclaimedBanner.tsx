"use client";

import { useState } from "react";

interface UnclaimedBannerProps {
  jobId: string;
  businessName: string;
  source: string | null;
}

/**
 * Shown at the top of a public job listing when the business hasn't
 * claimed the listing yet. Warns workers the business isn't on the
 * platform, and lets the business self-serve request a claim link.
 */
export default function UnclaimedBanner({ jobId, businessName, source }: UnclaimedBannerProps) {
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <>
      <div className="mb-6 flex flex-col gap-3 rounded-2xl border border-amber-200 bg-amber-50/60 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-100">
            <svg className="h-5 w-5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
            </svg>
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-amber-900">
              Unverified listing{source ? ` — sourced from ${source}` : ""}
            </p>
            <p className="mt-0.5 text-sm text-amber-800">
              {businessName} hasn&apos;t joined Mountain Connects yet. You can still express interest and we&apos;ll pass it on once they claim the listing.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setModalOpen(true)}
          className="shrink-0 rounded-xl border border-amber-300 bg-white px-4 py-2 text-sm font-semibold text-amber-800 transition-all hover:bg-amber-100"
        >
          Is this your business?
        </button>
      </div>

      {modalOpen && (
        <SelfServeClaimModal
          jobId={jobId}
          businessName={businessName}
          onClose={() => setModalOpen(false)}
        />
      )}
    </>
  );
}

function SelfServeClaimModal({
  jobId,
  businessName,
  onClose,
}: {
  jobId: string;
  businessName: string;
  onClose: () => void;
}) {
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/claim/request-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), jobId }),
      });
      // We always show the same success message regardless of outcome
      // (intentional — so we don't leak which emails are on the platform).
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "Something went wrong. Try again.");
        setSubmitting(false);
        return;
      }
      setSubmitted(true);
    } catch {
      setError("Something went wrong. Try again.");
    }
    setSubmitting(false);
  };

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={() => !submitting && onClose()}
      />
      <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
        {submitted ? (
          <>
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-green-100">
              <svg className="h-7 w-7 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="mt-4 text-center text-lg font-bold text-primary">Check your inbox</h3>
            <p className="mt-2 text-center text-sm text-foreground/60">
              If {email} is the contact on file for {businessName}, we&apos;ve sent a claim link. It may take a minute to arrive — check spam if you don&apos;t see it.
            </p>
            <div className="mt-5 flex justify-end">
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-white hover:bg-primary/90"
              >
                Got it
              </button>
            </div>
          </>
        ) : (
          <>
            <h3 className="text-lg font-bold text-primary">Claim {businessName}</h3>
            <p className="mt-2 text-sm text-foreground/60">
              Enter your business email. If it matches the contact on file for this listing, we&apos;ll send you a secure link to claim it and start managing applications.
            </p>
            <form onSubmit={handleSubmit} className="mt-4 space-y-3">
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="hello@yourbusiness.com"
                disabled={submitting}
                className="w-full rounded-lg border border-accent/50 bg-white px-4 py-2.5 text-sm text-primary placeholder:text-foreground/40 focus:border-secondary focus:outline-none focus:ring-1 focus:ring-secondary disabled:opacity-50"
              />
              {error && (
                <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  {error}
                </p>
              )}
              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={submitting}
                  className="rounded-xl px-4 py-2.5 text-sm font-semibold text-foreground/60 hover:bg-accent/20 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting || !email.trim()}
                  className="rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-white hover:bg-primary/90 disabled:opacity-50"
                >
                  {submitting ? "Sending..." : "Send claim link"}
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
