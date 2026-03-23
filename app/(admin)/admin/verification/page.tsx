"use client";

import { useState, useMemo } from "react";
import { seedBusinesses, getCategoryLabel } from "@/lib/data/businesses";
import type { BusinessVerificationStatus } from "@/types/database";

/* ─── Types ──────────────────────────────────────────────── */

interface VerificationBusiness {
  id: string;
  business_name: string;
  slug: string;
  category: string | null;
  location: string | null;
  description: string | null;
  website: string | null;
  email: string | null;
  phone: string | null;
  year_established: number | null;
  verification_status: BusinessVerificationStatus;
  resort_ids: string[];
  submitted_at: string;
}

/* ─── Demo data ──────────────────────────────────────────── */

const verificationQueue: VerificationBusiness[] = seedBusinesses.map((b) => ({
  id: b.id,
  business_name: b.business_name,
  slug: b.slug || "",
  category: b.category,
  location: b.location,
  description: b.description || "",
  website: b.website,
  email: b.email,
  phone: b.phone,
  year_established: b.year_established,
  verification_status: b.verification_status,
  resort_ids: b.resort_ids,
  submitted_at: b.created_at,
}));

const STATUS_STYLES: Record<BusinessVerificationStatus, { bg: string; text: string; label: string }> = {
  unverified: { bg: "bg-gray-50", text: "text-gray-600", label: "Unverified" },
  pending_review: { bg: "bg-yellow-50", text: "text-yellow-700", label: "Pending Review" },
  verified: { bg: "bg-green-50", text: "text-green-700", label: "Verified" },
  rejected: { bg: "bg-red-50", text: "text-red-600", label: "Rejected" },
};

/* ─── Page ──────────────────────────────────────────────── */

export default function AdminVerificationPage() {
  const [filter, setFilter] = useState<"pending" | "all">("pending");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [statuses, setStatuses] = useState<Record<string, BusinessVerificationStatus>>(() => {
    const initial: Record<string, BusinessVerificationStatus> = {};
    verificationQueue.forEach((b) => {
      initial[b.id] = b.verification_status;
    });
    return initial;
  });
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [actionLog, setActionLog] = useState<{ id: string; action: string; target: string; time: string }[]>([
    { id: "log-1", action: "Verified", target: "Whistler Blackcomb Ski & Snowboard School", time: "3 days ago" },
    { id: "log-2", action: "Verified", target: "Fairmont Chateau Whistler", time: "5 days ago" },
  ]);

  const filtered = useMemo(() => {
    if (filter === "pending") {
      return verificationQueue.filter((b) => statuses[b.id] === "pending_review");
    }
    return verificationQueue;
  }, [filter, statuses]);

  const pendingCount = Object.values(statuses).filter((s) => s === "pending_review").length;
  const verifiedCount = Object.values(statuses).filter((s) => s === "verified").length;

  const selected = selectedId ? verificationQueue.find((b) => b.id === selectedId) : null;

  const handleApprove = (id: string) => {
    const biz = verificationQueue.find((b) => b.id === id);
    setStatuses((prev) => ({ ...prev, [id]: "verified" }));
    setActionLog((prev) => [
      { id: `log-${Date.now()}`, action: "Verified", target: biz?.business_name || "", time: "Just now" },
      ...prev,
    ]);
    setSelectedId(null);
  };

  const handleReject = (id: string) => {
    const biz = verificationQueue.find((b) => b.id === id);
    setStatuses((prev) => ({ ...prev, [id]: "rejected" }));
    setActionLog((prev) => [
      { id: `log-${Date.now()}`, action: `Rejected — ${rejectReason || "No reason given"}`, target: biz?.business_name || "", time: "Just now" },
      ...prev,
    ]);
    setRejectingId(null);
    setRejectReason("");
    setSelectedId(null);
  };

  const FILTERS = [
    { value: "pending" as const, label: `Pending (${pendingCount})` },
    { value: "all" as const, label: "All Submissions" },
  ];

  return (
    <div className="mx-auto max-w-6xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-primary">Business Verification</h1>
          <p className="mt-1 text-sm text-foreground/60">
            Review and approve business verification requests.
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
        {FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              filter === f.value
                ? "bg-primary text-white"
                : "bg-white text-foreground/60 border border-accent hover:bg-accent/20"
            }`}
          >
            {f.label}
          </button>
        ))}
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
              <p className="mt-3 text-sm font-medium text-foreground/50">All caught up!</p>
              <p className="mt-1 text-xs text-foreground/40">No pending verification requests.</p>
            </div>
          ) : (
            filtered.map((biz) => {
              const status = statuses[biz.id];
              const style = STATUS_STYLES[status];
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
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-xs font-bold text-primary">
                        {biz.business_name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <h3 className="font-semibold text-primary">{biz.business_name}</h3>
                        <p className="mt-0.5 text-xs text-foreground/50">
                          {getCategoryLabel(biz.category as any)} · {biz.location}
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
                <div>
                  <h2 className="text-xl font-bold text-primary">{selected.business_name}</h2>
                  <p className="mt-1 text-sm text-foreground/60">
                    {getCategoryLabel(selected.category as any)} · {selected.location}
                  </p>
                </div>
                <span className={`rounded-full px-3 py-1 text-xs font-medium ${STATUS_STYLES[statuses[selected.id]].bg} ${STATUS_STYLES[statuses[selected.id]].text}`}>
                  {STATUS_STYLES[statuses[selected.id]].label}
                </span>
              </div>

              {/* Detail fields */}
              <div className="mt-6 space-y-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-foreground/40">Description</p>
                  <p className="mt-1 text-sm leading-relaxed text-foreground/80">{selected.description || "—"}</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-foreground/40">Website</p>
                    <p className="mt-1 text-sm text-primary">{selected.website || "—"}</p>
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
                  <p className="text-xs font-semibold uppercase tracking-wider text-foreground/40">Resorts</p>
                  <p className="mt-1 text-sm text-foreground/80">
                    {selected.resort_ids.length > 0 ? selected.resort_ids.join(", ") : "None specified"}
                  </p>
                </div>
              </div>

              {/* Action buttons */}
              {statuses[selected.id] === "pending_review" && (
                <div className="mt-6 border-t border-accent pt-5">
                  {rejectingId === selected.id ? (
                    <div className="space-y-3">
                      <p className="text-sm font-medium text-foreground">Reason for rejection:</p>
                      <textarea
                        value={rejectReason}
                        onChange={(e) => setRejectReason(e.target.value)}
                        rows={3}
                        placeholder="Explain why this business is being rejected..."
                        className="w-full rounded-lg border border-accent bg-white px-3 py-2 text-sm text-primary focus:border-secondary focus:outline-none focus:ring-1 focus:ring-secondary"
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleReject(selected.id)}
                          className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-700"
                        >
                          Confirm Reject
                        </button>
                        <button
                          onClick={() => {
                            setRejectingId(null);
                            setRejectReason("");
                          }}
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
                        className="rounded-lg bg-green-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-green-700"
                      >
                        Approve & Verify
                      </button>
                      <button
                        onClick={() => setRejectingId(selected.id)}
                        className="rounded-lg border border-red-200 bg-red-50 px-5 py-2.5 text-sm font-semibold text-red-600 transition-colors hover:bg-red-100"
                      >
                        Reject
                      </button>
                    </div>
                  )}
                </div>
              )}

              {statuses[selected.id] === "verified" && (
                <div className="mt-6 border-t border-accent pt-5">
                  <p className="text-sm text-green-600 font-medium">This business is verified and visible on resort pages.</p>
                </div>
              )}

              {statuses[selected.id] === "rejected" && (
                <div className="mt-6 border-t border-accent pt-5">
                  <p className="text-sm text-red-600 font-medium">This business has been rejected.</p>
                  <button
                    onClick={() => handleApprove(selected.id)}
                    className="mt-3 rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-green-700"
                  >
                    Override — Approve & Verify
                  </button>
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

      {/* Action log */}
      <div className="mt-8 rounded-xl border border-accent bg-white p-6">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-foreground/50">Recent Actions</h2>
        <div className="mt-4">
          {actionLog.length === 0 ? (
            <p className="text-sm text-foreground/40">No actions yet.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-accent text-left text-xs uppercase tracking-wider text-foreground/40">
                  <th className="pb-2">Action</th>
                  <th className="pb-2">Business</th>
                  <th className="pb-2 text-right">When</th>
                </tr>
              </thead>
              <tbody>
                {actionLog.map((log) => (
                  <tr key={log.id} className="border-b border-accent/30">
                    <td className="py-2.5 text-foreground/70">{log.action}</td>
                    <td className="py-2.5 font-medium text-primary">{log.target}</td>
                    <td className="py-2.5 text-right text-foreground/40">{log.time}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
