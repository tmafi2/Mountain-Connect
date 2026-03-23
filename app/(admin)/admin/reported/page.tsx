"use client";

import { useState } from "react";

/* ─── Demo reported items ──────────────────────────────── */

interface ReportedItem {
  id: string;
  type: "job" | "worker" | "business";
  target_name: string;
  reason: string;
  reported_by: string;
  reported_at: string;
  status: "open" | "resolved" | "dismissed";
  details: string;
}

const initialReports: ReportedItem[] = [
  {
    id: "rpt-1",
    type: "job",
    target_name: "Suspicious Job Listing — Earn $500/day!",
    reason: "Suspected scam",
    reported_by: "emma.j@example.com",
    reported_at: "2026-03-22",
    status: "open",
    details: "This job posting promises unrealistic pay and asks applicants to pay a 'registration fee' upfront. Multiple users have flagged this listing.",
  },
  {
    id: "rpt-2",
    type: "worker",
    target_name: "John D.",
    reason: "Fake profile",
    reported_by: "careers@fairmont.com",
    reported_at: "2026-03-21",
    status: "open",
    details: "This worker profile appears to have fabricated credentials and work history. The listed certifications cannot be verified.",
  },
  {
    id: "rpt-3",
    type: "business",
    target_name: "Quick Cash Resort Services",
    reason: "Fraudulent business",
    reported_by: "jake.t@example.com",
    reported_at: "2026-03-18",
    status: "resolved",
    details: "Business was collecting personal information without posting legitimate jobs. Account has been suspended.",
  },
];

const TYPE_STYLES: Record<string, { bg: string; text: string }> = {
  job: { bg: "bg-purple-50", text: "text-purple-700" },
  worker: { bg: "bg-blue-50", text: "text-blue-700" },
  business: { bg: "bg-orange-50", text: "text-orange-700" },
};

const STATUS_STYLES: Record<string, { bg: string; text: string }> = {
  open: { bg: "bg-red-50", text: "text-red-600" },
  resolved: { bg: "bg-green-50", text: "text-green-700" },
  dismissed: { bg: "bg-gray-50", text: "text-gray-500" },
};

/* ─── Page ──────────────────────────────────────────────── */

export default function AdminReportedPage() {
  const [reports, setReports] = useState(initialReports);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [filter, setFilter] = useState<"open" | "all">("open");

  const filtered = filter === "open"
    ? reports.filter((r) => r.status === "open")
    : reports;

  const selected = selectedId ? reports.find((r) => r.id === selectedId) : null;
  const openCount = reports.filter((r) => r.status === "open").length;

  const updateStatus = (id: string, status: "resolved" | "dismissed") => {
    setReports((prev) =>
      prev.map((r) => (r.id === id ? { ...r, status } : r))
    );
    setSelectedId(null);
  };

  return (
    <div className="mx-auto max-w-6xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-primary">Reported Content</h1>
          <p className="mt-1 text-sm text-foreground/60">
            Review flagged content and take action.
          </p>
        </div>
        <span className="rounded-full bg-red-50 px-3 py-1 text-sm font-medium text-red-600">
          {openCount} open
        </span>
      </div>

      {/* Filter tabs */}
      <div className="mt-6 flex gap-2">
        <button
          onClick={() => setFilter("open")}
          className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
            filter === "open"
              ? "bg-primary text-white"
              : "bg-white text-foreground/60 border border-accent hover:bg-accent/20"
          }`}
        >
          Open ({openCount})
        </button>
        <button
          onClick={() => setFilter("all")}
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
          {filtered.length === 0 ? (
            <div className="rounded-xl border border-accent bg-white p-8 text-center">
              <svg className="mx-auto h-10 w-10 text-green-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="mt-3 text-sm font-medium text-foreground/50">No open reports!</p>
            </div>
          ) : (
            filtered.map((report) => {
              const typeStyle = TYPE_STYLES[report.type];
              const statusStyle = STATUS_STYLES[report.status];
              return (
                <button
                  key={report.id}
                  onClick={() => setSelectedId(report.id)}
                  className={`w-full rounded-xl border bg-white p-4 text-left transition-all hover:shadow-sm ${
                    selectedId === report.id
                      ? "border-primary shadow-sm"
                      : "border-accent hover:border-secondary/50"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium capitalize ${typeStyle.bg} ${typeStyle.text}`}>
                          {report.type}
                        </span>
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium capitalize ${statusStyle.bg} ${statusStyle.text}`}>
                          {report.status}
                        </span>
                      </div>
                      <h3 className="mt-1.5 font-semibold text-primary">{report.target_name}</h3>
                      <p className="mt-0.5 text-xs text-foreground/50">{report.reason}</p>
                    </div>
                  </div>
                  <p className="mt-2 text-xs text-foreground/40">
                    Reported {report.reported_at} by {report.reported_by}
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
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${TYPE_STYLES[selected.type].bg} ${TYPE_STYLES[selected.type].text}`}>
                      {selected.type}
                    </span>
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${STATUS_STYLES[selected.status].bg} ${STATUS_STYLES[selected.status].text}`}>
                      {selected.status}
                    </span>
                  </div>
                  <h2 className="mt-2 text-xl font-bold text-primary">{selected.target_name}</h2>
                </div>
              </div>

              <div className="mt-5 space-y-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-foreground/40">Reason</p>
                  <p className="mt-1 text-sm text-foreground/80">{selected.reason}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-foreground/40">Details</p>
                  <p className="mt-1 text-sm leading-relaxed text-foreground/80">{selected.details}</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-foreground/40">Reported By</p>
                    <p className="mt-1 text-sm text-foreground/80">{selected.reported_by}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-foreground/40">Reported On</p>
                    <p className="mt-1 text-sm text-foreground/80">{selected.reported_at}</p>
                  </div>
                </div>
              </div>

              {/* Actions */}
              {selected.status === "open" && (
                <div className="mt-6 flex gap-3 border-t border-accent pt-5">
                  <button
                    onClick={() => updateStatus(selected.id, "resolved")}
                    className="rounded-lg bg-green-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-green-700"
                  >
                    Mark Resolved
                  </button>
                  <button
                    onClick={() => updateStatus(selected.id, "dismissed")}
                    className="rounded-lg border border-accent bg-white px-5 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-accent/20"
                  >
                    Dismiss
                  </button>
                </div>
              )}

              {selected.status !== "open" && (
                <div className="mt-6 border-t border-accent pt-5">
                  <p className={`text-sm font-medium ${STATUS_STYLES[selected.status].text}`}>
                    This report has been {selected.status}.
                  </p>
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
