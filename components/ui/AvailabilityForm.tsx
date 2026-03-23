"use client";

import { useState } from "react";

interface Block {
  start_time: string;
  end_time: string;
  reason: string;
}

interface AvailabilityFormProps {
  onSubmit: (data: {
    date: string;
    start_time: string;
    end_time: string;
    timezone: string;
    slot_duration_minutes: number;
    buffer_minutes: number;
    blocks: Block[];
  }) => Promise<void>;
  onCancel: () => void;
  loading?: boolean;
}

const TIMEZONES = [
  "America/Vancouver",
  "America/Denver",
  "America/Chicago",
  "America/New_York",
  "America/Halifax",
  "America/St_Johns",
  "Europe/London",
  "Europe/Paris",
  "Europe/Zurich",
  "Europe/Oslo",
  "Asia/Tokyo",
  "Australia/Sydney",
  "Pacific/Auckland",
];

export default function AvailabilityForm({
  onSubmit,
  onCancel,
  loading,
}: AvailabilityFormProps) {
  const [date, setDate] = useState("");
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("17:00");
  const [timezone, setTimezone] = useState("America/Denver");
  const [slotDuration, setSlotDuration] = useState(30);
  const [buffer, setBuffer] = useState(10);
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [showBlockForm, setShowBlockForm] = useState(false);
  const [blockStart, setBlockStart] = useState("12:00");
  const [blockEnd, setBlockEnd] = useState("13:00");
  const [blockReason, setBlockReason] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit({
      date,
      start_time: startTime,
      end_time: endTime,
      timezone,
      slot_duration_minutes: slotDuration,
      buffer_minutes: buffer,
      blocks,
    });
  };

  const addBlock = () => {
    if (blockStart && blockEnd) {
      setBlocks([...blocks, { start_time: blockStart, end_time: blockEnd, reason: blockReason }]);
      setBlockStart("12:00");
      setBlockEnd("13:00");
      setBlockReason("");
      setShowBlockForm(false);
    }
  };

  const removeBlock = (index: number) => {
    setBlocks(blocks.filter((_, i) => i !== index));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Date */}
      <div>
        <label className="block text-sm font-medium text-foreground">Date</label>
        <input
          type="date"
          required
          value={date}
          onChange={(e) => setDate(e.target.value)}
          min={new Date().toISOString().split("T")[0]}
          className="mt-1 w-full rounded-lg border border-accent bg-white px-4 py-2.5 text-primary focus:border-secondary focus:outline-none focus:ring-1 focus:ring-secondary"
        />
      </div>

      {/* Time range */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-foreground">Start Time</label>
          <input
            type="time"
            required
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
            className="mt-1 w-full rounded-lg border border-accent bg-white px-4 py-2.5 text-primary focus:border-secondary focus:outline-none focus:ring-1 focus:ring-secondary"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-foreground">End Time</label>
          <input
            type="time"
            required
            value={endTime}
            onChange={(e) => setEndTime(e.target.value)}
            className="mt-1 w-full rounded-lg border border-accent bg-white px-4 py-2.5 text-primary focus:border-secondary focus:outline-none focus:ring-1 focus:ring-secondary"
          />
        </div>
      </div>

      {/* Timezone */}
      <div>
        <label className="block text-sm font-medium text-foreground">Timezone</label>
        <select
          value={timezone}
          onChange={(e) => setTimezone(e.target.value)}
          className="mt-1 w-full rounded-lg border border-accent bg-white px-4 py-2.5 text-primary focus:border-secondary focus:outline-none focus:ring-1 focus:ring-secondary"
        >
          {TIMEZONES.map((tz) => (
            <option key={tz} value={tz}>
              {tz.replace(/_/g, " ")}
            </option>
          ))}
        </select>
      </div>

      {/* Slot duration + buffer */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-foreground">Slot Duration</label>
          <select
            value={slotDuration}
            onChange={(e) => setSlotDuration(Number(e.target.value))}
            className="mt-1 w-full rounded-lg border border-accent bg-white px-4 py-2.5 text-primary focus:border-secondary focus:outline-none focus:ring-1 focus:ring-secondary"
          >
            <option value={15}>15 minutes</option>
            <option value={30}>30 minutes</option>
            <option value={45}>45 minutes</option>
            <option value={60}>60 minutes</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-foreground">Buffer Between</label>
          <select
            value={buffer}
            onChange={(e) => setBuffer(Number(e.target.value))}
            className="mt-1 w-full rounded-lg border border-accent bg-white px-4 py-2.5 text-primary focus:border-secondary focus:outline-none focus:ring-1 focus:ring-secondary"
          >
            <option value={0}>No buffer</option>
            <option value={5}>5 minutes</option>
            <option value={10}>10 minutes</option>
            <option value={15}>15 minutes</option>
            <option value={30}>30 minutes</option>
          </select>
        </div>
      </div>

      {/* Blocked periods */}
      <div>
        <div className="flex items-center justify-between">
          <label className="block text-sm font-medium text-foreground">Blocked Periods</label>
          <button
            type="button"
            onClick={() => setShowBlockForm(true)}
            className="text-xs font-medium text-secondary hover:underline"
          >
            + Add Block
          </button>
        </div>

        {blocks.length > 0 && (
          <div className="mt-2 space-y-2">
            {blocks.map((block, i) => (
              <div
                key={i}
                className="flex items-center justify-between rounded-lg border border-accent bg-accent/10 px-3 py-2 text-sm"
              >
                <span className="text-primary">
                  {block.start_time} – {block.end_time}
                  {block.reason && (
                    <span className="ml-2 text-foreground/50">({block.reason})</span>
                  )}
                </span>
                <button
                  type="button"
                  onClick={() => removeBlock(i)}
                  className="text-red-500 hover:text-red-700"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        )}

        {showBlockForm && (
          <div className="mt-3 rounded-lg border border-accent bg-accent/5 p-3 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-foreground/60">From</label>
                <input
                  type="time"
                  value={blockStart}
                  onChange={(e) => setBlockStart(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-accent bg-white px-3 py-2 text-sm text-primary focus:border-secondary focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs text-foreground/60">To</label>
                <input
                  type="time"
                  value={blockEnd}
                  onChange={(e) => setBlockEnd(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-accent bg-white px-3 py-2 text-sm text-primary focus:border-secondary focus:outline-none"
                />
              </div>
            </div>
            <input
              type="text"
              placeholder="Reason (optional, e.g. Lunch)"
              value={blockReason}
              onChange={(e) => setBlockReason(e.target.value)}
              className="w-full rounded-lg border border-accent bg-white px-3 py-2 text-sm text-primary placeholder-foreground/40 focus:border-secondary focus:outline-none"
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={addBlock}
                className="rounded-lg bg-secondary/20 px-3 py-1.5 text-xs font-semibold text-primary hover:bg-secondary/30"
              >
                Add
              </button>
              <button
                type="button"
                onClick={() => setShowBlockForm(false)}
                className="rounded-lg px-3 py-1.5 text-xs text-foreground/60 hover:text-foreground"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          disabled={loading}
          className="flex-1 rounded-lg bg-primary py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary/90 disabled:opacity-50"
        >
          {loading ? "Saving…" : "Save Availability"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg border border-accent px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-accent/20"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
