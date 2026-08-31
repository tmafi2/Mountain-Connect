"use client";

import { useState } from "react";

interface Listing {
  id: string;
  title: string;
  lapsed: boolean;
  expiresAt: string | null;
}

const fmt = (iso: string | null) =>
  iso
    ? new Date(iso).toLocaleDateString("en-GB", {
        day: "numeric",
        month: "long",
        year: "numeric",
        timeZone: "UTC",
      })
    : null;

export default function RenewClient({
  token,
  businessName,
  listings,
  lifespanDays,
  canRenew,
}: {
  token: string;
  businessName: string | null;
  listings: Listing[];
  lifespanDays: number;
  canRenew: boolean;
}) {
  const [state, setState] = useState<"idle" | "saving" | "done" | "error">("idle");
  const [result, setResult] = useState<{ renewed: number; revived: number; expiresAt: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const weeks = Math.round(lifespanDays / 7);

  async function renew() {
    setState("saving");
    setError(null);
    try {
      const res = await fetch("/api/jobs/renew", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Could not renew your listings");
      setResult(data);
      setState("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setState("error");
    }
  }

  if (state === "done" && result) {
    const total = result.renewed + result.revived;
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
          <svg className="h-8 w-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-primary">
          {total === 1 ? "Your listing is live" : `${total} listings are live`}
        </h1>
        <p className="mt-3 text-foreground/70">
          {total === 1 ? "It will stay up" : "They will stay up"} until{" "}
          <strong className="text-primary">{fmt(result.expiresAt)}</strong>. We&apos;ll check in
          again a week before then.
        </p>
        <a
          href="/business/manage-listings"
          className="mt-6 inline-block rounded-xl bg-secondary px-6 py-3 font-semibold text-white"
        >
          Manage my listings
        </a>
      </div>
    );
  }

  // A free account's four weeks are up. Show what is at stake and where to
  // go, rather than a button that would answer 402.
  if (!canRenew && listings.length > 0) {
    return (
      <div className="mx-auto max-w-lg px-4 py-12">
        <h1 className="text-center text-2xl font-bold text-primary">
          {businessName ? `${businessName}, your free listing has run its course` : "Your free listing has run its course"}
        </h1>
        <p className="mt-3 text-center text-foreground/70">
          The first job post is free for four weeks. To keep{" "}
          {listings.length === 1 ? "it" : "these"} live, pick a plan — everyone who
          applied stays in your account either way.
        </p>

        <ul className="mt-8 divide-y divide-accent/40 rounded-2xl border border-accent/40 bg-white">
          {listings.map((l) => (
            <li key={l.id} className="flex items-center justify-between gap-4 px-5 py-4">
              <span className="font-semibold text-primary">{l.title}</span>
              <span className="shrink-0 text-xs text-foreground/50">
                {l.lapsed ? "Paused" : fmt(l.expiresAt) ? `Until ${fmt(l.expiresAt)}` : ""}
              </span>
            </li>
          ))}
        </ul>

        <a
          href="/business/upgrade"
          className="mt-6 block w-full rounded-xl bg-secondary px-6 py-3.5 text-center font-bold text-white transition-colors hover:bg-secondary/90"
        >
          See plans
        </a>
        <p className="mt-3 text-center text-xs text-foreground/50">
          Plans start at $39/month. Cancel any time.
        </p>
      </div>
    );
  }

  if (listings.length === 0) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <h1 className="text-2xl font-bold text-primary">Nothing to renew</h1>
        <p className="mt-3 text-foreground/70">
          You have no listings waiting on a renewal right now.
        </p>
        <a
          href="/business/manage-listings"
          className="mt-6 inline-block rounded-xl bg-secondary px-6 py-3 font-semibold text-white"
        >
          Go to my listings
        </a>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-12">
      <h1 className="text-center text-2xl font-bold text-primary">
        {businessName ? `Still hiring, ${businessName}?` : "Still hiring?"}
      </h1>
      <p className="mt-3 text-center text-foreground/70">
        Keeping these live tells workers the roles are genuinely open. Anything you&apos;ve
        already filled, just leave — it will pause itself and your applicants stay in your
        account.
      </p>

      <ul className="mt-8 divide-y divide-accent/40 rounded-2xl border border-accent/40 bg-white">
        {listings.map((l) => (
          <li key={l.id} className="flex items-center justify-between gap-4 px-5 py-4">
            <span className="font-semibold text-primary">{l.title}</span>
            <span className="shrink-0 text-xs text-foreground/50">
              {l.lapsed ? "Paused — will be restored" : fmt(l.expiresAt) ? `Until ${fmt(l.expiresAt)}` : ""}
            </span>
          </li>
        ))}
      </ul>

      {error && (
        <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      )}

      <button
        type="button"
        onClick={renew}
        disabled={state === "saving"}
        className="mt-6 w-full rounded-xl bg-secondary px-6 py-3.5 font-bold text-white transition-colors hover:bg-secondary/90 disabled:opacity-50"
      >
        {state === "saving"
          ? "Keeping them live…"
          : listings.length === 1
            ? `Keep it live for another ${weeks} weeks`
            : `Keep all ${listings.length} live for another ${weeks} weeks`}
      </button>
      <p className="mt-3 text-center text-xs text-foreground/50">
        No charge — renewing is free on every plan.
      </p>
    </div>
  );
}
