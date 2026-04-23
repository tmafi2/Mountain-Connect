import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/require-admin";

export async function GET(request: Request) {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;
  const { admin } = auth;

  // If workerId is provided, fetch that worker's applications
  const { searchParams } = new URL(request.url);
  const workerId = searchParams.get("workerId");

  if (workerId) {
    const { data: apps } = await admin
      .from("applications")
      .select("id, status, applied_at, job_posts(title, business_profiles(business_name))")
      .eq("worker_id", workerId)
      .order("applied_at", { ascending: false });

    const applications = (apps || []).map((a: any) => {
      const jp = a.job_posts as { title: string; business_profiles: { business_name: string } } | null;
      return {
        id: a.id,
        job_title: jp?.title || "Unknown",
        business_name: jp?.business_profiles?.business_name || "Unknown",
        status: a.status,
        applied_at: a.applied_at,
      };
    });

    return NextResponse.json({ applications });
  }

  // Fetch all worker profiles using admin client (bypasses RLS)
  const { data: profiles, error } = await admin
    .from("worker_profiles")
    .select("id, user_id, first_name, last_name, location_current, country_of_residence, nationality, skills, profile_photo_url, profile_completion_pct, bio, work_history, status, suspension_reason, suspended_at, created_at")
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Get user emails
  const userIds = (profiles || []).map((p: any) => p.user_id).filter(Boolean);
  const { data: users } = await admin.from("users").select("id, email").in("id", userIds);
  const emailMap: Record<string, string> = {};
  users?.forEach((u: any) => { emailMap[u.id] = u.email; });

  return NextResponse.json({ workers: profiles, emailMap });
}
