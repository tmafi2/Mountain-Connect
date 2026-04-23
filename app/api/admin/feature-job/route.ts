import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/require-admin";
import { rateLimit } from "@/lib/rate-limit";

export async function POST(request: Request) {
  const rateLimited = await rateLimit(request, { identifier: "admin" });
  if (rateLimited) return rateLimited;

  try {
    const auth = await requireAdmin();
    if (auth instanceof NextResponse) return auth;
    const { admin } = auth;

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
