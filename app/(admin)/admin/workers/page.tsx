"use client";

import { useState, useMemo } from "react";

/* ─── Demo worker data ──────────────────────────────────── */

interface DemoWorker {
  id: string;
  name: string;
  email: string;
  location: string;
  skills: string[];
  applications: number;
  joined: string;
  status: "active" | "suspended" | "flagged";
}

const demoWorkers: DemoWorker[] = [
  { id: "w1", name: "Emma Johansson", email: "emma.j@example.com", location: "Stockholm, Sweden", skills: ["Ski Instruction", "First Aid", "Swedish", "English"], applications: 4, joined: "2025-09-15", status: "active" },
  { id: "w2", name: "Sophie Chen", email: "sophie.c@example.com", location: "Melbourne, Australia", skills: ["Bartending", "Hospitality", "Barista"], applications: 3, joined: "2025-10-01", status: "active" },
  { id: "w3", name: "Jake Thompson", email: "jake.t@example.com", location: "Queenstown, NZ", skills: ["Lift Operations", "Snow Grooming", "Driving"], applications: 2, joined: "2025-08-20", status: "active" },
  { id: "w4", name: "Marie Dubois", email: "marie.d@example.com", location: "Chamonix, France", skills: ["Ski Instruction", "French", "English", "Children"], applications: 5, joined: "2025-07-10", status: "active" },
  { id: "w5", name: "Liam O'Brien", email: "liam.o@example.com", location: "Dublin, Ireland", skills: ["Hospitality", "F&B", "Management"], applications: 6, joined: "2025-06-01", status: "active" },
  { id: "w6", name: "Yuki Tanaka", email: "yuki.t@example.com", location: "Tokyo, Japan", skills: ["Snowboard Instruction", "Japanese", "English"], applications: 2, joined: "2025-11-01", status: "active" },
  { id: "w7", name: "Carlos Mendez", email: "carlos.m@example.com", location: "Santiago, Chile", skills: ["Ski Patrol", "EMT", "Spanish", "English"], applications: 3, joined: "2025-09-05", status: "flagged" },
  { id: "w8", name: "Anna Petrov", email: "anna.p@example.com", location: "Moscow, Russia", skills: ["Retail", "Customer Service", "Russian", "English"], applications: 1, joined: "2025-12-01", status: "active" },
];

const STATUS_STYLES: Record<string, { bg: string; text: string }> = {
  active: { bg: "bg-green-50", text: "text-green-700" },
  suspended: { bg: "bg-red-50", text: "text-red-600" },
  flagged: { bg: "bg-yellow-50", text: "text-yellow-700" },
};

/* ─── Page ──────────────────────────────────────────────── */

export default function AdminWorkersPage() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "flagged" | "suspended">("all");

  const filtered = useMemo(() => {
    let results = [...demoWorkers];

    if (statusFilter !== "all") {
      results = results.filter((w) => w.status === statusFilter);
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      results = results.filter(
        (w) =>
          w.name.toLowerCase().includes(q) ||
          w.email.toLowerCase().includes(q) ||
          w.location.toLowerCase().includes(q) ||
          w.skills.some((s) => s.toLowerCase().includes(q))
      );
    }

    return results;
  }, [search, statusFilter]);

  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="text-2xl font-bold text-primary">All Workers</h1>
      <p className="mt-1 text-sm text-foreground/60">
        Browse and manage all registered workers on the platform.
      </p>

      {/* Filters */}
      <div className="mt-6 flex flex-wrap items-center gap-3">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search workers..."
          className="w-64 rounded-lg border border-accent bg-white px-4 py-2.5 text-sm text-primary focus:border-secondary focus:outline-none focus:ring-1 focus:ring-secondary"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as any)}
          className="rounded-lg border border-accent bg-white px-4 py-2.5 text-sm text-primary focus:border-secondary focus:outline-none"
        >
          <option value="all">All Statuses</option>
          <option value="active">Active</option>
          <option value="flagged">Flagged</option>
          <option value="suspended">Suspended</option>
        </select>
        <span className="text-sm text-foreground/50">{filtered.length} workers</span>
      </div>

      {/* Table */}
      <div className="mt-6 overflow-hidden rounded-xl border border-accent bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-accent bg-accent/10 text-left text-xs uppercase tracking-wider text-foreground/50">
              <th className="px-5 py-3">Worker</th>
              <th className="px-5 py-3">Location</th>
              <th className="px-5 py-3">Skills</th>
              <th className="px-5 py-3">Applications</th>
              <th className="px-5 py-3">Status</th>
              <th className="px-5 py-3">Joined</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((worker) => {
              const style = STATUS_STYLES[worker.status];
              return (
                <tr key={worker.id} className="border-b border-accent/30 transition-colors hover:bg-accent/5">
                  <td className="px-5 py-3">
                    <div>
                      <p className="font-medium text-primary">{worker.name}</p>
                      <p className="text-xs text-foreground/40">{worker.email}</p>
                    </div>
                  </td>
                  <td className="px-5 py-3 text-foreground/70">{worker.location}</td>
                  <td className="px-5 py-3">
                    <div className="flex flex-wrap gap-1">
                      {worker.skills.slice(0, 3).map((skill) => (
                        <span key={skill} className="rounded-full bg-accent/20 px-2 py-0.5 text-[10px] text-foreground/60">
                          {skill}
                        </span>
                      ))}
                      {worker.skills.length > 3 && (
                        <span className="text-[10px] text-foreground/40">+{worker.skills.length - 3}</span>
                      )}
                    </div>
                  </td>
                  <td className="px-5 py-3 text-center font-medium text-primary">{worker.applications}</td>
                  <td className="px-5 py-3">
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium capitalize ${style.bg} ${style.text}`}>
                      {worker.status}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-foreground/50">
                    {new Date(worker.joined).toLocaleDateString("en-US", { month: "short", year: "numeric" })}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="p-8 text-center text-sm text-foreground/40">No workers found.</div>
        )}
      </div>
    </div>
  );
}
