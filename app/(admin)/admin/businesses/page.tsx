"use client";

import { useState, useEffect, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import type { BusinessVerificationStatus } from "@/types/database";

const STATUS_STYLES: Record<BusinessVerificationStatus, { bg: string; text: string; label: string }> = {
  unverified: { bg: "bg-gray-50", text: "text-gray-600", label: "Unverified" },
  pending_review: { bg: "bg-yellow-50", text: "text-yellow-700", label: "Pending Review" },
  accepted: { bg: "bg-blue-50", text: "text-blue-700", label: "Accepted" },
  pending_verification: { bg: "bg-purple-50", text: "text-purple-700", label: "Pending Verification" },
  verified: { bg: "bg-green-50", text: "text-green-700", label: "Verified" },
  rejected: { bg: "bg-red-50", text: "text-red-600", label: "Rejected" },
};

const INDUSTRY_LABELS: Record<string, string> = {
  ski_school: "Ski / Snowboard School",
  hospitality: "Hospitality",
  food_beverage: "Food & Beverage",
  retail: "Retail",
  resort_operations: "Resort Operations",
  accommodation: "Accommodation",
  rental_shop: "Rental Shop",
  transport: "Transport",
  entertainment: "Entertainment",
  cleaning_housekeeping: "Cleaning / Housekeeping",
  construction_maintenance: "Construction / Maintenance",
  childcare: "Childcare",
  health_fitness: "Health & Fitness",
  tourism: "Tourism / Adventure",
  other: "Other",
};

interface BusinessRow {
  id: string;
  user_id: string;
  business_name: string;
  category: string | null;
  industries: string[] | null;
  location: string | null;
  country: string | null;
  email: string | null;
  phone: string | null;
  website: string | null;
  description: string | null;
  logo_url: string | null;
  cover_photo_url: string | null;
  address: string | null;
  year_established: number | null;
  verification_status: BusinessVerificationStatus;
  is_verified: boolean;
  slug: string | null;
  social_links: Record<string, string> | null;
  standard_perks: string[] | null;
  resort_id: string | null;
  tier: "free" | "standard" | "premium" | "enterprise";
  created_at: string;
}

export default function AdminBusinessesPage() {
  const [businesses, setBusinesses] = useState<BusinessRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | BusinessVerificationStatus>("all");
  const [selected, setSelected] = useState<BusinessRow | null>(null);
  const [showDeleteWarning, setShowDeleteWarning] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [resortName, setResortName] = useState<string | null>(null);
  const [togglingPremium, setTogglingPremium] = useState(false);
  const [verifyAction, setVerifyAction] = useState<"verify" | "unverify" | null>(null);
  const [verifyReason, setVerifyReason] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [verifyError, setVerifyError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("business_profiles")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) console.error("Error loading businesses:", error);
      setBusinesses((data as BusinessRow[]) || []);
      setLoading(false);
    }
    load();
  }, []);

  // Fetch resort name when a business is selected
  useEffect(() => {
    if (!selected?.resort_id) {
      setResortName(null);
      return;
    }
    (async () => {
      const supabase = createClient();
      const { data } = await supabase
        .from("resorts")
        .select("name")
        .eq("id", selected.resort_id!)
        .single();
      setResortName(data?.name || null);
    })();
  }, [selected?.resort_id]);

  const filtered = useMemo(() => {
    let results = [...businesses];
    if (statusFilter !== "all") {
      results = results.filter((b) => b.verification_status === statusFilter);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      results = results.filter(
        (b) =>
          b.business_name.toLowerCase().includes(q) ||
          (b.location && b.location.toLowerCase().includes(q)) ||
          (b.country && b.country.toLowerCase().includes(q)) ||
          (b.email && b.email.toLowerCase().includes(q))
      );
    }
    return results;
  }, [businesses, search, statusFilter]);

  const getIndustryLabel = (biz: BusinessRow): string => {
    if (biz.industries && biz.industries.length > 0) {
      return biz.industries[0].replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
    }
    if (biz.category) {
      return biz.category.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
    }
    return "—";
  };

  const handleDelete = async () => {
    if (!selected) return;
    setDeleting(true);
    try {
      // Use the server-side admin API so RLS can't block the delete and
      // we can also clean up the auth user + linked users row in one shot.
      const res = await fetch("/api/admin/delete-business", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ businessId: selected.id }),
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        alert("Error deleting business: " + (data.error || "Unknown error"));
        setDeleting(false);
        return;
      }

      // Remove from local state
      setBusinesses((prev) => prev.filter((b) => b.id !== selected.id));
      setSelected(null);
      setShowDeleteConfirm(false);
      setShowDeleteWarning(false);
    } catch (err) {
      console.error("Delete failed:", err);
      alert("Failed to delete business. Please try again.");
    }
    setDeleting(false);
  };

  const handleSetTier = async (newTier: string) => {
    if (!selected) return;
    setTogglingPremium(true);
    try {
      const res = await fetch("/api/admin/toggle-premium", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ businessId: selected.id, tier: newTier }),
      });
      const data = await res.json();
      if (data.success) {
        const updated = { ...selected, tier: newTier as BusinessRow["tier"] };
        setSelected(updated);
        setBusinesses((prev) => prev.map((b) => b.id === selected.id ? updated : b));
      }
    } catch (err) {
      console.error("Tier update error:", err);
    }
    setTogglingPremium(false);
  };

  const openVerifyModal = (action: "verify" | "unverify") => {
    setVerifyAction(action);
    setVerifyReason("");
    setVerifyError(null);
  };

  const closeVerifyModal = () => {
    if (verifying) return;
    setVerifyAction(null);
    setVerifyReason("");
    setVerifyError(null);
  };

  const handleConfirmVerify = async () => {
    if (!selected || !verifyAction) return;
    setVerifying(true);
    setVerifyError(null);
    try {
      const res = await fetch("/api/admin/confirm-business", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          businessId: selected.id,
          action: verifyAction,
          message: verifyAction === "unverify" ? verifyReason.trim() || undefined : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setVerifyError(data.error || "Failed to update verification.");
        setVerifying(false);
        return;
      }

      // Mirror the API's DB updates in local state.
      const updated: BusinessRow = {
        ...selected,
        verification_status:
          verifyAction === "verify" ? "verified" : "accepted",
        is_verified: verifyAction === "verify",
      };
      setSelected(updated);
      setBusinesses((prev) => prev.map((b) => (b.id === selected.id ? updated : b)));
      setVerifyAction(null);
      setVerifyReason("");
    } catch (err) {
      console.error("Verify/unverify error:", err);
      setVerifyError("Something went wrong. Please try again.");
    }
    setVerifying(false);
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-primary" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="text-2xl font-bold text-primary">All Businesses</h1>
      <p className="mt-1 text-sm text-foreground/60">
        Browse and manage all registered businesses on the platform.
      </p>

      {/* Filters */}
      <div className="mt-6 flex flex-wrap items-center gap-3">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search businesses..."
          className="w-64 rounded-lg border border-accent bg-white px-4 py-2.5 text-sm text-primary focus:border-secondary focus:outline-none focus:ring-1 focus:ring-secondary"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as "all" | BusinessVerificationStatus)}
          className="rounded-lg border border-accent bg-white px-4 py-2.5 text-sm text-primary focus:border-secondary focus:outline-none"
        >
          <option value="all">All Statuses</option>
          <option value="verified">Verified</option>
          <option value="pending_verification">Pending Verification</option>
          <option value="accepted">Accepted</option>
          <option value="pending_review">Pending Review</option>
          <option value="unverified">Unverified</option>
          <option value="rejected">Rejected</option>
        </select>
        <span className="text-sm text-foreground/50">{filtered.length} businesses</span>
      </div>

      {/* Table */}
      <div className="mt-6 overflow-hidden rounded-xl border border-accent bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-accent bg-accent/10 text-left text-xs uppercase tracking-wider text-foreground/50">
              <th className="px-5 py-3">Business</th>
              <th className="px-5 py-3">Industry</th>
              <th className="px-5 py-3">Location</th>
              <th className="px-5 py-3">Status</th>
              <th className="px-5 py-3 text-right">Registered</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((biz) => {
              const style = STATUS_STYLES[biz.verification_status];
              return (
                <tr
                  key={biz.id}
                  onClick={() => setSelected(biz)}
                  className="cursor-pointer border-b border-accent/30 transition-colors hover:bg-accent/5"
                >
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      {biz.logo_url ? (
                        <img src={biz.logo_url} alt="" className="h-8 w-8 shrink-0 rounded-lg object-cover" />
                      ) : (
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-xs font-bold text-primary">
                          {biz.business_name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase()}
                        </div>
                      )}
                      <div>
                        <p className="font-medium text-primary">
                          {biz.tier === "enterprise" && <span className="mr-1 text-purple-500" title="Enterprise">⭐</span>}
                          {biz.tier === "premium" && <span className="mr-1 text-amber-500" title="Premium">👑</span>}
                          {biz.tier === "standard" && <span className="mr-1 text-blue-500" title="Standard">✓</span>}
                          {biz.business_name}
                        </p>
                        {biz.email && <p className="text-xs text-foreground/40">{biz.email}</p>}
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3 text-foreground/70">{getIndustryLabel(biz)}</td>
                  <td className="px-5 py-3 text-foreground/70">
                    {biz.location}{biz.country ? `, ${biz.country}` : ""}
                  </td>
                  <td className="px-5 py-3">
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${style.bg} ${style.text}`}>
                      {style.label}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-right text-foreground/50">
                    {new Date(biz.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="p-8 text-center text-sm text-foreground/40">No businesses found.</div>
        )}
      </div>

      {/* ─── Business Detail Panel ─── */}
      {selected && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setSelected(null)} />
          <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white shadow-2xl">
            {/* Header with cover/gradient */}
            <div className="relative h-32 rounded-t-2xl overflow-hidden">
              {selected.cover_photo_url ? (
                <img src={selected.cover_photo_url} alt="" className="h-full w-full object-cover" />
              ) : (
                <div className="h-full w-full bg-gradient-to-br from-primary via-primary/80 to-secondary" />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
              <button
                onClick={() => setSelected(null)}
                className="absolute top-3 right-3 rounded-full bg-white/90 p-1.5 text-foreground/60 transition-colors hover:bg-white hover:text-foreground"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Logo + Name */}
            <div className="relative px-6 pb-6">
              <div className="flex items-end gap-4 -mt-8">
                {selected.logo_url ? (
                  <img src={selected.logo_url} alt="" className="h-16 w-16 rounded-xl border-4 border-white object-cover shadow-md" />
                ) : (
                  <div className="flex h-16 w-16 items-center justify-center rounded-xl border-4 border-white bg-primary/10 text-lg font-bold text-primary shadow-md">
                    {selected.business_name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase()}
                  </div>
                )}
                <div className="pb-1">
                  <h2 className="text-xl font-bold text-primary">{selected.business_name}</h2>
                  {(() => {
                    const s = STATUS_STYLES[selected.verification_status];
                    return (
                      <span className={`mt-1 inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${s.bg} ${s.text}`}>
                        {s.label}
                      </span>
                    );
                  })()}
                </div>
              </div>

              {/* Info Grid */}
              <div className="mt-6 grid grid-cols-2 gap-4">
                <InfoItem label="Email" value={selected.email} />
                <InfoItem label="Phone" value={selected.phone} />
                <InfoItem label="Location" value={[selected.location, selected.country].filter(Boolean).join(", ") || null} />
                <InfoItem label="Address" value={selected.address} />
                <InfoItem label="Website" value={selected.website} isLink />
                <InfoItem label="Year Established" value={selected.year_established ? String(selected.year_established) : null} />
                <InfoItem label="Resort" value={resortName} />
                <InfoItem label="Slug" value={selected.slug} />
                <InfoItem label="Profile ID" value={selected.id} mono />
                <InfoItem label="User ID" value={selected.user_id} mono />
              </div>

              {/* Industries */}
              {selected.industries && selected.industries.length > 0 && (
                <div className="mt-5">
                  <p className="text-xs font-semibold uppercase tracking-wider text-foreground/40 mb-2">Industries</p>
                  <div className="flex flex-wrap gap-1.5">
                    {selected.industries.map((ind) => (
                      <span key={ind} className="rounded-full bg-secondary/10 px-3 py-1 text-xs font-medium text-secondary">
                        {INDUSTRY_LABELS[ind] || ind.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Perks */}
              {selected.standard_perks && selected.standard_perks.length > 0 && (
                <div className="mt-5">
                  <p className="text-xs font-semibold uppercase tracking-wider text-foreground/40 mb-2">Perks</p>
                  <div className="flex flex-wrap gap-1.5">
                    {selected.standard_perks.map((perk) => (
                      <span key={perk} className="rounded-full bg-accent/30 px-3 py-1 text-xs font-medium text-foreground/70">
                        {perk}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Social Links */}
              {selected.social_links && Object.keys(selected.social_links).length > 0 && (
                <div className="mt-5">
                  <p className="text-xs font-semibold uppercase tracking-wider text-foreground/40 mb-2">Social Links</p>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(selected.social_links).filter(([, v]) => v).map(([platform, url]) => (
                      <a
                        key={platform}
                        href={url.startsWith("http") ? url : `https://${url}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="rounded-lg border border-accent/40 px-3 py-1.5 text-xs font-medium text-primary hover:bg-accent/10 transition-colors capitalize"
                      >
                        {platform}
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {/* Description */}
              {selected.description && (
                <div className="mt-5">
                  <p className="text-xs font-semibold uppercase tracking-wider text-foreground/40 mb-2">About</p>
                  <p className="text-sm text-foreground/70 leading-relaxed whitespace-pre-wrap">{selected.description}</p>
                </div>
              )}

              {/* Registered date */}
              <div className="mt-5 pt-4 border-t border-accent/30">
                <p className="text-xs text-foreground/40">
                  Registered {new Date(selected.created_at).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
                </p>
              </div>

              {/* Actions */}
              <div className="mt-5 flex items-center gap-3 flex-wrap">
                <div className="flex items-center gap-2">
                  <label className="text-xs font-semibold uppercase tracking-wider text-foreground/40">Tier</label>
                  <select
                    value={selected.tier}
                    onChange={(e) => handleSetTier(e.target.value)}
                    disabled={togglingPremium}
                    className="rounded-xl border border-amber-300 bg-white px-3 py-2.5 text-sm font-semibold text-primary focus:border-secondary focus:outline-none disabled:opacity-50"
                  >
                    <option value="free">Free</option>
                    <option value="standard">Standard</option>
                    <option value="premium">Premium</option>
                    <option value="enterprise">Enterprise</option>
                  </select>
                  {togglingPremium && <span className="text-xs text-foreground/40">Saving...</span>}
                </div>

                {/* Verify / Unverify */}
                {selected.verification_status === "verified" ? (
                  <button
                    onClick={() => openVerifyModal("unverify")}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm font-semibold text-amber-700 transition-colors hover:bg-amber-100"
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                    </svg>
                    Unverify Business
                  </button>
                ) : (
                  <button
                    onClick={() => openVerifyModal("verify")}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-green-200 bg-green-50 px-4 py-2.5 text-sm font-semibold text-green-700 transition-colors hover:bg-green-100"
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Verify Business
                  </button>
                )}

                <a
                  href={`/business/${selected.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-xl border border-accent/40 px-4 py-2.5 text-sm font-semibold text-foreground/70 hover:bg-accent/10 transition-colors"
                >
                  View Public Profile
                </a>
                <button
                  onClick={() => setShowDeleteWarning(true)}
                  className="rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-semibold text-red-600 transition-colors hover:bg-red-100"
                >
                  Delete Business
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── Verify / Unverify Confirmation Modal ─── */}
      {verifyAction && selected && (
        <div className="fixed inset-0 z-[95] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={closeVerifyModal}
          />
          <div className="relative w-full max-w-md rounded-2xl bg-white shadow-2xl p-6">
            <div
              className={`mx-auto flex h-14 w-14 items-center justify-center rounded-full ${
                verifyAction === "verify" ? "bg-green-100" : "bg-amber-100"
              }`}
            >
              <svg
                className={`h-7 w-7 ${
                  verifyAction === "verify" ? "text-green-600" : "text-amber-600"
                }`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                {verifyAction === "verify" ? (
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                )}
              </svg>
            </div>
            <h3 className="mt-4 text-center text-lg font-bold text-primary">
              {verifyAction === "verify" ? "Verify Business" : "Unverify Business"}
            </h3>
            <p className="mt-2 text-center text-sm text-foreground/60">
              {verifyAction === "verify" ? (
                <>
                  Mark <span className="font-semibold text-primary">{selected.business_name}</span> as verified? Their profile and job listings will become publicly visible, and they&apos;ll receive a welcome notification and email.
                </>
              ) : (
                <>
                  Remove verification from <span className="font-semibold text-primary">{selected.business_name}</span>? Their profile and active job listings will stop being publicly visible, and they&apos;ll be notified. They can be verified again at any time.
                </>
              )}
            </p>

            {verifyAction === "unverify" && (
              <div className="mt-4">
                <label className="block text-xs font-semibold uppercase tracking-wider text-foreground/50">
                  Reason (optional)
                </label>
                <textarea
                  value={verifyReason}
                  onChange={(e) => setVerifyReason(e.target.value)}
                  disabled={verifying}
                  rows={3}
                  placeholder="Shown to the business in their notification and email."
                  className="mt-1.5 w-full rounded-lg border border-accent bg-white px-3 py-2 text-sm text-primary placeholder:text-foreground/30 focus:border-secondary focus:outline-none focus:ring-1 focus:ring-secondary disabled:opacity-50"
                />
              </div>
            )}

            {verifyError && (
              <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {verifyError}
              </p>
            )}

            <div className="mt-5 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={closeVerifyModal}
                disabled={verifying}
                className="rounded-xl px-4 py-2.5 text-sm font-semibold text-foreground/60 hover:bg-accent/20 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmVerify}
                disabled={verifying}
                className={`rounded-xl px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50 ${
                  verifyAction === "verify"
                    ? "bg-green-600 hover:bg-green-700"
                    : "bg-amber-600 hover:bg-amber-700"
                }`}
              >
                {verifying
                  ? verifyAction === "verify"
                    ? "Verifying..."
                    : "Unverifying..."
                  : verifyAction === "verify"
                  ? "Yes, Verify"
                  : "Yes, Unverify"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Delete Warning Modal ─── */}
      {showDeleteWarning && selected && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowDeleteWarning(false)} />
          <div className="relative w-full max-w-md rounded-2xl bg-white shadow-2xl p-6">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-red-100">
              <svg className="h-7 w-7 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
              </svg>
            </div>
            <h3 className="mt-4 text-center text-lg font-bold text-primary">
              Delete Business
            </h3>
            <p className="mt-2 text-center text-sm text-foreground/60">
              You are about to delete <span className="font-semibold text-primary">{selected.business_name}</span>. This will permanently remove:
            </p>
            <ul className="mt-3 space-y-2 text-sm text-foreground/60">
              <li className="flex items-start gap-2">
                <svg className="mt-0.5 h-4 w-4 shrink-0 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
                Their entire business profile and all data
              </li>
              <li className="flex items-start gap-2">
                <svg className="mt-0.5 h-4 w-4 shrink-0 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
                All job listings posted by this business
              </li>
              <li className="flex items-start gap-2">
                <svg className="mt-0.5 h-4 w-4 shrink-0 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
                Their verification status and history
              </li>
            </ul>
            <div className="mt-4 rounded-xl bg-red-50 border border-red-200 p-3">
              <p className="text-center text-xs font-semibold text-red-700">
                This action is irreversible and cannot be undone.
              </p>
            </div>
            <div className="mt-6 flex gap-3">
              <button
                onClick={() => setShowDeleteWarning(false)}
                className="flex-1 rounded-xl border border-accent/40 px-4 py-2.5 text-sm font-semibold text-foreground/70 hover:bg-accent/10 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setShowDeleteWarning(false);
                  setShowDeleteConfirm(true);
                }}
                className="flex-1 rounded-xl bg-red-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-600 transition-colors"
              >
                Continue
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Delete Final Confirmation Modal ─── */}
      {showDeleteConfirm && selected && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div className="relative w-full max-w-md rounded-2xl bg-white shadow-2xl p-6">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-red-600">
              <svg className="h-7 w-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
              </svg>
            </div>
            <h3 className="mt-4 text-center text-lg font-bold text-red-700">
              Are you sure?
            </h3>
            <p className="mt-2 text-center text-sm text-foreground/60">
              You are permanently deleting <span className="font-bold text-primary">{selected.business_name}</span>. This action is <span className="font-bold text-red-600">irreversible</span>.
            </p>
            <div className="mt-6 flex gap-3">
              <button
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setShowDeleteWarning(false);
                }}
                disabled={deleting}
                className="flex-1 rounded-xl border border-accent/40 px-4 py-2.5 text-sm font-semibold text-foreground/70 hover:bg-accent/10 transition-colors disabled:opacity-50"
              >
                Go Back
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {deleting ? "Deleting..." : "Yes, Delete Permanently"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Helper Component ─── */

function InfoItem({ label, value, isLink, mono }: { label: string; value: string | null; isLink?: boolean; mono?: boolean }) {
  if (!value) {
    return (
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-foreground/40">{label}</p>
        <p className="mt-0.5 text-sm text-foreground/30">—</p>
      </div>
    );
  }
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wider text-foreground/40">{label}</p>
      {isLink ? (
        <a
          href={value.startsWith("http") ? value : `https://${value}`}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-0.5 text-sm text-secondary hover:underline break-all"
        >
          {value}
        </a>
      ) : (
        <p className={`mt-0.5 text-sm text-foreground/70 break-all ${mono ? "font-mono text-xs" : ""}`}>{value}</p>
      )}
    </div>
  );
}
