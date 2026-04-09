import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { rateLimit } from "@/lib/rate-limit";

/**
 * GET /api/conversations
 * List all conversations for the authenticated user,
 * including other participant info, last message, and unread count.
 */
export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const admin = createAdminClient();

    // Get conversations the user is in
    const { data: participations } = await admin
      .from("conversation_participants")
      .select("conversation_id")
      .eq("user_id", user.id);

    if (!participations || participations.length === 0) {
      return NextResponse.json({ conversations: [] });
    }

    const convIds = participations.map((p) => p.conversation_id);

    // Get other participants in those conversations
    const { data: otherParticipants } = await admin
      .from("conversation_participants")
      .select("conversation_id, user_id, role")
      .in("conversation_id", convIds)
      .neq("user_id", user.id);

    // Look up display names
    const otherUserIds = [
      ...new Set((otherParticipants || []).map((p) => p.user_id)),
    ];
    const names: Record<string, { name: string; role: string }> = {};

    if (otherUserIds.length > 0) {
      const { data: workerProfiles } = await admin
        .from("worker_profiles")
        .select("user_id, first_name, last_name")
        .in("user_id", otherUserIds);
      workerProfiles?.forEach((wp) => {
        names[wp.user_id] = {
          name:
            [wp.first_name, wp.last_name].filter(Boolean).join(" ") ||
            "Worker",
          role: "Worker",
        };
      });

      const { data: bizProfiles } = await admin
        .from("business_profiles")
        .select("user_id, business_name")
        .in("user_id", otherUserIds);
      bizProfiles?.forEach((bp) => {
        names[bp.user_id] = {
          name: bp.business_name || "Business",
          role: "Employer",
        };
      });
    }

    // Build conversation list with last message + unread count
    const conversations = [];
    for (const convId of convIds) {
      const otherP = otherParticipants?.find(
        (p) => p.conversation_id === convId
      );
      const otherUserId = otherP?.user_id || "";
      const otherInfo = names[otherUserId] || { name: "Unknown", role: "User" };

      const { data: latestMsg } = await admin
        .from("messages")
        .select("content, created_at")
        .eq("conversation_id", convId)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      const { count: unread } = await admin
        .from("messages")
        .select("id", { count: "exact", head: true })
        .eq("conversation_id", convId)
        .eq("read", false)
        .neq("sender_id", user.id);

      conversations.push({
        id: convId,
        otherName: otherInfo.name,
        otherRole: otherInfo.role,
        otherUserId,
        lastMessage: latestMsg?.content || "",
        lastMessageAt: latestMsg?.created_at || new Date().toISOString(),
        unreadCount: unread ?? 0,
      });
    }

    conversations.sort(
      (a, b) =>
        new Date(b.lastMessageAt).getTime() -
        new Date(a.lastMessageAt).getTime()
    );

    return NextResponse.json({ conversations });
  } catch (error) {
    console.error("Error loading conversations:", error);
    return NextResponse.json(
      { error: "Failed to load conversations" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/conversations
 * Find or create a conversation between two users.
 * Inserts the initial message if provided.
 * Returns the conversation_id.
 */
export async function POST(request: Request) {
  const rateLimited = await rateLimit(request);
  if (rateLimited) return rateLimited;

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

        // Get other participant name for client
        const otherName = await getOtherParticipantName(admin, targetUserId);

        return NextResponse.json({
          conversationId: existingConvId,
          isNew: false,
          otherName,
          otherUserId: targetUserId,
          initialMessage: initialMessage?.trim() || null,
        });
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

    // Get other participant name for client
    const otherName = await getOtherParticipantName(admin, targetUserId);

    return NextResponse.json({
      conversationId: conv.id,
      isNew: true,
      otherName,
      otherUserId: targetUserId,
      initialMessage: initialMessage?.trim() || null,
    });
  } catch (error) {
    console.error("Error finding/creating conversation:", error);
    return NextResponse.json({ error: "Failed to create conversation" }, { status: 500 });
  }
}

/** Look up a user's display name (business name or worker name) */
async function getOtherParticipantName(
  admin: ReturnType<typeof createAdminClient>,
  userId: string
): Promise<string> {
  const { data: biz } = await admin
    .from("business_profiles")
    .select("business_name")
    .eq("user_id", userId)
    .single();
  if (biz?.business_name) return biz.business_name;

  const { data: worker } = await admin
    .from("worker_profiles")
    .select("first_name, last_name")
    .eq("user_id", userId)
    .single();
  if (worker) {
    return [worker.first_name, worker.last_name].filter(Boolean).join(" ") || "User";
  }

  return "User";
}
