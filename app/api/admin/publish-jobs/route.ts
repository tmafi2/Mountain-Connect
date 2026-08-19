import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/require-admin";
import { publishJobs } from "@/lib/admin/publish-jobs";

/** Guard against a runaway selection; the queue is ~76 today. */
const MAX_BULK = 200;

function resolveOrigin(request: Request): string {
  const origin = request.headers.get("origin");
  if (origin) return origin;
  return process.env.NEXT_PUBLIC_BASE_URL || "https://www.mountainconnects.com";
}

/**
 * POST /api/admin/publish-jobs
 * Body: { jobIds: string[] }
 *
 * Admin-only bulk approve. Publishes every listed draft and sends ONE
 * claim email per business rather than one per job — see
 * lib/admin/publish-jobs for why that distinction is the whole point.
 *
 * Returns a per-business email summary so the caller can show what was
 * actually sent, not just how many rows changed.
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

    const result = await publishJobs(admin, user.id, jobIds, resolveOrigin(request));
    return NextResponse.json({ success: true, ...result });
  } catch (err) {
    console.error("publish-jobs error:", err);
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
