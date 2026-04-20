import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { rateLimit } from "@/lib/rate-limit";

// PUT — update an availability window
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { date, start_time, end_time, timezone, slot_duration_minutes, buffer_minutes, is_active, blocks } = body as {
    date?: string;
    start_time?: string;
    end_time?: string;
    timezone?: string;
    slot_duration_minutes?: number;
    buffer_minutes?: number;
    is_active?: boolean;
    blocks?: { start_time: string; end_time: string; reason?: string | null }[];
  };

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (date !== undefined) updates.date = date;
  if (start_time !== undefined) updates.start_time = start_time;
  if (end_time !== undefined) updates.end_time = end_time;
  if (timezone !== undefined) updates.timezone = timezone;
  if (slot_duration_minutes !== undefined) updates.slot_duration_minutes = slot_duration_minutes;
  if (buffer_minutes !== undefined) updates.buffer_minutes = buffer_minutes;
  if (is_active !== undefined) updates.is_active = is_active;

  const { data, error } = await supabase
    .from("interview_availability")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Replace blocks wholesale when provided. Callers that only want to flip
  // is_active (the pause/resume toggle) omit `blocks` so their existing
  // blocked periods survive untouched.
  if (Array.isArray(blocks)) {
    await supabase
      .from("interview_availability_blocks")
      .delete()
      .eq("availability_id", id);

    if (blocks.length > 0) {
      const rows = blocks.map((b) => ({
        availability_id: id,
        start_time: b.start_time,
        end_time: b.end_time,
        reason: b.reason || null,
      }));
      await supabase.from("interview_availability_blocks").insert(rows);
    }
  }

  return NextResponse.json({ availability: data });
}

// DELETE — remove an availability window
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const rateLimited = await rateLimit(_request, { identifier: "availability" });
  if (rateLimited) return rateLimited;

  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { error } = await supabase
    .from("interview_availability")
    .delete()
    .eq("id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
