"use client";

import { useState, useEffect, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";

interface JobRow {
  id: string;
  title: string;
  position_type: string;
  status: string;
  pay_amount: string | null;
  pay_currency: string | null;
  positions_available: number;
  created_at: string;
  business_name?: string;
}

export default function AdminJobsPage() {
  const [jobs, setJobs] = useState<JobRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "closed">("all");

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("job_posts")
        .select("id, title, position_type, status, pay_amount, pay_currency, positions_available, created_at, business_id")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error loading jobs:", error);
        setLoading(false);
        return;
      }

      if (data && data.length > 0) {
        // Get business names
        const bizIds = [...new Set(data.map((j) => j.business_id))];
        const { data: bizData } = await supabase
          .from("business_profiles")
          .select("id, business_name")
          .in("id", bizIds);

        const bizMap: Record<string, string> = {};
        if (bizData) {
          bizData.forEach((b) => { bizMap[b.id] = b.business_name; });
        }

        setJobs(data.map((j) => ({
          ...j,
          business_name: bizMap[j.business_id] || "Unknown",
        })));
      } else {
        setJobs([]);
      }
      setLoading(false);
    }
    load();
  }, []);

  const filtered = useMemo(() => {
    let results = [...jobs];
    if (statusFilter === "active") {
      results = results.filter((j) => j.status === "active");
    } else if (statusFilter === "closed") {
      results = results.filter((j) => j.status !== "active");
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      results = results.filter(
        (j) =>
          j.title.toLowerCase().includes(q) ||
          (j.business_name && j.business_name.toLowerCase().includes(q))
      );
    }
    return results;
  }, [jobs, search, statusFilter]);

  const activeCount = jobs.filter((j) => j.status === "active").length;

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-primary" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="text-2xl font-bold text-primary">All Jobs</h1>
      <p className="mt-1 text-sm text-foreground/60">
        {jobs.length} total jobs — {activeCount} active
      </p>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search jobs..."
          className="w-64 rounded-lg border border-accent bg-white px-4 py-2.5 text-sm text-primary focus:border-secondary focus:outline-none focus:ring-1 focus:ring-secondary"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as "all" | "active" | "closed")}
          className="rounded-lg border border-accent bg-white px-4 py-2.5 text-sm text-primary focus:border-secondary focus:outline-none"
        >
          <option value="all">All Statuses</option>
          <option value="active">Active</option>
          <option value="closed">Closed / Paused</option>
        </select>
        <span className="text-sm text-foreground/50">{filtered.length} jobs</span>
      </div>

      <div className="mt-6 overflow-hidden rounded-xl border border-accent bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-accent bg-accent/10 text-left text-xs uppercase tracking-wider text-foreground/50">
              <th className="px-5 py-3">Job Title</th>
              <th className="px-5 py-3">Business</th>
              <th className="px-5 py-3">Type</th>
              <th className="px-5 py-3">Pay</th>
              <th className="px-5 py-3">Status</th>
              <th className="px-5 py-3 text-right">Posted</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((job) => (
              <tr key={job.id} className="border-b border-accent/30 transition-colors hover:bg-accent/5">
                <td className="px-5 py-3 font-medium text-primary">{job.title}</td>
                <td className="px-5 py-3 text-foreground/70">{job.business_name}</td>
                <td className="px-5 py-3 text-foreground/70 capitalize">{job.position_type?.replace("_", " ") || "—"}</td>
                <td className="px-5 py-3 text-foreground/70">
                  {job.pay_amount ? `${job.pay_currency || "AUD"} $${job.pay_amount}` : "—"}
                </td>
                <td className="px-5 py-3">
                  <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium capitalize ${
                    job.status === "active" ? "bg-green-50 text-green-700" : "bg-gray-50 text-gray-600"
                  }`}>
                    {job.status}
                  </span>
                </td>
                <td className="px-5 py-3 text-right text-foreground/50">
                  {new Date(job.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="p-8 text-center text-sm text-foreground/40">No jobs found.</div>
        )}
      </div>
    </div>
  );
}
