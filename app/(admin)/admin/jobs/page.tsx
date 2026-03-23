"use client";

import { useState, useMemo } from "react";
import { seedJobs } from "@/lib/data/jobs";

export default function AdminJobsPage() {
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState<"all" | "active" | "closed">("all");

  const filtered = useMemo(() => {
    let results = [...seedJobs];

    if (activeFilter === "active") {
      results = results.filter((j) => j.is_active);
    } else if (activeFilter === "closed") {
      results = results.filter((j) => !j.is_active);
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      results = results.filter(
        (j) =>
          j.title.toLowerCase().includes(q) ||
          j.business_name.toLowerCase().includes(q) ||
          j.resort_name.toLowerCase().includes(q) ||
          j.description.toLowerCase().includes(q)
      );
    }

    return results;
  }, [search, activeFilter]);

  const activeCount = seedJobs.filter((j) => j.is_active).length;
  const closedCount = seedJobs.filter((j) => !j.is_active).length;

  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="text-2xl font-bold text-primary">All Jobs</h1>
      <p className="mt-1 text-sm text-foreground/60">
        Browse and manage all job listings on the platform.
      </p>

      {/* Filters */}
      <div className="mt-6 flex flex-wrap items-center gap-3">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search jobs..."
          className="w-64 rounded-lg border border-accent bg-white px-4 py-2.5 text-sm text-primary focus:border-secondary focus:outline-none focus:ring-1 focus:ring-secondary"
        />
        <select
          value={activeFilter}
          onChange={(e) => setActiveFilter(e.target.value as any)}
          className="rounded-lg border border-accent bg-white px-4 py-2.5 text-sm text-primary focus:border-secondary focus:outline-none"
        >
          <option value="all">All ({seedJobs.length})</option>
          <option value="active">Active ({activeCount})</option>
          <option value="closed">Closed ({closedCount})</option>
        </select>
        <span className="text-sm text-foreground/50">{filtered.length} jobs</span>
      </div>

      {/* Table */}
      <div className="mt-6 overflow-hidden rounded-xl border border-accent bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-accent bg-accent/10 text-left text-xs uppercase tracking-wider text-foreground/50">
              <th className="px-5 py-3">Job Title</th>
              <th className="px-5 py-3">Business</th>
              <th className="px-5 py-3">Resort</th>
              <th className="px-5 py-3">Pay</th>
              <th className="px-5 py-3">Applicants</th>
              <th className="px-5 py-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((job) => (
              <tr key={job.id} className="border-b border-accent/30 transition-colors hover:bg-accent/5">
                <td className="px-5 py-3">
                  <div>
                    <p className="font-medium text-primary">{job.title}</p>
                    <p className="text-xs text-foreground/40">
                      {job.position_type === "full_time" ? "Full-time" : job.position_type === "part_time" ? "Part-time" : "Casual"}
                    </p>
                  </div>
                </td>
                <td className="px-5 py-3 text-foreground/70">{job.business_name}</td>
                <td className="px-5 py-3 text-foreground/70">{job.resort_name}</td>
                <td className="px-5 py-3 font-medium text-primary">{job.pay_amount}</td>
                <td className="px-5 py-3 text-center text-foreground/70">{job.applications_count}</td>
                <td className="px-5 py-3">
                  {job.is_active ? (
                    <span className="inline-flex rounded-full bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700">Active</span>
                  ) : (
                    <span className="inline-flex rounded-full bg-gray-50 px-2 py-0.5 text-xs font-medium text-gray-500">Closed</span>
                  )}
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
