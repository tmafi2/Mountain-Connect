"use client";

import { useState } from "react";

/**
 * Two notices for a listing whose business hasn't claimed their account.
 *
 * These used to be one amber warning box at the top of the page, and it was
 * doing two jobs with opposite audiences: telling a job seeker the listing
 * might be stale, and inviting the owner to claim it. Read as a whole it told
 * every worker "this probably goes nowhere" — which is self-fulfilling, since
 * fewer applications means less reason for the business to ever claim.
 *
 * So they are split by who they are for:
 *
 *   ClaimPrompt        for the OWNER. Stays where the banner was, because it
 *                      is the funnel that turns an imported shell into a real
 *                      account — 14 of 143 businesses have claimed, and this
 *                      is one of the few things that moves that number. But it
 *                      is styled as an invitation, not an alarm: a worker
 *                      skims past it, an owner sees their own name and acts.
 *
 *   UnclaimedFootnote  for the WORKER. Fine print at the foot of the page,
 *                      folded in with the "sourced from" line that already
 *                      lives there. Still honest, no longer the first thing
 *                      anyone reads.
 *
 * Note the wording changed too. The old heading said "Unverified listing",
 * which conflated two different things: `verification_status` (has an admin
 * vetted this business) and `is_claimed` (has anyone logged in). This renders
 * on the second, so it now says unclaimed — accurate, and less alarming than
 * the inaccurate version.
 */

interface UnclaimedProps {
  jobId: string;
  businessName: string;
  source?: string | null;
  sourceUrl?: string | null;
}

/** Owner-facing. Calm by design — see the note above. */
export function ClaimPrompt({ jobId, businessName }: UnclaimedProps) {
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <>
      <div className="mb-6 flex flex-col gap-3 rounded-2xl border border-accent/60 bg-white px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-secondary/10">
            <svg className="h-5 w-5 text-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25a3 3 0 013 3m3 0a6 6 0 01-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1121.75 8.25z" />
            </svg>
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-primary">
              Is this your listing?
            </p>
            <p className="mt-0.5 text-sm text-foreground/70">
              Claim {businessName} to see who&apos;s applied and reply to them directly.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setModalOpen(true)}
          className="shrink-0 rounded-xl border border-secondary/40 bg-secondary/5 px-4 py-2 text-sm font-semibold text-secondary transition-all hover:bg-secondary/10"
        >
          Claim this listing
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

/**
 * Worker-facing fine print. Deliberately the quietest thing on the page: it
 * has to be true and findable, it does not have to be the headline.
 */
export function UnclaimedFootnote({ businessName, source, sourceUrl }: UnclaimedProps) {
  return (
    <p className="mt-8 text-center text-xs leading-relaxed text-foreground/40">
      {source && <>Sourced from {source} · </>}
      {businessName} hasn&apos;t claimed their Mountain Connect account yet, so a
      reply may come directly from them rather than through the site.
      {sourceUrl && (
        <>
          {" · "}
          <a
            href={sourceUrl}
            target="_blank"
            rel="noopener noreferrer nofollow"
            className="underline hover:text-foreground/60"
          >
            View original post →
          </a>
        </>
      )}
    </p>
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
