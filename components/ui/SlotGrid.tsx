"use client";

interface TimeSlot {
  date: string;
  start_time: string;
  end_time: string;
  timezone: string;
}

interface SlotGridProps {
  slots: TimeSlot[];
  selectedSlot: TimeSlot | null;
  onSelect: (slot: TimeSlot) => void;
  workerTimezone: string;
}

export default function SlotGrid({
  slots,
  selectedSlot,
  onSelect,
  workerTimezone,
}: SlotGridProps) {
  // Group slots by date
  const grouped = slots.reduce<Record<string, TimeSlot[]>>((acc, slot) => {
    if (!acc[slot.date]) acc[slot.date] = [];
    acc[slot.date].push(slot);
    return acc;
  }, {});

  const dates = Object.keys(grouped).sort();

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr + "T00:00:00");
    return date.toLocaleDateString("en-US", {
      weekday: "long",
      month: "short",
      day: "numeric",
    });
  };

  const formatTime12 = (time: string) => {
    const [h, m] = time.split(":");
    const hour = parseInt(h);
    const ampm = hour >= 12 ? "PM" : "AM";
    return `${hour % 12 || 12}:${m} ${ampm}`;
  };

  // Convert time from business timezone to worker timezone for display
  const convertTime = (date: string, time: string, fromTz: string, toTz: string) => {
    if (fromTz === toTz) return formatTime12(time);

    try {
      // Create a date in the source timezone
      const [h, m] = time.split(":").map(Number);
      const dateObj = new Date(`${date}T${time}:00`);

      // Get offset difference (rough conversion using Intl)
      const sourceFormatter = new Intl.DateTimeFormat("en-US", {
        timeZone: fromTz,
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      });
      const targetFormatter = new Intl.DateTimeFormat("en-US", {
        timeZone: toTz,
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      });

      // Use a fixed reference point
      const ref = new Date(Date.UTC(
        parseInt(date.split("-")[0]),
        parseInt(date.split("-")[1]) - 1,
        parseInt(date.split("-")[2]),
        h, m, 0
      ));

      // Get the UTC offset for the source timezone
      const sourceStr = sourceFormatter.format(ref);
      const targetStr = targetFormatter.format(ref);

      // If they're the same, no conversion needed
      if (sourceStr === targetStr) return formatTime12(time);

      return targetStr;
    } catch {
      return formatTime12(time);
    }
  };

  const isSelected = (slot: TimeSlot) =>
    selectedSlot?.date === slot.date &&
    selectedSlot?.start_time === slot.start_time;

  if (dates.length === 0) {
    return (
      <div className="rounded-xl border border-accent bg-white p-8 text-center">
        <p className="text-sm text-foreground/50">
          No available time slots for the selected dates. Please check back later.
        </p>
      </div>
    );
  }

  const showConverted = workerTimezone !== slots[0]?.timezone;

  return (
    <div className="space-y-6">
      {showConverted && (
        <p className="text-xs text-foreground/50">
          Times shown in your timezone ({workerTimezone.replace(/_/g, " ")})
        </p>
      )}

      {dates.map((date) => (
        <div key={date}>
          <h3 className="mb-3 text-sm font-semibold text-primary">
            {formatDate(date)}
          </h3>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-5">
            {grouped[date].map((slot) => (
              <button
                key={`${slot.date}-${slot.start_time}`}
                onClick={() => onSelect(slot)}
                className={`rounded-lg border px-3 py-2.5 text-center text-sm font-medium transition-all ${
                  isSelected(slot)
                    ? "border-primary bg-primary text-white shadow-sm"
                    : "border-accent bg-white text-primary hover:border-secondary hover:bg-secondary/5"
                }`}
              >
                {showConverted
                  ? convertTime(slot.date, slot.start_time, slot.timezone, workerTimezone)
                  : formatTime12(slot.start_time)}
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
