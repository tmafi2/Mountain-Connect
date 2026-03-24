"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { resorts } from "@/lib/data/resorts";
import PhotoUpload, { type UploadedPhoto } from "@/components/ui/PhotoUpload";
import type { BusinessCategory, BusinessVerificationStatus } from "@/types/database";

/* ─── Types ──────────────────────────────────────────────── */

interface ProfileFormData {
  business_name: string;
  description: string;
  category: BusinessCategory | "";
  year_established: string;
  website: string;
  phone: string;
  email: string;
  location: string;
  instagram: string;
  facebook: string;
  linkedin: string;
  perks: string[];
  resort_ids: string[];
}

/* ─── Demo data ──────────────────────────────────────────── */

const CATEGORIES: { value: BusinessCategory; label: string }[] = [
  { value: "ski_school", label: "Ski School" },
  { value: "hospitality", label: "Hospitality" },
  { value: "food_beverage", label: "Food & Beverage" },
  { value: "retail", label: "Retail" },
  { value: "resort_operations", label: "Resort Operations" },
  { value: "accommodation", label: "Accommodation" },
  { value: "rental_shop", label: "Rental & Equipment" },
  { value: "transport", label: "Transport" },
  { value: "entertainment", label: "Entertainment" },
  { value: "other", label: "Other" },
];

const COMMON_PERKS = [
  "Season ski pass",
  "Staff housing",
  "Meals included",
  "Pro deals on gear",
  "Free lessons",
  "Gym access",
  "Health benefits",
  "Career development",
  "Flexible schedules",
  "Transport provided",
];

const VERIFICATION_STATUS_INFO: Record<
  BusinessVerificationStatus,
  { bg: string; text: string; label: string; description: string }
> = {
  unverified: {
    bg: "bg-gray-50 border-gray-200",
    text: "text-gray-600",
    label: "Unverified",
    description: "Complete your profile and submit for verification to appear on resort pages.",
  },
  pending_review: {
    bg: "bg-yellow-50 border-yellow-200",
    text: "text-yellow-700",
    label: "Pending Review",
    description: "Your profile is being reviewed by our team. This usually takes 1-2 business days.",
  },
  verified: {
    bg: "bg-green-50 border-green-200",
    text: "text-green-700",
    label: "Verified",
    description: "Your business is verified and visible in the Verified Employers section on resort pages.",
  },
  rejected: {
    bg: "bg-red-50 border-red-200",
    text: "text-red-600",
    label: "Rejected",
    description: "Your verification was not approved. Please update your profile and resubmit.",
  },
};

/* ─── Page ───────────────────────────────────────────────── */

export default function CompanyProfilePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [profileId, setProfileId] = useState<string | null>(null);
  const [verificationStatus, setVerificationStatus] = useState<BusinessVerificationStatus>("unverified");
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [saved, setSaved] = useState(false);
  const [newPerk, setNewPerk] = useState("");
  const [photos, setPhotos] = useState<UploadedPhoto[]>([]);

  const [form, setForm] = useState<ProfileFormData>({
    business_name: "",
    description: "",
    category: "",
    year_established: "",
    website: "",
    phone: "",
    email: "",
    location: "",
    instagram: "",
    facebook: "",
    linkedin: "",
    perks: [],
    resort_ids: [],
  });

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
        return;
      }

      const { data: profile } = await supabase
        .from("business_profiles")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (profile) {
        setProfileId(profile.id);
        setVerificationStatus(profile.verification_status ?? "unverified");
        const social = (profile.social_links as Record<string, string>) ?? {};
        setForm({
          business_name: profile.business_name ?? "",
          description: profile.description ?? "",
          category: (profile.category as BusinessCategory) ?? "",
          year_established: profile.year_established ? String(profile.year_established) : "",
          website: profile.website ?? "",
          phone: profile.phone ?? "",
          email: profile.email ?? "",
          location: profile.location ?? "",
          instagram: social.instagram ?? "",
          facebook: social.facebook ?? "",
          linkedin: social.linkedin ?? "",
          perks: profile.standard_perks ?? [],
          resort_ids: [],
        });

        // Load associated resorts
        const { data: bizResorts } = await supabase
          .from("business_resorts")
          .select("resort_id")
          .eq("business_id", profile.id);
        if (bizResorts) {
          setForm((prev) => ({
            ...prev,
            resort_ids: bizResorts.map((r: { resort_id: string }) => r.resort_id),
          }));
        }
      }

      setLoading(false);
    }
    load();
  }, [router]);

  // Calculate profile completion
  const fields = [
    form.business_name,
    form.description,
    form.category,
    form.year_established,
    form.website,
    form.phone,
    form.email,
    form.location,
    form.resort_ids.length > 0 ? "has_resorts" : "",
    form.perks.length > 0 ? "has_perks" : "",
  ];
  const filledCount = fields.filter((f) => f && f.length > 0).length;
  const completionPct = Math.round((filledCount / fields.length) * 100);

  const updateField = (field: keyof ProfileFormData, value: string | string[]) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setSaved(false);
  };

  const toggleResort = (resortId: string) => {
    setForm((prev) => ({
      ...prev,
      resort_ids: prev.resort_ids.includes(resortId)
        ? prev.resort_ids.filter((id) => id !== resortId)
        : [...prev.resort_ids, resortId],
    }));
    setSaved(false);
  };

  const togglePerk = (perk: string) => {
    setForm((prev) => ({
      ...prev,
      perks: prev.perks.includes(perk)
        ? prev.perks.filter((p) => p !== perk)
        : [...prev.perks, perk],
    }));
    setSaved(false);
  };

  const addCustomPerk = () => {
    if (newPerk.trim() && !form.perks.includes(newPerk.trim())) {
      setForm((prev) => ({ ...prev, perks: [...prev.perks, newPerk.trim()] }));
      setNewPerk("");
      setSaved(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !profileId) {
      setSaving(false);
      return;
    }

    const socialLinks: Record<string, string> = {};
    if (form.instagram) socialLinks.instagram = form.instagram;
    if (form.facebook) socialLinks.facebook = form.facebook;
    if (form.linkedin) socialLinks.linkedin = form.linkedin;

    await supabase.from("business_profiles").update({
      business_name: form.business_name,
      description: form.description || null,
      category: form.category || null,
      year_established: form.year_established ? parseInt(form.year_established) : null,
      website: form.website || null,
      phone: form.phone || null,
      email: form.email || null,
      location: form.location || null,
      social_links: Object.keys(socialLinks).length > 0 ? socialLinks : null,
      standard_perks: form.perks.length > 0 ? form.perks : [],
    }).eq("id", profileId);

    // Sync resort associations: delete old, insert new
    await supabase.from("business_resorts").delete().eq("business_id", profileId);
    if (form.resort_ids.length > 0) {
      await supabase.from("business_resorts").insert(
        form.resort_ids.map((rid) => ({
          business_id: profileId,
          resort_id: rid,
        }))
      );
    }

    setSaving(false);
    setSaved(true);
  };

  const handleSubmitForVerification = async () => {
    setSubmitting(true);
    const supabase = createClient();
    if (profileId) {
      await supabase.from("business_profiles").update({
        verification_status: "pending_review",
      }).eq("id", profileId);
    }
    setVerificationStatus("pending_review");
    setSubmitting(false);
  };

  const statusInfo = VERIFICATION_STATUS_INFO[verificationStatus];

  // Resort search
  const [resortSearch, setResortSearch] = useState("");
  const filteredResorts = resorts.filter((r) =>
    r.name.toLowerCase().includes(resortSearch.toLowerCase()) ||
    r.country.toLowerCase().includes(resortSearch.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-secondary" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-primary">Company Profile</h1>
          <p className="mt-1 text-sm text-foreground/60">
            Manage your business details and public presence.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {saved && (
            <span className="text-sm text-green-600 font-medium">Saved!</span>
          )}
          <button
            onClick={handleSave}
            disabled={saving}
            className="rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary/90 disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save Profile"}
          </button>
        </div>
      </div>

      {/* Verification status banner */}
      <div className={`mt-6 rounded-xl border p-4 ${statusInfo.bg}`}>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <span className={`inline-flex rounded-full border px-3 py-1 text-sm font-medium ${statusInfo.bg} ${statusInfo.text}`}>
              {statusInfo.label}
            </span>
            <p className="text-sm text-foreground/70">{statusInfo.description}</p>
          </div>
        </div>
        {(verificationStatus === "unverified" || verificationStatus === "rejected") && completionPct >= 70 && (
          <button
            onClick={handleSubmitForVerification}
            disabled={submitting}
            className="mt-3 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary/90 disabled:opacity-50"
          >
            {submitting ? "Submitting..." : "Submit for Verification"}
          </button>
        )}
        {(verificationStatus === "unverified" || verificationStatus === "rejected") && completionPct < 70 && (
          <p className="mt-2 text-xs text-foreground/50">
            Complete at least 70% of your profile to submit for verification. Currently at {completionPct}%.
          </p>
        )}
      </div>

      {/* Profile completion bar */}
      <div className="mt-4 rounded-xl border border-accent bg-white p-4">
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium text-foreground">Profile Completion</span>
          <span className="font-bold text-primary">{completionPct}%</span>
        </div>
        <div className="mt-2 h-2 w-full rounded-full bg-accent/30">
          <div
            className="h-2 rounded-full bg-secondary transition-all duration-500"
            style={{ width: `${completionPct}%` }}
          />
        </div>
      </div>

      {/* ── Form Sections ─────────────────────────────────── */}

      {/* Basic Info */}
      <div className="mt-6 rounded-xl border border-accent bg-white p-6">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-foreground/50">Basic Information</h2>

        <div className="mt-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground">Business Name *</label>
            <input
              value={form.business_name}
              onChange={(e) => updateField("business_name", e.target.value)}
              className="mt-1 w-full rounded-lg border border-accent bg-white px-4 py-2.5 text-primary focus:border-secondary focus:outline-none focus:ring-1 focus:ring-secondary"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground">Description *</label>
            <textarea
              value={form.description}
              onChange={(e) => updateField("description", e.target.value)}
              rows={4}
              className="mt-1 w-full rounded-lg border border-accent bg-white px-4 py-2.5 text-primary focus:border-secondary focus:outline-none focus:ring-1 focus:ring-secondary"
              placeholder="Tell workers about your business, culture, and what makes working with you special..."
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground">Category *</label>
              <select
                value={form.category}
                onChange={(e) => updateField("category", e.target.value)}
                className="mt-1 w-full rounded-lg border border-accent bg-white px-4 py-2.5 text-primary focus:border-secondary focus:outline-none focus:ring-1 focus:ring-secondary"
              >
                <option value="">Select a category</option>
                {CATEGORIES.map((cat) => (
                  <option key={cat.value} value={cat.value}>
                    {cat.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground">Year Established</label>
              <input
                value={form.year_established}
                onChange={(e) => updateField("year_established", e.target.value)}
                type="number"
                min="1800"
                max="2026"
                className="mt-1 w-full rounded-lg border border-accent bg-white px-4 py-2.5 text-primary focus:border-secondary focus:outline-none focus:ring-1 focus:ring-secondary"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground">Location *</label>
            <input
              value={form.location}
              onChange={(e) => updateField("location", e.target.value)}
              placeholder="e.g. Whistler, BC, Canada"
              className="mt-1 w-full rounded-lg border border-accent bg-white px-4 py-2.5 text-primary focus:border-secondary focus:outline-none focus:ring-1 focus:ring-secondary"
            />
          </div>
        </div>
      </div>

      {/* Contact & Links */}
      <div className="mt-4 rounded-xl border border-accent bg-white p-6">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-foreground/50">Contact & Links</h2>

        <div className="mt-4 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground">Email *</label>
              <input
                value={form.email}
                onChange={(e) => updateField("email", e.target.value)}
                type="email"
                className="mt-1 w-full rounded-lg border border-accent bg-white px-4 py-2.5 text-primary focus:border-secondary focus:outline-none focus:ring-1 focus:ring-secondary"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground">Phone</label>
              <input
                value={form.phone}
                onChange={(e) => updateField("phone", e.target.value)}
                type="tel"
                className="mt-1 w-full rounded-lg border border-accent bg-white px-4 py-2.5 text-primary focus:border-secondary focus:outline-none focus:ring-1 focus:ring-secondary"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground">Website</label>
            <input
              value={form.website}
              onChange={(e) => updateField("website", e.target.value)}
              type="url"
              placeholder="https://"
              className="mt-1 w-full rounded-lg border border-accent bg-white px-4 py-2.5 text-primary focus:border-secondary focus:outline-none focus:ring-1 focus:ring-secondary"
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground">Instagram</label>
              <input
                value={form.instagram}
                onChange={(e) => updateField("instagram", e.target.value)}
                placeholder="@handle"
                className="mt-1 w-full rounded-lg border border-accent bg-white px-4 py-2.5 text-primary focus:border-secondary focus:outline-none focus:ring-1 focus:ring-secondary"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground">Facebook</label>
              <input
                value={form.facebook}
                onChange={(e) => updateField("facebook", e.target.value)}
                placeholder="Page name"
                className="mt-1 w-full rounded-lg border border-accent bg-white px-4 py-2.5 text-primary focus:border-secondary focus:outline-none focus:ring-1 focus:ring-secondary"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground">LinkedIn</label>
              <input
                value={form.linkedin}
                onChange={(e) => updateField("linkedin", e.target.value)}
                placeholder="Company page"
                className="mt-1 w-full rounded-lg border border-accent bg-white px-4 py-2.5 text-primary focus:border-secondary focus:outline-none focus:ring-1 focus:ring-secondary"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Resort Selection */}
      <div className="mt-4 rounded-xl border border-accent bg-white p-6">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-foreground/50">
          Resorts You Operate At *
        </h2>
        <p className="mt-1 text-xs text-foreground/50">
          Select the ski resorts where your business operates. You&apos;ll appear in the Verified Employers section on these resort pages.
        </p>

        {/* Selected resorts */}
        {form.resort_ids.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {form.resort_ids.map((rid) => {
              const resort = resorts.find((r) => r.id === rid);
              if (!resort) return null;
              return (
                <span
                  key={rid}
                  className="inline-flex items-center gap-1.5 rounded-full bg-secondary/20 px-3 py-1 text-sm font-medium text-primary"
                >
                  {resort.name}
                  <button
                    onClick={() => toggleResort(rid)}
                    className="text-foreground/40 hover:text-red-500"
                  >
                    &times;
                  </button>
                </span>
              );
            })}
          </div>
        )}

        {/* Search & select */}
        <input
          value={resortSearch}
          onChange={(e) => setResortSearch(e.target.value)}
          placeholder="Search resorts..."
          className="mt-3 w-full rounded-lg border border-accent bg-white px-4 py-2.5 text-sm text-primary focus:border-secondary focus:outline-none focus:ring-1 focus:ring-secondary"
        />

        <div className="mt-2 max-h-48 overflow-y-auto rounded-lg border border-accent/50">
          {filteredResorts.slice(0, 20).map((resort) => {
            const isSelected = form.resort_ids.includes(resort.id);
            return (
              <button
                key={resort.id}
                onClick={() => toggleResort(resort.id)}
                className={`flex w-full items-center justify-between px-4 py-2 text-left text-sm transition-colors hover:bg-accent/10 ${
                  isSelected ? "bg-secondary/10 font-medium text-primary" : "text-foreground/70"
                }`}
              >
                <span>
                  {resort.name}{" "}
                  <span className="text-foreground/40">{resort.country}</span>
                </span>
                {isSelected && (
                  <svg className="h-4 w-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Perks */}
      <div className="mt-4 rounded-xl border border-accent bg-white p-6">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-foreground/50">
          Standard Perks
        </h2>
        <p className="mt-1 text-xs text-foreground/50">
          Select perks you typically offer to seasonal staff. These display on your public profile.
        </p>

        <div className="mt-4 flex flex-wrap gap-2">
          {COMMON_PERKS.map((perk) => {
            const isSelected = form.perks.includes(perk);
            return (
              <button
                key={perk}
                onClick={() => togglePerk(perk)}
                className={`rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
                  isSelected
                    ? "border-green-200 bg-green-50 text-green-700"
                    : "border-accent bg-white text-foreground/60 hover:bg-accent/20"
                }`}
              >
                {isSelected && (
                  <span className="mr-1">&#10003;</span>
                )}
                {perk}
              </button>
            );
          })}
        </div>

        {/* Custom perks */}
        {form.perks.filter((p) => !COMMON_PERKS.includes(p)).length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {form.perks
              .filter((p) => !COMMON_PERKS.includes(p))
              .map((perk) => (
                <span
                  key={perk}
                  className="inline-flex items-center gap-1 rounded-full border border-green-200 bg-green-50 px-3 py-1 text-sm font-medium text-green-700"
                >
                  &#10003; {perk}
                  <button
                    onClick={() => togglePerk(perk)}
                    className="text-green-400 hover:text-red-500"
                  >
                    &times;
                  </button>
                </span>
              ))}
          </div>
        )}

        {/* Add custom perk */}
        <div className="mt-3 flex gap-2">
          <input
            value={newPerk}
            onChange={(e) => setNewPerk(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addCustomPerk()}
            placeholder="Add a custom perk..."
            className="flex-1 rounded-lg border border-accent bg-white px-3 py-2 text-sm text-primary focus:border-secondary focus:outline-none focus:ring-1 focus:ring-secondary"
          />
          <button
            onClick={addCustomPerk}
            className="rounded-lg border border-accent bg-white px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent/20"
          >
            Add
          </button>
        </div>
      </div>

      {/* Photos */}
      <div className="mt-4 rounded-xl border border-accent bg-white p-6">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-foreground/50">
          Photos
        </h2>
        <p className="mt-1 text-xs text-foreground/50">
          Upload photos of your workplace, team, and location. These display on your public employer profile.
        </p>
        <div className="mt-4">
          <PhotoUpload
            photos={photos}
            onChange={setPhotos}
            maxPhotos={8}
            businessId="demo-business-id"
          />
        </div>
      </div>

      {/* Bottom save */}
      <div className="mt-6 flex items-center justify-between rounded-xl border border-accent bg-white p-5">
        <div className="text-sm text-foreground/60">
          {completionPct < 70 ? (
            <span>Complete at least 70% to submit for verification ({completionPct}% done)</span>
          ) : (
            <span className="text-green-600 font-medium">Profile ready for verification!</span>
          )}
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary/90 disabled:opacity-50"
        >
          {saving ? "Saving..." : "Save Profile"}
        </button>
      </div>
    </div>
  );
}
