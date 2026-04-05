import { NextResponse } from "next/server";
import { createNotification } from "@/lib/notifications/create";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendBusinessVerifiedEmail } from "@/lib/email/send";
import { rateLimit } from "@/lib/rate-limit";

/**
 * POST /api/notifications/verify-business
 * Called when an admin verifies a business. Creates a notification
 * and sets the celebration flag for the confetti popup.
 */
export async function POST(request: Request) {
  const rateLimited = await rateLimit(request, { identifier: "notif-verify" });
  if (rateLimited) return rateLimited;

  try {
    const { userId, businessName, businessId } = await request.json();

    if (!userId || !businessName || !businessId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Create the notification
    await createNotification({
      userId,
      type: "general",
      title: "You've been verified!",
      message: `${businessName}, you have been verified! Your business now has a verified badge and priority placement.`,
      link: "/business/dashboard",
    });

    // Set the celebration flag
    const supabase = createAdminClient();
    await supabase
      .from("business_profiles")
      .update({ show_verified_celebration: true })
      .eq("id", businessId);

    // Send verification email to the business owner
    const { data: businessUser } = await supabase.auth.admin.getUserById(userId);
    if (businessUser?.user?.email) {
      const dashboardUrl = `${process.env.NEXT_PUBLIC_SITE_URL || "https://mountainconnects.com"}/business/dashboard`;
      sendBusinessVerifiedEmail({
        to: businessUser.user.email,
        businessName,
        dashboardUrl,
      }).catch((err) => console.error("Failed to send business verified email:", err));
    }

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error("Error creating verification notification:", error);
    return NextResponse.json(
      { error: "Failed to create notification" },
      { status: 500 }
    );
  }
}
