import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  sendClaimLastChanceEmail,
  sendEoiThresholdNudgeEmail,
  sendFirstApplicantNudgeEmail,
  sendClaimRemovalNoticeEmail,
  sendClaimApplicantsWaitingEmail,
} from "@/lib/email/send";

// Two warnings and four weeks, changed from one warning and three on
// 2026-08-30. The first email arrives cold — from a company the business has
// never dealt with, about a listing they did not create — and one of those is
// easy to miss entirely. A fortnight of notice also survives a seasonal
// operator going a couple of weeks without reading email, which is most of a
// ski season.
const FIRST_WARNING_DAYS = 14;  // import → "removed in two weeks"
const FINAL_AFTER_DAYS = 7;     // first warning → "final notice"
const TAKEDOWN_AFTER_DAYS = 7;  // final notice → listing comes down
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
  // Fail closed when the secret is absent. With CRON_SECRET unset this
  // compared against the literal "Bearer undefined" — which anyone can send,
  // and which was live: a request with that header returned 200 in
  // production. Vercel also sends no Authorization header at all when the
  // variable is missing, so the scheduled runs were getting 401 and this job
  // had never actually executed.
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    console.error("[cron] CRON_SECRET is not set; refusing to run");
    return NextResponse.json({ error: "Cron is not configured" }, { status: 503 });
  }
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const now = Date.now();
  const firstWarningCutoff = new Date(now - FIRST_WARNING_DAYS * DAY_MS).toISOString();
  const finalCutoff = new Date(now - FINAL_AFTER_DAYS * DAY_MS).toISOString();
  const takedownCutoff = new Date(now - TAKEDOWN_AFTER_DAYS * DAY_MS).toISOString();
  const fmtDate = (ms: number) =>
    new Date(ms).toLocaleDateString("en-AU", { day: "numeric", month: "long", year: "numeric" });
  const origin = new URL(request.url).origin;

  const result = {
    firstApplicantSent: 0,
    thresholdSent: 0,
    warned: 0,
    finalNoticed: 0,
    /** Listings left live because somebody has applied to them. */
    sparedWithApplicants: 0,
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

  // Who has people waiting, and for what.
  //
  // THE RULE THIS ESTABLISHES: a listing somebody has applied to is never
  // threatened and never taken down. It is the most valuable listing on the
  // board, and the demand attached to it is the strongest argument for
  // claiming we will ever have — deleting it throws away both. These
  // businesses get told who is waiting instead, on the same schedule.
  const waiting = new Map<string, { total: number; roles: Array<{ title: string; count: number }> }>();
  {
    const { data: rows, error } = await admin
      .from("expressions_of_interest")
      .select("id, job_posts!inner(id, title, business_id)");
    if (error) {
      // Without this the sweep cannot tell a wanted listing from a dead one,
      // and would remove both. Better to warn nobody than remove the wrong one.
      console.error("dormancy-sweep: could not load expressions of interest:", error);
      result.errors.push(`eoi query: ${error.message} — takedown skipped this run`);
    }
    const perRole = new Map<string, { bizId: string; title: string; count: number }>();
    // PostgREST types an !inner join as an array even when it is one row.
    // Normalised here rather than cast away, because a wrong assumption about
    // this shape means every EOI is silently ignored and the exemption never
    // fires — a failure that looks exactly like having no applicants.
    type EoiRow = { job_posts: { id: string; title: string; business_id: string } | Array<{ id: string; title: string; business_id: string }> };
    for (const r of (rows ?? []) as unknown as EoiRow[]) {
      const jp = Array.isArray(r.job_posts) ? r.job_posts[0] : r.job_posts;
      if (!jp) continue;
      const cur = perRole.get(jp.id) ?? { bizId: jp.business_id, title: jp.title, count: 0 };
      cur.count += 1;
      perRole.set(jp.id, cur);
    }
    for (const { bizId, title, count } of perRole.values()) {
      const e = waiting.get(bizId) ?? { total: 0, roles: [] };
      e.total += count;
      e.roles.push({ title, count });
      waiting.set(bizId, e);
    }
    for (const e of waiting.values()) e.roles.sort((a, b) => b.count - a.count);
  }
  const eoiQueryFailed = result.errors.some((e) => e.startsWith("eoi query:"));

  // ─── Pass 1: first removal warning, two weeks in ────────────
  //
  // The gate is stamped AFTER a confirmed send, not before. Stamping first
  // meant a Resend outage silently consumed the only warning a business
  // would ever get, and they would find their listing gone having been told
  // nothing.
  const { data: toWarn, error: warnErr } = await admin
    .from("business_profiles")
    .select("id, business_name, email, claim_token, created_at")
    .eq("is_claimed", false)
    .is("dormancy_warning_sent_at", null)
    .lte("created_at", firstWarningCutoff);

  if (warnErr) {
    console.error("dormancy-sweep warn query failed:", warnErr);
    result.errors.push(`warn query: ${warnErr.message}`);
  }

  for (const biz of toWarn ?? []) {
    try {
      if (!biz.email || !biz.claim_token) continue;

      const { data: jobs } = await admin
        .from("job_posts")
        .select("id, title")
        .eq("business_id", biz.id)
        .eq("status", "active")
        .limit(1);
      // No live listing, nothing to warn about. This ALSO excludes the
      // trial-period imports whose posts migration 00092 retired: their
      // listings came down deliberately, they were never real prospects, and
      // Tyler's call on 2026-08-30 was to leave them alone rather than chase
      // them. Should this guard ever be relaxed to chase businesses that
      // still have expressions of interest waiting, exclude stale_cleanup
      // explicitly or those sixteen get a warning for a listing that was
      // taken down on purpose months earlier.
      if (!jobs || jobs.length === 0) continue;

      const { count: eoiCount } = await admin
        .from("expressions_of_interest")
        .select("id, job_posts!inner(business_id)", { count: "exact", head: true })
        .eq("job_posts.business_id", biz.id);

      const w = waiting.get(biz.id);
      if (w && w.total > 0) {
        // People are waiting: no deadline, no threat. Tell them who.
        await sendClaimApplicantsWaitingEmail({
          to: biz.email,
          businessName: biz.business_name,
          roles: w.roles,
          totalWaiting: w.total,
          claimUrl: `${origin}/claim/${biz.claim_token}`,
        });
      } else {
        await sendClaimRemovalNoticeEmail({
          to: biz.email,
          businessName: biz.business_name,
          jobTitle: jobs[0].title,
          eoiCount: 0,
          // Two more weeks from today: a week to the final notice, a week
          // from there to removal.
          removalDate: fmtDate(now + (FINAL_AFTER_DAYS + TAKEDOWN_AFTER_DAYS) * DAY_MS),
          claimUrl: `${origin}/claim/${biz.claim_token}`,
        });
      }

      const { error: stampErr } = await admin
        .from("business_profiles")
        .update({ dormancy_warning_sent_at: new Date().toISOString() })
        .eq("id", biz.id)
        .is("dormancy_warning_sent_at", null);
      if (stampErr) result.errors.push(`warn stamp ${biz.id}: ${stampErr.message}`);

      result.warned++;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`dormancy-sweep warn for ${biz.id}:`, err);
      result.errors.push(`warn ${biz.id}: ${msg}`);
    }
  }

  // ─── Pass 2: final notice, a week after the first ───────────
  //
  // Gated on how old the FIRST warning is, never on created_at. If the sweep
  // is down for a fortnight, the first run back sends warning one and the
  // final waits another week — rather than firing both at once and removing
  // the listing days later.
  const { data: toFinal, error: finalErr } = await admin
    .from("business_profiles")
    .select("id, business_name, email, claim_token")
    .eq("is_claimed", false)
    .not("dormancy_warning_sent_at", "is", null)
    .is("dormancy_final_sent_at", null)
    .lte("dormancy_warning_sent_at", finalCutoff);

  if (finalErr) {
    console.error("dormancy-sweep final query failed:", finalErr);
    result.errors.push(`final query: ${finalErr.message}`);
  }

  for (const biz of toFinal ?? []) {
    try {
      if (!biz.email || !biz.claim_token) continue;

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

      const w2 = waiting.get(biz.id);
      if (w2 && w2.total > 0) {
        // Sent again rather than skipped: the counts have moved on since the
        // first one, and "4 people are waiting" is a different message from
        // "someone applied". A final notice would be a lie — nothing is
        // being removed.
        await sendClaimApplicantsWaitingEmail({
          to: biz.email,
          businessName: biz.business_name,
          roles: w2.roles,
          totalWaiting: w2.total,
          claimUrl: `${origin}/claim/${biz.claim_token}`,
        });
      } else {
        await sendClaimLastChanceEmail({
          to: biz.email,
          businessName: biz.business_name,
          jobTitle: jobs[0].title,
          eoiCount: 0,
          takedownDate: fmtDate(now + TAKEDOWN_AFTER_DAYS * DAY_MS),
          claimUrl: `${origin}/claim/${biz.claim_token}`,
        });
      }

      const { error: stampErr } = await admin
        .from("business_profiles")
        .update({ dormancy_final_sent_at: new Date().toISOString() })
        .eq("id", biz.id)
        .is("dormancy_final_sent_at", null);
      if (stampErr) result.errors.push(`final stamp ${biz.id}: ${stampErr.message}`);

      result.finalNoticed++;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`dormancy-sweep final for ${biz.id}:`, err);
      result.errors.push(`final ${biz.id}: ${msg}`);
    }
  }

  // ─── Pass 3: takedown, a week after the final notice ────────
  //
  // Gated on the FINAL notice, so a listing can never come down without both
  // warnings having gone out and had their week to be read.
  const { data: toTakedown, error: tdErr } = await admin
    .from("business_profiles")
    .select("id")
    .eq("is_claimed", false)
    .not("dormancy_final_sent_at", "is", null)
    .lte("dormancy_final_sent_at", takedownCutoff);

  if (tdErr) {
    console.error("dormancy-sweep takedown query failed:", tdErr);
    result.errors.push(`takedown query: ${tdErr.message}`);
  }

  // If the expressions-of-interest query failed, we cannot tell a wanted
  // listing from a dead one — so nothing comes down this run. Removing the
  // wrong listing is unrecoverable; a day's delay is not.
  const takedownList = eoiQueryFailed ? [] : (toTakedown ?? []);
  if (eoiQueryFailed) result.errors.push("takedown skipped: could not verify which listings have applicants");

  for (const biz of takedownList) {
    try {
      // Post-level, not business-level: a listing somebody applied to stays
      // up, and the ones nobody wanted still come down. A business is not
      // all-or-nothing, and the row people are waiting on is precisely the
      // one worth keeping.
      const { data: wanted } = await admin
        .from("expressions_of_interest")
        .select("job_post_id, job_posts!inner(business_id)")
        .eq("job_posts.business_id", biz.id);
      const spared = new Set(
        ((wanted ?? []) as Array<{ job_post_id: string }>).map((r) => r.job_post_id)
      );

      let q = admin
        .from("job_posts")
        .update({ status: "inactive" })
        .eq("business_id", biz.id)
        .eq("status", "active");
      if (spared.size > 0) q = q.not("id", "in", `(${[...spared].join(",")})`);

      const { data: updated, error: updateErr } = await q.select("id");
      if (spared.size > 0) result.sparedWithApplicants += spared.size;

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
