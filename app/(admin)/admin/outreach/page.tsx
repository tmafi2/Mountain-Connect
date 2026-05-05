"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { OUTREACH_SEQUENCE, STANDALONE_TEMPLATES } from "@/lib/outreach/sequence";

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

  // Bulk import modal state
  const [showImport, setShowImport] = useState(false);

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
    // sales-dropin lets the admin optionally personalise the greeting
    // with the name of the person they spoke to in person. Skip the
    // prompt for other templates that don't use this field.
    let contactPersonName: string | undefined;
    if (template === "sales-dropin") {
      const input = prompt(
        "Optional: name of the person you spoke to (leave blank to greet the team generically)",
        ""
      );
      if (input === null) return; // cancelled
      contactPersonName = input.trim() || undefined;
    } else {
      if (!confirm(`Send "${template}" to this lead?`)) return;
    }
    setBusyId(leadId);
    try {
      const res = await fetch(`/api/admin/outreach/leads/${leadId}/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ template, contactPersonName }),
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
      {showImport && (
        <BulkImportModal
          onClose={() => setShowImport(false)}
          onImported={() => {
            setShowImport(false);
            void load();
          }}
        />
      )}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-primary sm:text-3xl">Outreach</h1>
          <p className="mt-1 text-sm text-foreground/60">
            Email campaigns to businesses you've collected leads for. Auto-stops when they sign up.
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/admin/outreach/campaign"
            className="rounded-xl border border-accent bg-white px-4 py-2 text-sm font-medium text-foreground/70 transition-colors hover:border-secondary/50 hover:bg-secondary/5"
          >
            Campaign overview →
          </Link>
          <button
            type="button"
            onClick={() => setShowImport(true)}
            className="rounded-xl border border-accent bg-white px-4 py-2 text-sm font-medium text-foreground/70 transition-colors hover:border-secondary/50 hover:bg-secondary/5"
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
                                leadName={lead.business_name}
                                leadEmail={lead.email}
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
  leadName,
  leadEmail,
}: {
  disabled: boolean;
  onSend: (template: string) => void;
  leadName: string;
  leadEmail: string;
}) {
  const [open, setOpen] = useState(false);

  // Lock background scroll while the modal is open and close on Escape.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function pick(template: string) {
    setOpen(false);
    onSend(template);
  }

  return (
    <>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen(true)}
        className="rounded-lg bg-secondary px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-secondary-light disabled:opacity-50"
      >
        Send →
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-primary/40 px-4 py-6 backdrop-blur-sm"
          onClick={(e) => {
            // Click on the backdrop closes; clicks on the modal itself stop
            // bubbling so they don't dismiss.
            if (e.target === e.currentTarget) setOpen(false);
          }}
        >
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-accent bg-white shadow-xl">
            {/* Header */}
            <div className="border-b border-accent/40 px-6 py-5">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-foreground/40">
                Send email
              </p>
              <h3 className="mt-1 text-lg font-bold text-primary">{leadName}</h3>
              <p className="text-xs text-foreground/50">{leadEmail}</p>
            </div>

            {/* Funnel sequence options */}
            {OUTREACH_SEQUENCE.length > 0 && (
              <div className="px-6 py-4">
                <div className="flex items-center gap-2">
                  <span className="h-4 w-1 rounded-full bg-secondary" aria-hidden />
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-primary">
                    Funnel sequence
                  </h4>
                </div>
                <p className="ml-3 mt-1 text-xs text-foreground/50">
                  Sends this template now and starts the lead in the auto-drip.
                </p>
                <div className="mt-3 space-y-2">
                  {OUTREACH_SEQUENCE.map((s) => (
                    <TemplateCard
                      key={s.template}
                      title={s.template}
                      subtitle={s.label}
                      onClick={() => pick(s.template)}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Standalone options */}
            {STANDALONE_TEMPLATES.length > 0 && (
              <div className="border-t border-accent/40 bg-accent/5 px-6 py-4">
                <div className="flex items-center gap-2">
                  <span className="h-4 w-1 rounded-full bg-amber-400" aria-hidden />
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-primary">
                    Ad-hoc (manual only)
                  </h4>
                </div>
                <p className="ml-3 mt-1 text-xs text-foreground/50">
                  One-off send. Drip cron will not auto-progress from these.
                </p>
                <div className="mt-3 space-y-2">
                  {STANDALONE_TEMPLATES.map((s) => (
                    <TemplateCard
                      key={s.template}
                      title={s.template}
                      subtitle={s.description}
                      onClick={() => pick(s.template)}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Footer */}
            <div className="flex justify-end gap-2 border-t border-accent/40 px-6 py-4">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-lg border border-accent bg-white px-4 py-2 text-sm font-medium text-foreground/60 hover:bg-accent/10"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function TemplateCard({
  title,
  subtitle,
  onClick,
}: {
  title: string;
  subtitle: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex w-full items-center justify-between gap-3 rounded-xl border border-accent bg-white px-4 py-3 text-left transition-all hover:-translate-y-0.5 hover:border-secondary/60 hover:bg-secondary/5 hover:shadow-sm"
    >
      <div className="min-w-0">
        <div className="text-sm font-semibold text-primary">{title}</div>
        <div className="mt-0.5 text-xs text-foreground/55">{subtitle}</div>
      </div>
      <span className="text-secondary opacity-0 transition-opacity group-hover:opacity-100">→</span>
    </button>
  );
}

/* ─── Bulk import modal ──────────────────────────────────── */

interface ImportRow {
  row: number;
  email?: string;
  business_name?: string;
  resort_name?: string | null;
  town_name?: string | null;
  notes?: string | null;
}
interface ImportResult {
  row: number;
  email: string;
  business_name: string;
  status: "created" | "skipped" | "error";
  message?: string;
  leadId?: string;
}
interface ImportSummary {
  total: number;
  created: number;
  skipped: number;
  errored: number;
}

const SAMPLE_CSV = [
  "email,business_name,resort_name,town_name,notes",
  "info@example.com.au,Example Hotel,Thredbo,,Met at the AGM",
  "hello@somewhere.com.au,Somewhere Cafe,,Jindabyne,",
  "team@otherbiz.com,Other Business,,,",
].join("\n");

/**
 * Tiny CSV parser — handles quoted fields and escaped quotes ("") so
 * cells can contain commas. Good enough for admin-controlled imports;
 * we don't need a full spec-compliant parser.
 */
function parseCSV(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  const push = () => {
    row.push(field);
    field = "";
  };
  const finishRow = () => {
    rows.push(row);
    row = [];
  };
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += c;
      }
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ",") {
      push();
    } else if (c === "\n") {
      push();
      finishRow();
    } else if (c === "\r") {
      // ignore — \r\n handled by skipping \r and processing \n
    } else {
      field += c;
    }
  }
  if (field.length > 0 || row.length > 0) {
    push();
    finishRow();
  }
  return rows.filter((r) => r.length > 0 && !(r.length === 1 && r[0] === ""));
}

function rowsFromCSV(text: string): { rows: ImportRow[]; error?: string } {
  const parsed = parseCSV(text);
  if (parsed.length === 0) return { rows: [], error: "Empty file" };
  const headers = parsed[0].map((h) => h.trim().toLowerCase());
  const required = ["email", "business_name"];
  const missing = required.filter((k) => !headers.includes(k));
  if (missing.length > 0) {
    return { rows: [], error: `Missing required column(s): ${missing.join(", ")}` };
  }
  const idx = (name: string) => headers.indexOf(name);
  const iEmail = idx("email");
  const iName = idx("business_name");
  const iResort = idx("resort_name");
  const iTown = idx("town_name");
  const iNotes = idx("notes");

  const rows: ImportRow[] = [];
  for (let r = 1; r < parsed.length; r++) {
    const cells = parsed[r];
    const email = cells[iEmail]?.trim();
    const name = cells[iName]?.trim();
    if (!email && !name) continue; // skip blank lines silently
    rows.push({
      row: r + 1, // 1-indexed file row, matches what spreadsheet apps show
      email,
      business_name: name,
      resort_name: iResort >= 0 ? cells[iResort]?.trim() || null : null,
      town_name: iTown >= 0 ? cells[iTown]?.trim() || null : null,
      notes: iNotes >= 0 ? cells[iNotes]?.trim() || null : null,
    });
  }
  return { rows };
}

function BulkImportModal({
  onClose,
  onImported,
}: {
  onClose: () => void;
  onImported: () => void;
}) {
  const [text, setText] = useState("");
  const [parseError, setParseError] = useState<string | null>(null);
  const [parsedRows, setParsedRows] = useState<ImportRow[] | null>(null);
  const [previewing, setPreviewing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [results, setResults] = useState<ImportResult[] | null>(null);
  const [summary, setSummary] = useState<ImportSummary | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);
  // True once an actual (non-dryRun) import has succeeded — used to lock
  // the Import button so the same batch can't be committed twice. Reset
  // to false on every preview so the user can iterate without reopening.
  const [committed, setCommitted] = useState(false);

  // Lock body scroll while open + Escape closes.
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setText(typeof reader.result === "string" ? reader.result : "");
      // Reset preview/results so user re-runs preview on the new file.
      setParsedRows(null);
      setResults(null);
      setSummary(null);
      setParseError(null);
      setServerError(null);
      setCommitted(false);
    };
    reader.readAsText(file);
  }

  async function preview() {
    setParseError(null);
    setServerError(null);
    setResults(null);
    setSummary(null);
    setCommitted(false);
    const { rows, error } = rowsFromCSV(text);
    if (error) {
      setParseError(error);
      setParsedRows(null);
      return;
    }
    if (rows.length === 0) {
      setParseError("No data rows found");
      setParsedRows(null);
      return;
    }
    setParsedRows(rows);
    setPreviewing(true);
    try {
      const res = await fetch("/api/admin/outreach/leads/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows, dryRun: true }),
      });
      const data = await res.json();
      if (!res.ok) {
        setServerError(data.error || "Preview failed");
      } else {
        setResults(data.results);
        setSummary(data.summary);
      }
    } catch (e) {
      setServerError(e instanceof Error ? e.message : "Preview failed");
    }
    setPreviewing(false);
  }

  async function commit() {
    if (!parsedRows) return;
    setImporting(true);
    setServerError(null);
    try {
      const res = await fetch("/api/admin/outreach/leads/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows: parsedRows, dryRun: false }),
      });
      const data = await res.json();
      if (!res.ok && !data.results) {
        setServerError(data.error || "Import failed");
      } else {
        setResults(data.results);
        setSummary(data.summary);
        setCommitted(true);
        // Reload the parent list so newly created leads appear.
        // Wait a beat so the admin sees the success summary first.
        if (data.summary.created > 0) {
          setTimeout(onImported, 1500);
        }
      }
    } catch (e) {
      setServerError(e instanceof Error ? e.message : "Import failed");
    }
    setImporting(false);
  }

  function downloadSample() {
    const blob = new Blob([SAMPLE_CSV], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "outreach-leads-sample.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  // True only after a real (non-dryRun) import has been committed. Used
  // to swap the Cancel button label to "Close" and to lock the Import
  // button so the same batch can't be submitted twice.
  const importComplete = committed;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-primary/40 px-4 py-6 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-accent bg-white shadow-xl">
        {/* Header */}
        <div className="border-b border-accent/40 px-6 py-5">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-foreground/40">
            Bulk import
          </p>
          <h3 className="mt-1 text-lg font-bold text-primary">Import leads from CSV</h3>
          <p className="mt-1 text-xs text-foreground/55">
            Required columns: <code>email</code>, <code>business_name</code>. Optional:{" "}
            <code>resort_name</code>, <code>town_name</code> (matched case-insensitively to your
            resorts/towns), <code>notes</code>. Duplicates are skipped automatically.
          </p>
          <button
            type="button"
            onClick={downloadSample}
            className="mt-2 text-xs font-medium text-secondary hover:underline"
          >
            Download sample CSV
          </button>
        </div>

        {/* Body — scrolls if results table grows */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {/* Step 1: file picker + paste */}
          <div className="space-y-3">
            <input
              type="file"
              accept=".csv,text/csv"
              onChange={handleFile}
              className="block w-full text-sm text-foreground/70 file:mr-3 file:rounded-lg file:border file:border-accent file:bg-white file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-primary hover:file:bg-accent/10"
            />
            <p className="text-[11px] text-foreground/50">…or paste the CSV directly:</p>
            <textarea
              value={text}
              onChange={(e) => {
                setText(e.target.value);
                setParsedRows(null);
                setResults(null);
                setSummary(null);
              }}
              rows={6}
              placeholder={SAMPLE_CSV}
              className="input font-mono text-xs"
            />
          </div>

          {/* Errors */}
          {parseError && (
            <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {parseError}
            </div>
          )}
          {serverError && (
            <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {serverError}
            </div>
          )}

          {/* Summary */}
          {summary && (
            <div className="mt-5 grid grid-cols-4 gap-2 text-center">
              <SummaryTile label="Total" value={summary.total} tone="gray" />
              <SummaryTile label="To create" value={summary.created} tone="green" />
              <SummaryTile label="Skipped" value={summary.skipped} tone="amber" />
              <SummaryTile label="Errors" value={summary.errored} tone="red" />
            </div>
          )}

          {/* Per-row results table */}
          {results && results.length > 0 && (
            <div className="mt-4 max-h-[40vh] overflow-y-auto rounded-xl border border-accent">
              <table className="w-full text-xs">
                <thead className="sticky top-0 bg-accent/10 text-left text-[10px] uppercase tracking-wider text-foreground/50">
                  <tr>
                    <th className="px-3 py-2">Row</th>
                    <th className="px-3 py-2">Business</th>
                    <th className="px-3 py-2">Email</th>
                    <th className="px-3 py-2">Status</th>
                    <th className="px-3 py-2">Note</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-accent/40">
                  {results.map((r, i) => (
                    <tr key={i}>
                      <td className="px-3 py-2 text-foreground/50">{r.row}</td>
                      <td className="px-3 py-2 text-primary">{r.business_name}</td>
                      <td className="px-3 py-2 text-foreground/70">{r.email}</td>
                      <td className="px-3 py-2">
                        <StatusPill status={r.status} />
                      </td>
                      <td className="px-3 py-2 text-foreground/55">{r.message ?? ""}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex flex-wrap justify-between gap-2 border-t border-accent/40 bg-accent/5 px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-accent bg-white px-4 py-2 text-sm font-medium text-foreground/60 hover:bg-accent/10"
          >
            {importComplete ? "Close" : "Cancel"}
          </button>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={preview}
              disabled={!text.trim() || previewing || importing}
              className="rounded-lg border border-secondary bg-white px-4 py-2 text-sm font-semibold text-secondary hover:bg-secondary/5 disabled:opacity-50"
            >
              {previewing ? "Previewing…" : results ? "Re-preview" : "Preview"}
            </button>
            <button
              type="button"
              onClick={commit}
              disabled={!parsedRows || !summary || summary.created === 0 || importing || importComplete}
              className="rounded-lg bg-secondary px-5 py-2 text-sm font-semibold text-white hover:bg-secondary-light disabled:opacity-50"
            >
              {importing
                ? "Importing…"
                : summary
                  ? `Import ${summary.created} ${summary.created === 1 ? "lead" : "leads"}`
                  : "Import"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function SummaryTile({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "gray" | "green" | "amber" | "red";
}) {
  const tones: Record<string, string> = {
    gray: "border-gray-200 bg-gray-50 text-gray-700",
    green: "border-green-200 bg-green-50 text-green-900",
    amber: "border-amber-200 bg-amber-50 text-amber-900",
    red: "border-red-200 bg-red-50 text-red-900",
  };
  return (
    <div className={`rounded-lg border px-2 py-2 ${tones[tone]}`}>
      <p className="text-[10px] font-semibold uppercase tracking-wider opacity-70">{label}</p>
      <p className="mt-0.5 text-lg font-bold">{value}</p>
    </div>
  );
}

function StatusPill({ status }: { status: "created" | "skipped" | "error" }) {
  if (status === "created") {
    return (
      <span className="inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-semibold text-green-700">
        Will create
      </span>
    );
  }
  if (status === "skipped") {
    return (
      <span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
        Skip
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-semibold text-red-700">
      Error
    </span>
  );
}
