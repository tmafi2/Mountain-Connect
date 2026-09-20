/**
 * lib/outreach/sequence.ts
 *
 * Two buckets of templates:
 *
 *   1. OUTREACH_SEQUENCE — the ordered drip funnel. Step 0 is fired
 *      manually from the admin UI ("Send" button on the lead row).
 *      Steps 1+ are fired automatically by the daily cron at
 *      /api/cron/outreach-drip once the previous step has been sent
 *      for at least `delayDaysAfterPrevious` days.
 *
 *   2. STANDALONE_TEMPLATES — manual-only ad-hoc templates that the
 *      admin can fire any time but the drip cron NEVER auto-progresses
 *      from. Used for one-off touchpoints like in-person sales follow-
 *      ups where the next step is "wait for the human to reply", not
 *      "fire another email in 7 days".
 *
 * To add a new follow-up email in the funnel:
 *   1. Create lib/email/templates/<name>.ts (copy winter-outreach.ts
 *      shape — must accept businessName, locationName?, unsubscribeUrl).
 *   2. Wire a send helper in lib/email/send.ts.
 *   3. Add a row to OUTREACH_SEQUENCE below.
 *
 * To add a new standalone template: same steps but add to
 * STANDALONE_TEMPLATES instead.
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

export interface StandaloneTemplate {
  template: string;
  label: string;
  /** One-line description shown in the admin Send dropdown to remind
   *  the admin what this template is for. */
  description: string;
}

/**
 * TWO TOUCHES, cut from five on 2026-09-20.
 *
 * These addresses are scraped from Facebook posts; nobody on this list asked
 * to hear from us. By that date outreach stood at 219 emails to 41 leads —
 * 5.3 touches each — and mail from this domain was landing in spam, which
 * costs us the transactional mail and Tyler's Workspace inbox too, because
 * they share the domain's reputation. Complaints come from repetition more
 * than from any one email, so the sequence is the lever.
 *
 * The three later emails are NOT deleted. They moved to STANDALONE_TEMPLATES,
 * where the admin can still send one by hand to a lead worth chasing, but the
 * cron will never fire them at anybody automatically. To restore the old
 * funnel, move the rows back — nothing else needs changing.
 */
export const OUTREACH_SEQUENCE: OutreachStep[] = [
  {
    template: "winter-outreach",
    delayDaysAfterPrevious: 0,
    label: "Initial winter outreach (manual)",
  },
  {
    template: "winter-followup-1",
    delayDaysAfterPrevious: 3,
    label: "Quick follow-up — bumping the inbox (last automatic email)",
  },
];

export const STANDALONE_TEMPLATES: StandaloneTemplate[] = [
  {
    template: "sales-dropin",
    label: "Sales drop-in follow-up",
    description: "Send after visiting a business in person",
  },
  {
    template: "winter-followup-2",
    label: "Workers near you — live demand pitch",
    description: "Was step 2 of the funnel; now by hand only, one lead at a time",
  },
  {
    template: "winter-followup-3",
    label: "Want me to set you up? — friction removal",
    description: "Was step 3 of the funnel; now by hand only, one lead at a time",
  },
  {
    template: "winter-followup-final",
    label: "Last note — graceful breakup",
    description: "Was step 4 of the funnel; now by hand only, one lead at a time",
  },
];

/**
 * Every template the admin can manually fire — the funnel sequence
 * plus the standalone bucket. Used by the admin Send dropdown.
 */
export function allManualTemplates(): { template: string; label: string; group: "sequence" | "standalone" }[] {
  return [
    ...OUTREACH_SEQUENCE.map((s) => ({ template: s.template, label: s.label, group: "sequence" as const })),
    ...STANDALONE_TEMPLATES.map((s) => ({ template: s.template, label: s.label, group: "standalone" as const })),
  ];
}

/**
 * Given the most recent send for a lead (or null if they've never been
 * emailed), return the next funnel step. Returns null if:
 *   - never emailed (step 0 is manual, cron must not auto-fire)
 *   - last template isn't part of the funnel (e.g. it was a standalone
 *     send like sales-dropin — cron should not auto-progress from there)
 *   - the funnel is exhausted
 */
export function findNextStep(lastSentTemplate: string | null): OutreachStep | null {
  if (lastSentTemplate === null) return null;
  const lastIdx = OUTREACH_SEQUENCE.findIndex((s) => s.template === lastSentTemplate);
  if (lastIdx === -1) return null;
  return OUTREACH_SEQUENCE[lastIdx + 1] ?? null;
}
