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
  cover_photo_url: string;
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

  // Business name lock
  const [isNameLocked, setIsNameLocked] = useState(true);
  const [showNameWarning, setShowNameWarning] = useState(false);
  const [showNameConfirm, setShowNameConfirm] = useState(false);
  const [originalName, setOriginalName] = useState("");

  // Logo upload
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);

  // Cover photo upload
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [coverUrl, setCoverUrl] = useState<string>("");
  const coverInputRef = useRef<HTMLInputElement>(null);

  // Resort search
  const [resortQuery, setResortQuery] = useState("");
  const [allResorts, setAllResorts] = useState<{ id: string; name: string; country: string }[]>([]);
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
    cover_photo_url: "",
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

      const { data: profile, error: profileError } = await supabase
        .from("business_profiles")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (profileError) {
        console.error("Error loading business profile:", profileError);
      }

      if (profile) {
        console.log("Loaded business profile:", profile.id, "columns:", Object.keys(profile));
        setProfileId(profile.id);
        setVerificationStatus(profile.verification_status ?? "unverified");
        const social = (profile.social_links as Record<string, string>) ?? {};

        setForm({
          business_name: profile.business_name ?? "",
          description: profile.description ?? "",
          industries: Array.isArray(profile.industries) ? profile.industries : [],
          year_established: profile.year_established ? String(profile.year_established) : "",
          website: profile.website ?? "",
          phone: profile.phone ?? "",
          email: profile.email ?? "",
          address: typeof profile.address === "string" ? profile.address : "",
          location: profile.location ?? "",
          country: typeof profile.country === "string" ? profile.country : "",
          logo_url: profile.logo_url ?? "",
          cover_photo_url: profile.cover_photo_url ?? "",
          instagram: social.instagram ?? "",
          facebook: social.facebook ?? "",
          linkedin: social.linkedin ?? "",
          perks: Array.isArray(profile.standard_perks) ? profile.standard_perks : [],
          resort_id: typeof profile.resort_id === "string" ? profile.resort_id : null,
        });

        setOriginalName(profile.business_name ?? "");

        // Set logo preview from existing URL
        if (profile.logo_url) {
          setLogoPreview(profile.logo_url);
        }

        // Set cover photo preview
        if (profile.cover_photo_url) {
          setCoverPreview(profile.cover_photo_url);
          setCoverUrl(profile.cover_photo_url);
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
      } else {
        console.warn("No business profile found for user:", user.id);
      }

      setLoading(false);
    }
    load();
  }, [router]);

  // Load all resorts once on mount
  useEffect(() => {
    fetch("/api/search-resorts?all=1")
      .then((r) => r.json())
      .then((data) => setAllResorts(Array.isArray(data) ? data : []))
      .catch(() => setAllResorts([]));
  }, []);

  // Filter resorts by search query
  const filteredResorts = resortQuery.trim()
    ? allResorts.filter(
        (r) =>
          r.name.toLowerCase().includes(resortQuery.toLowerCase()) ||
          r.country.toLowerCase().includes(resortQuery.toLowerCase())
      )
    : allResorts;

  // Calculate profile completion
  const profileFields: { label: string; filled: boolean }[] = [
    { label: "Business Name", filled: !!form.business_name },
    { label: "Description", filled: !!form.description },
    { label: "Industries", filled: form.industries.length > 0 },
    { label: "Website", filled: !!form.website },
    { label: "Phone", filled: !!form.phone },
    { label: "Email", filled: !!form.email },
    { label: "Location", filled: !!form.location },
    { label: "Country", filled: !!form.country },
    { label: "Address", filled: !!form.address },
    { label: "Perks", filled: form.perks.length > 0 },
    { label: "Ski Resort", filled: !!form.resort_id },
    { label: "Logo", filled: !!(form.logo_url || logoFile) },
  ];
  const filledCount = profileFields.filter((f) => f.filled).length;
  const completionPct = Math.round((filledCount / profileFields.length) * 100);
  const missingFields = profileFields.filter((f) => !f.filled).map((f) => f.label);

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

  const handleCoverSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { alert("Cover photo must be under 5MB"); return; }
    setCoverFile(file);
    setCoverPreview(URL.createObjectURL(file));
    setSaved(false);
  };

  const handleSave = async () => {
    // If the business name changed, show confirmation modal instead of saving directly
    const nameChanged = originalName.trim() !== "" && form.business_name.trim() !== originalName.trim();
    if (nameChanged) {
      setShowNameConfirm(true);
      return;
    }
    await proceedWithSave(false);
  };

  const proceedWithSave = async (resetVerification: boolean) => {
    setSaving(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      alert("You must be logged in to save. Please refresh and log in again.");
      setSaving(false);
      return;
    }

    if (!profileId) {
      // Profile doesn't exist yet — create it
      console.warn("No profileId found, attempting to create business profile...");
      const { data: newProfile, error: createError } = await supabase
        .from("business_profiles")
        .insert({
          user_id: user.id,
          business_name: form.business_name || "My Business",
          email: form.email || user.email || null,
          is_verified: false,
          verification_status: "unverified",
        })
        .select("id")
        .single();

      if (createError) {
        console.error("Error creating profile:", createError);
        alert("Error creating profile: " + createError.message);
        setSaving(false);
        return;
      }
      if (newProfile) {
        setProfileId(newProfile.id);
        // Now continue to update with full data
        await saveProfile(supabase, user.id, newProfile.id);
      }
      setSaving(false);
      return;
    }

    await saveProfile(supabase, user.id, profileId);

    // If name changed, reset verification status
    if (resetVerification && profileId) {
      const { error: verError } = await supabase
        .from("business_profiles")
        .update({
          verification_status: "unverified",
          is_verified: false,
        })
        .eq("id", profileId);

      if (verError) {
        console.error("Error resetting verification:", verError);
        alert("Profile saved, but failed to reset verification status: " + verError.message);
      } else {
        setVerificationStatus("unverified");
      }

      setOriginalName(form.business_name);
      setIsNameLocked(true);
    }

    setSaving(false);
  };

  const saveProfile = async (
    supabase: ReturnType<typeof createClient>,
    currentUserId: string,
    currentProfileId: string
  ) => {
    // Upload logo if new file selected
    let logoUrl = form.logo_url;
    if (logoFile) {
      setUploading(true);
      const fileExt = logoFile.name.split(".").pop();
      const filePath = `${currentUserId}/logo.${fileExt}`;
      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, logoFile, { upsert: true });
      if (uploadError) {
        console.error("Logo upload error:", uploadError);
      } else {
        const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(filePath);
        logoUrl = urlData.publicUrl + "?t=" + Date.now();
      }
      setUploading(false);
      setLogoFile(null);
    }

    // Upload cover photo if new file selected
    let currentCoverUrl = coverUrl || form.cover_photo_url;
    if (coverFile) {
      setUploading(true);
      const coverExt = coverFile.name.split(".").pop();
      const coverPath = `${currentUserId}/cover.${coverExt}`;
      const { error: coverUploadError } = await supabase.storage
        .from("business-photos")
        .upload(coverPath, coverFile, { upsert: true });
      if (coverUploadError) {
        console.error("Cover photo upload error:", coverUploadError);
      } else {
        const { data: coverUrlData } = supabase.storage.from("business-photos").getPublicUrl(coverPath);
        currentCoverUrl = coverUrlData.publicUrl + "?t=" + Date.now();
        setCoverUrl(currentCoverUrl);
      }
      setUploading(false);
      setCoverFile(null);
    }

    const socialLinks: Record<string, string> = {};
    if (form.instagram) socialLinks.instagram = form.instagram;
    if (form.facebook) socialLinks.facebook = form.facebook;
    if (form.linkedin) socialLinks.linkedin = form.linkedin;

    const updateData: Record<string, unknown> = {
      business_name: form.business_name || null,
      description: form.description || null,
      year_established: form.year_established ? parseInt(form.year_established) : null,
      website: form.website || null,
      phone: form.phone || null,
      email: form.email || null,
      location: form.location || null,
      logo_url: logoUrl || null,
      cover_photo_url: currentCoverUrl || null,
      category: form.industries.length > 0 ? form.industries[0] : null,
      social_links: Object.keys(socialLinks).length > 0 ? socialLinks : null,
      standard_perks: form.perks.length > 0 ? form.perks : [],
    };

    // These columns may not exist yet — add them conditionally
    // They are added by migration 00010
    updateData.industries = form.industries.length > 0 ? form.industries : [];
    updateData.address = form.address || null;
    updateData.country = form.country || null;
    // Only save resort_id if it's a valid UUID (static resort IDs are not UUIDs)
    const isUuid = (s: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);
    updateData.resort_id = form.resort_id && isUuid(form.resort_id) ? form.resort_id : null;

    console.log("Saving profile:", currentProfileId, "data:", updateData);

    const { error, status, statusText } = await supabase
      .from("business_profiles")
      .update(updateData)
      .eq("id", currentProfileId);

    console.log("Save response:", status, statusText, error);

    if (error) {
      console.error("Save error:", error);
      // If error is about missing columns, retry without the new columns
      if (error.message?.includes("column") || error.code === "PGRST204") {
        console.warn("Retrying save without new columns (industries/address/country/resort_id)...");
        delete updateData.industries;
        delete updateData.address;
        delete updateData.country;
        delete updateData.resort_id;

        const { error: retryError } = await supabase
          .from("business_profiles")
          .update(updateData)
          .eq("id", currentProfileId);

        if (retryError) {
          alert("Error saving profile: " + retryError.message + "\n\nPlease check the browser console for details.");
        } else {
          alert("Profile saved! Note: Some fields (industries, address, country, resort) could not be saved. Please run the database migration in Supabase SQL Editor.");
          // Update logo_url in form state
          if (logoUrl !== form.logo_url) {
            setForm((prev) => ({ ...prev, logo_url: logoUrl }));
          }
          setSaved(true);
        }
      } else {
        alert("Error saving profile: " + error.message + "\n\nPlease check the browser console for details.");
      }
    } else {
      // Update logo_url in form state
      if (logoUrl !== form.logo_url) {
        setForm((prev) => ({ ...prev, logo_url: logoUrl }));
      }
      setSaved(true);
    }
  };

  const handleSubmitForVerification = async () => {
    setSubmitting(true);
    // Save all profile data first, then submit for verification
    await handleSave();
    const supabase = createClient();
    if (profileId) {
      const { error } = await supabase.from("business_profiles").update({
        verification_status: "pending_review",
      }).eq("id", profileId);
      if (error) {
        alert("Error submitting for verification: " + error.message);
        setSubmitting(false);
        return;
      }
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
      {/* Cover photo header */}
      <div
        className="relative -mx-6 -mt-6 mb-8 overflow-hidden rounded-2xl px-8 py-10 sm:px-10 sm:py-12">
        {/* Cover photo background */}
        {coverPreview ? (
          <img src={coverPreview} alt="Cover" className="absolute inset-0 h-full w-full object-cover" />
        ) : (
          <img src="https://images.unsplash.com/photo-1483728642387-6c3bdd6c93e5?w=1200&q=80" alt="Mountain landscape" className="absolute inset-0 h-full w-full object-cover" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/40 to-black/20" />

        {/* Cover photo upload button */}
        <button
          onClick={() => coverInputRef.current?.click()}
          className="absolute top-4 right-4 z-10 flex items-center gap-1.5 rounded-lg bg-black/40 backdrop-blur-sm px-3 py-1.5 text-xs font-medium text-white/80 transition-all hover:bg-black/60 hover:text-white border border-white/20"
        >
          <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0z" />
          </svg>
          {coverPreview ? "Change Cover" : "Add Cover Photo"}
        </button>
        <input ref={coverInputRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={handleCoverSelect} className="hidden" />

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
        {missingFields.length > 0 && (
          <div className="mt-3 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
            <svg className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" /></svg>
            <div>
              <p className="text-xs font-medium text-amber-800">Still needed: {missingFields.join(", ")}</p>
            </div>
          </div>
        )}
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
            <div className="mt-1 flex items-center gap-2">
              <input
                value={form.business_name}
                onChange={(e) => updateField("business_name", e.target.value)}
                readOnly={isNameLocked}
                className={`${inputClass} ${isNameLocked ? "bg-gray-50 text-foreground/60 cursor-not-allowed" : ""} flex-1`}
              />
              {isNameLocked ? (
                <button
                  type="button"
                  onClick={() => setShowNameWarning(true)}
                  className="shrink-0 rounded-xl border border-accent/40 bg-white px-4 py-2.5 text-sm font-medium text-foreground/70 shadow-sm transition-all hover:bg-accent/10 hover:text-foreground flex items-center gap-1.5"
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" />
                  </svg>
                  Edit
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setForm((prev) => ({ ...prev, business_name: originalName }));
                    setIsNameLocked(true);
                  }}
                  className="shrink-0 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-medium text-red-600 shadow-sm transition-all hover:bg-red-100"
                >
                  Cancel
                </button>
              )}
            </div>
            {!isNameLocked && (
              <p className="mt-1.5 text-xs text-amber-600 font-medium">
                Changing your business name will require re-verification.
              </p>
            )}
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
              <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
                <svg className="h-4 w-4 text-foreground/30" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <input
                type="text"
                value={resortSearchOpen ? resortQuery : selectedResortName || resortQuery}
                onChange={(e) => {
                  setResortQuery(e.target.value);
                  if (!resortSearchOpen) setResortSearchOpen(true);
                }}
                placeholder="Search resorts..."
                className={inputClass + " !pl-9"}
                onFocus={() => setResortSearchOpen(true)}
                onBlur={() => setTimeout(() => setResortSearchOpen(false), 200)}
              />
              {form.resort_id && !resortSearchOpen && (
                <span className="absolute right-3 top-1/2 -translate-y-1/2 mt-0.5 flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                  Linked
                </span>
              )}
            </div>
            {resortSearchOpen && (
              <div className="absolute z-20 mt-1 w-full rounded-lg border border-accent bg-white shadow-xl max-h-56 overflow-y-auto">
                {form.resort_id && (
                  <button
                    type="button"
                    className="flex w-full items-center gap-2 border-b border-accent/50 px-4 py-2 text-left text-sm text-red-500 hover:bg-red-50 transition-colors"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => {
                      setSelectedResortName("");
                      updateField("resort_id", null);
                      setResortQuery("");
                      setResortSearchOpen(false);
                    }}
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    Clear selection
                  </button>
                )}
                {filteredResorts.length > 0 ? filteredResorts.map((r: { id: string; name: string; country: string }) => (
                  <button
                    key={r.id}
                    type="button"
                    className={`flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm transition-colors ${
                      form.resort_id === r.id ? "bg-secondary/10 text-secondary" : "hover:bg-accent/20"
                    }`}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => {
                      setSelectedResortName(r.name);
                      updateField("resort_id", r.id);
                      setResortQuery("");
                      setResortSearchOpen(false);
                    }}
                  >
                    <svg className={`h-4 w-4 shrink-0 ${form.resort_id === r.id ? "text-secondary" : "text-foreground/30"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    </svg>
                    <div className="flex-1 min-w-0">
                      <span className="font-medium text-primary">{r.name}</span>
                    </div>
                    <span className="shrink-0 text-xs text-foreground/40">{r.country}</span>
                    {form.resort_id === r.id && (
                      <svg className="h-4 w-4 shrink-0 text-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </button>
                )) : (
                  <div className="px-4 py-6 text-center text-sm text-foreground/40">
                    No resorts found for &ldquo;{resortQuery}&rdquo;
                  </div>
                )}
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

      {/* Warning Modal: Edit Business Name */}
      {showNameWarning && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowNameWarning(false)} />
          <div className="relative w-full max-w-md rounded-2xl bg-white shadow-2xl p-6">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-amber-100">
              <svg className="h-6 w-6 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
              </svg>
            </div>
            <h3 className="mt-4 text-center text-lg font-bold text-primary">
              Caution: Business Name Change
            </h3>
            <p className="mt-2 text-center text-sm text-foreground/60">
              Editing your business name will require re-verification. Your verified status will be removed and you will need to re-submit for verification.
            </p>
            <div className="mt-6 flex gap-3">
              <button
                onClick={() => setShowNameWarning(false)}
                className="flex-1 rounded-xl border border-accent/40 px-4 py-2.5 text-sm font-semibold text-foreground/70 hover:bg-accent/10 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setShowNameWarning(false);
                  setIsNameLocked(false);
                }}
                className="flex-1 rounded-xl bg-amber-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-amber-600 transition-colors"
              >
                I Understand, Edit Name
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal: Save Changed Business Name */}
      {showNameConfirm && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowNameConfirm(false)} />
          <div className="relative w-full max-w-md rounded-2xl bg-white shadow-2xl p-6">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
              <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
              </svg>
            </div>
            <h3 className="mt-4 text-center text-lg font-bold text-primary">
              Confirm Business Name Change
            </h3>
            <p className="mt-2 text-center text-sm text-foreground/60">
              Are you sure you want to save the new company name? Your verification status will be reset to <span className="font-semibold text-red-600">unverified</span> and you will need to re-submit for verification.
            </p>
            <div className="mt-4 rounded-xl bg-gray-50 p-3 text-center">
              <p className="text-xs text-foreground/40">Changing from</p>
              <p className="text-sm font-medium text-foreground/70 line-through">{originalName}</p>
              <p className="text-xs text-foreground/40 mt-1">to</p>
              <p className="text-sm font-semibold text-primary">{form.business_name}</p>
            </div>
            <div className="mt-6 flex gap-3">
              <button
                onClick={() => setShowNameConfirm(false)}
                className="flex-1 rounded-xl border border-accent/40 px-4 py-2.5 text-sm font-semibold text-foreground/70 hover:bg-accent/10 transition-colors"
              >
                Go Back
              </button>
              <button
                onClick={async () => {
                  setShowNameConfirm(false);
                  await proceedWithSave(true);
                }}
                className="flex-1 rounded-xl bg-red-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-600 transition-colors"
              >
                Confirm &amp; Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
