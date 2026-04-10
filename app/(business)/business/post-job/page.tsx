"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { isInLaunchLocation, LAUNCH_LOCATION_NAMES } from "@/lib/config/launch-locations";
import { canPostJob } from "@/lib/tier";
import type { BusinessTier } from "@/lib/tier";
import UpgradePrompt from "@/components/ui/UpgradePrompt";

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
  how_to_apply: string;
  application_email: string;
  application_url: string;
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

const CURRENCIES = [
  { code: "AUD", label: "AUD $", flag: "🇦🇺" },
  { code: "NZD", label: "NZD $", flag: "🇳🇿" },
  { code: "CAD", label: "CAD $", flag: "🇨🇦" },
  { code: "USD", label: "USD $", flag: "🇺🇸" },
  { code: "EUR", label: "EUR €", flag: "🇪🇺" },
  { code: "GBP", label: "GBP £", flag: "🇬🇧" },
  { code: "CHF", label: "CHF", flag: "🇨🇭" },
  { code: "JPY", label: "JPY ¥", flag: "🇯🇵" },
  { code: "NOK", label: "NOK kr", flag: "🇳🇴" },
  { code: "SEK", label: "SEK kr", flag: "🇸🇪" },
  { code: "CLP", label: "CLP $", flag: "🇨🇱" },
  { code: "ARS", label: "ARS $", flag: "🇦🇷" },
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
  const [draftSaved, setDraftSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [existingDrafts, setExistingDrafts] = useState<{ id: string; title: string; created_at: string }[]>([]);
  const [businessId, setBusinessId] = useState<string | null>(null);
  const [businessVerified, setBusinessVerified] = useState(false);
  const [inLaunchLoc, setInLaunchLoc] = useState(true);
  const [loading, setLoading] = useState(true);
  const [businessTier, setBusinessTier] = useState<BusinessTier>("free");
  const [activeJobCount, setActiveJobCount] = useState(0);
  const [canPost, setCanPost] = useState(true);

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
    title: "",
    category: "",
    employmentType: "",
    resortName: "",
    location: "",
    payCurrency: "AUD",
    payAmount: "",
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
    showPositions: true,
    customPerks: [],
    how_to_apply: "",
    application_email: "",
    application_url: "",
  });

  // Fetch business profile + all resorts on mount
  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }
      const { data: bp } = await supabase
        .from("business_profiles")
        .select("id, verification_status, tier")
        .eq("user_id", user.id)
        .single();
      if (bp) {
        setBusinessId(bp.id);
        setBusinessVerified(bp.verification_status === "verified");
        const tier = (bp.tier || "free") as BusinessTier;
        setBusinessTier(tier);

        // Check active job count for tier gating
        const { count } = await supabase
          .from("job_posts")
          .select("id", { count: "exact", head: true })
          .eq("business_id", bp.id)
          .eq("status", "active");
        const jobCount = count || 0;
        setActiveJobCount(jobCount);

        // For free tier, also check yearly job count
        let yearlyCount: number | undefined;
        if (tier === "free") {
          const yearStart = new Date(new Date().getFullYear(), 0, 1).toISOString();
          const { count: yc } = await supabase
            .from("job_posts")
            .select("id", { count: "exact", head: true })
            .eq("business_id", bp.id)
            .gte("created_at", yearStart);
          yearlyCount = yc || 0;
        }
        setCanPost(canPostJob(tier, jobCount, yearlyCount));

        // Check launch location
        const { data: bpFull } = await supabase
          .from("business_profiles")
          .select("resort_id, nearby_town_id")
          .eq("id", bp.id)
          .single();
        if (bpFull) {
          let legacyId: string | null = null;
          let townSlug: string | null = null;
          if (bpFull.resort_id) {
            const { data: resort } = await supabase.from("resorts").select("legacy_id").eq("id", bpFull.resort_id).single();
            legacyId = resort?.legacy_id ?? null;
          }
          if (bpFull.nearby_town_id) {
            const { data: town } = await supabase.from("nearby_towns").select("slug").eq("id", bpFull.nearby_town_id).single();
            townSlug = town?.slug ?? null;
          }
          setInLaunchLoc(isInLaunchLocation(legacyId, townSlug));
        }

        // Load existing drafts
        const { data: drafts } = await supabase
          .from("job_posts")
          .select("id, title, created_at")
          .eq("business_id", bp.id)
          .eq("status", "draft")
          .order("created_at", { ascending: false });
        if (drafts) setExistingDrafts(drafts);
      }
      setLoading(false);
    })();
    // Load all resorts
    fetch("/api/search-resorts?all=1")
      .then((r) => r.json())
      .then((data) => setAllResorts(data || []))
      .catch(() => {});
  }, []);

  // Filter resorts client-side
  const filteredResorts = resortSearch.trim()
    ? allResorts.filter(
        (r) =>
          r.name.toLowerCase().includes(resortSearch.toLowerCase()) ||
          r.country.toLowerCase().includes(resortSearch.toLowerCase())
      )
    : allResorts;

  // Load nearby towns when resort is selected
  useEffect(() => {
    if (!selectedResortId) {
      setNearbyTowns([]);
      setSelectedTownId(null);
      setSelectedTownName("");
      return;
    }
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
    const salaryDisplay = form.payAmount.trim()
      ? `${form.payCurrency} ${form.payAmount.trim()}`
      : null;
    return {
      business_id: businessId!,
      resort_id: selectedResortId!,
      title: form.title.trim(),
      description: form.description.trim(),
      requirements: form.requirements.trim() || null,
      accommodation_included: form.housingIncluded,
      salary_range: salaryDisplay,
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
      how_to_apply: form.how_to_apply.trim() || null,
      application_email: form.application_email.trim() || null,
      application_url: form.application_url.trim() || null,
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
    const { data: newJob, error: insertError } = await supabase.from("job_posts").insert(buildJobRow("active")).select("id").single();
    if (insertError) { setError(insertError.message); setPosting(false); return; }

    // Trigger job alert matching (non-blocking)
    if (newJob?.id) {
      fetch("/api/job-alerts/match", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId: newJob.id }),
      }).catch((err) => console.error("Failed to trigger job alert match:", err));
    }

    router.push("/business/manage-listings");
  };

  const handleSaveDraft = async () => {
    if (!businessId || !selectedResortId) { setError("Please select a resort first."); return; }
    setSavingDraft(true);
    setError(null);
    setDraftSaved(false);
    const supabase = createClient();
    const { data: inserted, error: insertError } = await supabase.from("job_posts").insert(buildJobRow("draft")).select("id, title, created_at").single();
    if (insertError) { setError(insertError.message); setSavingDraft(false); return; }
    // Add to drafts list and show success
    if (inserted) setExistingDrafts((prev) => [inserted, ...prev]);
    setDraftSaved(true);
    setSavingDraft(false);
    setTimeout(() => setDraftSaved(false), 4000);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-primary" />
      </div>
    );
  }

  // Show upgrade prompt if at job limit for current tier
  if (!canPost) {
    const tierMessages: Record<string, { feature: string; description: string; suggested: BusinessTier }> = {
      free: {
        feature: "More Job Listings",
        description: "You've used your 2 free job listings for this year. Upgrade to Standard for 5 active listings, or Premium for unlimited.",
        suggested: "standard",
      },
      standard: {
        feature: "Unlimited Job Listings",
        description: `You've reached the limit of ${activeJobCount} active job listings on the Standard plan. Upgrade to Premium for unlimited jobs and featured placement.`,
        suggested: "premium",
      },
    };
    const msg = tierMessages[businessTier] || tierMessages.free;
    return (
      <div className="mx-auto max-w-2xl py-12">
        <UpgradePrompt
          feature={msg.feature}
          description={msg.description}
          suggestedTier={msg.suggested}
        />
      </div>
    );
  }

  const inputClass =
    "mt-1 w-full rounded-xl border border-accent/40 bg-white px-4 py-2.5 text-primary shadow-sm focus:border-secondary focus:outline-none focus:ring-1 focus:ring-secondary";

  return (
    <div className="mx-auto max-w-3xl">
      {/* Corporate gradient header */}
      <div
        className="relative -mx-6 -mt-6 mb-8 overflow-hidden rounded-2xl px-8 py-10 sm:px-10 sm:py-12">
        <div className="absolute inset-0 bg-gradient-to-br from-[#0a1e33] via-[#0f2942] to-[#132d4a]" />
        <div className="pointer-events-none absolute -right-12 -top-12 h-48 w-48 rounded-3xl bg-secondary/8 blur-2xl rotate-12" />
        <div className="pointer-events-none absolute bottom-0 left-1/3 h-32 w-64 rounded-full bg-secondary/6 blur-3xl" />
        <div className="pointer-events-none absolute right-0 bottom-0 h-24 w-24 rounded-2xl bg-highlight/5 blur-xl" />
        <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: "radial-gradient(circle at 1px 1px, white 1px, transparent 0)", backgroundSize: "32px 32px" }} />
        <div className="relative">
          <div className="flex items-center gap-2 mb-1">
            <svg className="h-4 w-4 text-secondary/70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            <span className="text-xs font-medium uppercase tracking-widest text-secondary/70">Talent Acquisition</span>
          </div>
          <h1 className="text-2xl font-bold text-white">Post a New Job</h1>
          <p className="mt-1 text-sm text-white/50">
            Create a job listing to find seasonal workers for your business.
          </p>
        </div>
      </div>

      {/* Existing drafts */}
      {existingDrafts.length > 0 && (
        <div className="mb-6 rounded-2xl border border-blue-200/50 bg-blue-50/30 p-5">
          <div className="flex items-center gap-2 mb-3">
            <svg className="h-4 w-4 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" /></svg>
            <h3 className="text-sm font-semibold text-blue-700">Saved Drafts ({existingDrafts.length})</h3>
          </div>
          <div className="space-y-2">
            {existingDrafts.map((draft) => (
              <a
                key={draft.id}
                href={`/business/post-job/${draft.id}`}
                className="flex items-center justify-between rounded-lg border border-blue-100 bg-white p-3 transition-all hover:border-blue-300 hover:shadow-sm"
              >
                <div>
                  <p className="text-sm font-medium text-primary">{draft.title || "Untitled Draft"}</p>
                  <p className="text-xs text-foreground/40">
                    Saved {new Date(draft.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                  </p>
                </div>
                <span className="text-xs font-medium text-blue-600">Continue editing &rarr;</span>
              </a>
            ))}
          </div>
        </div>
      )}

      {/* ── Section 1: Basic Info ─────────────────────────── */}
      <div className="rounded-2xl border border-accent/40 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-2.5 mb-5">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10">
            <span className="text-xs font-bold text-primary">1</span>
          </div>
          <h2 className="text-sm font-semibold uppercase tracking-wider text-foreground/50">
            Basic Information
          </h2>
        </div>

        <div className="space-y-4">
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
              {selectedResortId ? (
                <div className="mt-1 flex items-center gap-2 rounded-xl border border-green-400 bg-green-50/30 px-4 py-2.5 shadow-sm">
                  <svg className="h-4 w-4 text-green-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                  <span className="text-sm font-medium text-primary truncate">{selectedResortName}</span>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedResortId(null);
                      setSelectedResortName("");
                      setResortSearch("");
                      setForm((prev) => ({ ...prev, resortName: "", location: "" }));
                    }}
                    className="ml-auto text-foreground/40 hover:text-red-500 transition-colors"
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                </div>
              ) : (
                <>
                  <input
                    value={resortSearch}
                    onChange={(e) => setResortSearch(e.target.value)}
                    onFocus={() => setShowResortDropdown(true)}
                    placeholder="Search for a resort..."
                    className={inputClass}
                  />
                  {showResortDropdown && (
                    <div className="absolute z-20 mt-1 w-full rounded-xl border border-accent/40 bg-white shadow-lg max-h-56 overflow-y-auto">
                      {filteredResorts.length === 0 ? (
                        <p className="px-4 py-3 text-sm text-foreground/40">No resorts found</p>
                      ) : (
                        filteredResorts.map((r) => (
                          <button
                            key={r.id}
                            type="button"
                            onClick={() => {
                              setSelectedResortId(r.id);
                              setSelectedResortName(r.name);
                              setResortSearch("");
                              setForm((prev) => ({ ...prev, resortName: r.name, location: `${r.name}, ${r.country}` }));
                              setShowResortDropdown(false);
                            }}
                            className="w-full px-4 py-2.5 text-left text-sm hover:bg-accent/20 transition-colors flex items-center justify-between"
                          >
                            <span className="font-medium text-primary">{r.name}</span>
                            <span className="text-xs text-foreground/40">{r.country}</span>
                          </button>
                        ))
                      )}
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
                      setForm((prev) => ({
                        ...prev,
                        location: `${town.name}, ${town.state_region || town.country}`,
                      }));
                    } else if (selectedResortName) {
                      const resort = allResorts.find((r) => r.id === selectedResortId);
                      setForm((prev) => ({
                        ...prev,
                        location: resort ? `${resort.name}, ${resort.country}` : prev.location,
                      }));
                    }
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
      <div className="mt-4 rounded-2xl border border-accent/40 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-2.5 mb-5">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10">
            <span className="text-xs font-bold text-primary">2</span>
          </div>
          <h2 className="text-sm font-semibold uppercase tracking-wider text-foreground/50">
            Pay &amp; Dates
          </h2>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground">
              Pay / Salary
            </label>
            <div className="mt-1 flex gap-2">
              <select
                value={form.payCurrency}
                onChange={(e) => updateField("payCurrency", e.target.value)}
                className="w-36 rounded-xl border border-accent/40 bg-white px-3 py-2.5 text-sm text-primary shadow-sm focus:border-secondary focus:outline-none focus:ring-1 focus:ring-secondary"
              >
                {CURRENCIES.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.flag} {c.label}
                  </option>
                ))}
              </select>
              <input
                value={form.payAmount}
                onChange={(e) => updateField("payAmount", e.target.value)}
                placeholder="e.g. 22-30/hr"
                className="flex-1 rounded-xl border border-accent/40 bg-white px-4 py-2.5 text-primary shadow-sm focus:border-secondary focus:outline-none focus:ring-1 focus:ring-secondary"
              />
            </div>
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
      <div className="mt-4 rounded-2xl border border-accent/40 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-2.5 mb-5">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10">
            <span className="text-xs font-bold text-primary">3</span>
          </div>
          <h2 className="text-sm font-semibold uppercase tracking-wider text-foreground/50">
            Description &amp; Requirements
          </h2>
        </div>

        <div className="space-y-4">
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
      <div className="mt-4 rounded-2xl border border-accent/40 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-2.5 mb-5">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10">
            <span className="text-xs font-bold text-primary">4</span>
          </div>
          <h2 className="text-sm font-semibold uppercase tracking-wider text-foreground/50">
            Perks &amp; Accommodation
          </h2>
        </div>

        <div className="space-y-4">
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

          {/* Custom Perks Toggle */}
          <Toggle
            label="Add Custom Perks"
            value={showCustomPerks}
            onChange={(v) => setShowCustomPerks(v)}
          />

          {showCustomPerks && (
            <div className="rounded-xl border border-accent/30 bg-accent/5 p-4">
              <p className="text-xs text-foreground/50 mb-3">Add any additional perks this role offers</p>
              <div className="flex gap-2">
                <input
                  value={newPerk}
                  onChange={(e) => setNewPerk(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && newPerk.trim()) {
                      e.preventDefault();
                      updateField("customPerks", [...form.customPerks, newPerk.trim()]);
                      setNewPerk("");
                    }
                  }}
                  placeholder="e.g. Staff discount, Free parking, Gym access..."
                  className="flex-1 rounded-lg border border-accent/40 bg-white px-3 py-2 text-sm text-primary focus:border-secondary focus:outline-none focus:ring-1 focus:ring-secondary"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (newPerk.trim()) {
                      updateField("customPerks", [...form.customPerks, newPerk.trim()]);
                      setNewPerk("");
                    }
                  }}
                  className="rounded-lg bg-secondary px-3 py-2 text-sm font-medium text-white hover:bg-secondary/90 transition-colors"
                >
                  Add
                </button>
              </div>
              {form.customPerks.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {form.customPerks.map((perk, i) => (
                    <span
                      key={i}
                      className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700"
                    >
                      {perk}
                      <button
                        type="button"
                        onClick={() =>
                          updateField(
                            "customPerks",
                            form.customPerks.filter((_, idx) => idx !== i)
                          )
                        }
                        className="text-emerald-400 hover:text-red-500 transition-colors"
                      >
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
      <div className="mt-4 rounded-2xl border border-accent/40 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-2.5 mb-5">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10">
            <span className="text-xs font-bold text-primary">5</span>
          </div>
          <h2 className="text-sm font-semibold uppercase tracking-wider text-foreground/50">
            Listing Options
          </h2>
        </div>

        <div className="space-y-4">
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

          <Toggle
            label="Show position count to applicants"
            value={form.showPositions}
            onChange={(v) => updateField("showPositions", v)}
          />
        </div>
      </div>

      {/* ── Section 6: How to Apply ─────────────────────────── */}
      <div className="mt-4 rounded-2xl border border-accent/40 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-2.5 mb-5">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10">
            <span className="text-xs font-bold text-primary">6</span>
          </div>
          <h2 className="text-sm font-semibold uppercase tracking-wider text-foreground/50">
            How to Apply
          </h2>
        </div>

        <div className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-foreground">
              Application Instructions <span className="text-foreground/40 font-normal">(optional)</span>
            </label>
            <p className="text-xs text-foreground/40 mb-1.5">Tell applicants how you&apos;d like them to apply — e.g. &quot;Email your CV and cover letter&quot; or &quot;Apply through our website&quot;.</p>
            <textarea
              value={form.how_to_apply}
              onChange={(e) => updateField("how_to_apply", e.target.value)}
              placeholder="e.g. Please send your CV and a brief cover letter to our hiring manager. Include your availability dates and any relevant certifications."
              rows={3}
              className={inputClass + " resize-none"}
            />
          </div>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-foreground">
                Application Email <span className="text-foreground/40 font-normal">(optional)</span>
              </label>
              <p className="text-xs text-foreground/40 mb-1.5">If you prefer applicants email you directly.</p>
              <input
                type="email"
                value={form.application_email}
                onChange={(e) => updateField("application_email", e.target.value)}
                placeholder="hiring@yourbusiness.com"
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground">
                Application URL <span className="text-foreground/40 font-normal">(optional)</span>
              </label>
              <p className="text-xs text-foreground/40 mb-1.5">Link to your external application form.</p>
              <input
                type="url"
                value={form.application_url}
                onChange={(e) => updateField("application_url", e.target.value)}
                placeholder="https://yourbusiness.com/careers/apply"
                className={inputClass}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Pending approval banner */}
      {!businessVerified && businessId && inLaunchLoc && (
        <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 flex items-center gap-2">
          <svg className="h-4 w-4 shrink-0 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
          </svg>
          Your account is pending approval. Job listings will be saved as drafts and can be published once your registration is confirmed.
        </div>
      )}

      {/* Launching soon banner for non-launch locations */}
      {!businessVerified && businessId && !inLaunchLoc && (
        <div className="mt-4 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800 flex items-center gap-2">
          <svg className="h-4 w-4 shrink-0 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          Mountain Connects is currently live in {LAUNCH_LOCATION_NAMES}. You can create draft listings now — they&apos;ll be ready to publish when we launch in your area.
        </div>
      )}

      {/* Error display */}
      {error && (
        <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {draftSaved && (
        <div className="mt-4 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700 flex items-center gap-2">
          <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          Draft saved successfully! You can find it in your <a href="/business/manage-listings" className="underline font-medium">Manage Listings</a> under the Draft tab.
        </div>
      )}

      {/* ── Actions ───────────────────────────────────────── */}
      <div className="mt-6 flex items-center justify-between rounded-2xl border border-accent/40 bg-white p-5 shadow-sm">
        <button
          onClick={handleSaveDraft}
          disabled={savingDraft || posting}
          className="rounded-xl border border-accent/50 bg-white px-5 py-2.5 text-sm font-semibold text-foreground transition-all hover:bg-accent/20 hover:-translate-y-0.5 disabled:opacity-50"
        >
          {savingDraft ? "Saving..." : "Save as Draft"}
        </button>
        {businessVerified ? (
          <button
            onClick={handlePost}
            disabled={posting || !form.title.trim()}
            className="rounded-xl bg-primary px-6 py-2.5 text-sm font-semibold text-white transition-all hover:bg-primary/90 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-primary/20 disabled:opacity-50"
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
        ) : (
          <button
            onClick={handleSaveDraft}
            disabled={savingDraft || !form.title.trim()}
            className="rounded-xl bg-amber-500 px-6 py-2.5 text-sm font-semibold text-white transition-all hover:bg-amber-600 hover:-translate-y-0.5 disabled:opacity-50"
          >
            {savingDraft ? "Saving..." : "Save as Draft (Pending Approval)"}
          </button>
        )}
      </div>
    </div>
  );
}
