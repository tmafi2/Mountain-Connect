import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { rateLimit } from "@/lib/rate-limit";

/**
 * POST /api/signup/check-imports
 *
 * Given an email address, returns any unclaimed admin-imported business
 * profiles and their active jobs. Used by the signup page to prompt the
 * user to claim existing imports instead of creating a parallel account.
 *
 * No auth required — the response only exposes the business name and
 * job titles tied to the email the caller already typed in. Rate limited
 * to prevent email enumeration.
 */
export async function POST(request: Request) {
  const rateLimited = await rateLimit(request, { identifier: "signup-check" });
  if (rateLimited) return rateLimited;

  try {
    const body = await request.json().catch(() => ({}));
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    if (!email) return NextResponse.json({ imports: [] });

    const admin = createAdminClient();
    const { data: profiles } = await admin
      .from("business_profiles")
      .select("id, business_name")
      .eq("email", email)
      .eq("is_claimed", false);

    if (!profiles || profiles.length === 0) {
      return NextResponse.json({ imports: [] });
    }

    const businessIds = profiles.map((p) => p.id);
    const { data: jobs } = await admin
      .from("job_posts")
      .select("id, title, business_id, status")
      .in("business_id", businessIds)
      .in("status", ["active", "draft"]);

    const imports = profiles.map((p) => ({
      businessId: p.id,
      businessName: p.business_name,
      jobs: (jobs || [])
        .filter((j) => j.business_id === p.id)
        .map((j) => ({ id: j.id, title: j.title, status: j.status })),
    }));

    return NextResponse.json({ imports });
  } catch (err) {
    console.error("check-imports error:", err);
    return NextResponse.json({ imports: [] });
  }
}
