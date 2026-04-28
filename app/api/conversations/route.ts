import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { rateLimit } from "@/lib/rate-limit";

type OtherProfile = {
  name: string;
  role: "Worker" | "Employer" | "User";
  avatarUrl: string | null;
  location: string | null;
  worker: {
    workerProfileId: string;
    nationality: string | null;
    bio: string | null;
    skills: string[];
    languages: { language: string; proficiency: string }[];
    yearsExperience: number;
  } | null;
  business: {
    businessProfileId: string;
    slug: string | null;
    description: string | null;
    yearEstablished: number | null;
  } | null;
};

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

    // Look up display info for every "other" user — names + a small profile
    // snapshot so the message list can render avatars and the chat header
    // popover can show profile details without a second request.
    const otherUserIds = [
      ...new Set((otherParticipants || []).map((p) => p.user_id)),
    ];
    const profiles: Record<string, OtherProfile> = {};

    if (otherUserIds.length > 0) {
      const [{ data: workerProfiles }, { data: bizProfiles }] =
        await Promise.all([
          admin
            .from("worker_profiles")
            .select(
              "id, user_id, first_name, last_name, avatar_url, profile_photo_url, nationality, location_current, bio, skills, languages, years_seasonal_experience"
            )
            .in("user_id", otherUserIds),
          admin
            .from("business_profiles")
            .select(
              "id, user_id, business_name, logo_url, location, description, year_established, slug"
            )
            .in("user_id", otherUserIds),
        ]);

      workerProfiles?.forEach((wp) => {
        profiles[wp.user_id] = {
          name:
            [wp.first_name, wp.last_name].filter(Boolean).join(" ") || "Worker",
          role: "Worker",
          avatarUrl: wp.avatar_url || wp.profile_photo_url || null,
          location: wp.location_current || null,
          worker: {
            workerProfileId: wp.id,
            nationality: wp.nationality || null,
            bio: wp.bio || null,
            skills: (wp.skills as string[]) || [],
            languages:
              (wp.languages as { language: string; proficiency: string }[]) || [],
            yearsExperience: (wp.years_seasonal_experience as number) || 0,
          },
          business: null,
        };
      });
      bizProfiles?.forEach((bp) => {
        profiles[bp.user_id] = {
          name: bp.business_name || "Business",
          role: "Employer",
          avatarUrl: bp.logo_url || null,
          location: bp.location || null,
          worker: null,
          business: {
            businessProfileId: bp.id,
            slug: bp.slug || null,
            description: bp.description || null,
            yearEstablished: bp.year_established || null,
          },
        };
      });
    }

    // ── Bulk-fetch the message data for ALL conversations at once.
    //
    // Previously this section ran 2 queries per conversation (latest
    // message + unread count) wrapped in a per-conv Promise.all, so a
    // user with 30 conversations was firing 60 DB round-trips on every
    // load. Replaced with two bulk queries plus in-memory aggregation:
    //
    //   1. Fetch recent messages across all convs (capped). Dedupe by
    //      conversation_id in JS to get each conv's latest message.
    //   2. Fetch all unread messages where the caller wasn't the sender.
    //      Group + count in JS for per-conv unread totals.
    //
    // Wall-clock latency drops from ~O(N) round-trips to O(1) regardless
    // of conversation count.
    const recentLimit = Math.max(convIds.length * 5, 50);
    const [latestMsgsRes, unreadMsgsRes] = await Promise.all([
      admin
        .from("messages")
        .select("conversation_id, content, created_at")
        .in("conversation_id", convIds)
        .order("created_at", { ascending: false })
        .limit(recentLimit),
      admin
        .from("messages")
        .select("conversation_id")
        .in("conversation_id", convIds)
        .eq("read", false)
        .neq("sender_id", user.id),
    ]);

    // Walk recent messages in created_at desc order and keep the first
    // we see per conversation — that's the latest message for that conv.
    const latestByConv = new Map<string, { content: string; created_at: string }>();
    for (const m of latestMsgsRes.data ?? []) {
      const cid = m.conversation_id as string;
      if (!latestByConv.has(cid)) {
        latestByConv.set(cid, { content: m.content as string, created_at: m.created_at as string });
      }
    }

    const unreadByConv = new Map<string, number>();
    for (const m of unreadMsgsRes.data ?? []) {
      const cid = m.conversation_id as string;
      unreadByConv.set(cid, (unreadByConv.get(cid) ?? 0) + 1);
    }

    const conversations = convIds.map((convId) => {
      const otherP = otherParticipants?.find((p) => p.conversation_id === convId);
      const otherUserId = otherP?.user_id || "";
      const otherInfo: OtherProfile = profiles[otherUserId] || {
        name: "Unknown",
        role: "User",
        avatarUrl: null,
        location: null,
        worker: null,
        business: null,
      };
      const latest = latestByConv.get(convId);
      return {
        id: convId,
        otherName: otherInfo.name,
        otherRole: otherInfo.role,
        otherUserId,
        otherAvatarUrl: otherInfo.avatarUrl,
        otherLocation: otherInfo.location,
        otherWorker: otherInfo.worker,
        otherBusiness: otherInfo.business,
        lastMessage: latest?.content || "",
        lastMessageAt: latest?.created_at || new Date().toISOString(),
        unreadCount: unreadByConv.get(convId) ?? 0,
      };
    });

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
