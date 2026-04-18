"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface Resort {
  id: string;
  name: string;
  country: string;
}

interface ImportResult {
  success: true;
  businessId: string;
  jobId: string;
  claimToken: string;
  claimUrl: string;
  outreachEmail: { subject: string; body: string };
}

const SOURCES = ["Facebook", "Seek", "Indeed", "Gumtree", "LinkedIn", "Other"];

export default function AdminImportListingPage() {
  const [allResorts, setAllResorts] = useState<Resort[]>([]);
  const [form, setForm] = useState({
    title: "",
    description: "",
    businessName: "",
    businessEmail: "",
    location: "",
    country: "",
    resortId: "",
    source: "Facebook",
    sourceUrl: "",
    howToApply: "",
    applicationEmail: "",
    applicationUrl: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [copyState, setCopyState] = useState<Record<string, boolean>>({});

  useEffect(() => {
    fetch("/api/search-resorts?all=1")
      .then((r) => r.json())
      .then((data) => setAllResorts(Array.isArray(data) ? data : []))
      .catch(() => setAllResorts([]));
  }, []);

  const update = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const copy = async (text: string, key: string) => {
    await navigator.clipboard.writeText(text);
    setCopyState((prev) => ({ ...prev, [key]: true }));
    setTimeout(() => setCopyState((prev) => ({ ...prev, [key]: false })), 2000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const res = await fetch("/api/admin/import-listing", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json();

    if (!res.ok || !data.success) {
      setError(data.error || "Failed to import listing.");
      setSubmitting(false);
      return;
    }

    setResult(data as ImportResult);
    setSubmitting(false);
  };

  const resetForm = () => {
    setResult(null);
    setForm({
      title: "",
      description: "",
      businessName: "",
      businessEmail: "",
      location: "",
      country: "",
      resortId: "",
      source: "Facebook",
      sourceUrl: "",
      howToApply: "",
      applicationEmail: "",
      applicationUrl: "",
    });
  };

  if (result) {
    return (
      <div className="mx-auto max-w-3xl">
        <h1 className="text-2xl font-bold text-primary">Listing imported</h1>
        <p className="mt-1 text-sm text-foreground/60">
          The listing is now live at{" "}
          <Link
            href={`/jobs/${result.jobId}`}
            target="_blank"
            className="font-medium text-secondary hover:underline"
          >
            /jobs/{result.jobId.slice(0, 8)}
          </Link>
          . Send the outreach email below to the business owner so they can claim it.
        </p>

        {/* Claim URL */}
        <div className="mt-6 rounded-xl border border-accent bg-white p-5 shadow-sm">
          <label className="text-xs font-semibold uppercase tracking-wider text-foreground/50">
            Claim URL
          </label>
          <div className="mt-2 flex items-center gap-2 rounded-lg border border-accent bg-accent/5 px-3 py-2">
            <code className="min-w-0 flex-1 truncate text-sm text-foreground/70">{result.claimUrl}</code>
            <button
              type="button"
              onClick={() => copy(result.claimUrl, "url")}
              className={`shrink-0 rounded-lg border px-3 py-1.5 text-xs font-medium transition-all ${
                copyState.url
                  ? "border-green-200 bg-green-50 text-green-700"
                  : "border-accent bg-white text-foreground/70 hover:bg-accent/20"
              }`}
            >
              {copyState.url ? "✓ Copied" : "Copy"}
            </button>
          </div>
        </div>

        {/* Outreach email */}
        <div className="mt-6 rounded-xl border border-accent bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold uppercase tracking-wider text-foreground/50">
              Outreach Email
            </label>
            <button
              type="button"
              onClick={() =>
                copy(
                  `Subject: ${result.outreachEmail.subject}\n\n${result.outreachEmail.body}`,
                  "email"
                )
              }
              className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-all ${
                copyState.email
                  ? "border-green-200 bg-green-50 text-green-700"
                  : "border-accent bg-white text-foreground/70 hover:bg-accent/20"
              }`}
            >
              {copyState.email ? "✓ Copied" : "Copy email"}
            </button>
          </div>
          <div className="mt-3 space-y-3">
            <div>
              <p className="text-[11px] uppercase tracking-wider text-foreground/40">Subject</p>
              <p className="mt-1 font-medium text-primary">{result.outreachEmail.subject}</p>
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-wider text-foreground/40">Body</p>
              <pre className="mt-1 whitespace-pre-wrap rounded-lg border border-accent/50 bg-background p-4 font-sans text-sm text-foreground/80">
                {result.outreachEmail.body}
              </pre>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={resetForm}
            className="rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-white hover:bg-primary/90"
          >
            Import another listing
          </button>
          <Link
            href="/admin/businesses"
            className="rounded-xl border border-accent bg-white px-5 py-2.5 text-sm font-semibold text-foreground/70 hover:bg-accent/10"
          >
            View all businesses
          </Link>
          <Link
            href={`/jobs/${result.jobId}`}
            target="_blank"
            className="rounded-xl border border-accent bg-white px-5 py-2.5 text-sm font-semibold text-foreground/70 hover:bg-accent/10"
          >
            View public listing →
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-2xl font-bold text-primary">Import a listing</h1>
      <p className="mt-1 text-sm text-foreground/60">
        Paste in a job listing from Facebook, Seek, or elsewhere. A shell business profile and active job will be created, along with a unique claim URL for outreach.
      </p>

      <form onSubmit={handleSubmit} className="mt-6 space-y-5">
        {/* Business Section */}
        <section className="rounded-2xl border border-accent bg-white p-6 shadow-sm">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-foreground/50 mb-4">
            Business
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Business name *">
              <input
                required
                value={form.businessName}
                onChange={(e) => update("businessName", e.target.value)}
                placeholder="e.g. Executive Housekeeping"
                className={inputCls}
              />
            </Field>
            <Field label="Business email *">
              <input
                required
                type="email"
                value={form.businessEmail}
                onChange={(e) => update("businessEmail", e.target.value)}
                placeholder="hr@company.com"
                className={inputCls}
              />
            </Field>
            <Field label="Resort *">
              <select
                required
                value={form.resortId}
                onChange={(e) => update("resortId", e.target.value)}
                className={inputCls}
              >
                <option value="">Select a resort…</option>
                {allResorts.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name} ({r.country})
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Location (optional)">
              <input
                value={form.location}
                onChange={(e) => update("location", e.target.value)}
                placeholder="e.g. Thredbo"
                className={inputCls}
              />
            </Field>
            <Field label="Country (optional)">
              <input
                value={form.country}
                onChange={(e) => update("country", e.target.value)}
                placeholder="e.g. Australia"
                className={inputCls}
              />
            </Field>
          </div>
        </section>

        {/* Listing Section */}
        <section className="rounded-2xl border border-accent bg-white p-6 shadow-sm">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-foreground/50 mb-4">
            Listing
          </h2>
          <div className="space-y-4">
            <Field label="Job title *">
              <input
                required
                value={form.title}
                onChange={(e) => update("title", e.target.value)}
                placeholder="e.g. Ski Instructor"
                className={inputCls}
              />
            </Field>
            <Field label="Description *">
              <textarea
                required
                rows={6}
                value={form.description}
                onChange={(e) => update("description", e.target.value)}
                placeholder="Paste the job description from the source"
                className={inputCls}
              />
            </Field>
            <Field label="How to apply (optional)">
              <input
                value={form.howToApply}
                onChange={(e) => update("howToApply", e.target.value)}
                placeholder="e.g. Email us with your CV"
                className={inputCls}
              />
            </Field>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Application email (optional)">
                <input
                  type="email"
                  value={form.applicationEmail}
                  onChange={(e) => update("applicationEmail", e.target.value)}
                  placeholder="jobs@company.com"
                  className={inputCls}
                />
              </Field>
              <Field label="Application URL (optional)">
                <input
                  value={form.applicationUrl}
                  onChange={(e) => update("applicationUrl", e.target.value)}
                  placeholder="https://..."
                  className={inputCls}
                />
              </Field>
            </div>
          </div>
        </section>

        {/* Source Section */}
        <section className="rounded-2xl border border-accent bg-white p-6 shadow-sm">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-foreground/50 mb-4">
            Source
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Source *">
              <select
                required
                value={form.source}
                onChange={(e) => update("source", e.target.value)}
                className={inputCls}
              >
                {SOURCES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Original post URL (optional)">
              <input
                type="url"
                value={form.sourceUrl}
                onChange={(e) => update("sourceUrl", e.target.value)}
                placeholder="https://facebook.com/..."
                className={inputCls}
              />
            </Field>
          </div>
        </section>

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={submitting}
            className="rounded-xl bg-primary px-6 py-2.5 text-sm font-semibold text-white transition-all hover:bg-primary/90 disabled:opacity-50"
          >
            {submitting ? "Importing…" : "Import listing"}
          </button>
        </div>
      </form>
    </div>
  );
}

const inputCls =
  "mt-1 w-full rounded-xl border border-accent/50 bg-white px-4 py-2.5 text-sm text-primary placeholder:text-foreground/40 focus:border-secondary focus:outline-none focus:ring-1 focus:ring-secondary";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-xs font-semibold uppercase tracking-wider text-foreground/50">
        {label}
      </span>
      {children}
    </label>
  );
}
