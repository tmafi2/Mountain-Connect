import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createNotification } from "@/lib/notifications/create";
import { sendNewMessageEmail } from "@/lib/email/send";

/**
 * POST /api/admin/confirm-business
 * Admin approves, rejects, or requests info from a business registration.
 */
export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // Verify admin role
    const admin = createAdminClient();
    const { data: adminUser } = await admin.from("users").select("role").eq("id", user.id).single();
    if (adminUser?.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { businessId, action, message } = await request.json();
    if (!businessId || !action) return NextResponse.json({ error: "Missing businessId or action" }, { status: 400 });

    // Get business details
    const { data: business } = await admin
      .from("business_profiles")
      .select("id, user_id, business_name, email")
      .eq("id", businessId)
      .single();

    if (!business) return NextResponse.json({ error: "Business not found" }, { status: 404 });

    if (action === "approve") {
      await admin.from("business_profiles").update({
        verification_status: "verified",
        is_verified: true,
        show_verified_celebration: true,
        updated_at: new Date().toISOString(),
      }).eq("id", businessId);

      await createNotification({
        userId: business.user_id,
        type: "general",
        title: "Registration Approved!",
        message: "Congratulations! Your business has been verified. Your profile and job listings are now live. Welcome to Mountain Connect!",
        link: "/business/dashboard",
      });

      // Send email
      const { data: bizUser } = await admin.auth.admin.getUserById(business.user_id);
      if (bizUser?.user?.email) {
        sendNewMessageEmail({
          to: bizUser.user.email,
          recipientName: business.business_name,
          senderName: "Mountain Connect Admin",
          messagePreview: "Your business registration has been approved! Your profile and job listings are now live on Mountain Connect.",
          conversationUrl: "https://www.mountainconnects.com/business/dashboard",
        }).catch(() => {});
      }

    } else if (action === "reject") {
      await admin.from("business_profiles").update({
        verification_status: "rejected",
        is_verified: false,
        updated_at: new Date().toISOString(),
      }).eq("id", businessId);

      await createNotification({
        userId: business.user_id,
        type: "general",
        title: "Registration Not Approved",
        message: message || "Your registration was not approved. Please update your profile and it will be re-reviewed.",
        link: "/business/company-profile",
      });

      const { data: bizUser } = await admin.auth.admin.getUserById(business.user_id);
      if (bizUser?.user?.email) {
        sendNewMessageEmail({
          to: bizUser.user.email,
          recipientName: business.business_name,
          senderName: "Mountain Connect Admin",
          messagePreview: message || "Your business registration was not approved. Please update your profile and resubmit.",
          conversationUrl: "https://www.mountainconnects.com/business/company-profile",
        }).catch(() => {});
      }

    } else if (action === "request_info") {
      await createNotification({
        userId: business.user_id,
        type: "general",
        title: "Additional Information Requested",
        message: message || "Our team needs more information to complete your registration review. Please check your profile.",
        link: "/business/company-profile",
      });

      const { data: bizUser } = await admin.auth.admin.getUserById(business.user_id);
      if (bizUser?.user?.email) {
        sendNewMessageEmail({
          to: bizUser.user.email,
          recipientName: business.business_name,
          senderName: "Mountain Connect Admin",
          messagePreview: message || "We need more information to complete your registration review. Please update your company profile.",
          conversationUrl: "https://www.mountainconnects.com/business/company-profile",
        }).catch(() => {});
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error confirming business:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
