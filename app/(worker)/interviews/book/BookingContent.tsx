"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import TimezonePicker from "@/components/ui/TimezonePicker";
import SlotGrid from "@/components/ui/SlotGrid";

interface TimeSlot {
  date: string;
  start_time: string;
  end_time: string;
  timezone: string;
}

interface InterviewInfo {
  id: string;
  status: string;
  business_name: string;
  job_title: string;
  business_id: string;
}

export default function BookingContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token");

  const [interview, setInterview] = useState<InterviewInfo | null>(null);
  const [slots, setSlots] = useState<TimeSlot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
  const [timezone, setTimezone] = useState(() => {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone;
    } catch {
      return "America/Denver";
    }
  });
  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // For demo mode — show sample data when no real token
  const isDemoMode = !token || token === "demo";

  const loadInterview = useCallback(async () => {
    if (isDemoMode) {
      // Demo mode — show sample data
      setInterview({
        id: "demo",
        status: "invited",
        business_name: "Whistler Blackcomb Ski School",
        job_title: "Ski Instructor — All Levels",
        business_id: "demo",
      });

      // Generate demo slots for the next 5 days
      const demoSlots: TimeSlot[] = [];
      const today = new Date();
      for (let d = 1; d <= 5; d++) {
        const date = new Date(today);
        date.setDate(today.getDate() + d);
        // Skip weekends
        if (date.getDay() === 0 || date.getDay() === 6) continue;
        const dateStr = date.toISOString().split("T")[0];
        const times = ["09:00", "09:40", "10:20", "11:00", "11:40", "13:00", "13:40", "14:20", "15:00", "15:40"];
        for (const t of times) {
          const [h, m] = t.split(":").map(Number);
          const endMin = h * 60 + m + 30;
          const endH = Math.floor(endMin / 60).toString().padStart(2, "0");
          const endM = (endMin % 60).toString().padStart(2, "0");
          demoSlots.push({
            date: dateStr,
            start_time: t,
            end_time: `${endH}:${endM}`,
            timezone: "America/Denver",
          });
        }
      }
      setSlots(demoSlots);
      setLoading(false);
      return;
    }

    // Real mode — fetch interview and slots from API
    try {
      // We'd need an API to look up interview by token
      // For now, this will be connected in Phase 5
      setError("Interview booking requires a valid invite token.");
      setLoading(false);
    } catch {
      setError("Failed to load interview details.");
      setLoading(false);
    }
  }, [isDemoMode]);

  useEffect(() => {
    loadInterview();
  }, [loadInterview]);

  const handleBook = async () => {
    if (!selectedSlot) return;
    setBooking(true);
    setError(null);

    if (isDemoMode) {
      // Demo mode — simulate booking
      await new Promise((r) => setTimeout(r, 1500));
      setSuccess(true);
      setBooking(false);
      return;
    }

    try {
      const res = await fetch("/api/interviews/book", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          invite_token: token,
          date: selectedSlot.date,
          start_time: selectedSlot.start_time,
          end_time: selectedSlot.end_time,
          timezone,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to book interview");
        setBooking(false);
        return;
      }

      setSuccess(true);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setBooking(false);
    }
  };

  const formatTime12 = (time: string) => {
    const [h, m] = time.split(":");
    const hour = parseInt(h);
    const ampm = hour >= 12 ? "PM" : "AM";
    return `${hour % 12 || 12}:${m} ${ampm}`;
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr + "T00:00:00");
    return date.toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <p className="text-foreground/50">Loading available times...</p>
      </div>
    );
  }

  if (success && selectedSlot) {
    return (
      <div className="mx-auto max-w-lg pt-12 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
          <svg className="h-8 w-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h1 className="mt-6 text-2xl font-bold text-primary">Interview Booked!</h1>
        <p className="mt-2 text-foreground/60">
          Your interview has been confirmed.
        </p>

        <div className="mx-auto mt-6 max-w-sm rounded-xl border border-accent bg-white p-5 text-left">
          <p className="text-sm font-semibold text-primary">{interview?.job_title}</p>
          <p className="mt-1 text-sm text-foreground/60">{interview?.business_name}</p>
          <hr className="my-3 border-accent" />
          <p className="text-sm text-primary font-medium">{formatDate(selectedSlot.date)}</p>
          <p className="mt-1 text-sm text-foreground/60">
            {formatTime12(selectedSlot.start_time)} – {formatTime12(selectedSlot.end_time)}
          </p>
          <p className="mt-1 text-xs text-foreground/40">
            {timezone.replace(/_/g, " ")}
          </p>
        </div>

        <button
          onClick={() => router.push("/interviews")}
          className="mt-6 rounded-lg bg-primary px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary/90"
        >
          View My Interviews
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl">
      {isDemoMode && (
        <div className="mb-6 rounded-lg border border-dashed border-secondary/50 bg-secondary/5 px-4 py-3 text-center text-xs text-foreground/50">
          Demo Mode — showing sample availability slots
        </div>
      )}

      <h1 className="text-2xl font-bold text-primary">Book Your Interview</h1>

      {interview && (
        <div className="mt-2">
          <p className="text-foreground/60">
            <span className="font-medium text-primary">{interview.job_title}</span>
            {" at "}
            <span className="font-medium text-primary">{interview.business_name}</span>
          </p>
        </div>
      )}

      {error && (
        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Timezone picker */}
      <div className="mt-6">
        <TimezonePicker value={timezone} onChange={setTimezone} />
      </div>

      {/* Slot grid */}
      <div className="mt-6">
        <h2 className="mb-4 text-lg font-semibold text-primary">Available Times</h2>
        <SlotGrid
          slots={slots}
          selectedSlot={selectedSlot}
          onSelect={setSelectedSlot}
          workerTimezone={timezone}
        />
      </div>

      {/* Confirm booking */}
      {selectedSlot && (
        <div className="mt-8 rounded-xl border border-secondary bg-secondary/5 p-5">
          <h3 className="font-semibold text-primary">Confirm Your Selection</h3>
          <p className="mt-2 text-sm text-foreground/60">
            <strong>{formatDate(selectedSlot.date)}</strong> at{" "}
            <strong>{formatTime12(selectedSlot.start_time)} – {formatTime12(selectedSlot.end_time)}</strong>
          </p>
          <button
            onClick={handleBook}
            disabled={booking}
            className="mt-4 w-full rounded-lg bg-primary py-3 text-sm font-semibold text-white transition-colors hover:bg-primary/90 disabled:opacity-50 sm:w-auto sm:px-8"
          >
            {booking ? "Booking…" : "Confirm Interview"}
          </button>
        </div>
      )}
    </div>
  );
}
