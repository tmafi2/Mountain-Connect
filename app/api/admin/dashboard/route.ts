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

  // All counts + recent activity via admin client
  const [businesses, pendingRegs, pendingVerif, verified, workers, jobs, applications, openReports] = await Promise.all([
    admin.from("business_profiles").select("id", { count: "exact", head: true }),
    admin.from("business_profiles").select("id", { count: "exact", head: true }).eq("verification_status", "pending_review"),
    admin.from("business_profiles").select("id", { count: "exact", head: true }).eq("verification_status", "pending_verification"),
    admin.from("business_profiles").select("id", { count: "exact", head: true }).eq("verification_status", "verified"),
    admin.from("worker_profiles").select("id", { count: "exact", head: true }),
    admin.from("job_posts").select("id", { count: "exact", head: true }).eq("status", "active"),
    admin.from("applications").select("id", { count: "exact", head: true }),
    admin.from("support_reports").select("id", { count: "exact", head: true }).eq("status", "open"),
  ]);

  const stats = {
    totalBusinesses: businesses.count ?? 0,
    pendingRegistrations: pendingRegs.count ?? 0,
    pendingVerification: pendingVerif.count ?? 0,
    verifiedBusinesses: verified.count ?? 0,
    openReports: openReports.count ?? 0,
    totalWorkers: workers.count ?? 0,
    activeJobs: jobs.count ?? 0,
    totalApplications: applications.count ?? 0,
  };

  // Recent activity
  const [recentBusinessesRes, recentWorkersRes, recentAppsRes] = await Promise.all([
    admin.from("business_profiles").select("id, business_name, verification_status, created_at").order("created_at", { ascending: false }).limit(10),
    admin.from("worker_profiles").select("id, first_name, last_name, created_at").order("created_at", { ascending: false }).limit(5),
    admin.from("applications").select("id, applied_at, job_posts(title), worker_profiles(first_name, last_name)").order("applied_at", { ascending: false }).limit(5),
  ]);

  return NextResponse.json({
    stats,
    recentBusinesses: recentBusinessesRes.data || [],
    recentWorkers: recentWorkersRes.data || [],
    recentApps: recentAppsRes.data || [],
  });
}
