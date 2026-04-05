import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendOnboardingReminderEmail } from "@/lib/email/send";

export async function GET(request: Request) {
  // Verify cron secret
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();

  // Find users who signed up 48+ hours ago but haven't completed onboarding
  const cutoff = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();
  // Only look at users from the last 7 days (don't spam old users)
  const maxAge = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  // Workers with incomplete profiles (no bio = didn't complete onboarding)
  const { data: incompleteWorkers } = await admin
    .from("users")
    .select("id, email, full_name")
    .eq("role", "worker")
    .lt("created_at", cutoff)
    .gt("created_at", maxAge);

  let sentCount = 0;

  for (const user of incompleteWorkers || []) {
    // Check if worker has completed onboarding (has bio)
    const { data: profile } = await admin
      .from("worker_profiles")
      .select("bio")
      .eq("user_id", user.id)
      .single();

    if (!profile || !profile.bio) {
      // Check we haven't already sent a reminder (use notifications table as a log)
      const { data: existing } = await admin
        .from("notifications")
        .select("id")
        .eq("user_id", user.id)
        .eq("type", "general")
        .like("title", "%Complete your profile%")
        .single();

      if (!existing) {
        await sendOnboardingReminderEmail({
          to: user.email,
          userName: user.full_name || "",
          accountType: "worker",
          loginUrl: "https://www.mountainconnects.com/login",
        }).catch(() => {});

        // Log the reminder as a notification so we don't send it again
        await admin.from("notifications").insert({
          user_id: user.id,
          type: "general",
          title: "Complete your profile",
          message: "Complete your Mountain Connect profile to start finding seasonal work.",
          link: "/onboarding?type=worker",
        }).catch(() => {});

        sentCount++;
      }
    }
  }

  // Businesses with incomplete profiles (no industries or website = didn't complete onboarding)
  const { data: incompleteBusinesses } = await admin
    .from("users")
    .select("id, email, full_name")
    .eq("role", "business_owner")
    .lt("created_at", cutoff)
    .gt("created_at", maxAge);

  for (const user of incompleteBusinesses || []) {
    const { data: profile } = await admin
      .from("business_profiles")
      .select("industries")
      .eq("user_id", user.id)
      .single();

    if (!profile || !profile.industries || (Array.isArray(profile.industries) && profile.industries.length === 0)) {
      const { data: existing } = await admin
        .from("notifications")
        .select("id")
        .eq("user_id", user.id)
        .eq("type", "general")
        .like("title", "%Complete your profile%")
        .single();

      if (!existing) {
        await sendOnboardingReminderEmail({
          to: user.email,
          userName: user.full_name || "",
          accountType: "business",
          loginUrl: "https://www.mountainconnects.com/login",
        }).catch(() => {});

        await admin.from("notifications").insert({
          user_id: user.id,
          type: "general",
          title: "Complete your profile",
          message: "Complete your business profile to start posting jobs on Mountain Connect.",
          link: "/onboarding?type=business",
        }).catch(() => {});

        sentCount++;
      }
    }
  }

  return NextResponse.json({ success: true, remindersSent: sentCount });
}
