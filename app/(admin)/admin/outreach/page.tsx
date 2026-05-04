"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { OUTREACH_SEQUENCE } from "@/lib/outreach/sequence";

/* ─── Types ──────────────────────────────────────────────── */

type LeadStatus = "active" | "signed_up" | "unsubscribed";

interface Lead {
  id: string;
  email: string;
  business_name: string;
  status: LeadStatus;
  notes: string | null;
  signed_up_at: string | null;
  unsubscribed_at: string | null;
  created_at: string;
  resorts: { id: string; name: string } | null;
  nearby_towns: { id: string; name: string } | null;
  last_sent_at: string | null;
  last_sent_template: string | null;
  send_count: number;
}

interface ResortOption {
  id: string;
  name: string;
}
interface TownOption {
  id: string;
  name: string;
}

const STATUS_STYLES: Record<LeadStatus, { bg: string; text: string; label: string }> = {
  active: { bg: "bg-blue-50", text: "text-blue-700", label: "Active" },
  signed_up: { bg: "bg-green-50", text: "text-green-700", label: "Signed up" },
  unsubscribed: { bg: "bg-gray-100", text: "text-gray-600", label: "Unsubscribed" },
};

function timeAgo(iso: string | null): string {
  if (!iso) return "—";
  const ms = Date.now() - new Date(iso).getTime();
  const days = Math.floor(ms / (24 * 60 * 60 * 1000));
  if (days === 0) return "today";
  if (days === 1) return "1 day ago";
  if (days < 30) return `${days} days ago`;
  const months = Math.floor(days / 30);
  return months === 1 ? "1 month ago" : `${months} months ago`;
}

/* ─── Page ───────────────────────────────────────────────── */

export default function AdminOutreachPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [resorts, setResorts] = useState<ResortOption[]>([]);
  const [towns, setTowns] = useState<TownOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | LeadStatus>("all");
  const [locationFilter, setLocationFilter] = useState<string>(""); // resort/town id
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  // Add-lead form state
  const [showForm, setShowForm] = useState(false);
  const [formEmail, setFormEmail] = useState("");
  const [formName, setFormName] = useState("");
  const [formLocation, setFormLocation] = useState(""); // "resort:<id>" or "town:<id>"
  const [formNotes, setFormNotes] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [formSubmitting, setFormSubmitting] = useState(false);

  /* ─── Initial load ─────────────────────────────────────── */

  useEffect(() => {
    void load();
    void loadLocations();
  }, []);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/outreach/leads", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load");
      setLeads(data.leads || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    }
    setLoading(false);
  }

  async function loadLocations() {
    const supabase = createClient();
    const [{ data: r }, { data: t }] = await Promise.all([
      supabase.from("resorts").select("id, name").order("name"),
      supabase.from("nearby_towns").select("id, name").order("name"),
    ]);
    setResorts((r || []) as ResortOption[]);
    setTowns((t || []) as TownOption[]);
  }

  /* ─── Add lead ────────────────────────────────────────── */

  async function submitAdd(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    setFormSubmitting(true);
    try {
      const [kind, id] = formLocation.split(":");
      const body = {
        email: formEmail,
        businessName: formName,
        resortId: kind === "resort" ? id : null,
        townId: kind === "town" ? id : null,
        notes: formNotes || null,
      };
      const res = await fetch("/api/admin/outreach/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create");
      setFormEmail("");
      setFormName("");
      setFormLocation("");
      setFormNotes("");
      setShowForm(false);
      await load();
    } catch (e) {
      setFormError(e instanceof Error ? e.message : "Failed to create");
    }
    setFormSubmitting(false);
  }

  /* ─── Send template ───────────────────────────────────── */

  async function sendTemplate(leadId: string, template: string) {
    if (!confirm(`Send "${template}" to this lead?`)) return;
    setBusyId(leadId);
    try {
      const res = await fetch(`/api/admin/outreach/leads/${leadId}/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ template }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to send");
      await load();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed to send");
    }
    setBusyId(null);
  }

  /* ─── Status update / delete ─────────────────────────── */

  async function setStatus(leadId: string, status: LeadStatus) {
    setBusyId(leadId);
    try {
      const res = await fetch(`/api/admin/outreach/leads/${leadId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      await load();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed");
    }
    setBusyId(null);
  }

  async function removeLead(leadId: string) {
    if (!confirm("Permanently delete this lead and all its send history? Usually you should mark it unsubscribed instead.")) return;
    setBusyId(leadId);
    try {
      const res = await fetch(`/api/admin/outreach/leads/${leadId}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed");
      }
      await load();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed");
    }
    setBusyId(null);
  }

  /* ─── Filtered view ───────────────────────────────────── */

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return leads.filter((l) => {
      if (statusFilter !== "all" && l.status !== statusFilter) return false;
      if (locationFilter) {
        const [kind, id] = locationFilter.split(":");
        if (kind === "resort" && l.resorts?.id !== id) return false;
        if (kind === "town" && l.nearby_towns?.id !== id) return false;
      }
      if (q) {
        const hay = `${l.business_name} ${l.email} ${l.resorts?.name ?? ""} ${l.nearby_towns?.name ?? ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [leads, search, statusFilter, locationFilter]);

  const counts = useMemo(() => {
    const c = { active: 0, signed_up: 0, unsubscribed: 0 };
    for (const l of leads) c[l.status]++;
    return c;
  }, [leads]);

  /* ─── Render ─────────────────────────────────────────── */

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-primary sm:text-3xl">Outreach</h1>
          <p className="mt-1 text-sm text-foreground/60">
            Email campaigns to businesses you've collected leads for. Auto-stops when they sign up.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            disabled
            className="cursor-not-allowed rounded-xl border border-accent bg-white px-4 py-2 text-sm font-medium text-foreground/40"
            title="Coming soon"
          >
            Bulk import (CSV)
          </button>
          <button
            type="button"
            onClick={() => setShowForm((v) => !v)}
            className="rounded-xl bg-secondary px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-secondary-light"
          >
            {showForm ? "Cancel" : "+ Add lead"}
          </button>
        </div>
      </div>

      {/* Counts */}
      <div className="mt-6 grid grid-cols-3 gap-3 sm:max-w-md">
        <CountTile label="Active" value={counts.active} tone="blue" />
        <CountTile label="Signed up" value={counts.signed_up} tone="green" />
        <CountTile label="Unsubscribed" value={counts.unsubscribed} tone="gray" />
      </div>

      {/* Add-lead form */}
      {showForm && (
        <form
          onSubmit={submitAdd}
          className="mt-6 rounded-2xl border border-accent bg-white p-5 shadow-sm"
        >
          <h2 className="text-base font-semibold text-primary">Add a new lead</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Field label="Business name" required>
              <input
                type="text"
                required
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="e.g. Smiggins Hotel"
                className="input"
              />
            </Field>
            <Field label="Email" required>
              <input
                type="email"
                required
                value={formEmail}
                onChange={(e) => setFormEmail(e.target.value)}
                placeholder="contact@business.com"
                className="input"
              />
            </Field>
            <Field label="Location (resort or town)">
              <select
                value={formLocation}
                onChange={(e) => setFormLocation(e.target.value)}
                className="input"
              >
                <option value="">— None —</option>
                {resorts.length > 0 && (
                  <optgroup label="Resorts">
                    {resorts.map((r) => (
                      <option key={r.id} value={`resort:${r.id}`}>{r.name}</option>
                    ))}
                  </optgroup>
                )}
                {towns.length > 0 && (
                  <optgroup label="Towns">
                    {towns.map((t) => (
                      <option key={t.id} value={`town:${t.id}`}>{t.name}</option>
                    ))}
                  </optgroup>
                )}
              </select>
            </Field>
            <Field label="Notes (admin only)">
              <input
                type="text"
                value={formNotes}
                onChange={(e) => setFormNotes(e.target.value)}
                placeholder="Source, contact, anything useful"
                className="input"
              />
            </Field>
          </div>
          {formError && (
            <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">{formError}</p>
          )}
          <div className="mt-4 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowForm(false)}
              disabled={formSubmitting}
              className="rounded-xl border border-accent bg-white px-4 py-2 text-sm font-medium text-foreground/60 hover:bg-accent/10"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={formSubmitting}
              className="rounded-xl bg-primary px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary/90 disabled:opacity-50"
            >
              {formSubmitting ? "Adding…" : "Add lead"}
            </button>
          </div>
        </form>
      )}

      {/* Filters */}
      <div className="mt-6 flex flex-wrap items-center gap-3">
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search business, email, location…"
          className="input min-w-[16rem] flex-1"
        />
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as "all" | LeadStatus)} className="input w-auto">
          <option value="all">All statuses</option>
          <option value="active">Active</option>
          <option value="signed_up">Signed up</option>
          <option value="unsubscribed">Unsubscribed</option>
        </select>
        <select value={locationFilter} onChange={(e) => setLocationFilter(e.target.value)} className="input w-auto">
          <option value="">All locations</option>
          {resorts.length > 0 && (
            <optgroup label="Resorts">
              {resorts.map((r) => (
                <option key={r.id} value={`resort:${r.id}`}>{r.name}</option>
              ))}
            </optgroup>
          )}
          {towns.length > 0 && (
            <optgroup label="Towns">
              {towns.map((t) => (
                <option key={t.id} value={`town:${t.id}`}>{t.name}</option>
              ))}
            </optgroup>
          )}
        </select>
      </div>

      {/* Sequence preview — keeps the admin oriented to what's configured */}
      <div className="mt-4 rounded-xl border border-accent/50 bg-accent/5 px-4 py-3 text-xs text-foreground/60">
        <span className="font-semibold text-primary">Sequence:</span>{" "}
        {OUTREACH_SEQUENCE.map((s, i) => (
          <span key={s.template}>
            {i > 0 && <span className="mx-1.5 text-foreground/30">→</span>}
            <span title={`${s.label} (${s.delayDaysAfterPrevious}d delay)`}>
              {s.template}
              {s.delayDaysAfterPrevious > 0 && (
                <span className="ml-1 text-foreground/40">+{s.delayDaysAfterPrevious}d</span>
              )}
            </span>
          </span>
        ))}
      </div>

      {/* Error banner */}
      {error && (
        <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* List */}
      <div className="mt-6 overflow-hidden rounded-2xl border border-accent bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-accent bg-accent/10 text-left text-xs uppercase tracking-wider text-foreground/50">
              <tr>
                <th className="px-4 py-3 font-medium">Business</th>
                <th className="px-4 py-3 font-medium">Email</th>
                <th className="px-4 py-3 font-medium">Location</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Last sent</th>
                <th className="px-4 py-3 font-medium">Sends</th>
                <th className="px-4 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-accent/40">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-foreground/40">
                    Loading…
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-foreground/40">
                    {leads.length === 0 ? "No leads yet — click \"Add lead\" to get started." : "No leads match your filters."}
                  </td>
                </tr>
              ) : (
                filtered.map((lead) => {
                  const status = STATUS_STYLES[lead.status];
                  const location = lead.nearby_towns?.name || lead.resorts?.name || "—";
                  const isBusy = busyId === lead.id;
                  return (
                    <tr key={lead.id} className="hover:bg-accent/5">
                      <td className="px-4 py-3">
                        <div className="font-medium text-primary">{lead.business_name}</div>
                        {lead.notes && (
                          <div className="mt-0.5 text-xs text-foreground/50 line-clamp-1" title={lead.notes}>
                            {lead.notes}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-foreground/70">{lead.email}</td>
                      <td className="px-4 py-3 text-foreground/70">{location}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${status.bg} ${status.text}`}>
                          {status.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-foreground/60">
                        <div>{timeAgo(lead.last_sent_at)}</div>
                        {lead.last_sent_template && (
                          <div className="text-xs text-foreground/40">{lead.last_sent_template}</div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-foreground/60">{lead.send_count}</td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-1.5">
                          {lead.status === "active" && (
                            <>
                              <SendDropdown
                                disabled={isBusy}
                                onSend={(t) => sendTemplate(lead.id, t)}
                              />
                              <button
                                type="button"
                                disabled={isBusy}
                                onClick={() => setStatus(lead.id, "unsubscribed")}
                                className="rounded-lg border border-accent bg-white px-2.5 py-1.5 text-xs font-medium text-foreground/60 hover:bg-accent/10"
                                title="Mark as unsubscribed"
                              >
                                Unsub
                              </button>
                            </>
                          )}
                          {lead.status !== "active" && (
                            <button
                              type="button"
                              disabled={isBusy}
                              onClick={() => setStatus(lead.id, "active")}
                              className="rounded-lg border border-accent bg-white px-2.5 py-1.5 text-xs font-medium text-foreground/60 hover:bg-accent/10"
                            >
                              Reactivate
                            </button>
                          )}
                          <button
                            type="button"
                            disabled={isBusy}
                            onClick={() => removeLead(lead.id)}
                            className="rounded-lg border border-red-200 bg-white px-2.5 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Local styles — kept inline so the page is self-contained */}
      <style jsx>{`
        :global(.input) {
          width: 100%;
          border-radius: 0.5rem;
          border: 1px solid var(--accent, #c8d5e0);
          background: white;
          padding: 0.5rem 0.75rem;
          font-size: 0.875rem;
          color: var(--primary, #0a1e33);
        }
        :global(.input:focus) {
          outline: none;
          border-color: #3b9ede;
          box-shadow: 0 0 0 2px rgba(59, 158, 222, 0.2);
        }
      `}</style>
    </div>
  );
}

/* ─── Helpers ────────────────────────────────────────────── */

function CountTile({ label, value, tone }: { label: string; value: number; tone: "blue" | "green" | "gray" }) {
  const tones: Record<string, string> = {
    blue: "border-blue-200 bg-blue-50 text-blue-900",
    green: "border-green-200 bg-green-50 text-green-900",
    gray: "border-gray-200 bg-gray-50 text-gray-700",
  };
  return (
    <div className={`rounded-xl border px-4 py-3 ${tones[tone]}`}>
      <p className="text-xs font-semibold uppercase tracking-wider opacity-70">{label}</p>
      <p className="mt-0.5 text-xl font-bold">{value}</p>
    </div>
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-xs font-semibold uppercase tracking-wider text-foreground/50">
        {label} {required && <span className="text-red-500">*</span>}
      </span>
      <div className="mt-1">{children}</div>
    </label>
  );
}

function SendDropdown({
  disabled,
  onSend,
}: {
  disabled: boolean;
  onSend: (template: string) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((v) => !v)}
        className="rounded-lg bg-secondary px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-secondary-light disabled:opacity-50"
      >
        Send →
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 z-20 mt-1 w-56 rounded-xl border border-accent bg-white py-1 shadow-lg">
            {OUTREACH_SEQUENCE.map((s) => (
              <button
                key={s.template}
                type="button"
                onClick={() => {
                  setOpen(false);
                  onSend(s.template);
                }}
                className="block w-full px-3 py-2 text-left text-xs hover:bg-accent/10"
                title={s.label}
              >
                <div className="font-medium text-primary">{s.template}</div>
                <div className="text-[10px] text-foreground/50">{s.label}</div>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
