import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { rateLimit } from "@/lib/rate-limit";

/**
 * POST /api/business/apply-verification
 * Business applies for verification after registration has been accepted.
 */
export async function POST(request: Request, ) {
  const rateLimited = await rateLimit(request, { identifier: "verify-biz" });
  if (rateLimited) return rateLimited;

  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const admin = createAdminClient();

    // Get business profile for this user
    const { data: business } = await admin
      .from("business_profiles")
      .select("id, verification_status, business_name")
      .eq("user_id", user.id)
      .single();

    if (!business) return NextResponse.json({ error: "Business profile not found" }, { status: 404 });

    if (business.verification_status !== "accepted") {
      return NextResponse.json(
        { error: "Business must be accepted before applying for verification" },
        { status: 400 }
      );
    }

    const { error: updateError } = await admin
      .from("business_profiles")
      .update({ verification_status: "pending_verification" })
      .eq("id", business.id);

    if (updateError) {
      console.error("Error applying for verification:", updateError);
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error applying for verification:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
