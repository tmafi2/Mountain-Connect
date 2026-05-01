import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  sendClaimLastChanceEmail,
  sendEoiThresholdNudgeEmail,
  sendFirstApplicantNudgeEmail,
} from "@/lib/email/send";

const WARNING_AFTER_DAYS = 14;
const TAKEDOWN_GRACE_DAYS = 7;
const EOI_NUDGE_THRESHOLD = 5;
const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * GET /api/cron/unclaimed-dormancy-sweep
 *
 * Daily sweep for imported-but-unclaimed business listings. Three passes:
 *
 *   0. Safety net for the first-applicant + 5-threshold nudges. The
 *      inline trigger on /api/jobs/[id]/express-interest fires these
 *      live, but it can miss for several reasons (silent Resend
 *      failures, applications written via paths that don't trigger,
 *      missing business email at the time of submission). Counts BOTH
 *      EOIs and applications so any form of interest counts.
 *
 *   1. Send the "last chance" warning email once a business has been
 *      unclaimed for 14 days. Stamps dormancy_warning_sent_at.
 *
 *   2. After another 7 days with no claim, flag the business's job
 *      posts as inactive so the listings disappear from public pages.
 *      EOIs are preserved in case the business claims later.
 */
export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const now = Date.now();
  const warningCutoff = new Date(now - WARNING_AFTER_DAYS * DAY_MS).toISOString();
  const takedownCutoff = new Date(now - TAKEDOWN_GRACE_DAYS * DAY_MS).toISOString();
  const origin = new URL(request.url).origin;

  const result = {
    firstApplicantSent: 0,
    thresholdSent: 0,
    warned: 0,
    takendown: 0,
    errors: [] as string[],
  };

  // ─── Pass 0: missed first-applicant + threshold nudges ──────
  const { data: nudgeCandidates, error: nudgeQueryErr } = await admin
    .from("business_profiles")
    .select(
      "id, business_name, email, claim_token, first_applicant_email_sent_at, eoi_nudge_sent_at"
    )
    .eq("is_claimed", false)
    .not("email", "is", null)
    .not("claim_token", "is", null)
    .or("first_applicant_email_sent_at.is.null,eoi_nudge_sent_at.is.null");

  if (nudgeQueryErr) {
    console.error("dormancy-sweep nudge query failed:", nudgeQueryErr);
    result.errors.push(`nudge query: ${nudgeQueryErr.message}`);
  }

  for (const biz of nudgeCandidates ?? []) {
    try {
      // Count both EOIs and applications against this business — they're
      // both signals of worker interest that should nudge a claim.
      const [eoiRes, appRes, jobRes] = await Promise.all([
        admin
          .from("expressions_of_interest")
          .select("id, job_posts!inner(business_id)", { count: "exact", head: true })
          .eq("job_posts.business_id", biz.id),
        admin
          .from("applications")
          .select("id, job_posts!inner(business_id)", { count: "exact", head: true })
          .eq("job_posts.business_id", biz.id),
        admin
          .from("job_posts")
          .select("title")
          .eq("business_id", biz.id)
          .eq("status", "active")
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
      ]);

      const total = (eoiRes.count ?? 0) + (appRes.count ?? 0);
      if (total < 1) continue;
      const jobTitle = (jobRes.data?.title as string | undefined)?.trim() || "your role";
      const claimUrl = `${origin}/claim/${biz.claim_token}`;

      // Threshold takes precedence — if a business qualifies for both
      // (e.g. they've been sitting at 8 with no nudge ever sent), only
      // the louder threshold email goes out, and we stamp BOTH flags so
      // they don't also get the first-applicant email later.
      if (!biz.eoi_nudge_sent_at && total >= EOI_NUDGE_THRESHOLD) {
        const stamp: Record<string, string> = {
          eoi_nudge_sent_at: new Date().toISOString(),
        };
        if (!biz.first_applicant_email_sent_at) {
          stamp.first_applicant_email_sent_at = stamp.eoi_nudge_sent_at;
        }
        await admin.from("business_profiles").update(stamp).eq("id", biz.id);
        await sendEoiThresholdNudgeEmail({
          to: biz.email!,
          businessName: biz.business_name,
          jobTitle,
          eoiCount: total,
          claimUrl,
        });
        result.thresholdSent++;
      } else if (!biz.first_applicant_email_sent_at) {
        await admin
          .from("business_profiles")
          .update({ first_applicant_email_sent_at: new Date().toISOString() })
          .eq("id", biz.id)
          .is("first_applicant_email_sent_at", null);
        // Use the threshold copy (with the actual count) when we're
        // catching up on >=2 interested workers — calling it "the first"
        // would misrepresent the situation. Only count == 1 truly is.
        if (total === 1) {
          await sendFirstApplicantNudgeEmail({
            to: biz.email!,
            businessName: biz.business_name,
            jobTitle,
            claimUrl,
          });
        } else {
          await sendEoiThresholdNudgeEmail({
            to: biz.email!,
            businessName: biz.business_name,
            jobTitle,
            eoiCount: total,
            claimUrl,
          });
        }
        result.firstApplicantSent++;
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`dormancy-sweep nudge for ${biz.id}:`, err);
      result.errors.push(`nudge ${biz.id}: ${msg}`);
    }
  }

  // ─── Pass 1: send last-chance warning ───────────────────────
  const { data: toWarn, error: warnErr } = await admin
    .from("business_profiles")
    .select("id, business_name, email, claim_token, created_at")
    .eq("is_claimed", false)
    .is("dormancy_warning_sent_at", null)
    .lte("created_at", warningCutoff);

  if (warnErr) {
    console.error("dormancy-sweep warn query failed:", warnErr);
    result.errors.push(`warn query: ${warnErr.message}`);
  }

  for (const biz of toWarn ?? []) {
    try {
      if (!biz.email || !biz.claim_token) continue;

      // Grab the first active job title + aggregate EOI count for this business
      const { data: jobs } = await admin
        .from("job_posts")
        .select("id, title")
        .eq("business_id", biz.id)
        .eq("status", "active")
        .limit(1);
      if (!jobs || jobs.length === 0) continue;

      const { count: eoiCount } = await admin
        .from("expressions_of_interest")
        .select("id, job_posts!inner(business_id)", { count: "exact", head: true })
        .eq("job_posts.business_id", biz.id);

      const origin = new URL(request.url).origin;
      const claimUrl = `${origin}/claim/${biz.claim_token}`;
      const takedownDate = new Date(now + TAKEDOWN_GRACE_DAYS * DAY_MS).toLocaleDateString("en-AU", {
        day: "numeric",
        month: "long",
        year: "numeric",
      });

      await admin
        .from("business_profiles")
        .update({ dormancy_warning_sent_at: new Date().toISOString() })
        .eq("id", biz.id)
        .is("dormancy_warning_sent_at", null);

      await sendClaimLastChanceEmail({
        to: biz.email,
        businessName: biz.business_name,
        jobTitle: jobs[0].title,
        eoiCount: eoiCount ?? 0,
        takedownDate,
        claimUrl,
      });

      result.warned++;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`dormancy-sweep warn for ${biz.id}:`, err);
      result.errors.push(`warn ${biz.id}: ${msg}`);
    }
  }

  // ─── Pass 2: takedown after grace period ────────────────────
  const { data: toTakedown, error: tdErr } = await admin
    .from("business_profiles")
    .select("id")
    .eq("is_claimed", false)
    .not("dormancy_warning_sent_at", "is", null)
    .lte("dormancy_warning_sent_at", takedownCutoff);

  if (tdErr) {
    console.error("dormancy-sweep takedown query failed:", tdErr);
    result.errors.push(`takedown query: ${tdErr.message}`);
  }

  for (const biz of toTakedown ?? []) {
    try {
      const { data: updated, error: updateErr } = await admin
        .from("job_posts")
        .update({ status: "inactive" })
        .eq("business_id", biz.id)
        .eq("status", "active")
        .select("id");

      if (updateErr) {
        result.errors.push(`takedown ${biz.id}: ${updateErr.message}`);
        continue;
      }
      if ((updated?.length ?? 0) > 0) result.takendown++;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`dormancy-sweep takedown for ${biz.id}:`, err);
      result.errors.push(`takedown ${biz.id}: ${msg}`);
    }
  }

  return NextResponse.json(result);
}
