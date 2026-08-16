"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";

/**
 * "Missing your resort or town? Let us know."
 *
 * Drop-in request form used in three places: the resort-picker "no results"
 * state (pre-filled with what they typed), the explore page, and the
 * employer hub. Posts to /api/location-requests which stores it and emails
 * the admin inbox. Works logged-out.
 *
 * `variant="compact"` is a tight inline version for dropdowns; "card" is the
 * fuller standalone block.
 */
export default function LocationRequestForm({
  initialName = "",
  initialKind = "either",
  initialRequester,
  variant = "card",
  onDone,
}: {
  initialName?: string;
  initialKind?: "resort" | "town" | "either";
  /** Pre-select who's asking when the context makes it obvious (business portal → business). */
  initialRequester?: "worker" | "business";
  variant?: "card" | "compact";
  onDone?: () => void;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(variant === "card" ? false : true);
  const [name, setName] = useState(initialName);
  const [country, setCountry] = useState("");
  const [kind, setKind] = useState<"resort" | "town" | "either">(initialKind);
  const [requester, setRequester] = useState<"worker" | "business" | "other">(initialRequester ?? "worker");
  const [email, setEmail] = useState("");
  const [note, setNote] = useState("");
  const [honeypot, setHoneypot] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setState("sending");
    setError(null);
    try {
      const res = await fetch("/api/location-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind, locationName: name, country, requester, email, note, sourcePath: pathname, website: honeypot }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Something went wrong");
      setState("sent");
      onDone?.();
    } catch (err) {
      setState("error");
      setError(err instanceof Error ? err.message : "Something went wrong");
    }
  };

  const compact = variant === "compact";

  if (state === "sent") {
    return (
      <div className={`rounded-xl border border-green-200 bg-green-50 ${compact ? "px-3 py-2.5 text-xs" : "p-5 text-sm"} text-green-800`}>
        <p className="font-semibold">Thanks — got it. 🏔️</p>
        <p className={`mt-0.5 ${compact ? "" : "text-green-700/80"}`}>
          We&apos;ll add <strong>{name}</strong> as soon as we can and email you when it&apos;s live.
        </p>
      </div>
    );
  }

  // Card variant starts collapsed as a single friendly line; compact is always open.
  if (!open) {
    return (
      <div className="rounded-xl border border-dashed border-accent bg-white/60 p-4 text-center">
        <p className="text-sm text-foreground/70">
          Missing your resort or town?{" "}
          <button type="button" onClick={() => setOpen(true)} className="font-semibold text-secondary underline-offset-2 hover:underline">
            Let us know →
          </button>
        </p>
      </div>
    );
  }

  const input = `w-full rounded-lg border border-accent/60 bg-white px-3 ${compact ? "py-1.5 text-xs" : "py-2 text-sm"} text-primary placeholder:text-foreground/35 focus:border-secondary focus:outline-none focus:ring-1 focus:ring-secondary`;
  const label = `block ${compact ? "text-[11px]" : "text-xs"} font-medium text-foreground/60 mb-1`;

  return (
    <form
      onSubmit={submit}
      className={`rounded-xl border border-accent/60 bg-white ${compact ? "p-3 space-y-2" : "p-5 space-y-3"}`}
    >
      <div>
        <p className={`font-semibold text-primary ${compact ? "text-xs" : "text-sm"}`}>Missing your resort or town? Let us know.</p>
        {!compact && (
          <p className="mt-0.5 text-xs text-foreground/55">We open new regions based on where people ask for them. Tell us where you are and we&apos;ll email you when it&apos;s live.</p>
        )}
      </div>

      {/* honeypot — hidden from humans, bots fill it */}
      <input type="text" name="website" value={honeypot} onChange={(e) => setHoneypot(e.target.value)} tabIndex={-1} autoComplete="off" className="hidden" aria-hidden="true" />

      <div className={compact ? "grid grid-cols-2 gap-2" : "grid gap-3 sm:grid-cols-2"}>
        <div className={compact ? "col-span-2" : ""}>
          <label className={label}>Resort or town name *</label>
          <input required value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Kimberley, Sun Valley, Zao Onsen" className={input} minLength={2} maxLength={120} />
        </div>
        <div>
          <label className={label}>Country</label>
          <input value={country} onChange={(e) => setCountry(e.target.value)} placeholder="e.g. Canada" className={input} maxLength={80} />
        </div>
        <div>
          <label className={label}>It&apos;s a…</label>
          <select value={kind} onChange={(e) => setKind(e.target.value as typeof kind)} className={input}>
            <option value="either">Resort or town</option>
            <option value="resort">Ski resort</option>
            <option value="town">Town workers live in</option>
          </select>
        </div>
        <div>
          <label className={label}>I&apos;m a…</label>
          <select value={requester} onChange={(e) => setRequester(e.target.value as typeof requester)} className={input}>
            <option value="worker">Worker looking for jobs</option>
            <option value="business">Business hiring staff</option>
            <option value="other">Other</option>
          </select>
        </div>
        <div>
          <label className={label}>Your email *</label>
          <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" className={input} />
        </div>
        {!compact && (
          <div className="sm:col-span-2">
            <label className={label}>Anything else? <span className="font-normal text-foreground/40">(optional)</span></label>
            <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} placeholder="e.g. I run a lodge there and want to hire for winter" className={input} maxLength={1000} />
          </div>
        )}
      </div>

      {error && <p className="text-xs text-red-600">{error}</p>}

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={state === "sending"}
          className={`rounded-lg bg-primary font-semibold text-white transition hover:bg-primary/90 disabled:opacity-60 ${compact ? "px-3 py-1.5 text-xs" : "px-4 py-2 text-sm"}`}
        >
          {state === "sending" ? "Sending…" : "Send request"}
        </button>
        {variant === "card" && (
          <button type="button" onClick={() => setOpen(false)} className="text-xs text-foreground/50 hover:text-foreground/80">Cancel</button>
        )}
      </div>
    </form>
  );
}
