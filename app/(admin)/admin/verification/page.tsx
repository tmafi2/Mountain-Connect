"use client";

import { useState, useEffect } from "react";
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

interface BusinessRecord {
  id: string;
  user_id: string;
  business_name: string;
  category: string | null;
  industries: string[] | null;
  location: string | null;
  country: string | null;
  address: string | null;
  description: string | null;
  website: string | null;
  email: string | null;
  phone: string | null;
  year_established: number | null;
  logo_url: string | null;
  verification_status: BusinessVerificationStatus;
  created_at: string;
}

export default function AdminVerificationPage() {
  const [businesses, setBusinesses] = useState<BusinessRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"pending" | "all">("pending");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    loadBusinesses();
  }, []);

  async function loadBusinesses() {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("business_profiles")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error loading businesses:", error);
    }
    setBusinesses((data as BusinessRecord[]) || []);
    setLoading(false);
  }

  const filtered = filter === "pending"
    ? businesses.filter((b) => b.verification_status === "pending_verification")
    : businesses;

  const pendingCount = businesses.filter((b) => b.verification_status === "pending_verification").length;
  const verifiedCount = businesses.filter((b) => b.verification_status === "verified").length;
  const selected = selectedId ? businesses.find((b) => b.id === selectedId) : null;

  const handleApprove = async (id: string) => {
    setProcessing(true);
    try {
      const res = await fetch("/api/admin/confirm-business", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ businessId: id, action: "verify" }),
      });
      if (!res.ok) {
        const data = await res.json();
        alert("Error verifying business: " + (data.error || "Unknown error"));
      } else {
        setBusinesses((prev) =>
          prev.map((b) => b.id === id ? { ...b, verification_status: "verified" as const } : b)
        );
        setSelectedId(null);
      }
    } catch (err) {
      alert("Network error verifying business");
    }
    setProcessing(false);
  };

  const handleReject = async (id: string) => {
    setProcessing(true);
    try {
      const res = await fetch("/api/admin/confirm-business", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ businessId: id, action: "reject_verification", message: rejectReason }),
      });
      if (!res.ok) {
        const data = await res.json();
        alert("Error denying verification: " + (data.error || "Unknown error"));
      } else {
        setBusinesses((prev) =>
          prev.map((b) => b.id === id ? { ...b, verification_status: "accepted" as const } : b)
        );
        setSelectedId(null);
      }
    } catch (err) {
      alert("Network error denying verification");
    }
    setRejectingId(null);
    setRejectReason("");
    setProcessing(false);
  };

  const getIndustryLabels = (biz: BusinessRecord): string => {
    if (biz.industries && biz.industries.length > 0) {
      return biz.industries.map((i) => i.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())).join(", ");
    }
    if (biz.category) {
      return biz.category.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
    }
    return "Not specified";
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-primary" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-primary">Verification Requests</h1>
          <p className="mt-1 text-sm text-foreground/60">
            Review and approve business verification applications.
          </p>
        </div>
        <div className="flex items-center gap-4 text-sm">
          <span className="rounded-full bg-yellow-50 px-3 py-1 font-medium text-yellow-700">
            {pendingCount} pending
          </span>
          <span className="rounded-full bg-green-50 px-3 py-1 font-medium text-green-700">
            {verifiedCount} verified
          </span>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="mt-6 flex gap-2">
        <button
          onClick={() => setFilter("pending")}
          className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
            filter === "pending"
              ? "bg-primary text-white"
              : "bg-white text-foreground/60 border border-accent hover:bg-accent/20"
          }`}
        >
          Pending ({pendingCount})
        </button>
        <button
          onClick={() => setFilter("all")}
          className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
            filter === "all"
              ? "bg-primary text-white"
              : "bg-white text-foreground/60 border border-accent hover:bg-accent/20"
          }`}
        >
          All Submissions
        </button>
      </div>

      {/* Split panel */}
      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-5">
        {/* Business list */}
        <div className="space-y-2 lg:col-span-2">
          {filtered.length === 0 ? (
            <div className="rounded-xl border border-accent bg-white p-8 text-center">
              <svg className="mx-auto h-10 w-10 text-green-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="mt-3 text-sm font-medium text-foreground/50">
                {filter === "pending" ? "All caught up!" : "No businesses yet."}
              </p>
              <p className="mt-1 text-xs text-foreground/40">
                {filter === "pending" ? "No pending verification applications." : "Businesses will appear here as they apply for verification."}
              </p>
            </div>
          ) : (
            filtered.map((biz) => {
              const style = STATUS_STYLES[biz.verification_status];
              return (
                <button
                  key={biz.id}
                  onClick={() => setSelectedId(biz.id)}
                  className={`w-full rounded-xl border bg-white p-4 text-left transition-all hover:shadow-sm ${
                    selectedId === biz.id
                      ? "border-primary shadow-sm"
                      : "border-accent hover:border-secondary/50"
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      {biz.logo_url ? (
                        <img src={biz.logo_url} alt="" className="h-10 w-10 shrink-0 rounded-lg object-cover" />
                      ) : (
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-xs font-bold text-primary">
                          {biz.business_name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase()}
                        </div>
                      )}
                      <div>
                        <h3 className="font-semibold text-primary">{biz.business_name}</h3>
                        <p className="mt-0.5 text-xs text-foreground/50">
                          {biz.location}{biz.country ? `, ${biz.country}` : ""}
                        </p>
                      </div>
                    </div>
                    <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${style.bg} ${style.text}`}>
                      {style.label}
                    </span>
                  </div>
                </button>
              );
            })
          )}
        </div>

        {/* Detail panel */}
        <div className="lg:col-span-3">
          {selected ? (
            <div className="rounded-xl border border-accent bg-white p-6">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4">
                  {selected.logo_url ? (
                    <img src={selected.logo_url} alt="" className="h-14 w-14 rounded-xl object-cover" />
                  ) : (
                    <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10 text-lg font-bold text-primary">
                      {selected.business_name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase()}
                    </div>
                  )}
                  <div>
                    <h2 className="text-xl font-bold text-primary">{selected.business_name}</h2>
                    <p className="mt-1 text-sm text-foreground/60">
                      {selected.location}{selected.country ? `, ${selected.country}` : ""}
                    </p>
                  </div>
                </div>
                <span className={`rounded-full px-3 py-1 text-xs font-medium ${STATUS_STYLES[selected.verification_status].bg} ${STATUS_STYLES[selected.verification_status].text}`}>
                  {STATUS_STYLES[selected.verification_status].label}
                </span>
              </div>

              {/* Detail fields */}
              <div className="mt-6 space-y-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-foreground/40">Industry</p>
                  <p className="mt-1 text-sm text-foreground/80">{getIndustryLabels(selected)}</p>
                </div>

                {selected.description && (
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-foreground/40">Description</p>
                    <p className="mt-1 text-sm leading-relaxed text-foreground/80">{selected.description}</p>
                  </div>
                )}

                {selected.address && (
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-foreground/40">Address</p>
                    <p className="mt-1 text-sm text-foreground/80">{selected.address}</p>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-foreground/40">Website</p>
                    <p className="mt-1 text-sm text-primary">
                      {selected.website ? (
                        <a href={selected.website} target="_blank" rel="noopener noreferrer" className="hover:underline">
                          {selected.website}
                        </a>
                      ) : "—"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-foreground/40">Email</p>
                    <p className="mt-1 text-sm text-foreground/80">{selected.email || "—"}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-foreground/40">Phone</p>
                    <p className="mt-1 text-sm text-foreground/80">{selected.phone || "—"}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-foreground/40">Year Established</p>
                    <p className="mt-1 text-sm text-foreground/80">{selected.year_established || "—"}</p>
                  </div>
                </div>

                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-foreground/40">Registered</p>
                  <p className="mt-1 text-sm text-foreground/80">
                    {new Date(selected.created_at).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
                  </p>
                </div>
              </div>

              {/* Action buttons */}
              {selected.verification_status === "pending_verification" && (
                <div className="mt-6 border-t border-accent pt-5">
                  {rejectingId === selected.id ? (
                    <div className="space-y-3">
                      <p className="text-sm font-medium text-foreground">Reason for denying verification:</p>
                      <textarea
                        value={rejectReason}
                        onChange={(e) => setRejectReason(e.target.value)}
                        rows={3}
                        placeholder="Explain why verification is being denied..."
                        className="w-full rounded-lg border border-accent bg-white px-3 py-2 text-sm text-primary focus:border-secondary focus:outline-none focus:ring-1 focus:ring-secondary"
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleReject(selected.id)}
                          disabled={processing}
                          className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-700 disabled:opacity-50"
                        >
                          {processing ? "Processing..." : "Confirm Deny"}
                        </button>
                        <button
                          onClick={() => { setRejectingId(null); setRejectReason(""); }}
                          className="rounded-lg border border-accent bg-white px-4 py-2 text-sm text-foreground transition-colors hover:bg-accent/20"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex gap-3">
                      <button
                        onClick={() => handleApprove(selected.id)}
                        disabled={processing}
                        className="rounded-lg bg-green-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-green-700 disabled:opacity-50"
                      >
                        {processing ? "Processing..." : "Approve & Verify"}
                      </button>
                      <button
                        onClick={() => setRejectingId(selected.id)}
                        className="rounded-lg border border-red-200 bg-red-50 px-5 py-2.5 text-sm font-semibold text-red-600 transition-colors hover:bg-red-100"
                      >
                        Deny Verification
                      </button>
                    </div>
                  )}
                </div>
              )}

              {selected.verification_status === "verified" && (
                <div className="mt-6 border-t border-accent pt-5">
                  <p className="text-sm text-green-600 font-medium">This business is verified and visible on resort pages.</p>
                </div>
              )}

              {selected.verification_status === "accepted" && (
                <div className="mt-6 border-t border-accent pt-5">
                  <p className="text-sm text-blue-600 font-medium">This business is accepted but has not applied for verification yet.</p>
                </div>
              )}

              {selected.verification_status === "rejected" && (
                <div className="mt-6 border-t border-accent pt-5">
                  <p className="text-sm text-red-600 font-medium">This business registration was rejected.</p>
                </div>
              )}

              {(selected.verification_status === "unverified" || selected.verification_status === "pending_review") && (
                <div className="mt-6 border-t border-accent pt-5">
                  <p className="text-sm text-foreground/50">This business has not yet been accepted. Review at Registrations.</p>
                </div>
              )}
            </div>
          ) : (
            <div className="flex h-64 items-center justify-center rounded-xl border border-dashed border-accent bg-white">
              <p className="text-sm text-foreground/40">Select a business to review</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
