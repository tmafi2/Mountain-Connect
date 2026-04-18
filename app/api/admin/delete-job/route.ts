import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { logAdminAction } from "@/lib/audit/log";
import { notifyGoogleIndexing } from "@/lib/seo/google-indexing";

/**
 * POST /api/admin/delete-job
 *
 * Fully deletes a job_post, cascading through applications, interviews,
 * contracts, and expressions_of_interest. Admin client required so RLS
 * doesn't block the delete.
 */
export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const admin = createAdminClient();

    const { data: adminUser } = await admin
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single();
    if (adminUser?.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { jobId } = await request.json();
    if (!jobId) return NextResponse.json({ error: "Missing jobId" }, { status: 400 });

    // Fetch for audit trail
    const { data: job } = await admin
      .from("job_posts")
      .select("id, title, business_id")
      .eq("id", jobId)
      .single();

    if (!job) {
      return NextResponse.json({ success: true, alreadyDeleted: true });
    }

    const { error: jobError } = await admin
      .from("job_posts")
      .delete()
      .eq("id", jobId);

    if (jobError) {
      console.error("Failed to delete job_post:", jobError);
      return NextResponse.json({ error: `Failed to delete job: ${jobError.message}` }, { status: 500 });
    }

    await logAdminAction({
      adminId: user.id,
      action: "business_rejected", // reuses permissive audit enum; see delete-business route
      targetType: "job",
      targetId: jobId,
      details: { deleted: true, job_title: job.title, business_id: job.business_id },
    }).catch(() => {});

    notifyGoogleIndexing(`https://www.mountainconnects.com/jobs/${jobId}`, "URL_DELETED").catch(
      (err) => console.error("Google indexing notify failed:", err)
    );

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("delete-job error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
