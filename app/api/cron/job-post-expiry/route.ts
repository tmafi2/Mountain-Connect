import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { planExpirySweep, describeSweep } from "@/lib/jobs/expiry-sweep";
import { JOB_EXPIRY_MODE, jobExpiryWrites, jobExpirySendsEmail } from "@/lib/config/features";

/**
 * GET /api/cron/job-post-expiry
 *
 * Daily sweep for job posts whose live window is running out. What it
 * actually does is governed by JOB_EXPIRY_MODE in lib/config/features.ts:
 *
 *   log_only    (now) — reports what it would do, touches nothing
 *   emails_only       — sends the warning and notice emails
 *   live              — also auto-renews and pauses
 *
 * The route stays thin on purpose. All the decisions live in
 * lib/jobs/expiry-sweep.ts where they can be unit tested against a fake
 * client, rather than only being exercisable by waiting for 09:00 UTC.
 *
 * The full plan comes back in the response body, not just the counts. In
 * log_only that body IS the deliverable — it is how we check which posts
 * the real queries select before anything is allowed to act on them.
 */
export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const admin = createAdminClient();
    const report = await planExpirySweep(admin);

    // Goes to the Vercel log whatever the mode, so a run leaves a trace
    // even when the response body is never read.
    console.log(describeSweep(report));

    if (!jobExpiryWrites() && !jobExpirySendsEmail()) {
      return NextResponse.json({ ...report, applied: false });
    }

    // Phases 3 and 4 attach here: send from report.warn / report.expire,
    // then renew and pause from report.renew / report.expire. Deliberately
    // not stubbed with half-written writes — an unfinished branch behind a
    // mode flag is the kind of thing that gets switched on by accident.
    return NextResponse.json(
      {
        ...report,
        applied: false,
        error: `JOB_EXPIRY_MODE="${JOB_EXPIRY_MODE}" but acting on the plan is not implemented yet`,
      },
      { status: 501 }
    );
  } catch (err) {
    console.error("[job-expiry] sweep failed:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "sweep failed" },
      { status: 500 }
    );
  }
}
