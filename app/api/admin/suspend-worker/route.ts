import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { rateLimit } from "@/lib/rate-limit";
import { logAdminAction } from "@/lib/audit/log";

/**
 * POST /api/admin/suspend-worker
 * Suspend or reactivate a worker. Admin only.
 */
export async function POST(request: Request) {
  const rateLimited = await rateLimit(request, { identifier: "admin" });
  if (rateLimited) return rateLimited;

  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // Verify admin role
    const { data: userData } = await supabase.from("users").select("role").eq("id", user.id).single();
    if (userData?.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { workerId, action, reason } = await request.json();
    if (!workerId || !action) return NextResponse.json({ error: "Missing fields" }, { status: 400 });

    const admin = createAdminClient();

    if (action === "suspend") {
      // Suspend the worker
      await admin.from("worker_profiles").update({
        status: "suspended",
        suspension_reason: reason || null,
        suspended_at: new Date().toISOString(),
        suspended_by: user.id,
      }).eq("id", workerId);

      // Withdraw their active applications
      const { data: workerApps } = await admin
        .from("applications")
        .select("id")
        .eq("worker_id", workerId)
        .in("status", ["new", "viewed", "reviewed", "shortlisted", "interview_pending", "interview", "offered"]);

      if (workerApps && workerApps.length > 0) {
        await admin
          .from("applications")
          .update({ status: "withdrawn" })
          .in("id", workerApps.map((a) => a.id));
      }

      await logAdminAction({ adminId: user.id, action: "worker_suspended", targetType: "worker", targetId: workerId, details: { reason } }).catch(() => {});
      return NextResponse.json({ success: true, action: "suspended" });
    } else if (action === "reactivate") {
      await admin.from("worker_profiles").update({
        status: "active",
        suspension_reason: null,
        suspended_at: null,
        suspended_by: null,
      }).eq("id", workerId);

      await logAdminAction({ adminId: user.id, action: "worker_reactivated", targetType: "worker", targetId: workerId }).catch(() => {});
      return NextResponse.json({ success: true, action: "reactivated" });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("Error suspending worker:", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
