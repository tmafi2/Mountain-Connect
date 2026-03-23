import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

interface TimeSlot {
  date: string;
  start_time: string;
  end_time: string;
  timezone: string;
}

// GET — compute available slots for a business on a given date range
// Query params: business_id, from (date), to (date)
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const businessId = searchParams.get("business_id");
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  if (!businessId || !from || !to) {
    return NextResponse.json(
      { error: "business_id, from, and to are required" },
      { status: 400 }
    );
  }

  // Use admin client to bypass RLS for slot computation
  const supabase = createAdminClient();

  // 1. Fetch availability windows for the date range
  const { data: windows, error: winError } = await supabase
    .from("interview_availability")
    .select("*, interview_availability_blocks(*)")
    .eq("business_id", businessId)
    .eq("is_active", true)
    .gte("date", from)
    .lte("date", to)
    .order("date", { ascending: true });

  if (winError) {
    return NextResponse.json({ error: winError.message }, { status: 500 });
  }

  // 2. Fetch already-booked interviews for this business in the date range
  const { data: booked, error: bookError } = await supabase
    .from("interviews")
    .select("scheduled_date, scheduled_start_time, scheduled_end_time")
    .eq("business_id", businessId)
    .in("status", ["scheduled"])
    .gte("scheduled_date", from)
    .lte("scheduled_date", to);

  if (bookError) {
    return NextResponse.json({ error: bookError.message }, { status: 500 });
  }

  // 3. Compute available slots
  const slots: TimeSlot[] = [];

  for (const window of windows || []) {
    const slotDuration = window.slot_duration_minutes;
    const buffer = window.buffer_minutes;
    const blocks = window.interview_availability_blocks || [];

    // Parse start/end as minutes from midnight
    const windowStart = parseTime(window.start_time);
    const windowEnd = parseTime(window.end_time);

    // Generate slots
    let cursor = windowStart;
    while (cursor + slotDuration <= windowEnd) {
      const slotStart = cursor;
      const slotEnd = cursor + slotDuration;

      // Check if slot overlaps with any block
      const blockedOverlap = blocks.some((b: { start_time: string; end_time: string }) => {
        const blockStart = parseTime(b.start_time);
        const blockEnd = parseTime(b.end_time);
        return slotStart < blockEnd && slotEnd > blockStart;
      });

      // Check if slot overlaps with any booked interview
      const bookedOverlap = (booked || []).some((b) => {
        if (b.scheduled_date !== window.date) return false;
        const bStart = parseTime(b.scheduled_start_time);
        const bEnd = parseTime(b.scheduled_end_time);
        return slotStart < bEnd && slotEnd > bStart;
      });

      if (!blockedOverlap && !bookedOverlap) {
        slots.push({
          date: window.date,
          start_time: formatTime(slotStart),
          end_time: formatTime(slotEnd),
          timezone: window.timezone,
        });
      }

      cursor += slotDuration + buffer;
    }
  }

  return NextResponse.json({ slots });
}

// Parse "HH:MM" or "HH:MM:SS" to minutes from midnight
function parseTime(time: string): number {
  const parts = time.split(":");
  return parseInt(parts[0]) * 60 + parseInt(parts[1]);
}

// Format minutes from midnight back to "HH:MM"
function formatTime(minutes: number): string {
  const h = Math.floor(minutes / 60)
    .toString()
    .padStart(2, "0");
  const m = (minutes % 60).toString().padStart(2, "0");
  return `${h}:${m}`;
}
