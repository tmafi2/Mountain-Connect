"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import PasswordStrength from "@/components/ui/PasswordStrength";
import { validatePassword } from "@/lib/utils/password";
import { TRIAL_DAYS_LABEL } from "@/lib/billing/trial";

interface ClaimJob {
  id: string;
  title: string;
  description: string | null;
  source: string | null;
}

interface ClaimFormProps {
  claimToken: string;
  businessName: string;
  defaultEmail: string;
  jobs: ClaimJob[];
  /** How many listings this claimant's tier keeps live. May be Infinity. */
  listingLimit: number;
}

export default function ClaimForm({
  claimToken,
  businessName,
  defaultEmail,
  jobs,
  listingLimit,
}: ClaimFormProps) {
  const router = useRouter();
  const [email, setEmail] = useState(defaultEmail);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // We import one listing per role, so a single post can arrive as a dozen
  // jobs. When that overflows what the tier keeps live, the claimant chooses
  // which one it is rather than us picking for them.
  const mustChoose = jobs.length > listingLimit;
  const [keepLiveJobId, setKeepLiveJobId] = useState<string>(jobs[0]?.id ?? "");
  const parkedCount = mustChoose ? jobs.length - listingLimit : 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const pwCheck = validatePassword(password);
    if (!pwCheck.isValid) {
      setError("Password must meet all requirements: " + pwCheck.errors.join(", "));
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords don't match.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/claim/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          claimToken,
          email: email.trim(),
          password,
          ...(mustChoose ? { keepLiveJobId } : {}),
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.error || "Could not complete claim. Please try again.");
        setSubmitting(false);
        return;
      }
      router.push(data.redirectUrl || "/login?claimed=1");
    } catch {
      setError("Something went wrong. Please try again.");
      setSubmitting(false);
    }
  };

  const selectedTitle = jobs.find((j) => j.id === keepLiveJobId)?.title;

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* ── Listings ─────────────────────────────────────────── */}
      {jobs.length > 0 &&
        (mustChoose ? (
          <fieldset>
            <legend className="text-base font-bold text-primary">
              Choose the listing that stays live
            </legend>
            <p className="mt-1 text-sm text-foreground/60">
              We found {jobs.length} listings for {businessName}. A free account keeps{" "}
              {listingLimit === 1 ? "one live" : `${listingLimit} live`} — pick the one you want
              working for you now. The other {parkedCount} stay saved with any interest they&apos;ve
              already attracted, ready to go live whenever you are.
            </p>

            <div className="mt-4 space-y-2">
              {jobs.map((j) => {
                const selected = j.id === keepLiveJobId;
                return (
                  <label
                    key={j.id}
                    className={`flex cursor-pointer gap-3 rounded-xl border p-3 transition-colors ${
                      selected
                        ? "border-secondary bg-secondary/5 ring-1 ring-secondary"
                        : "border-accent/50 bg-white hover:border-accent"
                    }`}
                  >
                    <input
                      type="radio"
                      name="keepLiveJobId"
                      value={j.id}
                      checked={selected}
                      onChange={() => setKeepLiveJobId(j.id)}
                      disabled={submitting}
                      className="mt-0.5 h-4 w-4 shrink-0 accent-secondary"
                    />
                    <span className="min-w-0">
                      <span className="block text-sm font-bold text-primary">{j.title}</span>
                      {j.description && (
                        <span className="mt-0.5 block line-clamp-2 text-xs text-foreground/60">
                          {j.description}
                        </span>
                      )}
                      {j.source && (
                        <span className="mt-1 block text-[11px] text-foreground/40">
                          Sourced from {j.source}
                        </span>
                      )}
                    </span>
                  </label>
                );
              })}
            </div>

            <div className="mt-4 rounded-xl border border-secondary/30 bg-secondary/5 p-4">
              <p className="text-sm font-bold text-primary">
                Want all {jobs.length} live instead?
              </p>
              <p className="mt-1 text-xs text-foreground/60">
                Your first {TRIAL_DAYS_LABEL} are free. Add a card, and if it isn&apos;t working for
                you, cancel any time before the trial ends and you won&apos;t be charged. You can
                start it from your dashboard the moment you finish claiming — your other{" "}
                {parkedCount} listing{parkedCount === 1 ? "" : "s"} go live automatically.
              </p>
            </div>
          </fieldset>
        ) : (
          <div className="rounded-xl border border-accent/50 bg-accent/10 p-4">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-foreground/50">
              Your listing{jobs.length > 1 ? "s" : ""}
            </p>
            <div className="space-y-3">
              {jobs.map((j) => (
                <div key={j.id} className="border-b border-accent/40 pb-3 last:border-0 last:pb-0">
                  <p className="text-sm font-bold text-primary">{j.title}</p>
                  {j.description && (
                    <p className="mt-1 line-clamp-2 text-xs text-foreground/60">{j.description}</p>
                  )}
                  {j.source && (
                    <p className="mt-1 text-[11px] text-foreground/40">Sourced from {j.source}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}

      {/* ── Account ──────────────────────────────────────────── */}
      <div className="space-y-4">
        <h2 className="text-base font-bold text-primary">
          Create your account for {businessName}
        </h2>

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-foreground/50">
            Email *
          </label>
          <input
            required
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={submitting}
            className="mt-1 w-full rounded-xl border border-accent/50 bg-white px-4 py-2.5 text-sm text-primary placeholder:text-foreground/40 focus:border-secondary focus:outline-none focus:ring-1 focus:ring-secondary disabled:opacity-50"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-foreground/50">
            Password *
          </label>
          <input
            required
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={submitting}
            placeholder="Min 8 characters"
            className="mt-1 w-full rounded-xl border border-accent/50 bg-white px-4 py-2.5 text-sm text-primary placeholder:text-foreground/40 focus:border-secondary focus:outline-none focus:ring-1 focus:ring-secondary disabled:opacity-50"
          />
          {password && <PasswordStrength password={password} />}
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-foreground/50">
            Confirm password *
          </label>
          <input
            required
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            disabled={submitting}
            className="mt-1 w-full rounded-xl border border-accent/50 bg-white px-4 py-2.5 text-sm text-primary placeholder:text-foreground/40 focus:border-secondary focus:outline-none focus:ring-1 focus:ring-secondary disabled:opacity-50"
          />
        </div>
      </div>

      {error && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      <div className="space-y-3">
        <button
          type="submit"
          disabled={
            submitting || !email.trim() || !password || !confirmPassword || (mustChoose && !keepLiveJobId)
          }
          className="w-full rounded-xl bg-primary py-3 text-sm font-bold text-white transition-all hover:-translate-y-0.5 hover:bg-primary/90 hover:shadow-lg hover:shadow-primary/20 disabled:opacity-50"
        >
          {submitting ? "Claiming listing..." : `Claim ${businessName}`}
        </button>

        {mustChoose && selectedTitle && !submitting && (
          <p className="text-center text-xs text-foreground/50">
            <span className="font-semibold text-foreground/70">{selectedTitle}</span> stays live.
            The other {parkedCount} are saved to your dashboard.
          </p>
        )}

        <p className="text-xs text-foreground/50">
          By claiming, you agree to Mountain Connects&apos; terms of service.
        </p>
      </div>
    </form>
  );
}
