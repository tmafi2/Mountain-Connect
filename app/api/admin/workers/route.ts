import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/require-admin";
import { fetchAllRows, fetchAllByIds } from "@/lib/supabase/fetch-all";

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

  // ⚠️ PAGED. 401 worker profiles today against a 1000-row cap this project
  // applies silently (lib/supabase/fetch-all.ts). An unpaged read here works
  // right up until it does not, and then the admin quietly stops showing the
  // newest workers with no error anywhere.
  //
  // `preferred_job_types` is what a worker says they are LOOKING FOR, and
  // `work_history` is what they have DONE — lib/workers/industry.ts turns
  // both into the board's own categories for the filters.
  let profiles;
  try {
    profiles = await fetchAllRows<Record<string, unknown>>(
      (from, to) =>
        admin
          .from("worker_profiles")
          .select(
            "id, user_id, first_name, last_name, location_current, country_of_residence, nationality, skills, preferred_job_types, years_seasonal_experience, profile_photo_url, profile_completion_pct, bio, work_history, status, suspension_reason, suspended_at, created_at",
          )
          .order("created_at", { ascending: false })
          .range(from, to),
      "worker profiles",
    );
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }

  // Chunked: a few hundred ids in one `.in(...)` builds a URL long enough to
  // be cut off by a proxy, which returns quietly fewer rows rather than an
  // error — here that would silently blank out emails.
  const userIds = profiles.map((p) => p.user_id as string).filter(Boolean);
  const emailMap: Record<string, string> = {};
  if (userIds.length) {
    const users = await fetchAllByIds<{ id: string; email: string }>(
      userIds,
      (chunk, from, to) => admin.from("users").select("id, email").in("id", chunk).range(from, to),
      "worker emails",
    );
    for (const u of users) emailMap[u.id] = u.email;
  }

  return NextResponse.json({ workers: profiles, emailMap });
}
