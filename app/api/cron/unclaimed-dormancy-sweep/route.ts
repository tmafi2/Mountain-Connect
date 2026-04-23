import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendClaimLastChanceEmail } from "@/lib/email/send";

const WARNING_AFTER_DAYS = 14;
const TAKEDOWN_GRACE_DAYS = 7;
const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * GET /api/cron/unclaimed-dormancy-sweep
 *
 * Daily sweep for imported-but-unclaimed business listings. Two passes:
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

  const result = { warned: 0, takendown: 0, errors: [] as string[] };

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
