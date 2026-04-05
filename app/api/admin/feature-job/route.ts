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

    const { jobId, featured, days } = await request.json();
    if (!jobId) return NextResponse.json({ error: "Missing jobId" }, { status: 400 });

    const featuredUntil = featured
      ? new Date(Date.now() + (days || 30) * 24 * 60 * 60 * 1000).toISOString()
      : null;

    const { error } = await admin
      .from("job_posts")
      .update({ featured_until: featuredUntil })
      .eq("id", jobId);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ success: true, featured_until: featuredUntil });
  } catch (error) {
    console.error("Feature job error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
