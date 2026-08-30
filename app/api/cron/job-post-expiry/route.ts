import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { planExpirySweep, describeSweep } from "@/lib/jobs/expiry-sweep";
import { sendExpiryWarnings } from "@/lib/jobs/send-expiry-warnings";
import { sendJobExpiryWarningEmail } from "@/lib/email/send";
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
  // Fail closed when the secret is absent. The shared pattern in the other
  // cron routes compares against `Bearer ${process.env.CRON_SECRET}`, which
  // with an unset variable is the guessable literal "Bearer undefined" —
  // an open endpoint exactly when configuration has gone wrong. This route
  // would rather not run at all than run for anybody.
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    console.error("[job-expiry] CRON_SECRET is not set; refusing to run");
    return NextResponse.json({ error: "Cron is not configured" }, { status: 503 });
  }
  if (request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const admin = createAdminClient();
    const report = await planExpirySweep(admin);

    // Goes to the Vercel log whatever the mode, so a run leaves a trace
    // even when the response body is never read.
    console.log(describeSweep(report));

    if (!jobExpirySendsEmail()) {
      return NextResponse.json({ ...report, warningsSent: null, applied: false });
    }

    // Warnings only. There is deliberately no "your listing has been paused"
    // email here: at emails_only nothing is paused, and sending that notice
    // would tell businesses something untrue. It ships with the pause, in
    // phase 4.
    const origin = new URL(request.url).origin;
    const warnings = await sendExpiryWarnings(
      admin,
      report.warn,
      origin,
      sendJobExpiryWarningEmail
    );
    console.log(
      `[job-expiry] warnings sent=${warnings.sent} noEmail=${warnings.skippedNoEmail} ` +
        `failed=${warnings.failed}` +
        (warnings.errors.length ? ` errors: ${warnings.errors.join("; ")}` : "")
    );

    if (!jobExpiryWrites()) {
      return NextResponse.json({ ...report, warningsSent: warnings, applied: false });
    }

    // Phase 4 attaches here: auto-renew report.renew, pause report.expire,
    // and send the pause notice. Deliberately not stubbed — an unfinished
    // branch behind a mode flag is what gets switched on by accident.
    return NextResponse.json(
      {
        ...report,
        warningsSent: warnings,
        applied: false,
        error: `JOB_EXPIRY_MODE="${JOB_EXPIRY_MODE}" but pausing is not implemented yet`,
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
