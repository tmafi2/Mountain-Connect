import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * GET /api/messages/unread-count
 * Returns total unread message count across all conversations for the authenticated user.
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
      return NextResponse.json({ count: 0 });
    }

    const convIds = participations.map((p) => p.conversation_id);

    // Count unread messages not sent by the user
    const { count, error } = await admin
      .from("messages")
      .select("id", { count: "exact", head: true })
      .in("conversation_id", convIds)
      .eq("read", false)
      .neq("sender_id", user.id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ count: count ?? 0 });
  } catch (error) {
    console.error("Error fetching unread message count:", error);
    return NextResponse.json({ error: "Failed to fetch count" }, { status: 500 });
  }
}
