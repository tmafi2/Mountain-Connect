import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { rateLimit } from "@/lib/rate-limit";

export async function POST(request: Request) {
  const rateLimited = await rateLimit(request, { identifier: "admin" });
  if (rateLimited) return rateLimited;

  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const admin = createAdminClient();
    const { data: adminUser } = await admin.from("users").select("role").eq("id", user.id).single();
    if (adminUser?.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { businessId, tier } = await request.json();
    if (!businessId || !["free", "standard", "premium", "enterprise"].includes(tier)) {
      return NextResponse.json({ error: "Missing businessId or invalid tier" }, { status: 400 });
    }

    const { error } = await admin
      .from("business_profiles")
      .update({ tier })
      .eq("id", businessId);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ success: true, tier });
  } catch (error) {
    console.error("Toggle premium error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
