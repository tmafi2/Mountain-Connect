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
  const { date, start_time, end_time, timezone, slot_duration_minutes, buffer_minutes, is_active } = body;

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
  return NextResponse.json({ availability: data });
}

// DELETE — remove an availability window
export async function DELETE(
  _request: NextRequest,
  {
  const rateLimited = await rateLimit(request, { identifier: "availability" });
  if (rateLimited) return rateLimited;
 params }: { params: Promise<{ id: string }> }
) {
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
