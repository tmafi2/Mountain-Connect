import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/require-admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { firstApplicantNudgeEmail } from "@/lib/email/templates/first-applicant-nudge";
import { eoiThresholdNudgeEmail } from "@/lib/email/templates/eoi-threshold-nudge";
import { coverLetterExcerpt } from "@/lib/email/cover-letter-excerpt";
import { SITE_ORIGIN } from "@/lib/config/site";

/**
 * GET /api/admin/claim-pipeline/preview?businessId=…
 *
 * The email a given unclaimed business would actually receive — their name,
 * their role, their application count, and the real applicant's words if one
 * of their letters survives the sanitiser. The pipeline page loads it into an
 * iframe srcDoc, the same way the outreach template viewer does.
 *
 * ⚠️ IT RENDERS, IT DOES NOT SEND. No email leaves, no flag is stamped, no
 * ledger is written. Admin only.
 *
 * ⚠️ THE CHOICE OF TEMPLATE MIRRORS THE CRON, including the order: threshold
 * wins over first-applicant when a business qualifies for both, because that
 * is what app/api/cron/unclaimed-dormancy-sweep/route.ts does. A preview that
 * picks differently from the sender is worse than no preview.
 */

/** Must match EOI_NUDGE_THRESHOLD in both send paths. */
const THRESHOLD = 5;

export async function GET(request: Request) {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;

  const businessId = new URL(request.url).searchParams.get("businessId");
  if (!businessId) {
    return NextResponse.json({ error: "Missing businessId" }, { status: 400 });
  }

  const admin = createAdminClient();

  const { data: biz, error: bizErr } = await admin
    .from("business_profiles")
    .select(
      "id, business_name, email, is_claimed, claim_token, first_applicant_email_sent_at, eoi_nudge_sent_at",
    )
    .eq("id", businessId)
    .maybeSingle();
  if (bizErr) return NextResponse.json({ error: bizErr.message }, { status: 500 });
  if (!biz) return NextResponse.json({ error: "No such business" }, { status: 404 });

  // Their live listings, newest first — the newest title is the one the
  // cadence names, so the preview has to use the same one.
  const { data: jobs } = await admin
    .from("job_posts")
    .select("id, title, created_at")
    .eq("business_id", businessId)
    .eq("status", "active")
    .order("created_at", { ascending: false });
  const jobIds = (jobs ?? []).map((j) => j.id as string);
  const jobTitle = ((jobs ?? [])[0]?.title as string | undefined)?.trim() || "your role";

  let apps = 0;
  let quote: string | undefined;
  if (jobIds.length) {
    const { data: eois } = await admin
      .from("expressions_of_interest")
      .select("message, share_with_employer, created_at")
      .in("job_post_id", jobIds)
      .order("created_at", { ascending: false });
    apps = (eois ?? []).length;
    for (const e of eois ?? []) {
      const q = coverLetterExcerpt({
        message: e.message as string | null,
        consent: e.share_with_employer as boolean | null,
      });
      if (q) {
        quote = q;
        break;
      }
    }
  }

  const claimUrl = `${SITE_ORIGIN}/claim/${biz.claim_token ?? "NO-TOKEN"}`;
  const businessName = (biz.business_name as string) ?? "this business";

  // Which email, and whether anything is actually due — the page says the
  // same thing, and the two must not disagree.
  const sentFirst = !!biz.first_applicant_email_sent_at;
  const sentThreshold = !!biz.eoi_nudge_sent_at;
  let type: "threshold" | "first-applicant";
  let due: string;
  if (!sentThreshold && apps >= THRESHOLD) {
    type = "threshold";
    due = "Queued — sends on the next run";
  } else if (!sentFirst) {
    type = "first-applicant";
    due = "Queued — sends on the next run";
  } else if (!sentThreshold) {
    type = "threshold";
    due = `Not due yet — needs ${THRESHOLD - apps} more application${THRESHOLD - apps === 1 ? "" : "s"}. This is what it will say.`;
  } else {
    type = "threshold";
    due = "Already sent. This is what went out.";
  }

  const rendered =
    type === "threshold"
      ? eoiThresholdNudgeEmail({
          businessName,
          jobTitle,
          eoiCount: Math.max(apps, THRESHOLD),
          claimUrl,
          coverLetterExcerpt: quote,
        })
      : firstApplicantNudgeEmail({
          businessName,
          jobTitle,
          claimUrl,
          coverLetterExcerpt: quote,
        });

  return NextResponse.json({
    subject: rendered.subject,
    html: rendered.html,
    type,
    due,
    apps,
    hasQuote: Boolean(quote),
    quote: quote ?? null,
    canSend: Boolean(biz.email && biz.claim_token),
  });
}
