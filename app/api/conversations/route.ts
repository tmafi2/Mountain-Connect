import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * POST /api/conversations
 * Find or create a conversation between two users.
 * Returns the conversation_id.
 */
export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { targetUserId } = await request.json();
    if (!targetUserId) return NextResponse.json({ error: "Missing targetUserId" }, { status: 400 });

    // Check if a conversation already exists between these two users
    const { data: myConvs } = await supabase
      .from("conversation_participants")
      .select("conversation_id")
      .eq("user_id", user.id);

    if (myConvs && myConvs.length > 0) {
      const myConvIds = myConvs.map((c) => c.conversation_id);
      const { data: existing } = await supabase
        .from("conversation_participants")
        .select("conversation_id")
        .eq("user_id", targetUserId)
        .in("conversation_id", myConvIds);

      if (existing && existing.length > 0) {
        return NextResponse.json({ conversationId: existing[0].conversation_id });
      }
    }

    // Create new conversation
    const { data: conv, error: convError } = await supabase
      .from("conversations")
      .insert({})
      .select("id")
      .single();

    if (convError || !conv) {
      throw convError || new Error("Failed to create conversation");
    }

    // Determine roles
    const { data: bizProfile } = await supabase
      .from("business_profiles")
      .select("id")
      .eq("user_id", user.id)
      .single();

    const currentRole = bizProfile ? "employer" : "applicant";
    const targetRole = currentRole === "employer" ? "applicant" : "employer";

    // Add both participants
    await supabase.from("conversation_participants").insert([
      { conversation_id: conv.id, user_id: user.id, role: currentRole },
      { conversation_id: conv.id, user_id: targetUserId, role: targetRole },
    ]);

    return NextResponse.json({ conversationId: conv.id });
  } catch (error) {
    console.error("Error finding/creating conversation:", error);
    return NextResponse.json({ error: "Failed to create conversation" }, { status: 500 });
  }
}
