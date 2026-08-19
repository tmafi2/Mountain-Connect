import type { SupabaseClient } from "@supabase/supabase-js";
import { sendImportOutreachEmail } from "@/lib/email/send";
import { logAdminAction } from "@/lib/audit/log";
import { notifyGoogleIndexing } from "@/lib/seo/google-indexing";

/**
 * Publish one or more draft job posts and send the claim outreach.
 *
 * Both /api/admin/publish-job (one) and /api/admin/publish-jobs (many)
 * route through here. That is deliberate: the bug this exists to prevent
 * is precisely the kind that appears when two paths do "the same thing"
 * separately and one of them forgets the email guard.
 *
 * THE EMAIL RULE. Outreach is per BUSINESS, not per job. We import one
 * listing per role, so a business can arrive with a dozen drafts, and
 * emailing per job would send them a dozen near-identical "claim your
 * listing" messages in one burst. Publishing groups by business, sends
 * one email naming the representative listing and counting the rest, and
 * stamps import_outreach_sent_at so no later publish re-sends.
 *
 * The stamp is written only after a SUCCESSFUL send, so a transient
 * Resend failure does not permanently silence a business.
 */
export interface PublishJobsResult {
  published: string[];
  alreadyActive: string[];
  notFound: string[];
  emailsSent: Array<{ businessName: string; to: string; listings: number }>;
  emailsSkipped: Array<{ businessName: string; reason: string }>;
  emailErrors: Array<{ businessName: string; error: string }>;
}

interface JobRow {
  id: string;
  title: string;
  status: string;
  business_id: string;
  source: string | null;
}

/**
 * The outreach sender, injectable so the grouping rule above can be tested
 * without sending mail or reaching a database. Production callers omit it.
 */
export type OutreachSender = typeof sendImportOutreachEmail;

export async function publishJobs(
  admin: SupabaseClient,
  adminUserId: string,
  jobIds: string[],
  origin: string,
  sendOutreach: OutreachSender = sendImportOutreachEmail
): Promise<PublishJobsResult> {
  const result: PublishJobsResult = {
    published: [],
    alreadyActive: [],
    notFound: [],
    emailsSent: [],
    emailsSkipped: [],
    emailErrors: [],
  };
  if (jobIds.length === 0) return result;

  const { data: jobs, error: readErr } = await admin
    .from("job_posts")
    .select("id, title, status, business_id, source")
    .in("id", jobIds);
  if (readErr) throw new Error(`Could not load jobs: ${readErr.message}`);

  const found = (jobs ?? []) as JobRow[];
  const foundIds = new Set(found.map((j) => j.id));
  result.notFound = jobIds.filter((id) => !foundIds.has(id));

  const toPublish = found.filter((j) => j.status !== "active");
  result.alreadyActive = found.filter((j) => j.status === "active").map((j) => j.id);
  if (toPublish.length === 0) return result;

  const { error: updateErr } = await admin
    .from("job_posts")
    .update({ status: "active", is_active: true, pending_approval: false })
    .in(
      "id",
      toPublish.map((j) => j.id)
    );
  if (updateErr) throw new Error(`Could not publish jobs: ${updateErr.message}`);
  result.published = toPublish.map((j) => j.id);

  // ── Outreach, grouped by business ──────────────────────────────
  const byBusiness = new Map<string, JobRow[]>();
  for (const job of toPublish) {
    const list = byBusiness.get(job.business_id);
    if (list) list.push(job);
    else byBusiness.set(job.business_id, [job]);
  }

  const { data: businesses } = await admin
    .from("business_profiles")
    .select("id, business_name, email, is_claimed, claim_token, import_outreach_sent_at")
    .in("id", [...byBusiness.keys()]);

  for (const business of businesses ?? []) {
    const theirJobs = byBusiness.get(business.id) ?? [];
    if (theirJobs.length === 0) continue;

    const name = business.business_name || "(unnamed)";
    if (business.is_claimed) {
      result.emailsSkipped.push({ businessName: name, reason: "already claimed" });
      continue;
    }
    if (business.import_outreach_sent_at) {
      result.emailsSkipped.push({ businessName: name, reason: "already contacted" });
      continue;
    }
    if (!business.email || !business.claim_token) {
      result.emailsSkipped.push({
        businessName: name,
        reason: !business.email ? "no email on file" : "no claim token",
      });
      continue;
    }

    const [lead, ...rest] = theirJobs;
    try {
      const sent = await sendOutreach({
        to: business.email,
        businessName: name,
        jobTitle: lead.title,
        source: lead.source || "an external listing",
        claimUrl: `${origin}/claim/${business.claim_token}`,
        eoiCount: 0,
        otherListings: rest.length,
      });
      if (!sent) {
        result.emailErrors.push({ businessName: name, error: "Email service is not configured" });
        continue;
      }
      // Stamp only after a confirmed send.
      await admin
        .from("business_profiles")
        .update({ import_outreach_sent_at: new Date().toISOString() })
        .eq("id", business.id);
      result.emailsSent.push({ businessName: name, to: business.email, listings: theirJobs.length });
    } catch (err) {
      result.emailErrors.push({
        businessName: name,
        error: err instanceof Error ? err.message : "Unknown email error",
      });
    }
  }

  // ── Side effects that must never block the publish ─────────────
  const siteUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://www.mountainconnects.com";
  for (const job of toPublish) {
    notifyGoogleIndexing(`${siteUrl}/jobs/${job.id}`, "URL_UPDATED").catch((err) =>
      console.error("Google indexing notify failed:", err)
    );
    logAdminAction({
      adminId: adminUserId,
      action: "business_approved",
      targetType: "job",
      targetId: job.id,
      details: { published_from_draft: true, bulk: jobIds.length > 1 },
    }).catch(() => {});
  }

  return result;
}
