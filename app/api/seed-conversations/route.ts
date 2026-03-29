import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

/**
 * POST /api/seed-conversations
 * Seeds demo conversations for the currently logged-in business user.
 * Looks up real applicants from the database and creates conversations
 * with realistic messages. Safe to call multiple times — skips if
 * conversations already exist.
 */
export async function POST() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const admin = createAdminClient();

    // Get the business profile for this user
    const { data: bizProfile } = await admin
      .from("business_profiles")
      .select("id, business_name")
      .eq("user_id", user.id)
      .single();

    if (!bizProfile) {
      return NextResponse.json({ error: "No business profile found" }, { status: 404 });
    }

    // Check if this business already has conversations
    const { data: existingParticipations } = await admin
      .from("conversation_participants")
      .select("id")
      .eq("user_id", user.id)
      .limit(1);

    if (existingParticipations && existingParticipations.length > 0) {
      return NextResponse.json({ message: "Conversations already exist", skipped: true });
    }

    // Find applicants who applied to this business's jobs
    const { data: jobIds } = await admin
      .from("job_posts")
      .select("id")
      .eq("business_id", bizProfile.id);

    if (!jobIds || jobIds.length === 0) {
      return NextResponse.json({ error: "No job posts found for this business" }, { status: 404 });
    }

    const { data: applications } = await admin
      .from("applications")
      .select("id, worker_id, job_post_id, worker_profiles(user_id, first_name, last_name), job_posts(title)")
      .in("job_post_id", jobIds.map((j) => j.id))
      .order("applied_at", { ascending: false })
      .limit(10);

    if (!applications || applications.length === 0) {
      return NextResponse.json({ error: "No applicants found" }, { status: 404 });
    }

    // Pick up to 3 distinct applicants
    const seen = new Set<string>();
    const selectedApplicants: { userId: string; name: string; jobTitle: string }[] = [];

    for (const app of applications) {
      const wp = app.worker_profiles as unknown as { user_id: string; first_name: string | null; last_name: string | null } | null;
      const jp = app.job_posts as unknown as { title: string } | null;
      if (!wp?.user_id || seen.has(wp.user_id)) continue;
      seen.add(wp.user_id);
      selectedApplicants.push({
        userId: wp.user_id,
        name: [wp.first_name, wp.last_name].filter(Boolean).join(" ") || "Applicant",
        jobTitle: jp?.title || "a position",
      });
      if (selectedApplicants.length >= 3) break;
    }

    if (selectedApplicants.length === 0) {
      return NextResponse.json({ error: "No applicant user IDs found" }, { status: 404 });
    }

    const bizName = bizProfile.business_name || "our team";
    const now = new Date();
    let created = 0;

    // Conversation templates — messages adapt to applicant names
    const templates = [
      {
        // Conversation 1: Interview details & start date
        messages: (applicantName: string, jobTitle: string) => [
          { fromBiz: true, content: `Hi ${applicantName.split(" ")[0]}, thanks for applying for the ${jobTitle} role! We'd love to chat with you about the position. Are you available for a quick video call this week?`, hoursAgo: 72 },
          { fromBiz: false, content: `Hi! Yes, I'd love to chat. I'm available Wednesday or Thursday afternoon if that works for you?`, hoursAgo: 68 },
          { fromBiz: true, content: `Thursday at 2pm works perfectly. I'll send you a calendar invite with the video link. Looking forward to learning more about your experience!`, hoursAgo: 48 },
          { fromBiz: false, content: `That's great, thank you! I've been reading up on ${bizName} and I'm really excited about the opportunity. Quick question — what's the expected start date for the season?`, hoursAgo: 46 },
          { fromBiz: true, content: `We're looking at a mid-June start for the winter season. Staff accommodation is available from June 1st if you need to arrive early to settle in. See you Thursday!`, hoursAgo: 44 },
        ],
      },
      {
        // Conversation 2: Accommodation questions
        messages: (applicantName: string, jobTitle: string) => [
          { fromBiz: false, content: `Hi there! I applied for the ${jobTitle} position and had a few questions about the accommodation options. Is staff housing included?`, hoursAgo: 36 },
          { fromBiz: true, content: `Hey ${applicantName.split(" ")[0]}! Great question. Yes, we offer subsidised staff accommodation — shared rooms are around $120/week which includes utilities and wifi. We also have a few single rooms available for $180/week.`, hoursAgo: 30 },
          { fromBiz: false, content: `That sounds really reasonable! Is the housing close to the resort or would I need transport?`, hoursAgo: 28 },
          { fromBiz: true, content: `It's about a 5-minute drive — we run a free staff shuttle that departs every 30 minutes during operating hours. Most staff find it really convenient. Would you like me to reserve a spot for you?`, hoursAgo: 24 },
        ],
      },
      {
        // Conversation 3: Acceptance confirmation
        messages: (applicantName: string, jobTitle: string) => [
          { fromBiz: true, content: `Hi ${applicantName.split(" ")[0]}, congratulations! We'd like to offer you the ${jobTitle} position at ${bizName}. 🎉 I've sent the formal offer through the platform. Let me know if you have any questions!`, hoursAgo: 18 },
          { fromBiz: false, content: `Wow, thank you so much! I'm thrilled to accept. This is going to be an amazing season! What do I need to prepare before my start date?`, hoursAgo: 14 },
          { fromBiz: true, content: `Fantastic news! Here's what you'll need:\n1. Valid ID/passport\n2. Tax file number\n3. Working with children check (if applicable)\n4. Any relevant certifications\n\nWe'll send a full onboarding pack via email closer to the start date.`, hoursAgo: 12 },
          { fromBiz: false, content: `Perfect, I'll get all of that sorted. Can't wait to join the team! 🏔️`, hoursAgo: 10 },
          { fromBiz: true, content: `We're excited to have you on board! Feel free to message me here if anything else comes up before the season starts. Welcome to the team! 🙌`, hoursAgo: 8 },
        ],
      },
    ];

    for (let i = 0; i < selectedApplicants.length; i++) {
      const applicant = selectedApplicants[i];
      const template = templates[i % templates.length];

      // Create conversation
      const { data: conv, error: convError } = await admin
        .from("conversations")
        .insert({ updated_at: new Date(now.getTime() - template.messages(applicant.name, applicant.jobTitle)[template.messages(applicant.name, applicant.jobTitle).length - 1].hoursAgo * 3600000).toISOString() })
        .select("id")
        .single();

      if (convError || !conv) {
        console.error("Failed to create conversation:", convError);
        continue;
      }

      // Add participants
      await admin.from("conversation_participants").insert([
        { conversation_id: conv.id, user_id: user.id, role: "employer" },
        { conversation_id: conv.id, user_id: applicant.userId, role: "applicant" },
      ]);

      // Add messages
      const msgs = template.messages(applicant.name, applicant.jobTitle);
      for (const msg of msgs) {
        const senderId = msg.fromBiz ? user.id : applicant.userId;
        const createdAt = new Date(now.getTime() - msg.hoursAgo * 3600000).toISOString();

        await admin.from("messages").insert({
          conversation_id: conv.id,
          sender_id: senderId,
          content: msg.content,
          read: true, // Mark all seeded messages as read
          created_at: createdAt,
        });
      }

      // Leave the last message from applicant as unread (if applicable)
      const lastMsg = msgs[msgs.length - 1];
      if (!lastMsg.fromBiz) {
        const { data: lastDbMsg } = await admin
          .from("messages")
          .select("id")
          .eq("conversation_id", conv.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .single();

        if (lastDbMsg) {
          await admin.from("messages").update({ read: false }).eq("id", lastDbMsg.id);
        }
      }

      created++;
    }

    return NextResponse.json({ success: true, conversationsCreated: created });
  } catch (error) {
    console.error("Error seeding conversations:", error);
    return NextResponse.json({ error: "Failed to seed conversations" }, { status: 500 });
  }
}
