"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

interface PendingBusiness {
  id: string;
  user_id: string;
  business_name: string;
  email: string | null;
  description: string | null;
  industries: string[] | null;
  website: string | null;
  location: string | null;
  country: string | null;
  logo_url: string | null;
  verification_status: string;
  resort_name: string | null;
  created_at: string;
}

export default function AdminRegistrationsPage() {
  const [businesses, setBusinesses] = useState<PendingBusiness[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<PendingBusiness | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [modalMessage, setModalMessage] = useState("");
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [filter, setFilter] = useState<"pending" | "all">("pending");

  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const query = supabase
        .from("business_profiles")
        .select("id, user_id, business_name, email, description, industries, website, location, country, logo_url, verification_status, resort_id, created_at")
        .order("created_at", { ascending: false });

      if (filter === "pending") {
        query.in("verification_status", ["pending_review", "unverified"]);
      }

      const { data } = await query;

      if (data) {
        // Get resort names
        const resortIds = [...new Set(data.filter((b) => b.resort_id).map((b) => b.resort_id))];
        let resortMap: Record<string, string> = {};
        if (resortIds.length > 0) {
          const { data: resorts } = await supabase.from("resorts").select("id, name").in("id", resortIds);
          if (resorts) resorts.forEach((r) => { resortMap[r.id] = r.name; });
        }

        setBusinesses(data.map((b) => ({
          ...b,
          resort_name: b.resort_id ? resortMap[b.resort_id] || null : null,
        })));
      }
      setLoading(false);
    })();
  }, [filter, feedback]);

  const handleAction = async (action: "approve" | "reject" | "request_info", message?: string) => {
    if (!selected) return;
    setActionLoading(action);
    try {
      const res = await fetch("/api/admin/confirm-business", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ businessId: selected.id, action, message }),
      });
      if (res.ok) {
        const label = action === "approve" ? "approved" : action === "reject" ? "rejected" : "info requested";
        setFeedback({ type: "success", message: `${selected.business_name} ${label} successfully.` });
        setSelected(null);
        setShowRejectModal(false);
        setShowInfoModal(false);
        setModalMessage("");
      } else {
        setFeedback({ type: "error", message: "Action failed. Please try again." });
      }
    } catch {
      setFeedback({ type: "error", message: "Network error. Please try again." });
    }
    setActionLoading(null);
    setTimeout(() => setFeedback(null), 4000);
  };

  const statusBadge = (status: string) => {
    switch (status) {
      case "pending_review": return <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-700">Pending</span>;
      case "verified": return <span className="rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-semibold text-green-700">Verified</span>;
      case "rejected": return <span className="rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-semibold text-red-700">Rejected</span>;
      default: return <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-semibold text-gray-600">Unverified</span>;
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-secondary" />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-primary">Business Registrations</h1>
          <p className="mt-1 text-sm text-foreground/60">Review and approve new business accounts.</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setFilter("pending")}
            className={`rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${filter === "pending" ? "bg-primary text-white" : "bg-accent/20 text-foreground/60 hover:bg-accent/40"}`}
          >
            Pending ({businesses.filter((b) => b.verification_status === "pending_review" || b.verification_status === "unverified").length})
          </button>
          <button
            onClick={() => setFilter("all")}
            className={`rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${filter === "all" ? "bg-primary text-white" : "bg-accent/20 text-foreground/60 hover:bg-accent/40"}`}
          >
            All
          </button>
        </div>
      </div>

      {feedback && (
        <div className={`mb-4 rounded-xl px-4 py-3 text-sm font-medium ${
          feedback.type === "success" ? "bg-green-50 text-green-700 border border-green-200" : "bg-red-50 text-red-700 border border-red-200"
        }`}>
          {feedback.message}
        </div>
      )}

      {businesses.length === 0 ? (
        <div className="rounded-xl border border-accent/50 bg-white p-12 text-center">
          <p className="text-foreground/50">{filter === "pending" ? "No pending registrations." : "No businesses found."}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {businesses.map((biz) => (
            <div
              key={biz.id}
              onClick={() => setSelected(selected?.id === biz.id ? null : biz)}
              className={`cursor-pointer rounded-xl border bg-white p-5 transition-all hover:shadow-md ${
                selected?.id === biz.id ? "border-secondary ring-2 ring-secondary/20" : "border-accent/50"
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {biz.logo_url ? (
                    <img src={biz.logo_url} alt="" className="h-10 w-10 rounded-lg border border-accent/30 object-cover" />
                  ) : (
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-sm font-bold text-primary/60">
                      {biz.business_name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase()}
                    </div>
                  )}
                  <div>
                    <p className="font-semibold text-primary">{biz.business_name}</p>
                    <p className="text-xs text-foreground/50">
                      {biz.email || "No email"} &middot; {biz.resort_name || "No resort"} &middot; Registered {new Date(biz.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                {statusBadge(biz.verification_status)}
              </div>

              {/* Expanded detail */}
              {selected?.id === biz.id && (
                <div className="mt-4 border-t border-accent/30 pt-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div><span className="font-medium text-foreground/40">Location:</span> <span className="text-foreground">{[biz.location, biz.country].filter(Boolean).join(", ") || "—"}</span></div>
                    <div><span className="font-medium text-foreground/40">Resort:</span> <span className="text-foreground">{biz.resort_name || "—"}</span></div>
                    <div><span className="font-medium text-foreground/40">Website:</span> {biz.website ? <a href={biz.website} target="_blank" rel="noopener noreferrer" className="text-secondary hover:underline">{biz.website}</a> : <span className="text-foreground/40">—</span>}</div>
                    <div><span className="font-medium text-foreground/40">Industries:</span> <span className="text-foreground">{biz.industries?.join(", ") || "—"}</span></div>
                  </div>
                  {biz.description && (
                    <div className="mt-3">
                      <span className="text-sm font-medium text-foreground/40">Description:</span>
                      <p className="mt-1 text-sm text-foreground/70 line-clamp-3">{biz.description}</p>
                    </div>
                  )}

                  {/* Action buttons */}
                  <div className="mt-4 flex flex-wrap gap-2">
                    {biz.verification_status !== "verified" && (
                      <button
                        onClick={(e) => { e.stopPropagation(); handleAction("approve"); }}
                        disabled={!!actionLoading}
                        className="rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700 transition-colors disabled:opacity-50"
                      >
                        {actionLoading === "approve" ? "Approving..." : "✓ Approve"}
                      </button>
                    )}
                    <button
                      onClick={(e) => { e.stopPropagation(); setShowRejectModal(true); }}
                      disabled={!!actionLoading}
                      className="rounded-lg border border-red-200 px-4 py-2 text-sm font-semibold text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
                    >
                      ✗ Reject
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); setShowInfoModal(true); }}
                      disabled={!!actionLoading}
                      className="rounded-lg border border-accent/50 px-4 py-2 text-sm font-semibold text-primary hover:bg-accent/20 transition-colors disabled:opacity-50"
                    >
                      ? Request Info
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Reject Modal */}
      {showRejectModal && selected && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center">
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={() => setShowRejectModal(false)} />
          <div className="relative z-10 w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-primary">Reject {selected.business_name}</h3>
            <p className="mt-1 text-sm text-foreground/60">Provide a reason (sent to the business).</p>
            <textarea
              value={modalMessage}
              onChange={(e) => setModalMessage(e.target.value)}
              placeholder="Reason for rejection..."
              rows={3}
              className="mt-3 w-full rounded-lg border border-accent/40 bg-white px-4 py-3 text-sm focus:border-secondary focus:outline-none resize-none"
            />
            <div className="mt-4 flex gap-3">
              <button onClick={() => setShowRejectModal(false)} className="flex-1 rounded-lg border border-accent/50 py-2.5 text-sm font-semibold text-foreground/60 hover:bg-accent/20">Cancel</button>
              <button
                onClick={() => handleAction("reject", modalMessage)}
                disabled={!!actionLoading}
                className="flex-1 rounded-lg bg-red-600 py-2.5 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50"
              >
                {actionLoading === "reject" ? "Rejecting..." : "Reject"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Request Info Modal */}
      {showInfoModal && selected && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center">
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={() => setShowInfoModal(false)} />
          <div className="relative z-10 w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-primary">Request Info from {selected.business_name}</h3>
            <p className="mt-1 text-sm text-foreground/60">What additional information do you need?</p>
            <textarea
              value={modalMessage}
              onChange={(e) => setModalMessage(e.target.value)}
              placeholder="e.g. Please provide your ABN/business registration number..."
              rows={3}
              className="mt-3 w-full rounded-lg border border-accent/40 bg-white px-4 py-3 text-sm focus:border-secondary focus:outline-none resize-none"
            />
            <div className="mt-4 flex gap-3">
              <button onClick={() => setShowInfoModal(false)} className="flex-1 rounded-lg border border-accent/50 py-2.5 text-sm font-semibold text-foreground/60 hover:bg-accent/20">Cancel</button>
              <button
                onClick={() => handleAction("request_info", modalMessage)}
                disabled={!!actionLoading || !modalMessage.trim()}
                className="flex-1 rounded-lg bg-primary py-2.5 text-sm font-semibold text-white hover:bg-primary/90 disabled:opacity-50"
              >
                {actionLoading === "request_info" ? "Sending..." : "Send Request"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
