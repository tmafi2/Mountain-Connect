"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  OUTREACH_SEQUENCE,
  STANDALONE_TEMPLATES,
} from "@/lib/outreach/sequence";

interface FetchedSubject {
  template: string;
  subject: string;
  loading: boolean;
  error?: string;
}

export default function CampaignOverviewPage() {
  const [businessName, setBusinessName] = useState("Thredbo Alpine Village");
  const [locationName, setLocationName] = useState("Thredbo");
  const [subjects, setSubjects] = useState<Record<string, FetchedSubject>>({});

  // Cumulative day each step lands on, computed once from the sequence.
  const cumulative = useMemo(() => {
    let total = 0;
    return OUTREACH_SEQUENCE.map((s) => {
      total += s.delayDaysAfterPrevious;
      return total;
    });
  }, []);

  // Sequence span — shown in the header to give the admin a sense of
  // total campaign length at a glance.
  const totalDays = cumulative[cumulative.length - 1] ?? 0;

  // Fetch each template's rendered subject so the cards show the actual
  // subject line a recipient would see (which depends on locationName).
  useEffect(() => {
    const all = [
      ...OUTREACH_SEQUENCE.map((s) => s.template),
      ...STANDALONE_TEMPLATES.map((s) => s.template),
    ];
    setSubjects((prev) => {
      const next = { ...prev };
      for (const t of all) next[t] = { template: t, subject: "", loading: true };
      return next;
    });
    const params = new URLSearchParams({ businessName, locationName });
    Promise.all(
      all.map(async (t) => {
        try {
          const res = await fetch(
            `/api/admin/outreach/templates/${t}/preview?${params.toString()}`,
            { cache: "no-store" }
          );
          const data = await res.json();
          setSubjects((prev) => ({
            ...prev,
            [t]: {
              template: t,
              subject: data.subject ?? "",
              loading: false,
              error: res.ok ? undefined : data.error,
            },
          }));
        } catch (e) {
          setSubjects((prev) => ({
            ...prev,
            [t]: {
              template: t,
              subject: "",
              loading: false,
              error: e instanceof Error ? e.message : "Failed",
            },
          }));
        }
      })
    );
  }, [businessName, locationName]);

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <Link href="/admin/outreach" className="text-xs text-foreground/50 hover:text-secondary">
            ← Back to outreach
          </Link>
          <h1 className="mt-1 text-2xl font-bold text-primary sm:text-3xl">Campaign overview</h1>
          <p className="mt-1 text-sm text-foreground/60">
            Every email a lead receives, in the order it lands. Drip cron auto-fires the funnel
            steps once you send the first one. Standalone templates are manual-only.
          </p>
        </div>
        <Link
          href="/admin/outreach/templates"
          className="rounded-xl border border-accent bg-white px-4 py-2 text-sm font-medium text-foreground/70 hover:border-secondary/50 hover:bg-secondary/5"
        >
          Open viewer →
        </Link>
      </div>

      {/* Sample data inputs */}
      <div className="mt-6 rounded-2xl border border-accent bg-white p-4 shadow-sm">
        <div className="flex items-center gap-2">
          <span className="h-4 w-1 rounded-full bg-secondary" aria-hidden />
          <h2 className="text-xs font-semibold uppercase tracking-wider text-primary">
            Subjects rendered with
          </h2>
        </div>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <Field label="Sample business name">
            <input
              type="text"
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              className="input"
            />
          </Field>
          <Field label="Sample location">
            <input
              type="text"
              value={locationName}
              onChange={(e) => setLocationName(e.target.value)}
              placeholder="e.g. Thredbo"
              className="input"
            />
          </Field>
        </div>
      </div>

      {/* Funnel sequence header */}
      <div className="mt-8 flex items-end justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="h-5 w-1 rounded-full bg-secondary" aria-hidden />
            <h2 className="text-lg font-bold text-primary">Funnel sequence</h2>
            <span className="rounded-full bg-secondary/10 px-2 py-0.5 text-xs font-semibold text-secondary">
              {OUTREACH_SEQUENCE.length} {OUTREACH_SEQUENCE.length === 1 ? "step" : "steps"} · {totalDays} days
            </span>
          </div>
          <p className="ml-3 mt-1 text-xs text-foreground/55">
            Step 0 fires when you click Send. Steps 1+ auto-fire on the cadence below.
          </p>
        </div>
      </div>

      {/* Timeline */}
      <div className="relative mt-4">
        {/* Vertical spine line */}
        <span
          className="pointer-events-none absolute left-7 top-2 bottom-2 w-px bg-accent"
          aria-hidden
        />
        <ol className="space-y-3">
          {OUTREACH_SEQUENCE.map((step, idx) => {
            const subj = subjects[step.template];
            return (
              <li key={step.template} className="relative pl-16">
                {/* Day badge / spine dot */}
                <div className="absolute left-0 top-3 flex h-14 w-14 items-center justify-center rounded-full border-2 border-accent bg-white text-center shadow-sm">
                  <div>
                    <p className="text-[9px] font-semibold uppercase tracking-wider text-foreground/40">
                      {idx === 0 ? "Day" : "Day"}
                    </p>
                    <p className="text-sm font-bold leading-none text-primary">{cumulative[idx]}</p>
                  </div>
                </div>

                {/* Card */}
                <Link
                  href={`/admin/outreach/templates?template=${step.template}`}
                  className="group block rounded-2xl border border-accent bg-white p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:border-secondary/60 hover:shadow-md"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="rounded-md bg-accent/30 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-foreground/60">
                          {step.template}
                        </span>
                        {idx === 0 ? (
                          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-800">
                            Manual
                          </span>
                        ) : (
                          <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-800">
                            Auto · +{step.delayDaysAfterPrevious}d
                          </span>
                        )}
                      </div>
                      <h3 className="mt-2 text-base font-semibold text-primary">
                        {subj?.loading ? (
                          <span className="text-foreground/40">Loading subject…</span>
                        ) : subj?.error ? (
                          <span className="text-red-600">{subj.error}</span>
                        ) : (
                          <>&ldquo;{subj?.subject}&rdquo;</>
                        )}
                      </h3>
                      <p className="mt-1.5 text-xs text-foreground/55">{step.label}</p>
                    </div>
                    <span className="shrink-0 text-secondary opacity-0 transition-opacity group-hover:opacity-100">
                      Preview →
                    </span>
                  </div>
                </Link>
              </li>
            );
          })}
        </ol>
      </div>

      {/* Standalone templates */}
      {STANDALONE_TEMPLATES.length > 0 && (
        <>
          <div className="mt-10 flex items-end justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className="h-5 w-1 rounded-full bg-amber-400" aria-hidden />
                <h2 className="text-lg font-bold text-primary">Ad-hoc templates</h2>
                <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800">
                  Manual only
                </span>
              </div>
              <p className="ml-3 mt-1 text-xs text-foreground/55">
                Sent on demand. Drip cron does not auto-progress from these.
              </p>
            </div>
          </div>

          <ol className="mt-4 space-y-3">
            {STANDALONE_TEMPLATES.map((s) => {
              const subj = subjects[s.template];
              return (
                <li key={s.template}>
                  <Link
                    href={`/admin/outreach/templates?template=${s.template}`}
                    className="group block rounded-2xl border border-accent bg-white p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:border-secondary/60 hover:shadow-md"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="rounded-md bg-accent/30 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-foreground/60">
                            {s.template}
                          </span>
                          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-800">
                            Manual
                          </span>
                        </div>
                        <h3 className="mt-2 text-base font-semibold text-primary">
                          {subj?.loading ? (
                            <span className="text-foreground/40">Loading subject…</span>
                          ) : subj?.error ? (
                            <span className="text-red-600">{subj.error}</span>
                          ) : (
                            <>&ldquo;{subj?.subject}&rdquo;</>
                          )}
                        </h3>
                        <p className="mt-1.5 text-xs text-foreground/55">{s.description}</p>
                      </div>
                      <span className="shrink-0 text-secondary opacity-0 transition-opacity group-hover:opacity-100">
                        Preview →
                      </span>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ol>
        </>
      )}

      <style jsx>{`
        :global(.input) {
          width: 100%;
          border-radius: 0.5rem;
          border: 1px solid var(--accent, #c8d5e0);
          background: white;
          padding: 0.5rem 0.75rem;
          font-size: 0.875rem;
          color: var(--primary, #0a1e33);
        }
        :global(.input:focus) {
          outline: none;
          border-color: #3b9ede;
          box-shadow: 0 0 0 2px rgba(59, 158, 222, 0.2);
        }
      `}</style>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-xs font-semibold uppercase tracking-wider text-foreground/50">
        {label}
      </span>
      <div className="mt-1">{children}</div>
    </label>
  );
}
