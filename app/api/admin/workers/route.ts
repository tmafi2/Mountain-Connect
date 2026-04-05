import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  // Auth + admin role check
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const { data: userData } = await admin
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();

  if (userData?.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Fetch all worker profiles using admin client (bypasses RLS)
  const { data: profiles, error } = await admin
    .from("worker_profiles")
    .select("id, user_id, first_name, last_name, location_current, country_of_residence, nationality, skills, profile_photo_url, profile_completion_pct, bio, work_history, status, suspension_reason, suspended_at, created_at")
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ workers: profiles });
}
