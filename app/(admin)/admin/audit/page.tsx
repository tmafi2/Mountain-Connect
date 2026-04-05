"use client";

import { useState, useEffect } from "react";

interface AuditLog {
  id: string;
  admin_id: string;
  action: string;
  target_type: string;
  target_id: string;
  details: Record<string, unknown> | null;
  ip_address: string | null;
  created_at: string;
  users?: { full_name: string; email: string } | null;
}

const ACTION_LABELS: Record<string, { label: string; color: string }> = {
  business_approved: { label: "Business Approved", color: "bg-green-50 text-green-700" },
  business_rejected: { label: "Business Rejected", color: "bg-red-50 text-red-600" },
  business_info_requested: { label: "Info Requested", color: "bg-yellow-50 text-yellow-700" },
  worker_suspended: { label: "Worker Suspended", color: "bg-red-50 text-red-600" },
  worker_reactivated: { label: "Worker Reactivated", color: "bg-green-50 text-green-700" },
  job_featured: { label: "Job Featured", color: "bg-purple-50 text-purple-700" },
  job_unfeatured: { label: "Job Unfeatured", color: "bg-gray-50 text-gray-600" },
  business_tier_changed: { label: "Tier Changed", color: "bg-blue-50 text-blue-700" },
  report_resolved: { label: "Report Resolved", color: "bg-green-50 text-green-700" },
  report_dismissed: { label: "Report Dismissed", color: "bg-gray-50 text-gray-600" },
  blog_created: { label: "Blog Created", color: "bg-blue-50 text-blue-700" },
  blog_updated: { label: "Blog Updated", color: "bg-blue-50 text-blue-700" },
  blog_deleted: { label: "Blog Deleted", color: "bg-red-50 text-red-600" },
};

export default function AuditLogPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    fetch("/api/admin/audit")
      .then((res) => res.json())
      .then((data) => {
        setLogs(data.logs || []);
        setTotal(data.total || 0);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString("en-AU", {
      year: "numeric", month: "short", day: "numeric",
      hour: "2-digit", minute: "2-digit",
    });

  return (
    <div className="mx-auto max-w-5xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-primary">Audit Log</h1>
          <p className="mt-1 text-sm text-foreground/60">
            Record of all admin actions on the platform.
          </p>
        </div>
        <span className="rounded-full bg-accent/50 px-3 py-1 text-sm font-medium text-foreground/60">
          {total} entries
        </span>
      </div>

      <div className="mt-6 rounded-xl border border-accent bg-white overflow-hidden">
        {loading ? (
          <div className="flex h-32 items-center justify-center">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-accent border-t-primary" />
          </div>
        ) : logs.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-sm text-foreground/40">No audit log entries yet.</p>
            <p className="mt-1 text-xs text-foreground/30">Admin actions will appear here.</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-accent bg-accent/10">
                <th className="px-4 py-3 text-left font-semibold text-foreground/60">Action</th>
                <th className="px-4 py-3 text-left font-semibold text-foreground/60">Target</th>
                <th className="px-4 py-3 text-left font-semibold text-foreground/60">Admin</th>
                <th className="px-4 py-3 text-left font-semibold text-foreground/60">Details</th>
                <th className="px-4 py-3 text-left font-semibold text-foreground/60">Date</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => {
                const actionStyle = ACTION_LABELS[log.action] || { label: log.action, color: "bg-gray-50 text-gray-600" };
                return (
                  <tr key={log.id} className="border-b border-accent/50 hover:bg-accent/5">
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${actionStyle.color}`}>
                        {actionStyle.label}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs text-foreground/50 capitalize">{log.target_type}</span>
                      <p className="truncate text-xs font-mono text-foreground/40 max-w-[120px]">{log.target_id.slice(0, 8)}...</p>
                    </td>
                    <td className="px-4 py-3 text-foreground/70">
                      {log.users?.full_name || log.users?.email || log.admin_id.slice(0, 8)}
                    </td>
                    <td className="px-4 py-3">
                      {log.details && (
                        <span className="text-xs text-foreground/50 truncate block max-w-[200px]">
                          {Object.entries(log.details).filter(([, v]) => v).map(([k, v]) => `${k}: ${v}`).join(", ")}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-foreground/40 whitespace-nowrap">
                      {formatDate(log.created_at)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
