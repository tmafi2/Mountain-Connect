"use client";

import { useState, useEffect } from "react";
import type { SupportReport, SupportReportCategory, SupportReportStatus } from "@/types/database";

const CATEGORY_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  bug: { bg: "bg-red-50", text: "text-red-700", label: "Bug" },
  feature_request: { bg: "bg-purple-50", text: "text-purple-700", label: "Feature" },
  content_issue: { bg: "bg-orange-50", text: "text-orange-700", label: "Content" },
  account_issue: { bg: "bg-blue-50", text: "text-blue-700", label: "Account" },
  other: { bg: "bg-gray-50", text: "text-gray-700", label: "Other" },
};

const STATUS_STYLES: Record<string, { bg: string; text: string }> = {
  open: { bg: "bg-red-50", text: "text-red-600" },
  resolved: { bg: "bg-green-50", text: "text-green-700" },
  dismissed: { bg: "bg-gray-50", text: "text-gray-500" },
};

export default function AdminReportedClient() {
  const [reports, setReports] = useState<SupportReport[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [filter, setFilter] = useState<"open" | "all">("open");
  const [loading, setLoading] = useState(true);
  const [adminNote, setAdminNote] = useState("");
  const [updating, setUpdating] = useState(false);

  const fetchReports = async (status: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/reports?status=${status}`);
      if (res.ok) {
        const data = await res.json();
        setReports(data.reports || []);
      }
    } catch (err) {
      console.error("Failed to fetch reports:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports(filter);
  }, [filter]);

  const selected = selectedId ? reports.find((r) => r.id === selectedId) : null;
  const openCount = reports.filter((r) => r.status === "open").length;

  const updateStatus = async (id: string, status: SupportReportStatus) => {
    setUpdating(true);
    try {
      const res = await fetch(`/api/admin/reports/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, admin_note: adminNote || undefined }),
      });
      if (res.ok) {
        setReports((prev) =>
          prev.map((r) => (r.id === id ? { ...r, status, admin_note: adminNote || r.admin_note } : r))
        );
        setSelectedId(null);
        setAdminNote("");
      }
    } catch (err) {
      console.error("Failed to update report:", err);
    } finally {
      setUpdating(false);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-AU", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="mx-auto max-w-6xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-primary">Support Reports</h1>
          <p className="mt-1 text-sm text-foreground/60">
            Review user feedback, bug reports, and support requests.
          </p>
        </div>
        <span className="rounded-full bg-red-50 px-3 py-1 text-sm font-medium text-red-600">
          {filter === "open" ? reports.length : openCount} open
        </span>
      </div>

      {/* Filter tabs */}
      <div className="mt-6 flex gap-2">
        <button
          onClick={() => { setFilter("open"); setSelectedId(null); }}
          className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
            filter === "open"
              ? "bg-primary text-white"
              : "bg-white text-foreground/60 border border-accent hover:bg-accent/20"
          }`}
        >
          Open
        </button>
        <button
          onClick={() => { setFilter("all"); setSelectedId(null); }}
          className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
            filter === "all"
              ? "bg-primary text-white"
              : "bg-white text-foreground/60 border border-accent hover:bg-accent/20"
          }`}
        >
          All Reports
        </button>
      </div>

      {/* Split panel */}
      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-5">
        {/* Reports list */}
        <div className="space-y-2 lg:col-span-2">
          {loading ? (
            <div className="flex h-32 items-center justify-center rounded-xl border border-accent bg-white">
              <p className="text-sm text-foreground/40">Loading...</p>
            </div>
          ) : reports.length === 0 ? (
            <div className="rounded-xl border border-accent bg-white p-8 text-center">
              <svg className="mx-auto h-10 w-10 text-green-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="mt-3 text-sm font-medium text-foreground/50">No reports found</p>
            </div>
          ) : (
            reports.map((report) => {
              const catStyle = CATEGORY_STYLES[report.category] || CATEGORY_STYLES.other;
              const statusStyle = STATUS_STYLES[report.status];
              return (
                <button
                  key={report.id}
                  onClick={() => { setSelectedId(report.id); setAdminNote(report.admin_note || ""); }}
                  className={`w-full rounded-xl border bg-white p-4 text-left transition-all hover:shadow-sm ${
                    selectedId === report.id
                      ? "border-primary shadow-sm"
                      : "border-accent hover:border-secondary/50"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${catStyle.bg} ${catStyle.text}`}>
                          {catStyle.label}
                        </span>
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium capitalize ${statusStyle.bg} ${statusStyle.text}`}>
                          {report.status}
                        </span>
                      </div>
                      <h3 className="mt-1.5 font-semibold text-primary">{report.subject}</h3>
                      <p className="mt-0.5 text-xs text-foreground/50">{report.user_name}</p>
                    </div>
                  </div>
                  <p className="mt-2 text-xs text-foreground/40">
                    {formatDate(report.created_at)} &bull; {report.user_email}
                  </p>
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
                  <div className="flex items-center gap-2">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${CATEGORY_STYLES[selected.category]?.bg || "bg-gray-50"} ${CATEGORY_STYLES[selected.category]?.text || "text-gray-700"}`}>
                      {CATEGORY_STYLES[selected.category]?.label || selected.category}
                    </span>
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${STATUS_STYLES[selected.status].bg} ${STATUS_STYLES[selected.status].text}`}>
                      {selected.status}
                    </span>
                  </div>
                  <h2 className="mt-2 text-xl font-bold text-primary">{selected.subject}</h2>
                </div>
              </div>

              <div className="mt-5 space-y-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-foreground/40">Message</p>
                  <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-foreground/80">{selected.message}</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-foreground/40">Submitted By</p>
                    <p className="mt-1 text-sm text-foreground/80">{selected.user_name}</p>
                    <p className="text-xs text-foreground/50">{selected.user_email}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-foreground/40">Submitted On</p>
                    <p className="mt-1 text-sm text-foreground/80">{formatDate(selected.created_at)}</p>
                  </div>
                </div>
                {selected.page_url && (
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-foreground/40">Page URL</p>
                    <p className="mt-1 truncate text-sm text-secondary">{selected.page_url}</p>
                  </div>
                )}
                {selected.user_agent && (
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-foreground/40">Browser</p>
                    <p className="mt-1 truncate text-xs text-foreground/50">{selected.user_agent}</p>
                  </div>
                )}
              </div>

              {/* Admin actions */}
              {selected.status === "open" && (
                <div className="mt-6 space-y-4 border-t border-accent pt-5">
                  <div>
                    <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-foreground/40">
                      Admin Note (optional)
                    </label>
                    <textarea
                      value={adminNote}
                      onChange={(e) => setAdminNote(e.target.value)}
                      placeholder="Internal note about resolution..."
                      rows={2}
                      className="w-full resize-none rounded-lg border border-accent px-3 py-2 text-sm placeholder:text-foreground/30 focus:border-secondary focus:outline-none"
                    />
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={() => updateStatus(selected.id, "resolved")}
                      disabled={updating}
                      className="rounded-lg bg-green-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-green-700 disabled:opacity-50"
                    >
                      {updating ? "Updating..." : "Mark Resolved"}
                    </button>
                    <button
                      onClick={() => updateStatus(selected.id, "dismissed")}
                      disabled={updating}
                      className="rounded-lg border border-accent bg-white px-5 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-accent/20 disabled:opacity-50"
                    >
                      Dismiss
                    </button>
                  </div>
                </div>
              )}

              {selected.status !== "open" && (
                <div className="mt-6 border-t border-accent pt-5">
                  <p className={`text-sm font-medium ${STATUS_STYLES[selected.status].text}`}>
                    This report has been {selected.status}.
                  </p>
                  {selected.admin_note && (
                    <p className="mt-2 text-sm text-foreground/60">
                      <span className="font-medium">Note:</span> {selected.admin_note}
                    </p>
                  )}
                  {selected.resolved_at && (
                    <p className="mt-1 text-xs text-foreground/40">
                      {formatDate(selected.resolved_at)}
                    </p>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="flex h-64 items-center justify-center rounded-xl border border-dashed border-accent bg-white">
              <p className="text-sm text-foreground/40">Select a report to review</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
