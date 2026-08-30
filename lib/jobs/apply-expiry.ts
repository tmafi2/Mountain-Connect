import type { SupabaseClient } from "@supabase/supabase-js";
import type { BusinessGroup } from "./expiry-sweep";
import { nextExpiryFrom } from "./expiry";
import { signRenewToken } from "./renew-token";
import { formatExpiryDate } from "./send-expiry-warnings";

/**
 * The writing half of the sweep: auto-renew what should stay, pause what
 * should lapse, and tell each business once.
 *
 * ORDER IS FIXED BY THE CALLER — renew before expire. The sweep already
 * puts a post in one list or the other, never both, but doing the renewals
 * first means a crash between the two leaves a paid business's listing live
 * rather than paused. Failure should land on the side that does no harm.
 *
 * WRITE FIRST, EMAIL SECOND, in the opposite order to the warning pass. A
 * warning promises something that has not happened yet, so it must not be
 * gated until it is really sent. These emails REPORT something that has
 * happened, so the state change is what has to be durable — an email about
 * a pause that did not happen is worse than a pause nobody was emailed
 * about, and the latter is recoverable on the next run.
 */

export type PausedMailer = (p: {
  to: string;
  businessName: string;
  jobTitles: string[];
  relistUrl: string;
  manageUrl: string;
}) => Promise<unknown>;

export type RenewedMailer = (p: {
  to: string;
  businessName: string;
  jobTitles: string[];
  expiryDate: string;
  pauseUrl: string;
}) => Promise<unknown>;

export interface ApplyResult {
  renewedJobs: number;
  pausedJobs: number;
  renewNoticesSent: number;
  pausedNoticesSent: number;
  skippedNoEmail: number;
  errors: string[];
}

export async function applyExpirySweep(
  admin: SupabaseClient,
  renewGroups: BusinessGroup[],
  expireGroups: BusinessGroup[],
  origin: string,
  mailers: { paused: PausedMailer; renewed: RenewedMailer },
  now: Date = new Date()
): Promise<ApplyResult> {
  const result: ApplyResult = {
    renewedJobs: 0,
    pausedJobs: 0,
    renewNoticesSent: 0,
    pausedNoticesSent: 0,
    skippedNoEmail: 0,
    errors: [],
  };
  const renewedUntil = nextExpiryFrom(now).toISOString();
  const manageUrl = `${origin}/business/manage-listings`;

  // ── Auto-renew ────────────────────────────────────────────
  for (const g of renewGroups) {
    if (!g.jobs.length) continue;
    const ids = g.jobs.map((j) => j.id);

    const { error } = await admin
      .from("job_posts")
      // The warning gate is cleared so the next cycle warns again. Without
      // this an auto-renewing post is warned once, ever.
      .update({ expires_at: renewedUntil, expiry_warning_sent_at: null })
      .in("id", ids);

    if (error) {
      result.errors.push(`${g.businessName ?? g.businessId}: auto-renew failed — ${error.message}`);
      continue;
    }
    result.renewedJobs += ids.length;

    if (!g.email) {
      result.skippedNoEmail += 1;
      continue;
    }
    try {
      await mailers.renewed({
        to: g.email,
        businessName: g.businessName ?? "there",
        jobTitles: g.jobs.map((j) => j.title),
        expiryDate: formatExpiryDate(renewedUntil),
        pauseUrl: manageUrl,
      });
      result.renewNoticesSent += 1;
    } catch (err) {
      result.errors.push(
        `${g.businessName ?? g.businessId}: renew notice failed — ${err instanceof Error ? err.message : "send failed"}`
      );
    }
  }

  // ── Expire ────────────────────────────────────────────────
  for (const g of expireGroups) {
    if (!g.jobs.length) continue;
    const ids = g.jobs.map((j) => j.id);

    // paused_reason = 'expired' is what makes this reversible and what keeps
    // billing's hands off it: restoreParkedJobs matches BILLING_PAUSE_REASONS
    // only, so an upgrade never silently republishes a lapsed role.
    const { error } = await admin
      .from("job_posts")
      .update({ status: "paused", is_active: false, paused_reason: "expired" })
      .in("id", ids);

    if (error) {
      result.errors.push(`${g.businessName ?? g.businessId}: pause failed — ${error.message}`);
      continue;
    }
    result.pausedJobs += ids.length;

    if (!g.email) {
      result.skippedNoEmail += 1;
      continue;
    }

    try {
      await mailers.paused({
        to: g.email,
        businessName: g.businessName ?? "there",
        jobTitles: g.jobs.map((j) => j.title),
        relistUrl: `${origin}/jobs/renew/${signRenewToken(g.businessId, now)}`,
        manageUrl,
      });
    } catch (err) {
      result.errors.push(
        `${g.businessName ?? g.businessId}: pause notice failed — ${err instanceof Error ? err.message : "send failed"}`
      );
      continue;
    }

    const { error: stampErr } = await admin
      .from("job_posts")
      .update({ expired_notice_sent_at: now.toISOString() })
      .in("id", ids);
    if (stampErr) {
      result.errors.push(
        `${g.businessName ?? g.businessId}: paused and notified but gate not stamped — ${stampErr.message}`
      );
    }
    result.pausedNoticesSent += 1;
  }

  return result;
}
