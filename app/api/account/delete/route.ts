import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { rateLimit } from "@/lib/rate-limit";

export async function POST(request: Request) {
  try {
    const rateLimited = await rateLimit(request);
    if (rateLimited) return rateLimited;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const admin = createAdminClient();

    // Delete user data from related tables (cascade handles most via FK)
    // But explicitly clean up profile data and storage
    const { data: workerProfile } = await admin
      .from("worker_profiles")
      .select("id")
      .eq("user_id", user.id)
      .single();

    const { data: businessProfile } = await admin
      .from("business_profiles")
      .select("id")
      .eq("user_id", user.id)
      .single();

    // Delete job posts if business owner
    if (businessProfile) {
      await admin.from("job_posts").delete().eq("business_id", businessProfile.id);
      await admin.from("business_profiles").delete().eq("id", businessProfile.id);
    }

    // Delete worker profile
    if (workerProfile) {
      await admin.from("worker_profiles").delete().eq("id", workerProfile.id);
    }

    // Delete referrals
    await admin.from("referrals").delete().eq("referrer_id", user.id);
    await admin.from("referrals").delete().eq("referred_user_id", user.id);

    // Delete notifications
    await admin.from("notifications").delete().eq("user_id", user.id);

    // Delete newsletter and waitlist subscriptions by email
    const userEmail = user.email;
    if (userEmail) {
      await admin.from("newsletter_subscribers").delete().eq("email", userEmail);
      await admin.from("waitlist_signups").delete().eq("email", userEmail);
    }

    // Delete support reports
    await admin.from("support_reports").delete().eq("user_id", user.id);

    // Delete the user record
    await admin.from("users").delete().eq("id", user.id);

    // Delete the auth user
    const { error } = await admin.auth.admin.deleteUser(user.id);
    if (error) {
      console.error("Error deleting auth user:", error);
      return NextResponse.json({ error: "Failed to delete account" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Account deletion error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
