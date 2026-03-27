"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import PhotoUpload, { type UploadedPhoto } from "@/components/ui/PhotoUpload";
import type { BusinessVerificationStatus } from "@/types/database";

/* ─── Types ──────────────────────────────────────────────── */

interface ProfileFormData {
  business_name: string;
  description: string;
  industries: string[];
  year_established: string;
  website: string;
  phone: string;
  email: string;
  address: string;
  location: string;
  country: string;
  logo_url: string;
  instagram: string;
  facebook: string;
  linkedin: string;
  perks: string[];
  resort_id: string | null;
}

/* ─── Constants ──────────────────────────────────────────── */

const INDUSTRY_OPTIONS = [
  { value: "ski_school", label: "Ski / Snowboard School" },
  { value: "hospitality", label: "Hospitality" },
  { value: "food_beverage", label: "Food & Beverage" },
  { value: "retail", label: "Retail" },
  { value: "resort_operations", label: "Resort Operations" },
  { value: "accommodation", label: "Accommodation" },
  { value: "rental_shop", label: "Rental Shop" },
  { value: "transport", label: "Transport" },
  { value: "entertainment", label: "Entertainment" },
  { value: "cleaning_housekeeping", label: "Cleaning / Housekeeping" },
  { value: "construction_maintenance", label: "Construction / Maintenance" },
  { value: "childcare", label: "Childcare" },
  { value: "health_fitness", label: "Health & Fitness" },
  { value: "tourism", label: "Tourism / Adventure" },
  { value: "other", label: "Other" },
];

const BIZ_COUNTRIES = [
  "Australia", "Austria", "Canada", "Chile", "Finland", "France", "Germany",
  "Italy", "Japan", "New Zealand", "Norway", "South Korea", "Spain",
  "Sweden", "Switzerland", "United Kingdom", "United States", "Other",
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
  const [userId, setUserId] = useState<string | null>(null);
  const [verificationStatus, setVerificationStatus] = useState<BusinessVerificationStatus>("unverified");
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [saved, setSaved] = useState(false);
  const [newPerk, setNewPerk] = useState("");
  const [photos, setPhotos] = useState<UploadedPhoto[]>([]);
  const [emailVerified, setEmailVerified] = useState(false);
  const [userEmail, setUserEmail] = useState("");
  const [sendingVerification, setSendingVerification] = useState(false);
  const [verificationSent, setVerificationSent] = useState(false);

  // Logo upload
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);

  // Resort search
  const [resortQuery, setResortQuery] = useState("");
  const [resortResults, setResortResults] = useState<{ id: string; name: string; country: string }[]>([]);
  const [resortSearchOpen, setResortSearchOpen] = useState(false);
  const [selectedResortName, setSelectedResortName] = useState("");

  const [form, setForm] = useState<ProfileFormData>({
    business_name: "",
    description: "",
    industries: [],
    year_established: "",
    website: "",
    phone: "",
    email: "",
    address: "",
    location: "",
    country: "",
    logo_url: "",
    instagram: "",
    facebook: "",
    linkedin: "",
    perks: [],
    resort_id: null,
  });

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
        return;
      }

      setUserId(user.id);
      setUserEmail(user.email ?? "");
      setEmailVerified(!!user.email_confirmed_at);

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
          industries: (profile.industries as string[]) ?? [],
          year_established: profile.year_established ? String(profile.year_established) : "",
          website: profile.website ?? "",
          phone: profile.phone ?? "",
          email: profile.email ?? "",
          address: (profile.address as string) ?? "",
          location: profile.location ?? "",
          country: (profile.country as string) ?? "",
          logo_url: profile.logo_url ?? "",
          instagram: social.instagram ?? "",
          facebook: social.facebook ?? "",
          linkedin: social.linkedin ?? "",
          perks: profile.standard_perks ?? [],
          resort_id: (profile.resort_id as string) ?? null,
        });

        // Set logo preview from existing URL
        if (profile.logo_url) {
          setLogoPreview(profile.logo_url);
        }

        // Set resort name if resort_id exists
        if (profile.resort_id) {
          const { data: resort } = await supabase
            .from("resorts")
            .select("name")
            .eq("id", profile.resort_id)
            .single();
          if (resort) {
            setSelectedResortName(resort.name);
          }
        }
      }

      setLoading(false);
    }
    load();
  }, [router]);

  // Resort search with debounce
  useEffect(() => {
    if (resortQuery.length < 1) { setResortResults([]); return; }
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search-resorts?q=${encodeURIComponent(resortQuery)}`);
        const data = await res.json();
        setResortResults(data.resorts || data || []);
        setResortSearchOpen(true);
      } catch { setResortResults([]); }
    }, 300);
    return () => clearTimeout(timer);
  }, [resortQuery]);

  // Calculate profile completion
  const fields = [
    form.business_name,
    form.description,
    form.industries.length > 0 ? "has_industries" : "",
    form.website,
    form.phone,
    form.email,
    form.location,
    form.country,
    form.address,
    form.perks.length > 0 ? "has_perks" : "",
    form.resort_id ? "has_resort" : "",
    form.logo_url || logoFile ? "has_logo" : "",
  ];
  const filledCount = fields.filter((f) => f && f.length > 0).length;
  const completionPct = Math.round((filledCount / fields.length) * 100);

  const updateField = (field: keyof ProfileFormData, value: string | string[] | null) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setSaved(false);
  };

  const toggleIndustry = (value: string) => {
    setForm((prev) => ({
      ...prev,
      industries: prev.industries.includes(value)
        ? prev.industries.filter((v) => v !== value)
        : [...prev.industries, value],
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

  const handleLogoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { alert("Logo must be under 2MB"); return; }
    setLogoFile(file);
    setLogoPreview(URL.createObjectURL(file));
    setSaved(false);
  };

  const handleSave = async () => {
    setSaving(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !profileId) {
      setSaving(false);
      return;
    }

    // Upload logo if new file selected
    let logoUrl = form.logo_url;
    if (logoFile) {
      setUploading(true);
      const fileExt = logoFile.name.split(".").pop();
      const filePath = `${user.id}/logo.${fileExt}`;
      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, logoFile, { upsert: true });
      if (!uploadError) {
        const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(filePath);
        logoUrl = urlData.publicUrl + "?t=" + Date.now();
      }
      setUploading(false);
      setLogoFile(null);
    }

    const socialLinks: Record<string, string> = {};
    if (form.instagram) socialLinks.instagram = form.instagram;
    if (form.facebook) socialLinks.facebook = form.facebook;
    if (form.linkedin) socialLinks.linkedin = form.linkedin;

    const { error } = await supabase.from("business_profiles").update({
      business_name: form.business_name,
      description: form.description || null,
      industries: form.industries.length > 0 ? form.industries : [],
      year_established: form.year_established ? parseInt(form.year_established) : null,
      website: form.website || null,
      phone: form.phone || null,
      email: form.email || null,
      address: form.address || null,
      location: form.location || null,
      country: form.country || null,
      logo_url: logoUrl || null,
      resort_id: form.resort_id || null,
      social_links: Object.keys(socialLinks).length > 0 ? socialLinks : null,
      standard_perks: form.perks.length > 0 ? form.perks : [],
    }).eq("id", profileId);

    if (error) {
      alert("Error saving profile: " + error.message);
    } else {
      // Update logo_url in form state
      if (logoUrl !== form.logo_url) {
        setForm((prev) => ({ ...prev, logo_url: logoUrl }));
      }
      setSaved(true);
    }
    setSaving(false);
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

  const handleResendVerification = async () => {
    setSendingVerification(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.resend({
        type: "signup",
        email: userEmail,
      });
      if (error) {
        alert("Error sending verification email: " + error.message);
      } else {
        setVerificationSent(true);
        setTimeout(() => setVerificationSent(false), 10000);
      }
    } catch {
      alert("Failed to send verification email. Please try again.");
    }
    setSendingVerification(false);
  };

  const statusInfo = VERIFICATION_STATUS_INFO[verificationStatus];

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-primary" />
      </div>
    );
  }

  const inputClass = "mt-1 w-full rounded-xl border border-accent/40 bg-white px-4 py-2.5 text-primary shadow-sm focus:border-secondary focus:outline-none focus:ring-1 focus:ring-secondary";

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

        <div className="relative flex items-start justify-between">
          <div className="flex items-center gap-4">
            {/* Logo in header */}
            <div
              onClick={() => logoInputRef.current?.click()}
              className="group relative flex h-16 w-16 shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-xl border-2 border-dashed border-white/30 bg-white/10 transition-colors hover:border-secondary hover:bg-white/20"
            >
              {logoPreview ? (
                <img src={logoPreview} alt="Logo" className="h-full w-full object-cover" />
              ) : (
                <svg className="h-7 w-7 text-white/40 group-hover:text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0z" />
                </svg>
              )}
            </div>
            <input ref={logoInputRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={handleLogoSelect} className="hidden" />
            <div>
              <div className="flex items-center gap-2 mb-1">
                <svg className="h-4 w-4 text-secondary/70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
                <span className="text-xs font-medium uppercase tracking-widest text-secondary/70">Business Identity</span>
              </div>
              <h1 className="text-2xl font-bold text-white">Company Profile</h1>
              <p className="mt-1 text-sm text-white/50">
                Manage your business details and public presence.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            {saved && (
              <span className="text-sm text-green-400 font-medium">Saved!</span>
            )}
            <button
              onClick={handleSave}
              disabled={saving || uploading}
              className="rounded-xl bg-white/10 border border-white/20 px-5 py-2.5 text-sm font-semibold text-white transition-all hover:bg-white/20 hover:-translate-y-0.5 disabled:opacity-50"
            >
              {saving || uploading ? "Saving..." : "Save Profile"}
            </button>
          </div>
        </div>
      </div>

      {/* Verification status banner */}
      <div className={`rounded-2xl border p-5 mb-4 ${statusInfo.bg}`}>
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3">
            <span className={`inline-flex shrink-0 rounded-full border px-3 py-1 text-sm font-semibold ${statusInfo.bg} ${statusInfo.text}`}>
              {statusInfo.label}
            </span>
            <p className="text-sm text-foreground/70 pt-0.5">{statusInfo.description}</p>
          </div>
        </div>
        {(verificationStatus === "unverified" || verificationStatus === "rejected") && completionPct >= 70 && (
          <button
            onClick={handleSubmitForVerification}
            disabled={submitting}
            className="mt-3 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white transition-all hover:bg-primary/90 hover:-translate-y-0.5 disabled:opacity-50"
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

      {/* Email verification status */}
      <div className={`rounded-2xl border p-5 mb-4 ${emailVerified ? "bg-green-50 border-green-200" : "bg-amber-50 border-amber-200"}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {emailVerified ? (
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-100">
                <svg className="h-4 w-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
            ) : (
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-100">
                <svg className="h-4 w-4 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
            )}
            <div>
              <p className={`text-sm font-semibold ${emailVerified ? "text-green-700" : "text-amber-700"}`}>
                {emailVerified ? "Email Verified" : "Email Not Verified"}
              </p>
              <p className="text-xs text-foreground/50">
                {emailVerified
                  ? `Your email (${userEmail}) has been verified.`
                  : `Please verify your email (${userEmail}) to unlock all features.`}
              </p>
            </div>
          </div>
          {!emailVerified && (
            <div className="flex items-center gap-2 shrink-0">
              {verificationSent && (
                <span className="text-xs text-green-600 font-medium">Sent!</span>
              )}
              <button
                onClick={handleResendVerification}
                disabled={sendingVerification}
                className="rounded-xl bg-amber-600 px-4 py-2 text-sm font-semibold text-white transition-all hover:bg-amber-700 hover:-translate-y-0.5 disabled:opacity-50"
              >
                {sendingVerification ? "Sending..." : "Verify My Email"}
              </button>
            </div>
          )}
        </div>
        {!emailVerified && (
          <p className="mt-2 ml-11 text-xs text-amber-600/70">
            Some features like posting jobs and appearing in search results require a verified email.
          </p>
        )}
      </div>

      {/* Profile completion bar */}
      <div className="mb-6 rounded-2xl border border-accent/40 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between text-sm mb-2">
          <span className="font-medium text-foreground">Profile Completion</span>
          <span className="font-bold text-primary">{completionPct}%</span>
        </div>
        <div className="h-2 w-full rounded-full bg-accent/30">
          <div
            className="h-2 rounded-full bg-secondary transition-all duration-500"
            style={{ width: `${completionPct}%` }}
          />
        </div>
      </div>

      {/* ── Form Sections ─────────────────────────────────── */}

      {/* Section 1: Basic Info (matches onboarding) */}
      <div className="rounded-2xl border border-accent/40 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-2.5 mb-5">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10">
            <span className="text-xs font-bold text-primary">1</span>
          </div>
          <h2 className="text-sm font-semibold uppercase tracking-wider text-foreground/50">Basic Information</h2>
        </div>

        <div className="space-y-4">
          {/* Logo upload */}
          <div className="flex items-center gap-4">
            <div
              onClick={() => logoInputRef.current?.click()}
              className="group relative flex h-20 w-20 shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-xl border-2 border-dashed border-accent bg-accent/10 transition-colors hover:border-secondary hover:bg-secondary/5"
            >
              {logoPreview ? (
                <img src={logoPreview} alt="Logo" className="h-full w-full object-cover" />
              ) : (
                <svg className="h-8 w-8 text-foreground/30 group-hover:text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0z" />
                </svg>
              )}
            </div>
            <div>
              <p className="text-sm font-medium text-primary">Business Logo</p>
              <p className="text-xs text-foreground/50">Upload your logo (max 2MB)</p>
              <button type="button" onClick={() => logoInputRef.current?.click()} className="mt-1 text-xs font-medium text-secondary hover:underline">
                {logoPreview ? "Change logo" : "Upload"}
              </button>
            </div>
          </div>

          {/* Business Name */}
          <div>
            <label className="block text-sm font-medium text-foreground">Business Name *</label>
            <input
              value={form.business_name}
              onChange={(e) => updateField("business_name", e.target.value)}
              className={inputClass}
            />
          </div>

          {/* Industries multi-select */}
          <div>
            <label className="block text-sm font-medium text-foreground">Industry *</label>
            <p className="mt-0.5 text-xs text-foreground/50">Select all that apply</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {INDUSTRY_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => toggleIndustry(opt.value)}
                  className={`rounded-full px-3.5 py-1.5 text-xs font-medium transition-all ${
                    form.industries.includes(opt.value)
                      ? "bg-secondary text-white shadow-sm"
                      : "bg-accent/20 text-foreground/60 hover:bg-accent/40"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-foreground">Description</label>
            <textarea
              value={form.description}
              onChange={(e) => updateField("description", e.target.value)}
              rows={4}
              className={inputClass}
              placeholder="Tell workers about your business, culture, and what makes working with you special..."
            />
          </div>

          {/* Year Established */}
          <div className="max-w-xs">
            <label className="block text-sm font-medium text-foreground">Year Established</label>
            <input
              value={form.year_established}
              onChange={(e) => updateField("year_established", e.target.value)}
              type="number"
              min="1800"
              max="2026"
              className={inputClass}
            />
          </div>
        </div>
      </div>

      {/* Section 2: Location & Address (matches onboarding) */}
      <div className="mt-4 rounded-2xl border border-accent/40 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-2.5 mb-5">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10">
            <span className="text-xs font-bold text-primary">2</span>
          </div>
          <h2 className="text-sm font-semibold uppercase tracking-wider text-foreground/50">Location &amp; Address</h2>
        </div>

        <div className="space-y-4">
          {/* Business Address */}
          <div>
            <label className="block text-sm font-medium text-foreground">Business Address</label>
            <input
              value={form.address}
              onChange={(e) => updateField("address", e.target.value)}
              placeholder="e.g. 123 Mountain Road"
              className={inputClass}
            />
          </div>

          {/* Location — Town/Village + Country */}
          <div>
            <label className="block text-sm font-medium text-foreground">Location *</label>
            <div className="mt-1 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="block text-xs text-foreground/50">Town / Village</label>
                <input
                  value={form.location}
                  onChange={(e) => updateField("location", e.target.value)}
                  placeholder="e.g. Whistler"
                  className={inputClass}
                />
              </div>
              <div>
                <label className="block text-xs text-foreground/50">Country</label>
                <select
                  value={form.country}
                  onChange={(e) => updateField("country", e.target.value)}
                  className={inputClass}
                >
                  <option value="">Select a country</option>
                  {BIZ_COUNTRIES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Associated Resort */}
          <div className="relative">
            <label className="block text-sm font-medium text-foreground">Associated Resort</label>
            <div className="relative">
              <input
                type="text"
                value={resortQuery || selectedResortName}
                onChange={(e) => {
                  setResortQuery(e.target.value);
                  setSelectedResortName("");
                  updateField("resort_id", null);
                }}
                placeholder="Search for a ski resort..."
                className={inputClass}
                onFocus={() => resortResults.length > 0 && setResortSearchOpen(true)}
                onBlur={() => setTimeout(() => setResortSearchOpen(false), 200)}
              />
              {form.resort_id && (
                <span className="absolute right-3 top-1/2 -translate-y-1/2 mt-0.5 flex items-center gap-1 rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                  Linked
                </span>
              )}
            </div>
            {resortSearchOpen && resortResults.length > 0 && (
              <div className="absolute z-20 mt-1 w-full rounded-lg border border-accent bg-white shadow-lg max-h-48 overflow-y-auto">
                {resortResults.map((r: { id: string; name: string; country: string }) => (
                  <button
                    key={r.id}
                    type="button"
                    className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm hover:bg-secondary/10"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => {
                      setSelectedResortName(r.name);
                      updateField("resort_id", r.id);
                      setResortQuery("");
                      setResortSearchOpen(false);
                    }}
                  >
                    <svg className="h-4 w-4 shrink-0 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    </svg>
                    <div>
                      <span className="font-medium text-primary">{r.name}</span>
                      <span className="ml-2 text-xs text-foreground/50">{r.country}</span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Section 3: Contact & Links */}
      <div className="mt-4 rounded-2xl border border-accent/40 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-2.5 mb-5">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10">
            <span className="text-xs font-bold text-primary">3</span>
          </div>
          <h2 className="text-sm font-semibold uppercase tracking-wider text-foreground/50">Contact &amp; Links</h2>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground">Email *</label>
              <input
                value={form.email}
                onChange={(e) => updateField("email", e.target.value)}
                type="email"
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground">Phone</label>
              <input
                value={form.phone}
                onChange={(e) => updateField("phone", e.target.value)}
                type="tel"
                className={inputClass}
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
              className={inputClass}
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground">Instagram</label>
              <input
                value={form.instagram}
                onChange={(e) => updateField("instagram", e.target.value)}
                placeholder="@handle"
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground">Facebook</label>
              <input
                value={form.facebook}
                onChange={(e) => updateField("facebook", e.target.value)}
                placeholder="Page name"
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground">LinkedIn</label>
              <input
                value={form.linkedin}
                onChange={(e) => updateField("linkedin", e.target.value)}
                placeholder="Company page"
                className={inputClass}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Section 4: Perks */}
      <div className="mt-4 rounded-2xl border border-accent/40 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-2.5 mb-1">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10">
            <span className="text-xs font-bold text-primary">4</span>
          </div>
          <h2 className="text-sm font-semibold uppercase tracking-wider text-foreground/50">
            Standard Perks
          </h2>
        </div>
        <p className="mb-4 ml-9 text-xs text-foreground/50">
          Select perks you typically offer to seasonal staff. These display on your public profile.
        </p>

        <div className="flex flex-wrap gap-2">
          {COMMON_PERKS.map((perk) => {
            const isSelected = form.perks.includes(perk);
            return (
              <button
                key={perk}
                type="button"
                onClick={() => togglePerk(perk)}
                className={`rounded-full border px-3 py-1.5 text-sm font-medium transition-all ${
                  isSelected
                    ? "border-green-200 bg-green-50 text-green-700"
                    : "border-accent/50 bg-white text-foreground/60 hover:bg-accent/20 hover:border-accent"
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
                    type="button"
                    onClick={() => togglePerk(perk)}
                    className="text-green-400 hover:text-red-500 transition-colors"
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
            onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addCustomPerk())}
            placeholder="Add a custom perk..."
            className="flex-1 rounded-xl border border-accent/40 bg-white px-3 py-2 text-sm text-primary shadow-sm focus:border-secondary focus:outline-none focus:ring-1 focus:ring-secondary"
          />
          <button
            type="button"
            onClick={addCustomPerk}
            className="rounded-xl border border-accent/50 bg-white px-4 py-2 text-sm font-medium text-foreground transition-all hover:bg-accent/20 hover:-translate-y-0.5"
          >
            Add
          </button>
        </div>
      </div>

      {/* Section 5: Photos */}
      <div className="mt-4 rounded-2xl border border-accent/40 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-2.5 mb-1">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10">
            <span className="text-xs font-bold text-primary">5</span>
          </div>
          <h2 className="text-sm font-semibold uppercase tracking-wider text-foreground/50">
            Photos
          </h2>
        </div>
        <p className="mb-4 ml-9 text-xs text-foreground/50">
          Upload photos of your workplace, team, and location. These display on your public employer profile.
        </p>
        <div>
          <PhotoUpload
            photos={photos}
            onChange={setPhotos}
            maxPhotos={8}
            businessId={profileId ?? "demo-business-id"}
          />
        </div>
      </div>

      {/* Bottom save */}
      <div className="mt-6 mb-8 flex items-center justify-between rounded-2xl border border-accent/40 bg-white p-5 shadow-sm">
        <div className="text-sm text-foreground/60">
          {completionPct < 70 ? (
            <span>Complete at least 70% to submit for verification ({completionPct}% done)</span>
          ) : (
            <span className="text-green-600 font-medium">Profile ready for verification!</span>
          )}
        </div>
        <button
          onClick={handleSave}
          disabled={saving || uploading}
          className="rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-white transition-all hover:bg-primary/90 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-primary/20 disabled:opacity-50"
        >
          {saving || uploading ? "Saving..." : "Save Profile"}
        </button>
      </div>
    </div>
  );
}
