"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import SlotGrid from "@/components/ui/SlotGrid";
import TimezonePicker from "@/components/ui/TimezonePicker";

interface TimeSlot {
  date: string;
  start_time: string;
  end_time: string;
  timezone: string;
}

interface InstantInterviewData {
  interview_id: string;
  business_name: string;
  job_title: string;
  room_expires_at: string;
  business_id?: string;
}

interface InstantInterviewModalProps {
  data: InstantInterviewData;
  onDismiss: () => void;
}

export default function InstantInterviewModal({ data, onDismiss }: InstantInterviewModalProps) {
  const router = useRouter();
  const [action, setAction] = useState<"idle" | "accepting" | "declining" | "rescheduling">("idle");
  const [showReschedule, setShowReschedule] = useState(false);
  const [timeLeft, setTimeLeft] = useState("");
  const [expired, setExpired] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reschedule state
  const [slots, setSlots] = useState<TimeSlot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [timezone, setTimezone] = useState(() => {
    try { return Intl.DateTimeFormat().resolvedOptions().timeZone; }
    catch { return "America/Denver"; }
  });

  // Countdown timer
  useEffect(() => {
    function tick() {
      const now = Date.now();
      const expires = new Date(data.room_expires_at).getTime();
      const diff = expires - now;

      if (diff <= 0) {
        setExpired(true);
        setTimeLeft("0:00");
        return;
      }

      const mins = Math.floor(diff / 60000);
      const secs = Math.floor((diff % 60000) / 1000);
      setTimeLeft(`${mins}:${secs.toString().padStart(2, "0")}`);
    }

    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [data.room_expires_at]);

  // Auto-expire
  useEffect(() => {
    if (expired) {
      const timeout = setTimeout(() => {
        onDismiss();
      }, 5000);
      return () => clearTimeout(timeout);
    }
  }, [expired, onDismiss]);

  const handleAccept = useCallback(async () => {
    setAction("accepting");
    setError(null);
    try {
      const res = await fetch("/api/interviews/instant/respond", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ interview_id: data.interview_id, action: "accept" }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to accept");
      }

      onDismiss();
      router.push(`/interviews/${data.interview_id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to accept interview");
      setAction("idle");
    }
  }, [data.interview_id, onDismiss, router]);

  const handleDecline = useCallback(async () => {
    setAction("declining");
    setError(null);
    try {
      const res = await fetch("/api/interviews/instant/respond", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ interview_id: data.interview_id, action: "decline" }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to decline");
      }

      onDismiss();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to decline");
      setAction("idle");
    }
  }, [data.interview_id, onDismiss]);

  const loadAvailability = useCallback(async () => {
    if (!data.business_id) return;
    setLoadingSlots(true);
    try {
      const { createClient } = await import("@/lib/supabase/client");
      const supabase = createClient();

      const todayStr = new Date().toISOString().split("T")[0];
      const { data: windows } = await supabase
        .from("interview_availability")
        .select("date, start_time, end_time, timezone, slot_duration_minutes, buffer_minutes")
        .eq("business_id", data.business_id)
        .eq("is_active", true)
        .gte("date", todayStr)
        .order("date", { ascending: true })
        .limit(30);

      const { data: booked } = await supabase
        .from("interviews")
        .select("scheduled_date, scheduled_start_time, scheduled_end_time")
        .eq("business_id", data.business_id)
        .eq("status", "scheduled");

      const bookedSlots = (booked || []).map((b) => ({
        date: b.scheduled_date,
        start: b.scheduled_start_time?.slice(0, 5),
        end: b.scheduled_end_time?.slice(0, 5),
      }));

      const availableSlots: TimeSlot[] = [];
      for (const w of windows || []) {
        const slotMins = w.slot_duration_minutes || 30;
        const bufferMins = w.buffer_minutes || 0;
        const tz = w.timezone || "America/Denver";
        const [sh, sm] = (w.start_time as string).split(":").map(Number);
        const [eh, em] = (w.end_time as string).split(":").map(Number);
        const startMin = sh * 60 + sm;
        const endMin = eh * 60 + em;

        for (let m = startMin; m + slotMins <= endMin; m += slotMins + bufferMins) {
          const sH = Math.floor(m / 60).toString().padStart(2, "0");
          const sM = (m % 60).toString().padStart(2, "0");
          const eMin = m + slotMins;
          const eH = Math.floor(eMin / 60).toString().padStart(2, "0");
          const eM = (eMin % 60).toString().padStart(2, "0");
          const slotStart = `${sH}:${sM}`;
          const slotEnd = `${eH}:${eM}`;

          const isBooked = bookedSlots.some(
            (b) => b.date === w.date && slotStart < b.end && slotEnd > b.start
          );
          if (!isBooked) {
            availableSlots.push({ date: w.date, start_time: slotStart, end_time: slotEnd, timezone: tz });
          }
        }
      }

      setSlots(availableSlots);
    } catch {
      setError("Failed to load available times");
    } finally {
      setLoadingSlots(false);
    }
  }, [data.business_id]);

  const handleReschedule = useCallback(async () => {
    if (!selectedSlot) return;
    setAction("rescheduling");
    setError(null);
    try {
      const res = await fetch("/api/interviews/instant/respond", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          interview_id: data.interview_id,
          action: "reschedule",
          reschedule_slot: {
            date: selectedSlot.date,
            start_time: selectedSlot.start_time,
            end_time: selectedSlot.end_time,
            timezone,
          },
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to reschedule");
      }

      onDismiss();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to reschedule");
      setAction("rescheduling");
    }
  }, [data.interview_id, selectedSlot, timezone, onDismiss]);

  // Expired state
  if (expired) {
    return (
      <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 backdrop-blur-sm">
        <div className="mx-4 w-full max-w-md rounded-2xl bg-white p-8 shadow-2xl text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-100">
            <svg className="h-8 w-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-primary">Interview Request Expired</h2>
          <p className="mt-2 text-sm text-foreground/60">
            The instant interview request from {data.business_name} has expired. You can still schedule an interview from your interviews page.
          </p>
          <button
            onClick={onDismiss}
            className="mt-6 rounded-xl bg-primary px-6 py-2.5 text-sm font-semibold text-white hover:bg-primary/90"
          >
            Dismiss
          </button>
        </div>
      </div>
    );
  }

  // Reschedule view
  if (showReschedule) {
    return (
      <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 backdrop-blur-sm">
        <div className="mx-4 w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white shadow-2xl">
          <div className="sticky top-0 z-10 flex items-center justify-between border-b border-accent bg-white px-6 py-4 rounded-t-2xl">
            <div>
              <h2 className="text-lg font-bold text-primary">Reschedule Interview</h2>
              <p className="text-sm text-foreground/60">{data.job_title} at {data.business_name}</p>
            </div>
            <button
              onClick={() => setShowReschedule(false)}
              className="rounded-xl p-1.5 text-foreground/40 hover:bg-accent/50 hover:text-foreground/70"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </button>
          </div>

          <div className="p-6 space-y-4">
            {error && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
            )}

            {loadingSlots ? (
              <div className="flex items-center justify-center py-12">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-secondary" />
              </div>
            ) : slots.length > 0 ? (
              <>
                <TimezonePicker value={timezone} onChange={setTimezone} />
                <SlotGrid slots={slots} selectedSlot={selectedSlot} onSelect={setSelectedSlot} workerTimezone={timezone} />

                {selectedSlot && (
                  <div className="rounded-xl border border-secondary bg-secondary/5 p-4">
                    <p className="text-sm text-foreground/70">
                      Selected: <strong>{selectedSlot.date}</strong> at{" "}
                      <strong>{selectedSlot.start_time} - {selectedSlot.end_time}</strong>
                    </p>
                    <button
                      onClick={handleReschedule}
                      disabled={action === "rescheduling"}
                      className="mt-3 w-full rounded-xl bg-primary py-2.5 text-sm font-semibold text-white hover:bg-primary/90 disabled:opacity-50"
                    >
                      {action === "rescheduling" ? "Rescheduling..." : "Confirm Reschedule"}
                    </button>
                  </div>
                )}
              </>
            ) : (
              <div className="rounded-xl border border-accent bg-white p-8 text-center">
                <p className="text-sm text-foreground/60">
                  No available time slots found. The business may not have set their availability yet.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Main modal
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="mx-4 w-full max-w-md rounded-2xl bg-white shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
        {/* Pulsing header */}
        <div className="relative bg-gradient-to-br from-primary via-primary to-primary/90 px-6 py-6 text-center">
          <div className="pointer-events-none absolute -left-8 -top-8 h-32 w-32 rounded-full bg-secondary/20 blur-2xl" />
          <div className="pointer-events-none absolute right-0 bottom-0 h-24 w-24 rounded-full bg-emerald-400/15 blur-2xl" />
          <div className="relative">
            <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-white/15 backdrop-blur-sm">
              <div className="relative">
                <svg className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                <span className="absolute -top-1 -right-1 flex h-3 w-3">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex h-3 w-3 rounded-full bg-emerald-500" />
                </span>
              </div>
            </div>
            <h2 className="text-xl font-bold text-white">Live Interview Request</h2>
            <p className="mt-1 text-sm text-white/70">
              {data.business_name} wants to interview you now
            </p>
          </div>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-4">
          {/* Job info */}
          <div className="rounded-xl bg-accent/30 p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-foreground/50">Position</p>
            <p className="mt-1 font-semibold text-primary">{data.job_title}</p>
            <p className="text-sm text-foreground/60">{data.business_name}</p>
          </div>

          {/* Countdown */}
          <div className="flex items-center justify-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
            <svg className="h-5 w-5 text-amber-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-sm font-medium text-amber-800">
              Expires in <span className="font-mono font-bold text-amber-900">{timeLeft}</span>
            </p>
          </div>

          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
          )}

          {/* Action buttons */}
          <div className="space-y-2.5 pt-1">
            <button
              onClick={handleAccept}
              disabled={action !== "idle"}
              className="w-full rounded-xl bg-emerald-600 py-3.5 text-sm font-bold text-white transition-all hover:-translate-y-0.5 hover:bg-emerald-700 hover:shadow-lg hover:shadow-emerald-600/20 disabled:opacity-50 disabled:hover:translate-y-0 flex items-center justify-center gap-2"
            >
              {action === "accepting" ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  Connecting...
                </>
              ) : (
                <>
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  Accept &amp; Join Call
                </>
              )}
            </button>

            <div className="grid grid-cols-2 gap-2.5">
              <button
                onClick={() => {
                  setShowReschedule(true);
                  loadAvailability();
                }}
                disabled={action !== "idle"}
                className="rounded-xl border border-accent py-2.5 text-sm font-semibold text-primary transition-colors hover:bg-accent/30 disabled:opacity-50 flex items-center justify-center gap-1.5"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                Reschedule
              </button>
              <button
                onClick={handleDecline}
                disabled={action !== "idle"}
                className="rounded-xl border border-red-200 bg-red-50 py-2.5 text-sm font-semibold text-red-600 transition-colors hover:bg-red-100 disabled:opacity-50 flex items-center justify-center gap-1.5"
              >
                {action === "declining" ? (
                  <>
                    <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-red-300 border-t-red-600" />
                    Declining...
                  </>
                ) : (
                  <>
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    Decline
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
