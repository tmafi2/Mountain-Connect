import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createMeetingToken } from "@/lib/daily/client";
import { rateLimit } from "@/lib/rate-limit";

export async function POST(request: NextRequest) {
  const rateLimited = await rateLimit(request, { identifier: "daily-token" });
  if (rateLimited) return rateLimited;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { room_name } = body as { room_name: string };

  if (!room_name) {
    return NextResponse.json({ error: "room_name is required" }, { status: 400 });
  }

  const userName = user.user_metadata?.full_name || user.email || "Participant";
  const token = await createMeetingToken(room_name, userName);

  return NextResponse.json({ token });
}
