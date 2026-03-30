import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * POST /api/conversations
 * Find or create a conversation between two users.
 * Inserts the initial message if provided.
 * Returns the conversation_id.
 */
export async function POST(request: Request) {
  try {
    // Auth check via user-scoped client
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { targetUserId, initialMessage } = await request.json();
    if (!targetUserId) return NextResponse.json({ error: "Missing targetUserId" }, { status: 400 });

    // Use admin client for all DB mutations (bypasses RLS)
    const admin = createAdminClient();

    // Check if a conversation already exists between these two users
    const { data: myConvs } = await admin
      .from("conversation_participants")
      .select("conversation_id")
      .eq("user_id", user.id);

    if (myConvs && myConvs.length > 0) {
      const myConvIds = myConvs.map((c) => c.conversation_id);
      const { data: existing } = await admin
        .from("conversation_participants")
        .select("conversation_id")
        .eq("user_id", targetUserId)
        .in("conversation_id", myConvIds);

      if (existing && existing.length > 0) {
        const existingConvId = existing[0].conversation_id;

        // Insert the initial message if provided
        if (initialMessage?.trim()) {
          const { error: msgErr } = await admin.from("messages").insert({
            conversation_id: existingConvId,
            sender_id: user.id,
            content: initialMessage.trim(),
          });
          if (msgErr) console.error("Message insert error:", msgErr);

          await admin
            .from("conversations")
            .update({ updated_at: new Date().toISOString() })
            .eq("id", existingConvId);
        }

        return NextResponse.json({ conversationId: existingConvId });
      }
    }

    // Create new conversation
    const { data: conv, error: convError } = await admin
      .from("conversations")
      .insert({})
      .select("id")
      .single();

    if (convError || !conv) {
      throw convError || new Error("Failed to create conversation");
    }

    // Determine roles
    const { data: bizProfile } = await admin
      .from("business_profiles")
      .select("id")
      .eq("user_id", user.id)
      .single();

    const currentRole = bizProfile ? "employer" : "applicant";
    const targetRole = currentRole === "employer" ? "applicant" : "employer";

    // Add both participants
    const { error: partErr } = await admin.from("conversation_participants").insert([
      { conversation_id: conv.id, user_id: user.id, role: currentRole },
      { conversation_id: conv.id, user_id: targetUserId, role: targetRole },
    ]);
    if (partErr) {
      console.error("Participant insert error:", partErr);
      throw partErr;
    }

    // Insert the initial message if provided
    if (initialMessage?.trim()) {
      const { error: msgErr } = await admin.from("messages").insert({
        conversation_id: conv.id,
        sender_id: user.id,
        content: initialMessage.trim(),
      });
      if (msgErr) console.error("Message insert error:", msgErr);

      await admin
        .from("conversations")
        .update({ updated_at: new Date().toISOString() })
        .eq("id", conv.id);
    }

    return NextResponse.json({ conversationId: conv.id });
  } catch (error) {
    console.error("Error finding/creating conversation:", error);
    return NextResponse.json({ error: "Failed to create conversation" }, { status: 500 });
  }
}
