"use client";

import { useEffect, useState, useCallback } from "react";
import AvailabilityForm from "@/components/ui/AvailabilityForm";

interface Block {
  id: string;
  start_time: string;
  end_time: string;
  reason: string | null;
}

interface AvailabilityWindow {
  id: string;
  date: string;
  start_time: string;
  end_time: string;
  timezone: string;
  slot_duration_minutes: number;
  buffer_minutes: number;
  is_active: boolean;
  interview_availability_blocks: Block[];
}

export default function AvailabilityPage() {
  const [windows, setWindows] = useState<AvailabilityWindow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);

  const fetchAvailability = useCallback(async () => {
    try {
      const res = await fetch("/api/availability");
      if (res.ok) {
        const data = await res.json();
        setWindows(data.availability ?? []);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAvailability();
  }, [fetchAvailability]);

  const handleCreate = async (formData: {
    date: string;
    start_time: string;
    end_time: string;
    timezone: string;
    slot_duration_minutes: number;
    buffer_minutes: number;
    blocks: { start_time: string; end_time: string; reason: string }[];
  }) => {
    setSaving(true);
    try {
      const res = await fetch("/api/availability", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      if (res.ok) {
        setShowForm(false);
        await fetchAvailability();
      }
    } catch {
      // ignore
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await fetch(`/api/availability/${id}`, { method: "DELETE" });
      await fetchAvailability();
    } catch {
      // ignore
    }
  };

  const handleToggleActive = async (id: string, currentActive: boolean) => {
    try {
      await fetch(`/api/availability/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: !currentActive }),
      });
      await fetchAvailability();
    } catch {
      // ignore
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr + "T00:00:00");
    return date.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const formatTime12 = (time: string) => {
    const [h, m] = time.split(":");
    const hour = parseInt(h);
    const ampm = hour >= 12 ? "PM" : "AM";
    const hour12 = hour % 12 || 12;
    return `${hour12}:${m} ${ampm}`;
  };

  // Separate upcoming vs past
  const today = new Date().toISOString().split("T")[0];
  const upcoming = windows.filter((w) => w.date >= today);
  const past = windows.filter((w) => w.date < today);

  return (
    <div className="mx-auto max-w-4xl">
      {/* Corporate gradient header */}
      <div
        className="relative mb-8 overflow-hidden rounded-2xl bg-gradient-to-r from-[#0a1e33] via-[#0f2942] to-[#132d4a] px-8 py-8"
        style={{
          backgroundImage:
            "radial-gradient(circle at 1px 1px, rgba(255,255,255,0.03) 1px, transparent 0)",
          backgroundSize: "32px 32px",
        }}
      >
        <div className="pointer-events-none absolute -right-8 -top-8 h-40 w-40 rounded-3xl bg-secondary/8 blur-2xl" style={{ transform: "rotate(12deg)" }} />
        <div className="pointer-events-none absolute -bottom-6 right-24 h-24 w-24 rounded-2xl bg-secondary/5 blur-xl" style={{ transform: "rotate(-8deg)" }} />

        <div className="relative flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <svg className="h-4 w-4 text-secondary/70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span className="text-xs font-medium uppercase tracking-widest text-secondary/70">Scheduling</span>
            </div>
            <h1 className="text-2xl font-bold text-white">Interview Availability</h1>
            <p className="mt-1 text-sm text-white/50">
              Set the dates and times you&apos;re available for interviews.
            </p>
          </div>
          {!showForm && (
            <button
              onClick={() => setShowForm(true)}
              className="shrink-0 rounded-xl bg-white/10 border border-white/20 px-4 py-2.5 text-sm font-semibold text-white transition-all hover:bg-white/20 hover:-translate-y-0.5"
            >
              + Add Availability
            </button>
          )}
        </div>
      </div>

      {/* Form */}
      {showForm && (
        <div className="mb-6 rounded-2xl border border-accent/40 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-primary">New Availability Window</h2>
          <AvailabilityForm
            onSubmit={handleCreate}
            onCancel={() => setShowForm(false)}
            loading={saving}
          />
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="mt-8 flex items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-primary" />
        </div>
      )}

      {/* Upcoming windows */}
      {!loading && (
        <div>
          <h2 className="text-lg font-semibold text-primary mb-4">
            Upcoming <span className="ml-1.5 text-sm font-normal text-foreground/40">({upcoming.length})</span>
          </h2>

          {upcoming.length === 0 ? (
            <div className="rounded-2xl border border-accent/40 bg-white p-10 text-center shadow-sm">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-accent/20">
                <svg className="h-6 w-6 text-foreground/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <p className="text-sm font-medium text-foreground/60">No upcoming availability set.</p>
              <p className="mt-1 text-xs text-foreground/40">Add your first window to start scheduling interviews.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {upcoming.map((w) => (
                <div
                  key={w.id}
                  className={`rounded-2xl border bg-white p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md ${
                    w.is_active ? "border-accent/40" : "border-accent/30 opacity-60"
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-primary">{formatDate(w.date)}</p>
                        {w.is_active && (
                          <span className="inline-flex items-center rounded-full bg-green-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-green-700">
                            Active
                          </span>
                        )}
                      </div>
                      <p className="mt-1 text-sm text-foreground/60">
                        {formatTime12(w.start_time)} – {formatTime12(w.end_time)}
                        <span className="ml-2 text-foreground/40">
                          ({w.timezone.replace(/_/g, " ")})
                        </span>
                      </p>
                      <p className="mt-1 text-xs text-foreground/40">
                        {w.slot_duration_minutes}min slots &middot; {w.buffer_minutes}min buffer
                      </p>

                      {/* Blocks */}
                      {w.interview_availability_blocks.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-2">
                          {w.interview_availability_blocks.map((b) => (
                            <span
                              key={b.id}
                              className="inline-flex items-center rounded-full bg-red-50 px-2.5 py-0.5 text-xs text-red-600"
                            >
                              Blocked: {formatTime12(b.start_time)} – {formatTime12(b.end_time)}
                              {b.reason && ` (${b.reason})`}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => handleToggleActive(w.id, w.is_active)}
                        className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition-colors ${
                          w.is_active
                            ? "bg-green-50 text-green-700 hover:bg-green-100"
                            : "bg-accent/20 text-foreground/50 hover:bg-accent/40"
                        }`}
                      >
                        {w.is_active ? "Active" : "Paused"}
                      </button>
                      <button
                        onClick={() => handleDelete(w.id)}
                        className="rounded-xl border border-red-100 px-3 py-1.5 text-xs font-semibold text-red-500 transition-colors hover:bg-red-50"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Past windows */}
      {!loading && past.length > 0 && (
        <div className="mt-8">
          <h2 className="text-lg font-semibold text-foreground/40 mb-4">
            Past <span className="ml-1.5 text-sm font-normal">({past.length})</span>
          </h2>
          <div className="space-y-3 opacity-50">
            {past.map((w) => (
              <div
                key={w.id}
                className="rounded-2xl border border-accent/30 bg-white p-5"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-semibold text-primary">{formatDate(w.date)}</p>
                    <p className="mt-1 text-sm text-foreground/60">
                      {formatTime12(w.start_time)} – {formatTime12(w.end_time)}
                    </p>
                  </div>
                  <button
                    onClick={() => handleDelete(w.id)}
                    className="rounded-xl border border-red-100 px-3 py-1.5 text-xs font-semibold text-red-500 transition-colors hover:bg-red-50"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
