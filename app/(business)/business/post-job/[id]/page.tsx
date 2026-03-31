"use client";

import { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

/* ─── Types ──────────────────────────────────────────────── */

interface JobFormData {
  title: string;
  category: string;
  employmentType: string;
  resortName: string;
  location: string;
  payCurrency: string;
  payAmount: string;
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
  showPositions: boolean;
  customPerks: string[];
}

/* ─── Constants ──────────────────────────────────────────── */

const JOB_CATEGORIES = [
  "Ski Instruction", "Hospitality", "Food & Beverage", "Retail",
  "Resort Operations", "Lift Operations", "Housekeeping", "Maintenance",
  "Administration", "Entertainment", "Other",
];

const EMPLOYMENT_TYPES = ["Full-time", "Part-time", "Casual"];

const ACCOMMODATION_TYPES = [
  "Staff housing", "Shared apartment", "Private room", "Subsidy/stipend", "Not provided",
];

const CURRENCIES = [
  { code: "AUD", label: "AUD $", flag: "\u{1F1E6}\u{1F1FA}" },
  { code: "NZD", label: "NZD $", flag: "\u{1F1F3}\u{1F1FF}" },
  { code: "CAD", label: "CAD $", flag: "\u{1F1E8}\u{1F1E6}" },
  { code: "USD", label: "USD $", flag: "\u{1F1FA}\u{1F1F8}" },
  { code: "EUR", label: "EUR \u20AC", flag: "\u{1F1EA}\u{1F1FA}" },
  { code: "GBP", label: "GBP \u00A3", flag: "\u{1F1EC}\u{1F1E7}" },
  { code: "CHF", label: "CHF", flag: "\u{1F1E8}\u{1F1ED}" },
  { code: "JPY", label: "JPY \u00A5", flag: "\u{1F1EF}\u{1F1F5}" },
  { code: "NOK", label: "NOK kr", flag: "\u{1F1F3}\u{1F1F4}" },
  { code: "SEK", label: "SEK kr", flag: "\u{1F1F8}\u{1F1EA}" },
  { code: "CLP", label: "CLP $", flag: "\u{1F1E8}\u{1F1F1}" },
  { code: "ARS", label: "ARS $", flag: "\u{1F1E6}\u{1F1F7}" },
];

/* ─── Toggle Component ───────────────────────────────────── */

function Toggle({ value, onChange, label }: { value: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm font-medium text-foreground">{label}</span>
      <button
        type="button"
        onClick={() => onChange(!value)}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${value ? "bg-secondary" : "bg-gray-200"}`}
      >
        <span className={`inline-block h-4 w-4 rounded-full bg-white transition-transform ${value ? "translate-x-6" : "translate-x-1"}`} />
      </button>
    </div>
  );
}

/* ─── Page ───────────────────────────────────────────────── */

export default function EditJobPage() {
  const params = useParams();
  const router = useRouter();
  const jobId = params.id as string;
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [businessId, setBusinessId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [jobStatus, setJobStatus] = useState<string>("draft");

  // Resort search state
  const [allResorts, setAllResorts] = useState<{ id: string; legacy_id: string; name: string; country: string }[]>([]);
  const [resortSearch, setResortSearch] = useState("");
  const [selectedResortId, setSelectedResortId] = useState<string | null>(null);
  const [selectedResortName, setSelectedResortName] = useState("");
  const [showResortDropdown, setShowResortDropdown] = useState(false);
  const resortRef = useRef<HTMLDivElement>(null);

  // Nearby town state
  const [nearbyTowns, setNearbyTowns] = useState<{ id: string; name: string; slug: string; country: string; state_region: string | null }[]>([]);
  const [selectedTownId, setSelectedTownId] = useState<string | null>(null);
  const [selectedTownName, setSelectedTownName] = useState("");

  // Custom perks state
  const [showCustomPerks, setShowCustomPerks] = useState(false);
  const [newPerk, setNewPerk] = useState("");

  const [form, setForm] = useState<JobFormData>({
    title: "", category: "", employmentType: "", resortName: "", location: "",
    payCurrency: "AUD", payAmount: "", seasonStart: "", seasonEnd: "",
    description: "", requirements: "", languageRequirements: "",
    housingIncluded: false, skiPassIncluded: false, mealsIncluded: false,
    visaSponsorshipAvailable: false, housingDetails: "", accommodationType: "",
    accommodationCost: "", urgentlyHiring: false, positions: 1, showPositions: true,
    customPerks: [],
  });

  // Load job data + resorts
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

      // Load the job
      const { data: job } = await supabase
        .from("job_posts")
        .select("*, resorts(id, name, country)")
        .eq("id", jobId)
        .single();

      if (job) {
        setJobStatus(job.status || "draft");
        const resort = job.resorts as { id: string; name: string; country: string } | null;
        if (resort) {
          setSelectedResortId(resort.id);
          setSelectedResortName(resort.name);
        } else if (job.resort_id) {
          setSelectedResortId(job.resort_id);
        }

        const posTypeMap: Record<string, string> = { full_time: "Full-time", part_time: "Part-time", casual: "Casual" };
        setForm({
          title: job.title || "",
          category: job.category || "",
          employmentType: posTypeMap[job.position_type] || "",
          resortName: resort?.name || "",
          location: resort ? `${resort.name}, ${resort.country}` : "",
          payCurrency: job.pay_currency || "AUD",
          payAmount: job.pay_amount || "",
          seasonStart: job.start_date || "",
          seasonEnd: job.end_date || "",
          description: job.description || "",
          requirements: job.requirements || "",
          languageRequirements: job.language_required || "",
          housingIncluded: job.accommodation_included || false,
          skiPassIncluded: job.ski_pass_included || false,
          mealsIncluded: job.meal_perks || false,
          visaSponsorshipAvailable: job.visa_sponsorship || false,
          housingDetails: job.housing_details || "",
          accommodationType: job.accommodation_type || "",
          accommodationCost: job.accommodation_cost || "",
          urgentlyHiring: job.urgently_hiring || false,
          positions: job.positions_available || 1,
          showPositions: job.show_positions !== false,
          customPerks: job.custom_perks || [],
        });
        if (job.custom_perks && job.custom_perks.length > 0) setShowCustomPerks(true);

        // Load existing town selection
        if (job.nearby_town_id) {
          setSelectedTownId(job.nearby_town_id);
          const { data: townData } = await supabase
            .from("nearby_towns")
            .select("name")
            .eq("id", job.nearby_town_id)
            .single();
          if (townData) setSelectedTownName(townData.name);
        }
      }
      setLoading(false);
    })();
    fetch("/api/search-resorts?all=1")
      .then((r) => r.json())
      .then((data) => setAllResorts(data || []))
      .catch(() => {});
  }, [jobId]);

  // Load nearby towns when resort is selected
  useEffect(() => {
    if (!selectedResortId) { setNearbyTowns([]); return; }
    const supabase = createClient();
    supabase
      .from("resort_nearby_towns")
      .select("nearby_towns(id, name, slug, country, state_region)")
      .eq("resort_id", selectedResortId)
      .then(({ data }) => {
        if (data) {
          const towns = data.map((r) => {
            const t = r.nearby_towns as unknown as { id: string; name: string; slug: string; country: string; state_region: string | null };
            return t;
          }).filter(Boolean);
          setNearbyTowns(towns);
        }
      });
  }, [selectedResortId]);

  // Close resort dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (resortRef.current && !resortRef.current.contains(e.target as Node)) setShowResortDropdown(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const filteredResorts = resortSearch.trim()
    ? allResorts.filter((r) => r.name.toLowerCase().includes(resortSearch.toLowerCase()) || r.country.toLowerCase().includes(resortSearch.toLowerCase()))
    : allResorts;

  const updateField = <K extends keyof JobFormData>(field: K, value: JobFormData[K]) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (field === "resortName") setSelectedResortId(null);
    setSaved(false);
  };

  const buildJobRow = (status: string) => {
    const posType = form.employmentType === "Full-time" ? "full_time" : form.employmentType === "Part-time" ? "part_time" : "casual";
    return {
      resort_id: selectedResortId!,
      title: form.title.trim(),
      description: form.description.trim(),
      requirements: form.requirements.trim() || null,
      accommodation_included: form.housingIncluded,
      salary_range: form.payAmount.trim() ? `${form.payCurrency} ${form.payAmount.trim()}` : null,
      start_date: form.seasonStart || null,
      end_date: form.seasonEnd || null,
      is_active: status === "active",
      category: form.category || null,
      position_type: posType,
      pay_amount: form.payAmount.trim() || null,
      pay_currency: form.payCurrency || "AUD",
      housing_details: form.housingDetails.trim() || null,
      meal_perks: form.mealsIncluded,
      ski_pass_included: form.skiPassIncluded,
      language_required: form.languageRequirements.trim() || null,
      visa_sponsorship: form.visaSponsorshipAvailable,
      urgently_hiring: form.urgentlyHiring,
      positions_available: form.positions,
      accommodation_type: form.accommodationType || null,
      accommodation_cost: form.accommodationCost.trim() || null,
      custom_perks: form.customPerks.length > 0 ? form.customPerks : null,
      show_positions: form.showPositions,
      nearby_town_id: selectedTownId || null,
      status,
    };
  };

  const handleSave = async () => {
    if (!selectedResortId) { setError("Please select a resort from the dropdown."); return; }
    if (!form.title.trim()) { setError("Job title is required."); return; }

    setSaving(true);
    setError(null);
    const supabase = createClient();
    const { error: updateError } = await supabase
      .from("job_posts")
      .update(buildJobRow(jobStatus))
      .eq("id", jobId);
    if (updateError) { setError(updateError.message); setSaving(false); return; }
    setSaved(true);
    setSaving(false);
    setTimeout(() => setSaved(false), 3000);
  };

  const handleSaveAndPublish = async () => {
    if (!selectedResortId) { setError("Please select a resort from the dropdown."); return; }
    if (!form.title.trim()) { setError("Job title is required."); return; }
    if (!form.description.trim()) { setError("Job description is required."); return; }

    setSaving(true);
    setError(null);
    const supabase = createClient();
    const { error: updateError } = await supabase
      .from("job_posts")
      .update(buildJobRow("active"))
      .eq("id", jobId);
    if (updateError) { setError(updateError.message); setSaving(false); return; }

    // Trigger job alert matching when publishing (non-blocking)
    fetch("/api/job-alerts/match", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jobId }),
    }).catch((err) => console.error("Failed to trigger job alert match:", err));

    router.push("/business/manage-listings");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-primary" />
      </div>
    );
  }

  const inputClass =
    "mt-1 w-full rounded-xl border border-accent/40 bg-white px-4 py-2.5 text-primary shadow-sm focus:border-secondary focus:outline-none focus:ring-1 focus:ring-secondary";

  const statusLabel = jobStatus === "draft" ? "Draft" : jobStatus === "active" ? "Active" : jobStatus === "paused" ? "Paused" : "Closed";
  const statusColor = jobStatus === "active" ? "bg-green-50 text-green-700" : jobStatus === "draft" ? "bg-blue-50 text-blue-600" : jobStatus === "paused" ? "bg-yellow-50 text-yellow-700" : "bg-gray-100 text-gray-500";

  return (
    <div className="mx-auto max-w-3xl">
      {/* Header */}
      <div className="relative -mx-6 -mt-6 mb-8 overflow-hidden rounded-2xl px-8 py-10 sm:px-10 sm:py-12">
        <div className="absolute inset-0 bg-gradient-to-br from-[#0a1e33] via-[#0f2942] to-[#132d4a]" />
        <div className="pointer-events-none absolute -right-12 -top-12 h-48 w-48 rounded-3xl bg-secondary/8 blur-2xl rotate-12" />
        <div className="pointer-events-none absolute bottom-0 left-1/3 h-32 w-64 rounded-full bg-secondary/6 blur-3xl" />
        <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: "radial-gradient(circle at 1px 1px, white 1px, transparent 0)", backgroundSize: "32px 32px" }} />
        <div className="relative">
          <div className="flex items-center gap-2 mb-1">
            <svg className="h-4 w-4 text-secondary/70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" />
            </svg>
            <span className="text-xs font-medium uppercase tracking-widest text-secondary/70">Edit Listing</span>
          </div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-white">Edit Job Listing</h1>
            <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${statusColor}`}>{statusLabel}</span>
          </div>
          <p className="mt-1 text-sm text-white/50">
            Update your job listing details. Changes are saved when you click Save.
          </p>
        </div>
      </div>

      {/* Back link */}
      <button onClick={() => router.back()} className="mb-4 inline-flex items-center gap-1 text-sm text-foreground/50 hover:text-foreground">
        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
        Back
      </button>

      {/* ── Section 1: Basic Info ─────────────────────────── */}
      <div className="rounded-2xl border border-accent/40 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-2.5 mb-5">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10"><span className="text-xs font-bold text-primary">1</span></div>
          <h2 className="text-sm font-semibold uppercase tracking-wider text-foreground/50">Basic Information</h2>
        </div>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground">Job Title <span className="text-red-400">*</span></label>
            <input value={form.title} onChange={(e) => updateField("title", e.target.value)} placeholder="e.g. Ski Instructor, Line Cook, Front Desk Agent" className={inputClass} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground">Job Category</label>
              <select value={form.category} onChange={(e) => updateField("category", e.target.value)} className={inputClass}>
                <option value="">Select a category</option>
                {JOB_CATEGORIES.map((cat) => (<option key={cat} value={cat}>{cat}</option>))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground">Employment Type</label>
              <select value={form.employmentType} onChange={(e) => updateField("employmentType", e.target.value)} className={inputClass}>
                <option value="">Select type</option>
                {EMPLOYMENT_TYPES.map((type) => (<option key={type} value={type}>{type}</option>))}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div ref={resortRef} className="relative">
              <label className="block text-sm font-medium text-foreground">Resort / Location Name <span className="text-red-400">*</span></label>
              {selectedResortId ? (
                <div className="mt-1 flex items-center gap-2 rounded-xl border border-green-400 bg-green-50/30 px-4 py-2.5 shadow-sm">
                  <svg className="h-4 w-4 text-green-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                  <span className="text-sm font-medium text-primary truncate">{selectedResortName}</span>
                  <button type="button" onClick={() => { setSelectedResortId(null); setSelectedResortName(""); setResortSearch(""); setForm((prev) => ({ ...prev, resortName: "", location: "" })); }} className="ml-auto text-foreground/40 hover:text-red-500 transition-colors">
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                </div>
              ) : (
                <>
                  <input value={resortSearch} onChange={(e) => setResortSearch(e.target.value)} onFocus={() => setShowResortDropdown(true)} placeholder="Search for a resort..." className={inputClass} />
                  {showResortDropdown && (
                    <div className="absolute z-20 mt-1 w-full rounded-xl border border-accent/40 bg-white shadow-lg max-h-56 overflow-y-auto">
                      {filteredResorts.length === 0 ? (
                        <p className="px-4 py-3 text-sm text-foreground/40">No resorts found</p>
                      ) : filteredResorts.map((r) => (
                        <button key={r.id} type="button" onClick={() => { setSelectedResortId(r.id); setSelectedResortName(r.name); setResortSearch(""); setForm((prev) => ({ ...prev, resortName: r.name, location: `${r.name}, ${r.country}` })); setShowResortDropdown(false); }} className="w-full px-4 py-2.5 text-left text-sm hover:bg-accent/20 transition-colors flex items-center justify-between">
                          <span className="font-medium text-primary">{r.name}</span>
                          <span className="text-xs text-foreground/40">{r.country}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
            {/* Town Location (optional) */}
            {selectedResortId && nearbyTowns.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-foreground">
                  Town Location <span className="text-foreground/40 font-normal">(optional)</span>
                </label>
                <p className="text-xs text-foreground/40 mb-1.5">
                  If your business operates in a nearby town, select it so workers searching by town can find your listing.
                </p>
                <select
                  value={selectedTownId || ""}
                  onChange={(e) => {
                    const townId = e.target.value || null;
                    setSelectedTownId(townId);
                    const town = nearbyTowns.find((t) => t.id === townId);
                    setSelectedTownName(town?.name || "");
                    if (town) {
                      setForm((prev) => ({ ...prev, location: `${town.name}, ${town.state_region || town.country}` }));
                    } else if (selectedResortName) {
                      const resort = allResorts.find((r) => r.id === selectedResortId);
                      setForm((prev) => ({ ...prev, location: resort ? `${resort.name}, ${resort.country}` : prev.location }));
                    }
                    setSaved(false);
                  }}
                  className={inputClass}
                >
                  <option value="">None — resort only</option>
                  {nearbyTowns.map((t) => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-foreground">Location</label>
              <input value={form.location} onChange={(e) => updateField("location", e.target.value)} placeholder="e.g. Whistler, Canada" className={inputClass} />
            </div>
          </div>
        </div>
      </div>

      {/* ── Section 2: Pay & Dates ────────────────────────── */}
      <div className="mt-4 rounded-2xl border border-accent/40 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-2.5 mb-5">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10"><span className="text-xs font-bold text-primary">2</span></div>
          <h2 className="text-sm font-semibold uppercase tracking-wider text-foreground/50">Pay &amp; Dates</h2>
        </div>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground">Pay / Salary</label>
            <div className="mt-1 flex gap-2">
              <select value={form.payCurrency} onChange={(e) => updateField("payCurrency", e.target.value)} className="w-36 rounded-xl border border-accent/40 bg-white px-3 py-2.5 text-sm text-primary shadow-sm focus:border-secondary focus:outline-none focus:ring-1 focus:ring-secondary">
                {CURRENCIES.map((c) => (<option key={c.code} value={c.code}>{c.flag} {c.label}</option>))}
              </select>
              <input value={form.payAmount} onChange={(e) => updateField("payAmount", e.target.value)} placeholder="e.g. 22-30/hr" className="flex-1 rounded-xl border border-accent/40 bg-white px-4 py-2.5 text-primary shadow-sm focus:border-secondary focus:outline-none focus:ring-1 focus:ring-secondary" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground">Season Start Date</label>
              <input type="date" value={form.seasonStart} onChange={(e) => updateField("seasonStart", e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground">Season End Date</label>
              <input type="date" value={form.seasonEnd} onChange={(e) => updateField("seasonEnd", e.target.value)} className={inputClass} />
            </div>
          </div>
        </div>
      </div>

      {/* ── Section 3: Description & Requirements ─────────── */}
      <div className="mt-4 rounded-2xl border border-accent/40 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-2.5 mb-5">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10"><span className="text-xs font-bold text-primary">3</span></div>
          <h2 className="text-sm font-semibold uppercase tracking-wider text-foreground/50">Description &amp; Requirements</h2>
        </div>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground">Job Description</label>
            <textarea value={form.description} onChange={(e) => updateField("description", e.target.value)} rows={6} placeholder="Describe the role, day-to-day responsibilities, and what makes this position unique..." className={inputClass} />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground">Requirements</label>
            <textarea value={form.requirements} onChange={(e) => updateField("requirements", e.target.value)} rows={5} placeholder="List qualifications, certifications, experience level, and any must-haves..." className={inputClass} />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground">Language Requirements</label>
            <input value={form.languageRequirements} onChange={(e) => updateField("languageRequirements", e.target.value)} placeholder="e.g. English (fluent), French (basic)" className={inputClass} />
          </div>
        </div>
      </div>

      {/* ── Section 4: Perks & Accommodation ──────────────── */}
      <div className="mt-4 rounded-2xl border border-accent/40 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-2.5 mb-5">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10"><span className="text-xs font-bold text-primary">4</span></div>
          <h2 className="text-sm font-semibold uppercase tracking-wider text-foreground/50">Perks &amp; Accommodation</h2>
        </div>
        <div className="space-y-4">
          <Toggle label="Housing Included" value={form.housingIncluded} onChange={(v) => updateField("housingIncluded", v)} />
          <Toggle label="Ski Pass Included" value={form.skiPassIncluded} onChange={(v) => updateField("skiPassIncluded", v)} />
          <Toggle label="Meals Included" value={form.mealsIncluded} onChange={(v) => updateField("mealsIncluded", v)} />
          <Toggle label="Visa Sponsorship Available" value={form.visaSponsorshipAvailable} onChange={(v) => updateField("visaSponsorshipAvailable", v)} />
          <Toggle label="Add Custom Perks" value={showCustomPerks} onChange={(v) => setShowCustomPerks(v)} />
          {showCustomPerks && (
            <div className="rounded-xl border border-accent/30 bg-accent/5 p-4">
              <p className="text-xs text-foreground/50 mb-3">Add any additional perks this role offers</p>
              <div className="flex gap-2">
                <input value={newPerk} onChange={(e) => setNewPerk(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && newPerk.trim()) { e.preventDefault(); updateField("customPerks", [...form.customPerks, newPerk.trim()]); setNewPerk(""); } }} placeholder="e.g. Staff discount, Free parking..." className="flex-1 rounded-lg border border-accent/40 bg-white px-3 py-2 text-sm text-primary focus:border-secondary focus:outline-none focus:ring-1 focus:ring-secondary" />
                <button type="button" onClick={() => { if (newPerk.trim()) { updateField("customPerks", [...form.customPerks, newPerk.trim()]); setNewPerk(""); } }} className="rounded-lg bg-secondary px-3 py-2 text-sm font-medium text-white hover:bg-secondary/90">Add</button>
              </div>
              {form.customPerks.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {form.customPerks.map((perk, i) => (
                    <span key={i} className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">
                      {perk}
                      <button type="button" onClick={() => updateField("customPerks", form.customPerks.filter((_, idx) => idx !== i))} className="text-emerald-400 hover:text-red-500">
                        <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}
          {form.housingIncluded && (
            <div>
              <label className="block text-sm font-medium text-foreground">Housing Details</label>
              <textarea value={form.housingDetails} onChange={(e) => updateField("housingDetails", e.target.value)} rows={3} placeholder="Describe the housing arrangement..." className={inputClass} />
            </div>
          )}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground">Accommodation Type</label>
              <select value={form.accommodationType} onChange={(e) => updateField("accommodationType", e.target.value)} className={inputClass}>
                <option value="">Select type</option>
                {ACCOMMODATION_TYPES.map((type) => (<option key={type} value={type}>{type}</option>))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground">Accommodation Cost</label>
              <input value={form.accommodationCost} onChange={(e) => updateField("accommodationCost", e.target.value)} placeholder="e.g. $500/month" className={inputClass} />
            </div>
          </div>
        </div>
      </div>

      {/* ── Section 5: Listing Options ────────────────────── */}
      <div className="mt-4 rounded-2xl border border-accent/40 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-2.5 mb-5">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10"><span className="text-xs font-bold text-primary">5</span></div>
          <h2 className="text-sm font-semibold uppercase tracking-wider text-foreground/50">Listing Options</h2>
        </div>
        <div className="space-y-4">
          <Toggle label="Urgently Hiring" value={form.urgentlyHiring} onChange={(v) => updateField("urgentlyHiring", v)} />
          <div>
            <label className="block text-sm font-medium text-foreground">Number of Positions Available</label>
            <input type="number" min={1} value={form.positions} onChange={(e) => updateField("positions", Math.max(1, parseInt(e.target.value) || 1))} className={inputClass} />
          </div>
          <Toggle label="Show position count to applicants" value={form.showPositions} onChange={(v) => updateField("showPositions", v)} />
        </div>
      </div>

      {/* Error / Success */}
      {error && (
        <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}
      {saved && (
        <div className="mt-4 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700 flex items-center gap-2">
          <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          Changes saved successfully!
        </div>
      )}

      {/* ── Actions ───────────────────────────────────────── */}
      <div className="mt-6 flex items-center justify-between rounded-2xl border border-accent/40 bg-white p-5 shadow-sm">
        <button
          onClick={handleSave}
          disabled={saving}
          className="rounded-xl border border-accent/50 bg-white px-5 py-2.5 text-sm font-semibold text-foreground transition-all hover:bg-accent/20 hover:-translate-y-0.5 disabled:opacity-50"
        >
          {saving ? "Saving..." : "Save Changes"}
        </button>
        <div className="flex items-center gap-3">
          {jobStatus !== "active" && (
            <button
              onClick={handleSaveAndPublish}
              disabled={saving || !form.title.trim()}
              className="rounded-xl bg-green-600 px-5 py-2.5 text-sm font-semibold text-white transition-all hover:bg-green-700 hover:-translate-y-0.5 hover:shadow-lg disabled:opacity-50"
            >
              {saving ? "Publishing..." : "Save & Publish"}
            </button>
          )}
          <button
            onClick={handleSave}
            disabled={saving}
            className="rounded-xl bg-primary px-6 py-2.5 text-sm font-semibold text-white transition-all hover:bg-primary/90 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-primary/20 disabled:opacity-50"
          >
            {saving ? "Saving..." : "Update Listing"}
          </button>
        </div>
      </div>
    </div>
  );
}
