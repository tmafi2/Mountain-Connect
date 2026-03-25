"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

/* ─── Types ──────────────────────────────────────────────── */

interface JobFormData {
  title: string;
  category: string;
  employmentType: string;
  resortName: string;
  location: string;
  salary: string;
  seasonStart: string;
  seasonEnd: string;
  description: string;
  requirements: string;
  languageRequirements: string;
  housingIncluded: boolean;
  skiPassIncluded: boolean;
  mealsIncluded: boolean;
  visaSponsorshipAvailable: boolean;
  housingDetails: string;
  accommodationType: string;
  accommodationCost: string;
  urgentlyHiring: boolean;
  positions: number;
}

/* ─── Constants ──────────────────────────────────────────── */

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

/* ─── Toggle Component ───────────────────────────────────── */

function Toggle({
  value,
  onChange,
  label,
}: {
  value: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm font-medium text-foreground">{label}</span>
      <button
        type="button"
        onClick={() => onChange(!value)}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
          value ? "bg-secondary" : "bg-gray-200"
        }`}
      >
        <span
          className={`inline-block h-4 w-4 rounded-full bg-white transition-transform ${
            value ? "translate-x-6" : "translate-x-1"
          }`}
        />
      </button>
    </div>
  );
}

/* ─── Page ───────────────────────────────────────────────── */

export default function PostJobPage() {
  const router = useRouter();
  const [posting, setPosting] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [businessId, setBusinessId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Resort search state
  const [resortResults, setResortResults] = useState<{ id: string; name: string; country: string }[]>([]);
  const [selectedResortId, setSelectedResortId] = useState<string | null>(null);
  const [showResortDropdown, setShowResortDropdown] = useState(false);
  const resortRef = useRef<HTMLDivElement>(null);

  const [form, setForm] = useState<JobFormData>({
    title: "",
    category: "",
    employmentType: "",
    resortName: "",
    location: "",
    salary: "",
    seasonStart: "",
    seasonEnd: "",
    description: "",
    requirements: "",
    languageRequirements: "",
    housingIncluded: false,
    skiPassIncluded: false,
    mealsIncluded: false,
    visaSponsorshipAvailable: false,
    housingDetails: "",
    accommodationType: "",
    accommodationCost: "",
    urgentlyHiring: false,
    positions: 1,
  });

  // Fetch business profile on mount
  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }
      const { data: bp } = await supabase
        .from("business_profiles")
        .select("id")
        .eq("user_id", user.id)
        .single();
      if (bp) setBusinessId(bp.id);
      setLoading(false);
    })();
  }, []);

  // Resort search
  useEffect(() => {
    if (!form.resortName.trim() || form.resortName.length < 2) {
      setResortResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      const supabase = createClient();
      const { data } = await supabase
        .from("resorts")
        .select("id, name, country")
        .ilike("name", `%${form.resortName}%`)
        .limit(8);
      setResortResults(data || []);
      setShowResortDropdown(true);
    }, 300);
    return () => clearTimeout(timer);
  }, [form.resortName]);

  // Close resort dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (resortRef.current && !resortRef.current.contains(e.target as Node)) {
        setShowResortDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const updateField = <K extends keyof JobFormData>(
    field: K,
    value: JobFormData[K]
  ) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (field === "resortName") setSelectedResortId(null);
  };

  const buildJobRow = (status: "active" | "draft") => {
    const posType = form.employmentType === "Full-time" ? "full_time" : form.employmentType === "Part-time" ? "part_time" : "casual";
    return {
      business_id: businessId!,
      resort_id: selectedResortId!,
      title: form.title.trim(),
      description: form.description.trim(),
      requirements: form.requirements.trim() || null,
      accommodation_included: form.housingIncluded,
      salary_range: form.salary.trim() || null,
      start_date: form.seasonStart || null,
      end_date: form.seasonEnd || null,
      is_active: status === "active",
      category: form.category || null,
      position_type: posType,
      pay_amount: form.salary.trim() || null,
      pay_currency: "USD",
      housing_details: form.housingDetails.trim() || null,
      meal_perks: form.mealsIncluded,
      ski_pass_included: form.skiPassIncluded,
      language_required: form.languageRequirements.trim() || null,
      visa_sponsorship: form.visaSponsorshipAvailable,
      urgently_hiring: form.urgentlyHiring,
      positions_available: form.positions,
      accommodation_type: form.accommodationType || null,
      accommodation_cost: form.accommodationCost.trim() || null,
      status,
    };
  };

  const handlePost = async () => {
    if (!businessId) { setError("Business profile not found. Please complete your company profile first."); return; }
    if (!selectedResortId) { setError("Please select a resort from the dropdown."); return; }
    if (!form.title.trim()) { setError("Job title is required."); return; }
    if (!form.description.trim()) { setError("Job description is required."); return; }

    setPosting(true);
    setError(null);
    const supabase = createClient();
    const { error: insertError } = await supabase.from("job_posts").insert(buildJobRow("active"));
    if (insertError) { setError(insertError.message); setPosting(false); return; }
    router.push("/business/manage-listings");
  };

  const handleSaveDraft = async () => {
    if (!businessId || !selectedResortId) { setError("Please select a resort first."); return; }
    setSavingDraft(true);
    setError(null);
    const supabase = createClient();
    const { error: insertError } = await supabase.from("job_posts").insert(buildJobRow("draft"));
    if (insertError) { setError(insertError.message); }
    setSavingDraft(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-secondary/30 border-t-secondary" />
      </div>
    );
  }

  const inputClass =
    "mt-1 w-full rounded-lg border border-accent bg-white px-4 py-2.5 text-primary focus:border-secondary focus:outline-none focus:ring-1 focus:ring-secondary";

  return (
    <div className="mx-auto max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold text-primary">Post a New Job</h1>
        <p className="mt-1 text-sm text-foreground/60">
          Create a job listing to find seasonal workers for your business.
        </p>
      </div>

      {/* ── Section 1: Basic Info ─────────────────────────── */}
      <div className="mt-6 rounded-xl border border-accent bg-white p-6">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-foreground/50">
          Basic Information
        </h2>

        <div className="mt-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground">
              Job Title <span className="text-red-400">*</span>
            </label>
            <input
              value={form.title}
              onChange={(e) => updateField("title", e.target.value)}
              placeholder="e.g. Ski Instructor, Line Cook, Front Desk Agent"
              className={inputClass}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground">
                Job Category
              </label>
              <select
                value={form.category}
                onChange={(e) => updateField("category", e.target.value)}
                className={inputClass}
              >
                <option value="">Select a category</option>
                {JOB_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground">
                Employment Type
              </label>
              <select
                value={form.employmentType}
                onChange={(e) => updateField("employmentType", e.target.value)}
                className={inputClass}
              >
                <option value="">Select type</option>
                {EMPLOYMENT_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div ref={resortRef} className="relative">
              <label className="block text-sm font-medium text-foreground">
                Resort / Location Name <span className="text-red-400">*</span>
              </label>
              <input
                value={form.resortName}
                onChange={(e) => updateField("resortName", e.target.value)}
                onFocus={() => resortResults.length > 0 && setShowResortDropdown(true)}
                placeholder="Search for a resort..."
                className={`${inputClass} ${selectedResortId ? "border-green-400 bg-green-50/30" : ""}`}
              />
              {selectedResortId && (
                <span className="absolute right-3 top-9 text-green-500">
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                </span>
              )}
              {showResortDropdown && resortResults.length > 0 && (
                <div className="absolute z-20 mt-1 w-full rounded-lg border border-accent bg-white shadow-lg max-h-48 overflow-y-auto">
                  {resortResults.map((r) => (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => {
                        setSelectedResortId(r.id);
                        setForm((prev) => ({ ...prev, resortName: r.name, location: `${r.name}, ${r.country}` }));
                        setShowResortDropdown(false);
                      }}
                      className="w-full px-4 py-2 text-left text-sm hover:bg-accent/30 transition-colors"
                    >
                      <span className="font-medium text-primary">{r.name}</span>
                      <span className="ml-2 text-foreground/40">{r.country}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground">
                Location
              </label>
              <input
                value={form.location}
                onChange={(e) => updateField("location", e.target.value)}
                placeholder="e.g. Whistler, Canada"
                className={inputClass}
              />
            </div>
          </div>
        </div>
      </div>

      {/* ── Section 2: Pay & Dates ────────────────────────── */}
      <div className="mt-4 rounded-xl border border-accent bg-white p-6">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-foreground/50">
          Pay &amp; Dates
        </h2>

        <div className="mt-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground">
              Pay / Salary
            </label>
            <input
              value={form.salary}
              onChange={(e) => updateField("salary", e.target.value)}
              placeholder="e.g. CAD $22-30/hr"
              className={inputClass}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground">
                Season Start Date
              </label>
              <input
                type="date"
                value={form.seasonStart}
                onChange={(e) => updateField("seasonStart", e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground">
                Season End Date
              </label>
              <input
                type="date"
                value={form.seasonEnd}
                onChange={(e) => updateField("seasonEnd", e.target.value)}
                className={inputClass}
              />
            </div>
          </div>
        </div>
      </div>

      {/* ── Section 3: Description & Requirements ─────────── */}
      <div className="mt-4 rounded-xl border border-accent bg-white p-6">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-foreground/50">
          Description &amp; Requirements
        </h2>

        <div className="mt-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground">
              Job Description
            </label>
            <textarea
              value={form.description}
              onChange={(e) => updateField("description", e.target.value)}
              rows={6}
              placeholder="Describe the role, day-to-day responsibilities, and what makes this position unique..."
              className={inputClass}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground">
              Requirements
            </label>
            <textarea
              value={form.requirements}
              onChange={(e) => updateField("requirements", e.target.value)}
              rows={5}
              placeholder="List qualifications, certifications, experience level, and any must-haves..."
              className={inputClass}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground">
              Language Requirements
            </label>
            <input
              value={form.languageRequirements}
              onChange={(e) =>
                updateField("languageRequirements", e.target.value)
              }
              placeholder="e.g. English (fluent), French (basic)"
              className={inputClass}
            />
          </div>
        </div>
      </div>

      {/* ── Section 4: Perks & Accommodation ──────────────── */}
      <div className="mt-4 rounded-xl border border-accent bg-white p-6">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-foreground/50">
          Perks &amp; Accommodation
        </h2>

        <div className="mt-4 space-y-4">
          <Toggle
            label="Housing Included"
            value={form.housingIncluded}
            onChange={(v) => updateField("housingIncluded", v)}
          />
          <Toggle
            label="Ski Pass Included"
            value={form.skiPassIncluded}
            onChange={(v) => updateField("skiPassIncluded", v)}
          />
          <Toggle
            label="Meals Included"
            value={form.mealsIncluded}
            onChange={(v) => updateField("mealsIncluded", v)}
          />
          <Toggle
            label="Visa Sponsorship Available"
            value={form.visaSponsorshipAvailable}
            onChange={(v) => updateField("visaSponsorshipAvailable", v)}
          />

          {form.housingIncluded && (
            <div>
              <label className="block text-sm font-medium text-foreground">
                Housing Details
              </label>
              <textarea
                value={form.housingDetails}
                onChange={(e) => updateField("housingDetails", e.target.value)}
                rows={3}
                placeholder="Describe the housing arrangement, location, amenities..."
                className={inputClass}
              />
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground">
                Accommodation Type
              </label>
              <select
                value={form.accommodationType}
                onChange={(e) =>
                  updateField("accommodationType", e.target.value)
                }
                className={inputClass}
              >
                <option value="">Select type</option>
                {ACCOMMODATION_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground">
                Accommodation Cost
              </label>
              <input
                value={form.accommodationCost}
                onChange={(e) =>
                  updateField("accommodationCost", e.target.value)
                }
                placeholder="e.g. $500/month"
                className={inputClass}
              />
            </div>
          </div>
        </div>
      </div>

      {/* ── Section 5: Listing Options ────────────────────── */}
      <div className="mt-4 rounded-xl border border-accent bg-white p-6">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-foreground/50">
          Listing Options
        </h2>

        <div className="mt-4 space-y-4">
          <Toggle
            label="Urgently Hiring"
            value={form.urgentlyHiring}
            onChange={(v) => updateField("urgentlyHiring", v)}
          />

          <div>
            <label className="block text-sm font-medium text-foreground">
              Number of Positions Available
            </label>
            <input
              type="number"
              min={1}
              value={form.positions}
              onChange={(e) =>
                updateField("positions", Math.max(1, parseInt(e.target.value) || 1))
              }
              className={inputClass}
            />
          </div>
        </div>
      </div>

      {/* Error display */}
      {error && (
        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* ── Actions ───────────────────────────────────────── */}
      <div className="mt-6 flex items-center justify-between rounded-xl border border-accent bg-white p-5">
        <button
          onClick={handleSaveDraft}
          disabled={savingDraft || posting}
          className="rounded-lg border border-accent bg-white px-5 py-2.5 text-sm font-semibold text-foreground transition-colors hover:bg-accent/20 disabled:opacity-50"
        >
          {savingDraft ? "Saving..." : "Save as Draft"}
        </button>
        <button
          onClick={handlePost}
          disabled={posting || !form.title.trim()}
          className="rounded-lg bg-primary px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary/90 disabled:opacity-50"
        >
          {posting ? (
            <span className="flex items-center gap-2">
              <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
              Posting...
            </span>
          ) : (
            "Post Job"
          )}
        </button>
      </div>
    </div>
  );
}
