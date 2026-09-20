import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Who has asked us to stop emailing them.
 *
 * Unsubscribing used to govern the cold-outreach cadence only. The claim-flow
 * emails — import outreach, the first-applicant nudge, the 5-applicant nudge,
 * the dormancy warnings — are keyed on `business_profiles` and never consulted
 * `outreach_leads`, so a business that pressed Unsubscribe could still hear
 * from us through the other pipe. On 2026-09-20 one of the two unsubscribed
 * leads was also a business record, so this was live, not hypothetical.
 *
 * An unsubscribe is a person saying stop, not "stop one particular campaign".
 * It covers every unsolicited email we send to that address. It does NOT
 * cover mail somebody asked for: a claim link they requested, or the
 * confirmation after they claim.
 *
 * FAILS CLOSED. If the lookup breaks we suppress rather than send: the
 * senders stamp their sent-at column only after a successful send, so a
 * skipped nudge is retried on the next cron run, while an email to someone
 * who opted out cannot be taken back.
 */
export interface SuppressionList {
  /** Lowercased addresses that unsubscribed. */
  unsubscribed: Set<string>;
  /** True when the list could not be read — treat everything as suppressed. */
  lookupFailed: boolean;
}

export async function loadUnsubscribed(admin: SupabaseClient): Promise<SuppressionList> {
  const { data, error } = await admin
    .from("outreach_leads")
    .select("email")
    .eq("status", "unsubscribed");

  if (error) {
    console.error("suppression: could not read unsubscribes:", error.message);
    return { unsubscribed: new Set(), lookupFailed: true };
  }

  const unsubscribed = new Set<string>();
  for (const row of (data ?? []) as { email: string | null }[]) {
    const address = (row.email ?? "").trim().toLowerCase();
    if (address) unsubscribed.add(address);
  }
  return { unsubscribed, lookupFailed: false };
}

/** Pure, so the fail-closed rule is testable without a database. */
export function suppressed(list: SuppressionList, email?: string | null): boolean {
  if (list.lookupFailed) return true;
  if (!email) return false;
  return list.unsubscribed.has(email.trim().toLowerCase());
}

/** One address, for senders that handle a single business at a time. */
export async function hasUnsubscribed(
  admin: SupabaseClient,
  email?: string | null
): Promise<boolean> {
  if (!email) return false;
  return suppressed(await loadUnsubscribed(admin), email);
}
