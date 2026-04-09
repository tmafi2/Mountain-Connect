import { NextResponse } from "next/server";
import { after } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendNewMessageEmail } from "@/lib/email/send";

/**
 * POST /api/messages/send
 * Send a message in a conversation the user belongs to.
 * Uses admin client to bypass RLS race conditions.
 */
export async function POST(request: Request) {
  try {
    // Auth check
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { conversationId, content } = await request.json();

    if (!conversationId || !content?.trim()) {
      return NextResponse.json(
        { error: "Missing conversationId or content" },
        { status: 400 }
      );
    }

    const admin = createAdminClient();

    // Verify the user is a participant in this conversation
    const { data: participant } = await admin
      .from("conversation_participants")
      .select("id")
      .eq("conversation_id", conversationId)
      .eq("user_id", user.id)
      .single();

    if (!participant) {
      return NextResponse.json(
        { error: "Not a participant in this conversation" },
        { status: 403 }
      );
    }

    // Insert the message
    const { data: message, error: msgError } = await admin
      .from("messages")
      .insert({
        conversation_id: conversationId,
        sender_id: user.id,
        content: content.trim(),
      })
      .select("id, conversation_id, sender_id, content, read, created_at")
      .single();

    if (msgError) {
      console.error("Message insert error:", msgError);
      return NextResponse.json(
        { error: "Failed to send message" },
        { status: 500 }
      );
    }

    // Update conversation timestamp
    await admin
      .from("conversations")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", conversationId);

    // Send email notification in the background (non-blocking)
    after(async () => {
      try {
        await sendMessageEmailIfNeeded(admin, user.id, conversationId, content.trim());
      } catch (err) {
        console.error("Message email notification error:", err);
      }
    });

    return NextResponse.json({ message });
  } catch (error) {
    console.error("Error sending message:", error);
    return NextResponse.json(
      { error: "Failed to send message" },
      { status: 500 }
    );
  }
}

const EMAIL_COOLDOWN_MS = 5 * 60 * 1000; // 5 minutes
const ACTIVE_THRESHOLD_MS = 2 * 60 * 1000; // 2 minutes

/**
 * Send an email notification to the other participant(s) if:
 * 1. They haven't received an email for this conversation in the last 5 minutes
 * 2. They haven't read messages in the last 2 minutes (i.e. they're not actively in the chat)
 */
async function sendMessageEmailIfNeeded(
  admin: ReturnType<typeof createAdminClient>,
  senderId: string,
  conversationId: string,
  messageContent: string
) {
  // Get all other participants in this conversation
  const { data: participants } = await admin
    .from("conversation_participants")
    .select("user_id, last_message_email_at, last_read_at")
    .eq("conversation_id", conversationId)
    .neq("user_id", senderId);

  if (!participants || participants.length === 0) return;

  const now = new Date();

  // Get sender name
  const { data: senderUser } = await admin
    .from("users")
    .select("full_name")
    .eq("id", senderId)
    .single();

  const senderName = senderUser?.full_name || "Someone";

  for (const participant of participants) {
    // Check cooldown — skip if email was sent recently
    if (participant.last_message_email_at) {
      const lastEmailAt = new Date(participant.last_message_email_at);
      if (now.getTime() - lastEmailAt.getTime() < EMAIL_COOLDOWN_MS) {
        continue;
      }
    }

    // Check if recipient is actively in the chat (read messages recently)
    if (participant.last_read_at) {
      const lastReadAt = new Date(participant.last_read_at);
      if (now.getTime() - lastReadAt.getTime() < ACTIVE_THRESHOLD_MS) {
        continue;
      }
    }

    // Get recipient details
    const { data: recipientUser } = await admin
      .from("users")
      .select("email, full_name")
      .eq("id", participant.user_id)
      .single();

    if (!recipientUser?.email) continue;

    // Determine the correct messages URL based on user role
    const { data: roleData } = await admin
      .from("users")
      .select("role")
      .eq("id", participant.user_id)
      .single();

    const basePath = roleData?.role === "business_owner" ? "/business/messages" : "/messages";
    const conversationUrl = `${process.env.NEXT_PUBLIC_SITE_URL || "https://mountainconnects.com"}${basePath}?conv=${conversationId}`;

    // Truncate message preview to 150 chars
    const messagePreview =
      messageContent.length > 150
        ? messageContent.slice(0, 150) + "..."
        : messageContent;

    await sendNewMessageEmail({
      to: recipientUser.email,
      recipientName: recipientUser.full_name || "there",
      senderName,
      messagePreview,
      conversationUrl,
    });

    // Update throttle timestamp
    await admin
      .from("conversation_participants")
      .update({ last_message_email_at: now.toISOString() })
      .eq("conversation_id", conversationId)
      .eq("user_id", participant.user_id);
  }
}
