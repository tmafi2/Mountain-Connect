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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-primary">Interview Availability</h1>
          <p className="mt-1 text-sm text-foreground/60">
            Set the dates and times you&apos;re available for interviews.
          </p>
        </div>
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary/90"
          >
            + Add Availability
          </button>
        )}
      </div>

      {/* Form */}
      {showForm && (
        <div className="mt-6 rounded-xl border border-accent bg-white p-6">
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
        <div className="mt-8 text-center text-sm text-foreground/50">Loading...</div>
      )}

      {/* Upcoming windows */}
      {!loading && (
        <div className="mt-8">
          <h2 className="text-lg font-semibold text-primary">
            Upcoming ({upcoming.length})
          </h2>

          {upcoming.length === 0 ? (
            <div className="mt-4 rounded-xl border border-accent bg-white p-8 text-center">
              <p className="text-sm text-foreground/50">
                No upcoming availability set. Add your first window to start scheduling interviews.
              </p>
            </div>
          ) : (
            <div className="mt-4 space-y-3">
              {upcoming.map((w) => (
                <div
                  key={w.id}
                  className={`rounded-xl border bg-white p-5 transition-colors ${
                    w.is_active ? "border-accent" : "border-accent/50 opacity-60"
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-semibold text-primary">{formatDate(w.date)}</p>
                      <p className="mt-1 text-sm text-foreground/60">
                        {formatTime12(w.start_time)} – {formatTime12(w.end_time)}
                        <span className="ml-2 text-foreground/40">
                          ({w.timezone.replace(/_/g, " ")})
                        </span>
                      </p>
                      <p className="mt-1 text-xs text-foreground/40">
                        {w.slot_duration_minutes}min slots · {w.buffer_minutes}min buffer
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

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleToggleActive(w.id, w.is_active)}
                        className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                          w.is_active
                            ? "bg-green-50 text-green-700 hover:bg-green-100"
                            : "bg-gray-50 text-gray-500 hover:bg-gray-100"
                        }`}
                      >
                        {w.is_active ? "Active" : "Paused"}
                      </button>
                      <button
                        onClick={() => handleDelete(w.id)}
                        className="rounded-lg px-3 py-1.5 text-xs font-medium text-red-500 hover:bg-red-50"
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
          <h2 className="text-lg font-semibold text-foreground/40">
            Past ({past.length})
          </h2>
          <div className="mt-4 space-y-3 opacity-50">
            {past.map((w) => (
              <div
                key={w.id}
                className="rounded-xl border border-accent/50 bg-white p-5"
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
                    className="rounded-lg px-3 py-1.5 text-xs font-medium text-red-500 hover:bg-red-50"
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
