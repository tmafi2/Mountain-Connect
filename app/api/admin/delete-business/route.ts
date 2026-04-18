import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { logAdminAction } from "@/lib/audit/log";

/**
 * POST /api/admin/delete-business
 *
 * Fully deletes a business, including:
 *  - All job_posts (CASCADE removes applications, interviews, contracts, EOIs)
 *  - The business_profile row (CASCADE removes business_resorts, business_photos, etc.)
 *  - The auth user (CASCADE removes the users row via auth.users → users FK)
 *
 * The auth user delete requires the service-role admin client, which is why
 * this has to be a server-side route rather than a direct supabase.from().delete()
 * call from the admin page.
 *
 * Idempotent: if the business is already gone, returns success.
 */
export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const admin = createAdminClient();

    // Verify admin role
    const { data: adminUser } = await admin
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single();
    if (adminUser?.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { businessId } = await request.json();
    if (!businessId) return NextResponse.json({ error: "Missing businessId" }, { status: 400 });

    // Fetch the business so we can audit + find the linked user
    const { data: business } = await admin
      .from("business_profiles")
      .select("id, user_id, business_name, email")
      .eq("id", businessId)
      .single();

    if (!business) {
      // Already gone — still return success so the UI can move on
      return NextResponse.json({ success: true, alreadyDeleted: true });
    }

    // 1. Delete the business_profile. Supabase's CASCADE policies will remove
    //    all dependent rows: job_posts, applications, interviews, contracts,
    //    EOIs, business_resorts, business_photos, business_followers,
    //    business_reviews.
    const { error: bizError } = await admin
      .from("business_profiles")
      .delete()
      .eq("id", businessId);

    if (bizError) {
      console.error("Failed to delete business_profile:", bizError);
      return NextResponse.json({ error: `Failed to delete business: ${bizError.message}` }, { status: 500 });
    }

    // 2. If there's a linked auth user, delete it. Deleting auth.users
    //    cascades to the public.users row. (Unclaimed businesses have
    //    user_id = NULL, so this is skipped for them.)
    if (business.user_id) {
      const { error: authError } = await admin.auth.admin.deleteUser(business.user_id);
      if (authError) {
        // Log but don't fail — the business itself was deleted successfully.
        // The auth user is now orphaned; admin can clean up manually.
        console.error("Failed to delete auth user after business delete:", authError);
      }
    }

    // 3. Audit log
    await logAdminAction({
      adminId: user.id,
      action: "business_rejected", // closest existing action type; the audit `action` column is permissive text
      targetType: "business",
      targetId: businessId,
      details: {
        deleted: true,
        business_name: business.business_name,
        email: business.email,
      },
    }).catch(() => {});

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("delete-business error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
