"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

interface Resort {
  id: string;
  name: string;
  country: string;
}

interface NearbyTown {
  id: string;
  name: string;
  slug: string;
  country: string;
  state_region: string | null;
}

interface ImportResult {
  success: true;
  businessId: string;
  jobId: string;
  claimToken: string;
  claimUrl: string;
  outreachEmail: { subject: string; body: string };
  emailSent: boolean;
  emailError: string | null;
  sentTo: string;
}

const SOURCES = ["Facebook", "Seek", "Indeed", "Gumtree", "LinkedIn", "Other"];

const JOB_CATEGORIES = [
  "Ski Instruction",
  "Hospitality",
  "Food & Beverage",
  "Retail",
  "Resort Operations",
  "Lift Operations",
  "Housekeeping",
  "Maintenance",
  "Administration",
  "Entertainment",
  "Other",
];

const EMPLOYMENT_TYPES = ["Full-time", "Part-time", "Casual"];

const ACCOMMODATION_TYPES = [
  "Staff housing",
  "Shared apartment",
  "Private room",
  "Subsidy/stipend",
  "Not provided",
];

const CURRENCIES = [
  { code: "AUD", label: "AUD $" },
  { code: "NZD", label: "NZD $" },
  { code: "CAD", label: "CAD $" },
  { code: "USD", label: "USD $" },
  { code: "EUR", label: "EUR €" },
  { code: "GBP", label: "GBP £" },
  { code: "CHF", label: "CHF" },
  { code: "JPY", label: "JPY ¥" },
  { code: "NOK", label: "NOK kr" },
  { code: "SEK", label: "SEK kr" },
  { code: "CLP", label: "CLP $" },
  { code: "ARS", label: "ARS $" },
];

const initialForm = {
  // Required
  title: "",
  description: "",
  businessName: "",
  businessEmail: "",
  resortId: "",
  source: "Facebook",
  // Source / business shell
  sourceUrl: "",
  location: "",
  country: "",
  // Job details
  category: "",
  employmentType: "",
  requirements: "",
  languageRequirements: "",
  // Pay & dates
  payCurrency: "AUD",
  payAmount: "",
  seasonStart: "",
  seasonEnd: "",
  // Perks
  housingIncluded: false,
  housingDetails: "",
  accommodationType: "",
  accommodationCost: "",
  skiPassIncluded: false,
  mealsIncluded: false,
  visaSponsorshipAvailable: false,
  urgentlyHiring: false,
  customPerksRaw: "",
  // Positions
  positions: 1,
  showPositions: true,
  // Nearby town
  nearbyTownId: "",
  // How to apply
  howToApply: "",
  applicationEmail: "",
  applicationUrl: "",
};

export default function AdminImportListingPage() {
  const [allResorts, setAllResorts] = useState<Resort[]>([]);
  const [nearbyTowns, setNearbyTowns] = useState<NearbyTown[]>([]);
  const [form, setForm] = useState(initialForm);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [copyState, setCopyState] = useState<Record<string, boolean>>({});

  // Section open state (basics + business + source default open)
  const [openSections, setOpenSections] = useState({
    basics: true,
    business: true,
    resort: true,
    details: false,
    pay: false,
    perks: false,
    positions: false,
    apply: false,
    source: true,
  });
  const toggle = (key: keyof typeof openSections) =>
    setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }));

  useEffect(() => {
    fetch("/api/search-resorts?all=1")
      .then((r) => r.json())
      .then((data) => setAllResorts(Array.isArray(data) ? data : []))
      .catch(() => setAllResorts([]));
  }, []);

  // Fetch nearby towns when the resort changes
  useEffect(() => {
    if (!form.resortId) {
      setNearbyTowns([]);
      setForm((prev) => ({ ...prev, nearbyTownId: "" }));
      return;
    }
    const supabase = createClient();
    supabase
      .from("resort_nearby_towns")
      .select("nearby_towns(id, name, slug, country, state_region)")
      .eq("resort_id", form.resortId)
      .then(({ data }) => {
        if (data) {
          const towns = data
            .map((r) => r.nearby_towns as unknown as NearbyTown)
            .filter(Boolean);
          setNearbyTowns(towns);
        }
      });
  }, [form.resortId]);

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

    const customPerks = form.customPerksRaw
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    const payload = {
      ...form,
      customPerks,
      positions: Number(form.positions) || 1,
    };

    const res = await fetch("/api/admin/import-listing", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
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
    setForm(initialForm);
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
          .
        </p>

        {/* Email send status */}
        {result.emailSent ? (
          <div className="mt-5 flex items-start gap-3 rounded-xl border border-green-200 bg-green-50 px-4 py-3">
            <span className="text-lg leading-none text-green-700">✓</span>
            <div>
              <p className="text-sm font-semibold text-green-800">Outreach email sent</p>
              <p className="mt-0.5 text-xs text-green-700/80">
                Sent from <code className="font-mono">tyler@mountainconnects.com</code> to{" "}
                <code className="font-mono">{result.sentTo}</code>.
              </p>
            </div>
          </div>
        ) : (
          <div className="mt-5 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
            <span className="text-lg leading-none text-amber-700">!</span>
            <div>
              <p className="text-sm font-semibold text-amber-800">Email did not send automatically</p>
              <p className="mt-0.5 text-xs text-amber-700/80">
                {result.emailError || "Unknown error"}. Copy the email below and send it manually.
              </p>
            </div>
          </div>
        )}

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

        {/* Outreach email — fallback when auto-send fails */}
        {!result.emailSent && (
          <div className="mt-6 rounded-xl border border-accent bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold uppercase tracking-wider text-foreground/50">
                Outreach Email (fallback)
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
        )}

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
        Mirrors the same fields a business would fill out themselves. Anything you do not know — leave blank or write &quot;TBA&quot;. Only the starred sections are required.
      </p>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        {/* BASICS — required */}
        <Section title="Basics *" open={openSections.basics} onToggle={() => toggle("basics")}>
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
          </div>
        </Section>

        {/* BUSINESS — required */}
        <Section title="Business *" open={openSections.business} onToggle={() => toggle("business")}>
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
            <Field label="Location">
              <input
                value={form.location}
                onChange={(e) => update("location", e.target.value)}
                placeholder="e.g. Thredbo (or TBA)"
                className={inputCls}
              />
            </Field>
            <Field label="Country">
              <input
                value={form.country}
                onChange={(e) => update("country", e.target.value)}
                placeholder="e.g. Australia"
                className={inputCls}
              />
            </Field>
          </div>
        </Section>

        {/* RESORT & TOWN — required */}
        <Section title="Resort & town *" open={openSections.resort} onToggle={() => toggle("resort")}>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
            <Field label="Nearby town">
              <select
                value={form.nearbyTownId}
                onChange={(e) => update("nearbyTownId", e.target.value)}
                className={inputCls}
                disabled={nearbyTowns.length === 0}
              >
                <option value="">
                  {form.resortId
                    ? nearbyTowns.length === 0
                      ? "No towns linked to this resort"
                      : "None / TBA"
                    : "Select a resort first"}
                </option>
                {nearbyTowns.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </Field>
          </div>
        </Section>

        {/* JOB DETAILS */}
        <Section title="Job details" open={openSections.details} onToggle={() => toggle("details")}>
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Category">
                <select
                  value={form.category}
                  onChange={(e) => update("category", e.target.value)}
                  className={inputCls}
                >
                  <option value="">Not specified / TBA</option>
                  {JOB_CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Employment type">
                <select
                  value={form.employmentType}
                  onChange={(e) => update("employmentType", e.target.value)}
                  className={inputCls}
                >
                  <option value="">Not specified / TBA</option>
                  {EMPLOYMENT_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
            <Field label="Requirements">
              <textarea
                rows={3}
                value={form.requirements}
                onChange={(e) => update("requirements", e.target.value)}
                placeholder="e.g. Must have a current First Aid certificate (or TBA)"
                className={inputCls}
              />
            </Field>
            <Field label="Language requirements">
              <input
                value={form.languageRequirements}
                onChange={(e) => update("languageRequirements", e.target.value)}
                placeholder="e.g. English (or TBA)"
                className={inputCls}
              />
            </Field>
          </div>
        </Section>

        {/* PAY & DATES */}
        <Section title="Pay & dates" open={openSections.pay} onToggle={() => toggle("pay")}>
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Pay currency">
                <select
                  value={form.payCurrency}
                  onChange={(e) => update("payCurrency", e.target.value)}
                  className={inputCls}
                >
                  {CURRENCIES.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Pay amount">
                <input
                  value={form.payAmount}
                  onChange={(e) => update("payAmount", e.target.value)}
                  placeholder="e.g. 25/hr or TBA"
                  className={inputCls}
                />
              </Field>
              <Field label="Season start">
                <input
                  type="date"
                  value={form.seasonStart}
                  onChange={(e) => update("seasonStart", e.target.value)}
                  className={inputCls}
                />
              </Field>
              <Field label="Season end">
                <input
                  type="date"
                  value={form.seasonEnd}
                  onChange={(e) => update("seasonEnd", e.target.value)}
                  className={inputCls}
                />
              </Field>
            </div>
          </div>
        </Section>

        {/* PERKS */}
        <Section title="Perks & benefits" open={openSections.perks} onToggle={() => toggle("perks")}>
          <div className="space-y-4">
            <p className="text-xs text-foreground/50">
              Only check perks if you are confident the listing offers them. Leave unchecked when unknown.
            </p>
            <div className="grid grid-cols-2 gap-3">
              <Toggle
                checked={form.housingIncluded}
                onChange={(v) => update("housingIncluded", v)}
                label="Housing included"
              />
              <Toggle
                checked={form.skiPassIncluded}
                onChange={(v) => update("skiPassIncluded", v)}
                label="Ski/lift pass"
              />
              <Toggle
                checked={form.mealsIncluded}
                onChange={(v) => update("mealsIncluded", v)}
                label="Meals included"
              />
              <Toggle
                checked={form.visaSponsorshipAvailable}
                onChange={(v) => update("visaSponsorshipAvailable", v)}
                label="Visa sponsorship"
              />
              <Toggle
                checked={form.urgentlyHiring}
                onChange={(v) => update("urgentlyHiring", v)}
                label="Urgently hiring"
              />
            </div>
            {form.housingIncluded && (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label="Accommodation type">
                  <select
                    value={form.accommodationType}
                    onChange={(e) => update("accommodationType", e.target.value)}
                    className={inputCls}
                  >
                    <option value="">Not specified / TBA</option>
                    {ACCOMMODATION_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Accommodation cost">
                  <input
                    value={form.accommodationCost}
                    onChange={(e) => update("accommodationCost", e.target.value)}
                    placeholder="e.g. $150/wk or TBA"
                    className={inputCls}
                  />
                </Field>
                <div className="sm:col-span-2">
                  <Field label="Housing details">
                    <textarea
                      rows={2}
                      value={form.housingDetails}
                      onChange={(e) => update("housingDetails", e.target.value)}
                      placeholder="Anything specific about the accommodation"
                      className={inputCls}
                    />
                  </Field>
                </div>
              </div>
            )}
            <Field label="Custom perks (comma separated)">
              <input
                value={form.customPerksRaw}
                onChange={(e) => update("customPerksRaw", e.target.value)}
                placeholder="e.g. Free gym access, Staff discount, Yoga classes"
                className={inputCls}
              />
            </Field>
          </div>
        </Section>

        {/* POSITIONS */}
        <Section title="Positions" open={openSections.positions} onToggle={() => toggle("positions")}>
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Positions available">
                <input
                  type="number"
                  min={1}
                  value={form.positions}
                  onChange={(e) => update("positions", Number(e.target.value) || 1)}
                  className={inputCls}
                />
              </Field>
            </div>
            <Toggle
              checked={form.showPositions}
              onChange={(v) => update("showPositions", v)}
              label="Show position count to applicants"
            />
          </div>
        </Section>

        {/* HOW TO APPLY */}
        <Section title="How to apply" open={openSections.apply} onToggle={() => toggle("apply")}>
          <div className="space-y-4">
            <Field label="How to apply (free text)">
              <input
                value={form.howToApply}
                onChange={(e) => update("howToApply", e.target.value)}
                placeholder="e.g. Email us with your CV (or TBA)"
                className={inputCls}
              />
            </Field>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Application email">
                <input
                  type="email"
                  value={form.applicationEmail}
                  onChange={(e) => update("applicationEmail", e.target.value)}
                  placeholder="jobs@company.com"
                  className={inputCls}
                />
              </Field>
              <Field label="Application URL">
                <input
                  value={form.applicationUrl}
                  onChange={(e) => update("applicationUrl", e.target.value)}
                  placeholder="https://..."
                  className={inputCls}
                />
              </Field>
            </div>
          </div>
        </Section>

        {/* SOURCE — required */}
        <Section title="Source *" open={openSections.source} onToggle={() => toggle("source")}>
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
            <Field label="Original post URL">
              <input
                type="url"
                value={form.sourceUrl}
                onChange={(e) => update("sourceUrl", e.target.value)}
                placeholder="https://facebook.com/..."
                className={inputCls}
              />
            </Field>
          </div>
        </Section>

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
  "mt-1 w-full rounded-xl border border-accent/50 bg-white px-4 py-2.5 text-sm text-primary placeholder:text-foreground/40 focus:border-secondary focus:outline-none focus:ring-1 focus:ring-secondary disabled:bg-accent/10 disabled:text-foreground/40";

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

function Section({
  title,
  open,
  onToggle,
  children,
}: {
  title: string;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-2xl border border-accent bg-white shadow-sm">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between px-6 py-4 text-left transition-colors hover:bg-accent/5"
      >
        <span className="text-sm font-semibold uppercase tracking-wider text-foreground/60">
          {title}
        </span>
        <span className={`text-foreground/40 transition-transform ${open ? "rotate-180" : ""}`}>
          ▾
        </span>
      </button>
      {open && <div className="border-t border-accent/40 px-6 py-5">{children}</div>}
    </section>
  );
}

function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-accent/40 bg-white px-3 py-2 transition-colors hover:bg-accent/5">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-4 w-4 rounded border-accent/60"
      />
      <span className="text-sm text-foreground/80">{label}</span>
    </label>
  );
}
