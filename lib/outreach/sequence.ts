/**
 * lib/outreach/sequence.ts
 *
 * The ordered drip sequence for the business-outreach campaign. Each
 * step references a template (lib/email/templates/<name>.ts) and the
 * number of days to wait AFTER the previous step before firing.
 *
 * Step 0 is fired manually from the admin UI ("Send" button on the
 * lead row). Steps 1+ are fired automatically by the daily cron at
 * /api/cron/outreach-drip once the previous step has been sent for
 * at least `delayDaysAfterPrevious` days.
 *
 * To add a new follow-up email:
 *   1. Create lib/email/templates/<name>.ts (copy winter-outreach.ts
 *      shape — must accept businessName, locationName?, unsubscribeUrl).
 *   2. Wire a send helper in lib/email/send.ts.
 *   3. Add a row below.
 *
 * Removing or reordering steps is fine — the cron uses
 * `findNextStep()` which compares "what was the last template sent"
 * to this list and figures out what to send next.
 */
export interface OutreachStep {
  /** File-stem of the template under lib/email/templates/. */
  template: string;
  /** Days after the PREVIOUS step before this one fires. Step 0 is
   *  manual so its delay is informational only. */
  delayDaysAfterPrevious: number;
  /** Human label shown in the admin UI sequence preview. */
  label: string;
}

export const OUTREACH_SEQUENCE: OutreachStep[] = [
  {
    template: "winter-outreach",
    delayDaysAfterPrevious: 0,
    label: "Initial winter outreach (manual)",
  },
  // Future follow-ups plug in here, e.g.:
  // { template: "winter-followup-1", delayDaysAfterPrevious: 7,  label: "Follow-up #1" },
  // { template: "winter-followup-2", delayDaysAfterPrevious: 14, label: "Follow-up #2 / final" },
];

/**
 * Given the most recent send for a lead (or null if they've never been
 * emailed), return the next step in the sequence. Returns null if the
 * sequence is exhausted or the lead is at step 0 awaiting manual send.
 */
export function findNextStep(lastSentTemplate: string | null): OutreachStep | null {
  if (lastSentTemplate === null) {
    // Never emailed — step 0 is manual, so the cron should not auto-fire it.
    return null;
  }
  const lastIdx = OUTREACH_SEQUENCE.findIndex((s) => s.template === lastSentTemplate);
  if (lastIdx === -1) {
    // Last template isn't in the current sequence (renamed or removed).
    // Bail out to avoid surprising the lead with a wrong follow-up.
    return null;
  }
  return OUTREACH_SEQUENCE[lastIdx + 1] ?? null;
}
