"use client";

import { useState, useEffect, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";

interface WorkerRow {
  id: string;
  user_id: string;
  first_name: string | null;
  last_name: string | null;
  location_current: string | null;
  country_of_residence: string | null;
  nationality: string | null;
  skills: string[] | null;
  profile_photo_url: string | null;
  profile_completion_pct: number | null;
  is_suspended: boolean;
  created_at: string;
  user_email?: string;
}

export default function AdminWorkersPage() {
  const [workers, setWorkers] = useState<WorkerRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "suspended" | "incomplete">("all");

  useEffect(() => {
    async function load() {
      const supabase = createClient();

      // Get worker profiles
      const { data: profiles, error } = await supabase
        .from("worker_profiles")
        .select("id, user_id, first_name, last_name, location_current, country_of_residence, nationality, skills, profile_photo_url, profile_completion_pct, created_at")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error loading workers:", error);
        setLoading(false);
        return;
      }

      // Get user emails for each worker
      if (profiles && profiles.length > 0) {
        const userIds = profiles.map((p) => p.user_id);
        const { data: users } = await supabase
          .from("users")
          .select("id, email")
          .in("id", userIds);

        const emailMap: Record<string, string> = {};
        if (users) {
          users.forEach((u) => { emailMap[u.id] = u.email; });
        }

        const enriched = profiles.map((p) => ({
          ...p,
          is_suspended: false, // No suspended column yet — default to false
          user_email: emailMap[p.user_id] || "",
        }));

        setWorkers(enriched as WorkerRow[]);
      } else {
        setWorkers([]);
      }

      setLoading(false);
    }
    load();
  }, []);

  const filtered = useMemo(() => {
    let results = [...workers];

    // Status filter
    if (statusFilter === "active") {
      results = results.filter((w) => !w.is_suspended && (w.profile_completion_pct ?? 0) >= 50);
    } else if (statusFilter === "suspended") {
      results = results.filter((w) => w.is_suspended);
    } else if (statusFilter === "incomplete") {
      results = results.filter((w) => !w.first_name || !w.last_name || (w.profile_completion_pct ?? 0) < 50);
    }

    // Search filter
    if (search.trim()) {
      const q = search.toLowerCase();
      results = results.filter(
        (w) =>
          (w.first_name && w.first_name.toLowerCase().includes(q)) ||
          (w.last_name && w.last_name.toLowerCase().includes(q)) ||
          (w.user_email && w.user_email.toLowerCase().includes(q)) ||
          (w.location_current && w.location_current.toLowerCase().includes(q)) ||
          (w.nationality && w.nationality.toLowerCase().includes(q)) ||
          (w.skills && w.skills.some((s) => s.toLowerCase().includes(q)))
      );
    }
    return results;
  }, [workers, search, statusFilter]);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-primary" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="text-2xl font-bold text-primary">All Workers</h1>
      <p className="mt-1 text-sm text-foreground/60">
        Browse all registered workers on the platform.
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
          onChange={(e) => setStatusFilter(e.target.value as "all" | "active" | "suspended" | "incomplete")}
          className="rounded-lg border border-accent bg-white px-4 py-2.5 text-sm text-primary focus:border-secondary focus:outline-none"
        >
          <option value="all">All Workers</option>
          <option value="active">Active</option>
          <option value="suspended">Suspended</option>
          <option value="incomplete">Incomplete Profile</option>
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
              <th className="px-5 py-3">Nationality</th>
              <th className="px-5 py-3">Joined</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((worker) => {
              const fullName = [worker.first_name, worker.last_name].filter(Boolean).join(" ") || "No name";
              const initials = fullName !== "No name"
                ? fullName.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase()
                : "?";
              return (
                <tr key={worker.id} className="border-b border-accent/30 transition-colors hover:bg-accent/5">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      {worker.profile_photo_url ? (
                        <img src={worker.profile_photo_url} alt="" className="h-8 w-8 shrink-0 rounded-full object-cover" />
                      ) : (
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-secondary/10 text-xs font-bold text-secondary">
                          {initials}
                        </div>
                      )}
                      <div>
                        <p className="font-medium text-primary">{fullName}</p>
                        {worker.user_email && <p className="text-xs text-foreground/40">{worker.user_email}</p>}
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3 text-foreground/70">
                    {worker.location_current || worker.country_of_residence || "—"}
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex flex-wrap gap-1">
                      {worker.skills && worker.skills.length > 0 ? (
                        <>
                          {worker.skills.slice(0, 3).map((skill) => (
                            <span key={skill} className="rounded-full bg-accent/20 px-2 py-0.5 text-[10px] text-foreground/60">
                              {skill}
                            </span>
                          ))}
                          {worker.skills.length > 3 && (
                            <span className="text-[10px] text-foreground/40">+{worker.skills.length - 3}</span>
                          )}
                        </>
                      ) : (
                        <span className="text-xs text-foreground/40">—</span>
                      )}
                    </div>
                  </td>
                  <td className="px-5 py-3 text-foreground/70">{worker.nationality || "—"}</td>
                  <td className="px-5 py-3 text-foreground/50">
                    {new Date(worker.created_at).toLocaleDateString("en-US", { month: "short", year: "numeric" })}
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
