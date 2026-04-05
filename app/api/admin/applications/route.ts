import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = createAdminClient();
  const { data: userData } = await admin.from("users").select("role").eq("id", user.id).single();
  if (userData?.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { data: applications, error } = await admin
    .from("applications")
    .select("id, status, applied_at, updated_at, worker_id, job_post_id, worker_profiles(first_name, last_name, user_id, location_current, skills), job_posts(id, title, salary_range, business_id, business_profiles(id, business_name))")
    .order("applied_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Get user emails for workers
  const userIds = (applications || []).map((a: any) => a.worker_profiles?.user_id).filter(Boolean);
  const { data: users } = await admin.from("users").select("id, email").in("id", userIds);
  const emailMap: Record<string, string> = {};
  users?.forEach((u: any) => { emailMap[u.id] = u.email; });

  return NextResponse.json({ applications, emailMap });
}
