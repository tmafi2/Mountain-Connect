"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
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
  bio: string | null;
  work_history: unknown[] | null;
  status: string;
  suspension_reason: string | null;
  suspended_at: string | null;
  created_at: string;
  user_email?: string;
}

interface WorkerApplication {
  id: string;
  job_title: string;
  business_name: string;
  status: string;
  applied_at: string;
}

export default function AdminWorkersPage() {
  const [workers, setWorkers] = useState<WorkerRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "suspended" | "incomplete">("all");
  const [selected, setSelected] = useState<WorkerRow | null>(null);
  const [selectedApps, setSelectedApps] = useState<WorkerApplication[]>([]);
  const [loadingApps, setLoadingApps] = useState(false);
  const [showSuspendDialog, setShowSuspendDialog] = useState(false);
  const [suspendReason, setSuspendReason] = useState("Fake profile");
  const [suspendNotes, setSuspendNotes] = useState("");
  const [suspending, setSuspending] = useState(false);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      // Try with suspension columns first, fall back without them if migration 00022 hasn't been run
      let profiles: Record<string, unknown>[] | null = null;
      let error: { message: string } | null = null;

      const fullResult = await supabase
        .from("worker_profiles")
        .select("id, user_id, first_name, last_name, location_current, country_of_residence, nationality, skills, profile_photo_url, profile_completion_pct, bio, work_history, status, suspension_reason, suspended_at, created_at")
        .order("created_at", { ascending: false });

      if (fullResult.error) {
        // Fallback: query without suspension columns
        console.warn("Falling back to basic worker query:", fullResult.error.message);
        const basicResult = await supabase
          .from("worker_profiles")
          .select("id, user_id, first_name, last_name, location_current, country_of_residence, nationality, skills, profile_photo_url, profile_completion_pct, bio, work_history, created_at")
          .order("created_at", { ascending: false });
        profiles = basicResult.data as Record<string, unknown>[] | null;
        error = basicResult.error;
      } else {
        profiles = fullResult.data as Record<string, unknown>[] | null;
        error = fullResult.error;
      }

      if (error) { console.error("Error loading workers:", error); setLoading(false); return; }

      if (profiles && profiles.length > 0) {
        const userIds = profiles.map((p) => p.user_id as string);
        const { data: users } = await supabase.from("users").select("id, email").in("id", userIds);
        const emailMap: Record<string, string> = {};
        if (users) users.forEach((u) => { emailMap[u.id] = u.email; });

        setWorkers(profiles.map((p) => ({
          id: p.id as string,
          user_id: p.user_id as string,
          first_name: (p.first_name as string) || null,
          last_name: (p.last_name as string) || null,
          location_current: (p.location_current as string) || null,
          country_of_residence: (p.country_of_residence as string) || null,
          nationality: (p.nationality as string) || null,
          skills: (p.skills as string[]) || null,
          profile_photo_url: (p.profile_photo_url as string) || null,
          profile_completion_pct: (p.profile_completion_pct as number) || null,
          bio: (p.bio as string) || null,
          work_history: (p.work_history as unknown[]) || null,
          status: (p.status as string) || "active",
          suspension_reason: (p.suspension_reason as string) || null,
          suspended_at: (p.suspended_at as string) || null,
          created_at: p.created_at as string,
          user_email: emailMap[p.user_id as string] || "",
        })));
      }
      setLoading(false);
    }
    load();
  }, []);

  // Load applications when a worker is selected
  useEffect(() => {
    if (!selected) { setSelectedApps([]); return; }
    setLoadingApps(true);
    (async () => {
      const supabase = createClient();
      const { data } = await supabase
        .from("applications")
        .select("id, status, applied_at, job_posts(title, business_profiles(business_name))")
        .eq("worker_id", selected.id)
        .order("applied_at", { ascending: false });

      if (data) {
        setSelectedApps(data.map((a) => {
          const jp = a.job_posts as unknown as { title: string; business_profiles: { business_name: string } } | null;
          return {
            id: a.id,
            job_title: jp?.title || "Unknown",
            business_name: jp?.business_profiles?.business_name || "Unknown",
            status: a.status as string,
            applied_at: a.applied_at as string,
          };
        }));
      }
      setLoadingApps(false);
    })();
  }, [selected]);

  const filtered = useMemo(() => {
    let results = [...workers];
    if (statusFilter === "active") results = results.filter((w) => w.status !== "suspended" && (w.profile_completion_pct ?? 0) >= 50);
    else if (statusFilter === "suspended") results = results.filter((w) => w.status === "suspended");
    else if (statusFilter === "incomplete") results = results.filter((w) => w.status !== "suspended" && (!w.first_name || !w.last_name || (w.profile_completion_pct ?? 0) < 50));

    if (search.trim()) {
      const q = search.toLowerCase();
      results = results.filter((w) =>
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

  const handleSuspendAction = async (action: "suspend" | "reactivate") => {
    if (!selected) return;
    setSuspending(true);
    try {
      const res = await fetch("/api/admin/suspend-worker", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workerId: selected.id,
          action,
          reason: action === "suspend" ? `${suspendReason}${suspendNotes ? ` — ${suspendNotes}` : ""}` : null,
        }),
      });
      if (res.ok) {
        const now = new Date().toISOString();
        const updatedWorker = {
          ...selected,
          status: action === "suspend" ? "suspended" : "active",
          suspension_reason: action === "suspend" ? `${suspendReason}${suspendNotes ? ` — ${suspendNotes}` : ""}` : null,
          suspended_at: action === "suspend" ? now : null,
        };
        setSelected(updatedWorker);
        setWorkers((prev) => prev.map((w) => w.id === selected.id ? updatedWorker : w));
        setShowSuspendDialog(false);
        setSuspendReason("Fake profile");
        setSuspendNotes("");
      }
    } catch (err) {
      console.error("Suspend action failed:", err);
    }
    setSuspending(false);
  };

  if (loading) {
    return <div className="flex h-64 items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-primary" /></div>;
  }

  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="text-2xl font-bold text-primary">All Workers</h1>
      <p className="mt-1 text-sm text-foreground/60">Browse all registered workers on the platform.</p>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search workers..."
          className="w-64 rounded-lg border border-accent bg-white px-4 py-2.5 text-sm text-primary focus:border-secondary focus:outline-none focus:ring-1 focus:ring-secondary" />
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
          className="rounded-lg border border-accent bg-white px-4 py-2.5 text-sm text-primary focus:border-secondary focus:outline-none">
          <option value="all">All Workers</option>
          <option value="active">Active</option>
          <option value="suspended">Suspended</option>
          <option value="incomplete">Incomplete Profile</option>
        </select>
        <span className="text-sm text-foreground/50">{filtered.length} workers</span>
      </div>

      <div className="mt-6 overflow-hidden rounded-xl border border-accent bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-accent bg-accent/10 text-left text-xs uppercase tracking-wider text-foreground/50">
              <th className="px-5 py-3">Worker</th>
              <th className="px-5 py-3">Location</th>
              <th className="px-5 py-3">Skills</th>
              <th className="px-5 py-3">Nationality</th>
              <th className="px-5 py-3">Status</th>
              <th className="px-5 py-3">Joined</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((worker) => {
              const fullName = [worker.first_name, worker.last_name].filter(Boolean).join(" ") || "No name";
              const initials = fullName !== "No name" ? fullName.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase() : "?";
              return (
                <tr key={worker.id} onClick={() => setSelected(worker)} className={`border-b border-accent/30 cursor-pointer transition-colors hover:bg-accent/5 ${worker.status === "suspended" ? "opacity-60" : ""}`}>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      {worker.profile_photo_url ? (
                        <img src={worker.profile_photo_url} alt="" className="h-8 w-8 shrink-0 rounded-full object-cover" />
                      ) : (
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-secondary/10 text-xs font-bold text-secondary">{initials}</div>
                      )}
                      <div>
                        <p className="font-medium text-primary">{fullName}</p>
                        {worker.user_email && <p className="text-xs text-foreground/40">{worker.user_email}</p>}
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3 text-foreground/70">{worker.location_current || worker.country_of_residence || "—"}</td>
                  <td className="px-5 py-3">
                    <div className="flex flex-wrap gap-1">
                      {worker.skills && worker.skills.length > 0 ? (
                        <>
                          {worker.skills.slice(0, 3).map((skill) => (
                            <span key={skill} className="rounded-full bg-accent/20 px-2 py-0.5 text-[10px] text-foreground/60">{skill}</span>
                          ))}
                          {worker.skills.length > 3 && <span className="text-[10px] text-foreground/40">+{worker.skills.length - 3}</span>}
                        </>
                      ) : <span className="text-xs text-foreground/40">—</span>}
                    </div>
                  </td>
                  <td className="px-5 py-3 text-foreground/70">{worker.nationality || "—"}</td>
                  <td className="px-5 py-3">
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${worker.status === "suspended" ? "bg-red-50 text-red-600" : "bg-green-50 text-green-700"}`}>
                      {worker.status === "suspended" ? "Suspended" : "Active"}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-foreground/50">{new Date(worker.created_at).toLocaleDateString("en-US", { month: "short", year: "numeric" })}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {filtered.length === 0 && <div className="p-8 text-center text-sm text-foreground/40">No workers found.</div>}
      </div>

      {/* ─── Suspend Confirmation Dialog ─── */}
      {showSuspendDialog && selected && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowSuspendDialog(false)} />
          <div className="relative w-full max-w-md rounded-2xl bg-white shadow-2xl p-6">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-red-100">
              <svg className="h-7 w-7 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
              </svg>
            </div>
            <h3 className="mt-4 text-center text-lg font-bold text-primary">Suspend Worker</h3>
            <p className="mt-2 text-center text-sm text-foreground/60">
              Suspending {[selected.first_name, selected.last_name].filter(Boolean).join(" ")} will withdraw all active applications.
            </p>
            <div className="mt-4 space-y-3">
              <div>
                <label className="block text-sm font-medium text-foreground/70 mb-1">Reason</label>
                <select value={suspendReason} onChange={(e) => setSuspendReason(e.target.value)}
                  className="w-full rounded-lg border border-accent bg-white px-3 py-2.5 text-sm text-primary focus:border-secondary focus:outline-none">
                  <option>Fake profile</option>
                  <option>Policy violation</option>
                  <option>Spam</option>
                  <option>Inappropriate content</option>
                  <option>Other</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground/70 mb-1">Notes <span className="text-foreground/40">(optional)</span></label>
                <textarea value={suspendNotes} onChange={(e) => setSuspendNotes(e.target.value)} placeholder="Additional details..."
                  rows={2} className="w-full rounded-lg border border-accent bg-white px-3 py-2.5 text-sm text-primary placeholder:text-foreground/40 focus:border-secondary focus:outline-none resize-none" />
              </div>
            </div>
            <div className="mt-5 flex gap-3">
              <button onClick={() => setShowSuspendDialog(false)} className="flex-1 rounded-xl border border-accent/40 py-2.5 text-sm font-semibold text-foreground/70 hover:bg-accent/10 transition-colors">Cancel</button>
              <button onClick={() => handleSuspendAction("suspend")} disabled={suspending}
                className="flex-1 rounded-xl bg-red-600 py-2.5 text-sm font-semibold text-white hover:bg-red-700 transition-colors disabled:opacity-50">
                {suspending ? "Suspending..." : "Confirm Suspend"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Worker Detail Modal ─── */}
      {selected && (() => {
        const fullName = [selected.first_name, selected.last_name].filter(Boolean).join(" ") || "No name";
        const initials = fullName !== "No name" ? fullName.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase() : "?";
        return (
          <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setSelected(null)} />
            <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white shadow-2xl">
              {/* Header */}
              <div className="relative h-28 rounded-t-2xl overflow-hidden bg-gradient-to-br from-secondary via-secondary/80 to-highlight">
                <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
                <button onClick={() => setSelected(null)} className="absolute top-3 right-3 rounded-full bg-white/90 p-1.5 text-foreground/60 hover:bg-white hover:text-foreground transition-colors">
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="relative px-6 pb-6">
                {/* Avatar + Name */}
                <div className="flex items-end gap-4 -mt-8">
                  {selected.profile_photo_url ? (
                    <img src={selected.profile_photo_url} alt="" className="h-16 w-16 rounded-xl border-4 border-white object-cover shadow-md" />
                  ) : (
                    <div className="flex h-16 w-16 items-center justify-center rounded-xl border-4 border-white bg-secondary/10 text-lg font-bold text-secondary shadow-md">{initials}</div>
                  )}
                  <div className="pb-1">
                    <h2 className="text-xl font-bold text-primary">{fullName}</h2>
                    <p className="text-sm text-foreground/50">{selected.user_email || "No email"}</p>
                  </div>
                </div>

                {/* Info Grid */}
                <div className="mt-6 grid grid-cols-2 gap-4">
                  <InfoItem label="Location" value={selected.location_current || selected.country_of_residence} />
                  <InfoItem label="Nationality" value={selected.nationality} />
                  <InfoItem label="Profile Completion" value={selected.profile_completion_pct != null ? `${selected.profile_completion_pct}%` : null} />
                  <InfoItem label="Joined" value={new Date(selected.created_at).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })} />
                  <InfoItem label="Profile ID" value={selected.id} mono />
                  <InfoItem label="User ID" value={selected.user_id} mono />
                </div>

                {/* Skills */}
                {selected.skills && selected.skills.length > 0 && (
                  <div className="mt-5">
                    <p className="text-xs font-semibold uppercase tracking-wider text-foreground/40 mb-2">Skills</p>
                    <div className="flex flex-wrap gap-1.5">
                      {selected.skills.map((skill) => (
                        <span key={skill} className="rounded-full bg-secondary/10 px-3 py-1 text-xs font-medium text-secondary">{skill}</span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Bio */}
                {selected.bio && (
                  <div className="mt-5">
                    <p className="text-xs font-semibold uppercase tracking-wider text-foreground/40 mb-2">About</p>
                    <p className="text-sm text-foreground/70 leading-relaxed whitespace-pre-wrap">{selected.bio}</p>
                  </div>
                )}

                {/* Work History */}
                {selected.work_history && (selected.work_history as unknown[]).length > 0 && (
                  <div className="mt-5">
                    <p className="text-xs font-semibold uppercase tracking-wider text-foreground/40 mb-2">Work Experience</p>
                    <div className="space-y-2">
                      {(selected.work_history as { role?: string; company?: string; duration?: string }[]).map((wh, i) => (
                        <div key={i} className="rounded-lg bg-accent/10 px-4 py-2.5">
                          <p className="text-sm font-medium text-primary">{wh.role || "Role"}</p>
                          <p className="text-xs text-foreground/50">{[wh.company, wh.duration].filter(Boolean).join(" · ")}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Applications */}
                <div className="mt-5">
                  <p className="text-xs font-semibold uppercase tracking-wider text-foreground/40 mb-2">Applications ({selectedApps.length})</p>
                  {loadingApps ? (
                    <div className="flex justify-center py-4"><div className="h-5 w-5 animate-spin rounded-full border-2 border-accent border-t-secondary" /></div>
                  ) : selectedApps.length === 0 ? (
                    <p className="text-sm text-foreground/40">No applications submitted.</p>
                  ) : (
                    <div className="space-y-1.5">
                      {selectedApps.map((app) => (
                        <div key={app.id} className="flex items-center justify-between rounded-lg bg-accent/10 px-4 py-2.5">
                          <div>
                            <p className="text-sm font-medium text-primary">{app.job_title}</p>
                            <p className="text-xs text-foreground/50">{app.business_name}</p>
                          </div>
                          <div className="text-right">
                            <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium capitalize ${
                              app.status === "accepted" ? "bg-green-50 text-green-700" :
                              app.status === "rejected" ? "bg-red-50 text-red-600" :
                              app.status === "interview" ? "bg-purple-50 text-purple-700" :
                              "bg-gray-50 text-gray-600"
                            }`}>{app.status}</span>
                            <p className="mt-0.5 text-[10px] text-foreground/40">{new Date(app.applied_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Suspension info */}
                {selected.status === "suspended" && (
                  <div className="mt-5 rounded-lg bg-red-50 border border-red-100 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wider text-red-600 mb-1">Suspended</p>
                    <p className="text-sm text-red-700">{selected.suspension_reason || "No reason provided"}</p>
                    {selected.suspended_at && (
                      <p className="mt-1 text-xs text-red-500">Since {new Date(selected.suspended_at).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</p>
                    )}
                  </div>
                )}

                {/* Actions */}
                <div className="mt-5 pt-4 border-t border-accent/30 flex items-center gap-3">
                  <Link href={`/business/workers/${selected.id}`} target="_blank" className="rounded-xl border border-accent/40 px-4 py-2.5 text-sm font-semibold text-foreground/70 hover:bg-accent/10 transition-colors">
                    View Public Profile
                  </Link>
                  {selected.status === "suspended" ? (
                    <button
                      onClick={() => handleSuspendAction("reactivate")}
                      disabled={suspending}
                      className="rounded-xl border border-green-200 bg-green-50 px-4 py-2.5 text-sm font-semibold text-green-600 transition-colors hover:bg-green-100 disabled:opacity-50"
                    >
                      {suspending ? "Reactivating..." : "Reactivate Worker"}
                    </button>
                  ) : (
                    <button
                      onClick={() => setShowSuspendDialog(true)}
                      className="rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-semibold text-red-600 transition-colors hover:bg-red-100"
                    >
                      Suspend Worker
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}

/* ── Info Item ──────────────────────────────────────────────── */
function InfoItem({ label, value, mono }: { label: string; value: string | null | undefined; mono?: boolean }) {
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-wider text-foreground/40">{label}</p>
      <p className={`mt-0.5 text-sm ${mono ? "font-mono text-xs" : ""} ${value ? "text-foreground/70" : "text-foreground/30"}`}>
        {value || "—"}
      </p>
    </div>
  );
}
