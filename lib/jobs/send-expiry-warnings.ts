import type { SupabaseClient } from "@supabase/supabase-js";
import type { BusinessGroup } from "./expiry-sweep";
import { signRenewToken } from "./renew-token";

/**
 * Send the "still hiring?" warnings for one sweep.
 *
 * ONE EMAIL PER BUSINESS. The groups arrive pre-batched from the sweep, and
 * a business with twelve lapsing roles gets one email listing twelve. This
 * is the rule migration 00088 was written to enforce after the outreach
 * cadence nearly sent 76 emails where 21 were intended.
 *
 * THE GATE IS STAMPED ONLY AFTER A CONFIRMED SEND, and only on the posts
 * that were actually named in the email. Stamping first would mean a Resend
 * outage silently consumed the one warning a business ever gets, and they
 * would find a listing paused having been told nothing. Stamping the whole
 * group when only some posts were included would do the same, quietly.
 *
 * The mailer is injectable so the batching and the gate can be tested
 * without sending real email — the same shape as lib/admin/publish-jobs.ts.
 */

export type ExpiryMailer = (params: {
  to: string;
  businessName: string;
  jobTitles: string[];
  expiryDate: string;
  renewUrl: string;
  manageUrl: string;
  canRenew: boolean;
}) => Promise<unknown>;

export interface WarningSendResult {
  sent: number;
  skippedNoEmail: number;
  failed: number;
  errors: string[];
}

/** "25 October 2026" — unambiguous for a mixed AU/CA/JP/US audience. */
export function formatExpiryDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

export async function sendExpiryWarnings(
  admin: SupabaseClient,
  groups: BusinessGroup[],
  origin: string,
  mailer: ExpiryMailer,
  now: Date = new Date()
): Promise<WarningSendResult> {
  const result: WarningSendResult = { sent: 0, skippedNoEmail: 0, failed: 0, errors: [] };

  for (const g of groups) {
    if (g.jobs.length === 0) continue;

    // No address, no warning — and crucially no stamp, so the business is
    // warned properly if an address is added before the posts lapse.
    if (!g.email) {
      result.skippedNoEmail += 1;
      continue;
    }

    // The soonest expiry in the batch is the date quoted, so the email never
    // promises a business more time than its earliest listing actually has.
    const earliest = g.jobs
      .map((j) => j.expiresAt)
      .sort()[0];

    try {
      await mailer({
        to: g.email,
        businessName: g.businessName ?? "there",
        jobTitles: g.jobs.map((j) => j.title),
        expiryDate: formatExpiryDate(earliest),
        renewUrl: `${origin}/jobs/renew/${signRenewToken(g.businessId, now)}`,
        manageUrl: `${origin}/business/manage-listings`,
        // Free accounts get the upgrade wording instead of a renew button
        // they are not entitled to press.
        canRenew: g.effectiveTier !== "free",
      });
    } catch (err) {
      result.failed += 1;
      result.errors.push(
        `${g.businessName ?? g.businessId}: ${err instanceof Error ? err.message : "send failed"}`
      );
      continue;
    }

    const { error } = await admin
      .from("job_posts")
      .update({ expiry_warning_sent_at: now.toISOString() })
      .in(
        "id",
        g.jobs.map((j) => j.id)
      );

    if (error) {
      // The email went out; only the bookkeeping failed. Reported rather
      // than counted as a failure, because tomorrow's run will re-send to
      // this business and a duplicate is the visible symptom to chase.
      result.errors.push(
        `${g.businessName ?? g.businessId}: sent but gate not stamped — ${error.message}`
      );
    }
    result.sent += 1;
  }

  return result;
}
