"use client";

import { useState } from "react";
import { BROADCAST_AREAS } from "@/lib/broadcast-areas";

interface Outcome {
  email: string;
  status: "sent" | "failed";
  message?: string;
}

interface Summary {
  area: string;
  testOnly: boolean;
  total: number;
  sent: number;
  failed: number;
  jobsIncluded: number;
}

export default function AdminBroadcastPage() {
  const [areaKey, setAreaKey] = useState(BROADCAST_AREAS[0]?.key ?? "");
  const [busy, setBusy] = useState<"test" | "live" | "retry" | null>(null);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [outcomes, setOutcomes] = useState<Outcome[]>([]);
  const [error, setError] = useState<string | null>(null);

  const area = BROADCAST_AREAS.find((a) => a.key === areaKey);
  const failedEmails = outcomes
    .filter((o) => o.status === "failed")
    .map((o) => o.email);

  async function postBroadcast(payload: {
    testOnly?: boolean;
    retryEmails?: string[];
  }) {
    setError(null);
    try {
      const res = await fetch("/api/admin/broadcast/area-jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ areaKey, ...payload }),
      });
      const body = await res.json();
      if (!res.ok) {
        setError(body.error ?? `Request failed (${res.status})`);
        return null;
      }
      return body as { summary: Summary; outcomes: Outcome[] };
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      return null;
    }
  }

  async function send(testOnly: boolean) {
    if (!area) return;
    if (!testOnly) {
      const ok = window.confirm(
        `Send "${area.displayName}" job alert to ALL worker users? This cannot be undone.`
      );
      if (!ok) return;
    }
    setBusy(testOnly ? "test" : "live");
    setSummary(null);
    setOutcomes([]);
    const body = await postBroadcast({ testOnly });
    if (body) {
      setSummary(body.summary);
      setOutcomes(body.outcomes ?? []);
    }
    setBusy(null);
  }

  async function retryFailed() {
    if (!area || failedEmails.length === 0) return;
    const ok = window.confirm(
      `Retry sending to ${failedEmails.length} failed address${failedEmails.length === 1 ? "" : "es"}? Already-successful recipients will not be re-emailed.`
    );
    if (!ok) return;
    setBusy("retry");
    const body = await postBroadcast({ retryEmails: failedEmails });
    if (body) {
      // Merge the new outcomes back over the previous failures so the
      // UI reflects which retries succeeded.
      const updated = new Map(outcomes.map((o) => [o.email, o]));
      for (const o of body.outcomes ?? []) updated.set(o.email, o);
      const next = Array.from(updated.values());
      setOutcomes(next);
      setSummary({
        ...(summary ?? body.summary),
        sent: next.filter((o) => o.status === "sent").length,
        failed: next.filter((o) => o.status === "failed").length,
        total: next.length,
      });
    }
    setBusy(null);
  }

  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      <h1 className="text-2xl font-bold text-primary">Broadcast to Workers</h1>
      <p className="mt-2 text-sm text-foreground/60">
        Send a "new jobs in {area?.displayName ?? "this area"}" email to every
        registered worker. The email pulls in the 5 newest active jobs in the
        selected area.
      </p>

      <div className="mt-8 space-y-6 rounded-xl border border-accent/30 bg-white p-6">
        <div>
          <label className="block text-sm font-semibold text-primary">Area</label>
          <select
            value={areaKey}
            onChange={(e) => setAreaKey(e.target.value)}
            className="mt-2 w-full rounded-lg border border-accent/40 bg-white px-3 py-2 text-sm text-primary focus:border-secondary focus:outline-none"
            disabled={busy !== null}
          >
            {BROADCAST_AREAS.map((a) => (
              <option key={a.key} value={a.key}>
                {a.displayName}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <button
            type="button"
            onClick={() => send(true)}
            disabled={busy !== null || !area}
            className="rounded-lg border border-secondary px-4 py-2 text-sm font-semibold text-secondary hover:bg-secondary/5 disabled:opacity-50"
          >
            {busy === "test" ? "Sending test…" : "Send test to me"}
          </button>
          <button
            type="button"
            onClick={() => send(false)}
            disabled={busy !== null || !area}
            className="rounded-lg bg-secondary px-4 py-2 text-sm font-semibold text-white hover:bg-secondary/90 disabled:opacity-50"
          >
            {busy === "live" ? "Sending…" : "Send to all workers"}
          </button>
        </div>

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {summary && (
          <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
            <p className="font-semibold">
              {summary.testOnly ? "Test send complete" : "Broadcast complete"}
            </p>
            <p className="mt-1">
              Area: {summary.area} · Jobs in email: {summary.jobsIncluded} · Sent:{" "}
              {summary.sent} / {summary.total}
              {summary.failed > 0 && ` · Failed: ${summary.failed}`}
            </p>
          </div>
        )}

        {failedEmails.length > 0 && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800">
            <div className="mb-2 flex items-center justify-between gap-3">
              <p className="font-semibold">
                Failed sends ({failedEmails.length}):
              </p>
              <button
                type="button"
                onClick={retryFailed}
                disabled={busy !== null}
                className="rounded-md border border-amber-300 bg-white px-3 py-1 text-xs font-semibold text-amber-800 hover:bg-amber-100 disabled:opacity-50"
              >
                {busy === "retry"
                  ? "Retrying…"
                  : `Resend to ${failedEmails.length} failed`}
              </button>
            </div>
            <ul className="space-y-1">
              {outcomes
                .filter((o) => o.status === "failed")
                .slice(0, 20)
                .map((o, i) => (
                  <li key={i}>
                    {o.email}: {o.message ?? "unknown error"}
                  </li>
                ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
