import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/require-admin";
import { publishJobs } from "@/lib/admin/publish-jobs";

function resolveOrigin(request: Request): string {
  const origin = request.headers.get("origin");
  if (origin) return origin;
  return process.env.NEXT_PUBLIC_BASE_URL || "https://www.mountainconnects.com";
}

/**
 * POST /api/admin/publish-job
 *
 * Admin-only. Flips one draft job_post to active, sends the claim
 * outreach if the business is still unclaimed and has not been contacted
 * before, and pings the Google Indexing API.
 *
 * The work lives in lib/admin/publish-jobs so this and the bulk endpoint
 * cannot drift — in particular so both honour the per-business email
 * guard. Approving four of a business's listings one at a time used to
 * send them four emails.
 */
export async function POST(request: Request) {
  try {
    const auth = await requireAdmin();
    if (auth instanceof NextResponse) return auth;
    const { admin, user } = auth;

    const { jobId } = (await request.json()) as { jobId?: string };
    if (!jobId) return NextResponse.json({ error: "jobId is required" }, { status: 400 });

    const result = await publishJobs(admin, user.id, [jobId], resolveOrigin(request));

    if (result.notFound.length > 0) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    const email = result.emailsSent[0] ?? null;
    return NextResponse.json({
      success: true,
      jobId,
      alreadyActive: result.alreadyActive.includes(jobId),
      emailSent: !!email,
      sentTo: email?.to ?? null,
      emailError: result.emailErrors[0]?.error ?? null,
      emailSkipped: result.emailsSkipped[0]?.reason ?? null,
    });
  } catch (err) {
    console.error("publish-job error:", err);
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
