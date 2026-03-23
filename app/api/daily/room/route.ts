import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createRoom } from "@/lib/daily/client";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { interview_id } = body as { interview_id: string };

  if (!interview_id) {
    return NextResponse.json({ error: "interview_id is required" }, { status: 400 });
  }

  const admin = createAdminClient();

  // Verify the interview exists and user is a participant
  const { data: interview } = await admin
    .from("interviews")
    .select("id, business_id, worker_id, video_room_name, video_room_url, status")
    .eq("id", interview_id)
    .single();

  if (!interview) {
    return NextResponse.json({ error: "Interview not found" }, { status: 404 });
  }

  if (interview.status !== "scheduled") {
    return NextResponse.json({ error: "Interview must be in scheduled status" }, { status: 400 });
  }

  // If room already exists, return it
  if (interview.video_room_name && interview.video_room_url) {
    return NextResponse.json({
      room_name: interview.video_room_name,
      room_url: interview.video_room_url,
    });
  }

  // Create a new room
  const roomName = `mc-interview-${interview_id.slice(0, 8)}`;
  const room = await createRoom(roomName);

  if (!room) {
    return NextResponse.json({ error: "Failed to create video room" }, { status: 500 });
  }

  // Save room info to interview
  await admin
    .from("interviews")
    .update({
      video_room_name: room.name,
      video_room_url: room.url,
      updated_at: new Date().toISOString(),
    })
    .eq("id", interview_id);

  return NextResponse.json({
    room_name: room.name,
    room_url: room.url,
  });
}
