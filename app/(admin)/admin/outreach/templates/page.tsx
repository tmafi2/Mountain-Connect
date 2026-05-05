"use client";

import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  OUTREACH_SEQUENCE,
  STANDALONE_TEMPLATES,
} from "@/lib/outreach/sequence";

type Group = "sequence" | "standalone";

interface TemplateMeta {
  template: string;
  label: string;
  group: Group;
  description?: string;
  /** Days after the previous step (sequence templates only). */
  delay?: number;
}

const ALL_TEMPLATES: TemplateMeta[] = [
  ...OUTREACH_SEQUENCE.map((s) => ({
    template: s.template,
    label: s.label,
    group: "sequence" as const,
    delay: s.delayDaysAfterPrevious,
  })),
  ...STANDALONE_TEMPLATES.map((s) => ({
    template: s.template,
    label: s.label,
    group: "standalone" as const,
    description: s.description,
  })),
];

export default function AdminOutreachTemplatesPage() {
  return (
    <Suspense fallback={<div className="mx-auto max-w-7xl px-4 py-8 text-sm text-foreground/40">Loading…</div>}>
      <Inner />
    </Suspense>
  );
}

function Inner() {
  const searchParams = useSearchParams();
  // Optional ?template=name — used by the campaign overview to deep-link
  // straight to a specific template's preview.
  const initial = searchParams.get("template") ?? ALL_TEMPLATES[0]?.template ?? "";
  const [selected, setSelected] = useState<string>(
    ALL_TEMPLATES.find((t) => t.template === initial) ? initial : ALL_TEMPLATES[0]?.template ?? ""
  );
  const [businessName, setBusinessName] = useState("Thredbo Alpine Village");
  const [locationName, setLocationName] = useState("Thredbo");
  const [contactPersonName, setContactPersonName] = useState("");
  const [previewHtml, setPreviewHtml] = useState<string>("");
  const [previewSubject, setPreviewSubject] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected, businessName, locationName, contactPersonName]);

  async function refresh() {
    if (!selected) return;
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        businessName,
        locationName,
        contactPersonName,
      });
      const res = await fetch(
        `/api/admin/outreach/templates/${selected}/preview?${params.toString()}`,
        { cache: "no-store" }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Preview failed");
      setPreviewHtml(data.html);
      setPreviewSubject(data.subject);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Preview failed");
      setPreviewHtml("");
      setPreviewSubject("");
    }
    setLoading(false);
  }

  async function sendTest() {
    setSending(true);
    setError(null);
    setToast(null);
    try {
      const res = await fetch(`/api/admin/outreach/templates/${selected}/send-test`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          businessName,
          locationName,
          contactPersonName,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Send failed");
      setToast(`Test email sent to ${data.sentTo}`);
      setTimeout(() => setToast(null), 4000);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Send failed");
    }
    setSending(false);
  }

  const isSalesDropin = selected === "sales-dropin";

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <Link
            href="/admin/outreach"
            className="text-xs text-foreground/50 hover:text-secondary"
          >
            ← Back to outreach
          </Link>
          <h1 className="mt-1 text-2xl font-bold text-primary sm:text-3xl">
            Email templates
          </h1>
          <p className="mt-1 text-sm text-foreground/60">
            Preview the rendered HTML for each outreach template and send a
            test to your own inbox before firing it at real leads.
          </p>
        </div>
      </div>

      {/* Layout: left column = template picker + sample data, right column = preview */}
      <div className="mt-6 grid gap-6 lg:grid-cols-[20rem_1fr]">
        {/* ── Left: pick template + sample fields ────────── */}
        <div className="space-y-5">
          <div className="rounded-2xl border border-accent bg-white p-4 shadow-sm">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-foreground/40">
              Templates
            </h2>
            <div className="mt-3 space-y-1">
              <p className="px-1 text-[10px] font-semibold uppercase tracking-wider text-foreground/40">
                Funnel sequence
              </p>
              {ALL_TEMPLATES.filter((t) => t.group === "sequence").map((t) => (
                <TemplateButton
                  key={t.template}
                  active={selected === t.template}
                  onClick={() => setSelected(t.template)}
                  template={t}
                />
              ))}
              <p className="mt-3 px-1 text-[10px] font-semibold uppercase tracking-wider text-foreground/40">
                Ad-hoc
              </p>
              {ALL_TEMPLATES.filter((t) => t.group === "standalone").map((t) => (
                <TemplateButton
                  key={t.template}
                  active={selected === t.template}
                  onClick={() => setSelected(t.template)}
                  template={t}
                />
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-accent bg-white p-4 shadow-sm">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-foreground/40">
              Sample data
            </h2>
            <p className="mt-1 text-[11px] text-foreground/50">
              Used for the preview and the test email. No real lead is touched.
            </p>
            <div className="mt-4 space-y-3">
              <Field label="Business name">
                <input
                  type="text"
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  className="input"
                />
              </Field>
              <Field label="Location (optional)">
                <input
                  type="text"
                  value={locationName}
                  onChange={(e) => setLocationName(e.target.value)}
                  placeholder="e.g. Thredbo, Jindabyne"
                  className="input"
                />
              </Field>
              {isSalesDropin && (
                <Field label="Contact name (optional)">
                  <input
                    type="text"
                    value={contactPersonName}
                    onChange={(e) => setContactPersonName(e.target.value)}
                    placeholder="e.g. Sarah"
                    className="input"
                  />
                </Field>
              )}
            </div>

            <button
              type="button"
              onClick={sendTest}
              disabled={sending}
              className="mt-4 w-full rounded-xl bg-secondary px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-secondary-light disabled:opacity-50"
            >
              {sending ? "Sending…" : "Send test to my inbox"}
            </button>
            {toast && (
              <p className="mt-3 rounded-lg bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
                {toast}
              </p>
            )}
          </div>

          <div className="rounded-2xl border border-amber-200/60 bg-amber-50/50 p-4 text-xs text-amber-900">
            <p className="font-semibold">Editing the copy</p>
            <p className="mt-1 opacity-80">
              Templates are TypeScript files under{" "}
              <code className="rounded bg-amber-100 px-1 py-0.5">lib/email/templates/</code>.
              Editing them inline from the admin UI isn't built yet — for now,
              ping the dev or edit the file directly.
            </p>
          </div>
        </div>

        {/* ── Right: preview ─────────────────────────────── */}
        <div className="space-y-3">
          <div className="rounded-2xl border border-accent bg-white p-4 shadow-sm">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-foreground/40">
              Subject
            </p>
            <p className="mt-1 text-sm font-semibold text-primary">
              {loading ? "Loading…" : previewSubject || "—"}
            </p>
          </div>

          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <div className="overflow-hidden rounded-2xl border border-accent bg-white shadow-sm">
            <div className="border-b border-accent/40 bg-accent/5 px-4 py-2 text-[10px] font-semibold uppercase tracking-wider text-foreground/40">
              HTML preview
            </div>
            <iframe
              title={`${selected} preview`}
              srcDoc={previewHtml}
              sandbox=""
              className="h-[80vh] w-full border-0"
            />
          </div>
        </div>
      </div>

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

function TemplateButton({
  template: t,
  active,
  onClick,
}: {
  template: TemplateMeta;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`block w-full rounded-lg px-3 py-2 text-left text-xs transition-colors ${
        active
          ? "bg-secondary/10 text-primary"
          : "text-foreground/70 hover:bg-accent/10"
      }`}
    >
      <div className="font-medium">{t.template}</div>
      <div className="mt-0.5 text-[10px] text-foreground/50">{t.label}</div>
      {t.delay !== undefined && t.delay > 0 && (
        <div className="text-[10px] text-foreground/40">+{t.delay} days</div>
      )}
      {t.description && (
        <div className="text-[10px] text-foreground/40">{t.description}</div>
      )}
    </button>
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
