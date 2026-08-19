import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/require-admin";
import { logAdminAction } from "@/lib/audit/log";
import { notifyGoogleIndexing } from "@/lib/seo/google-indexing";

/** Guard against a runaway selection. Deletion is not reversible. */
const MAX_BULK = 200;

/**
 * POST /api/admin/delete-jobs
 * Body: { jobIds: string[] }
 *
 * Admin-only bulk delete, cascading through applications, interviews,
 * contracts and expressions_of_interest exactly as the single-job route
 * does. Admin client required so RLS does not block it.
 *
 * Titles are read BEFORE the delete so the audit trail records what was
 * removed — after the fact there is nothing left to name, and "deleted 40
 * jobs" with no titles is not an audit trail.
 */
export async function POST(request: Request) {
  try {
    const auth = await requireAdmin();
    if (auth instanceof NextResponse) return auth;
    const { admin, user } = auth;

    let body: { jobIds?: unknown };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const jobIds = Array.isArray(body.jobIds)
      ? [...new Set(body.jobIds.filter((id): id is string => typeof id === "string" && !!id))]
      : null;
    if (!jobIds || jobIds.length === 0) {
      return NextResponse.json({ error: "jobIds must be a non-empty array" }, { status: 400 });
    }
    if (jobIds.length > MAX_BULK) {
      return NextResponse.json(
        { error: `Too many jobs at once (max ${MAX_BULK}). Narrow the selection.` },
        { status: 400 }
      );
    }

    const { data: jobs } = await admin
      .from("job_posts")
      .select("id, title, business_id")
      .in("id", jobIds);

    const found = jobs ?? [];
    if (found.length === 0) {
      return NextResponse.json({ success: true, deleted: 0, alreadyGone: jobIds.length });
    }

    const foundIds = found.map((j) => j.id);
    const { error: deleteErr } = await admin.from("job_posts").delete().in("id", foundIds);
    if (deleteErr) {
      console.error("Failed to bulk delete job_posts:", deleteErr);
      return NextResponse.json({ error: `Failed to delete: ${deleteErr.message}` }, { status: 500 });
    }

    const siteUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://www.mountainconnects.com";
    for (const job of found) {
      logAdminAction({
        adminId: user.id,
        action: "business_rejected", // reuses permissive audit enum; see delete-job route
        targetType: "job",
        targetId: job.id,
        details: { deleted: true, job_title: job.title, business_id: job.business_id, bulk: true },
      }).catch(() => {});
      notifyGoogleIndexing(`${siteUrl}/jobs/${job.id}`, "URL_DELETED").catch((err) =>
        console.error("Google indexing notify failed:", err)
      );
    }

    return NextResponse.json({
      success: true,
      deleted: foundIds.length,
      alreadyGone: jobIds.length - foundIds.length,
    });
  } catch (err) {
    console.error("delete-jobs error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
