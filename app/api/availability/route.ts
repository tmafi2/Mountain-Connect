import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// GET — fetch all availability windows for the logged-in business
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Get business profile
  const { data: business } = await supabase
    .from("business_profiles")
    .select("id")
    .eq("user_id", user.id)
    .single();

  if (!business) {
    return NextResponse.json({ error: "No business profile" }, { status: 404 });
  }

  const { data, error } = await supabase
    .from("interview_availability")
    .select("*, interview_availability_blocks(*)")
    .eq("business_id", business.id)
    .order("date", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ availability: data });
}

// POST — create a new availability window
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: business } = await supabase
    .from("business_profiles")
    .select("id")
    .eq("user_id", user.id)
    .single();

  if (!business) {
    return NextResponse.json({ error: "No business profile" }, { status: 404 });
  }

  const body = await request.json();
  const {
    date,
    start_time,
    end_time,
    timezone,
    slot_duration_minutes,
    buffer_minutes,
    blocks,
  } = body as {
    date: string;
    start_time: string;
    end_time: string;
    timezone: string;
    slot_duration_minutes: number;
    buffer_minutes: number;
    blocks?: { start_time: string; end_time: string; reason?: string }[];
  };

  // Validate required fields
  if (!date || !start_time || !end_time) {
    return NextResponse.json({ error: "date, start_time, and end_time are required" }, { status: 400 });
  }

  // Insert availability window
  const { data: availability, error } = await supabase
    .from("interview_availability")
    .insert({
      business_id: business.id,
      date,
      start_time,
      end_time,
      timezone: timezone || "America/Denver",
      slot_duration_minutes: slot_duration_minutes || 30,
      buffer_minutes: buffer_minutes ?? 10,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Insert blocks if provided
  if (blocks && blocks.length > 0) {
    const blockRows = blocks.map((b) => ({
      availability_id: availability.id,
      start_time: b.start_time,
      end_time: b.end_time,
      reason: b.reason || null,
    }));

    const { error: blockError } = await supabase
      .from("interview_availability_blocks")
      .insert(blockRows);

    if (blockError) {
      return NextResponse.json({ error: blockError.message }, { status: 500 });
    }
  }

  return NextResponse.json({ availability }, { status: 201 });
}
