import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendNewMessageEmail } from "@/lib/email/send";
import { rateLimit } from "@/lib/rate-limit";

/**
 * POST /api/emails/new-message
 * Sends an email notification for a new message.
 * Deduplicates: only sends if no email was sent for this conversation in the last 5 minutes.
 */
export async function POST(request: Request) {
  const rateLimited = await rateLimit(request, { identifier: "email" });
  if (rateLimited) return rateLimited;

  try {
    const { conversationId, senderId, messageContent } = await request.json();

    if (!conversationId || !senderId || !messageContent) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const supabase = createAdminClient();

    // Find the recipient (other participant)
    const { data: participants } = await supabase
      .from("conversation_participants")
      .select("user_id")
      .eq("conversation_id", conversationId)
      .neq("user_id", senderId);

    if (!participants || participants.length === 0) {
      return NextResponse.json({ success: true, skipped: true, reason: "No recipient" });
    }

    const recipientUserId = participants[0].user_id;

    // Check for recent email notification (within 5 minutes) to avoid spam
    const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    const { data: recentNotif } = await supabase
      .from("notifications")
      .select("id, created_at")
      .eq("user_id", recipientUserId)
      .eq("type", "new_message")
      .gte("created_at", fiveMinAgo)
      .limit(1);

    if (recentNotif && recentNotif.length > 0) {
      return NextResponse.json({ success: true, skipped: true, reason: "Recent email exists" });
    }

    // Get sender name
    let senderName = "Someone";
    const { data: bizProfile } = await supabase
      .from("business_profiles")
      .select("business_name")
      .eq("user_id", senderId)
      .single();

    if (bizProfile?.business_name) {
      senderName = bizProfile.business_name;
    } else {
      const { data: workerProfile } = await supabase
        .from("worker_profiles")
        .select("first_name, last_name")
        .eq("user_id", senderId)
        .single();
      if (workerProfile) {
        senderName = [workerProfile.first_name, workerProfile.last_name].filter(Boolean).join(" ") || "Someone";
      }
    }

    // Get recipient name and email
    let recipientName = "there";
    const { data: recipientBiz } = await supabase
      .from("business_profiles")
      .select("business_name")
      .eq("user_id", recipientUserId)
      .single();

    if (recipientBiz?.business_name) {
      recipientName = recipientBiz.business_name;
    } else {
      const { data: recipientWorker } = await supabase
        .from("worker_profiles")
        .select("first_name")
        .eq("user_id", recipientUserId)
        .single();
      if (recipientWorker?.first_name) {
        recipientName = recipientWorker.first_name;
      }
    }

    // Get recipient email from auth
    const { data: recipientAuth } = await supabase.auth.admin.getUserById(recipientUserId);
    if (!recipientAuth?.user?.email) {
      return NextResponse.json({ success: true, skipped: true, reason: "No email" });
    }

    // Determine conversation URL based on recipient role
    const isBusiness = !!recipientBiz;
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://www.mountainconnects.com";
    const conversationUrl = isBusiness
      ? `${baseUrl}/business/messages?conv=${conversationId}`
      : `${baseUrl}/messages?conv=${conversationId}`;

    // Truncate preview
    const preview = messageContent.length > 100 ? messageContent.slice(0, 97) + "..." : messageContent;

    await sendNewMessageEmail({
      to: recipientAuth.user.email,
      recipientName,
      senderName,
      messagePreview: preview,
      conversationUrl,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error sending new message email:", error);
    return NextResponse.json({ error: "Failed to send email" }, { status: 500 });
  }
}
