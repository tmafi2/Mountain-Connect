import { JOB_CATEGORIES, categoryForTitle, type JobCategory } from "@/lib/jobs/category";

/**
 * What industries a worker has WORKED in, and which they are LOOKING FOR.
 *
 * Both questions are already answerable from `worker_profiles`, but they are
 * stored in two different vocabularies, neither of which is the one the job
 * board uses:
 *
 *   preferred_job_types   19 Title Case values  ("Hospitality", "Bartender")
 *   work_history[].category 9 snake_case values ("hospitality", "outdoor")
 *   JOB_CATEGORIES        11 values             — what job posts are filed under
 *
 * ⚠️ THIS MODULE DOES NOT INVENT A FOURTH. Everything is resolved into
 * JOB_CATEGORIES, because that is the vocabulary of the thing a worker is
 * being matched TO, and because lib/jobs/category.ts already classifies into
 * it. Inventing a nicer set here would leave the admin filtering on one
 * taxonomy while the board filters on another — the split 00110 was written
 * to avoid.
 *
 * ⚠️ COVERAGE IS LOW AND THAT IS NOT A BUG TO HIDE. Measured 2026-11-11 over
 * all 401 worker profiles: 168 (42%) list any preferred job type, and 115
 * (29%) have any work history at all. A filter on either dimension is a
 * filter over the minority who filled that section in, so the UI has to say
 * so rather than presenting a short list as "the workers who have done this".
 */

/**
 * The worker's own 9-value work-history category, used ONLY as a fallback
 * when the job title cannot be classified.
 *
 * ⚠️ `outdoor` AND `instruction` FALL BACK TO "Other", WHICH LOOKS WRONG AND
 * IS NOT. The fallback only ever fires on titles the classifier could not
 * read, and those were inspected one by one (2026-11-11):
 *
 *   outdoor, unreadable  → Raspberry Picker, Grain Handler, Farm Worker,
 *                          Grape Harvest Worker. All four are farm work. The
 *                          genuine lift operators and instructors filed under
 *                          `outdoor` ARE read by the classifier (5 → Lift
 *                          Operations, 7 → Ski Instruction), so they never
 *                          reach this map. Sending the remainder to Lift
 *                          Operations would tell you a fruit picker has lift
 *                          experience.
 *   instruction, unreadable → Packing Operator, Personal Trainer, Tutor,
 *                          Revved Up Ambassador, Kingston Gets Active
 *                          Ambassador. Not one is ski instruction.
 *
 * The others are safe: `cleaning_housekeeping` recovers "House keeper" and
 * "House Keeper", which the classifier misses on the space, and `retail`
 * recovers "Customer service" and "Pharmacy Assistant".
 */
const WORKED_FALLBACK: Record<string, JobCategory> = {
  hospitality: "Hospitality",
  food_beverage: "Food & Beverage",
  cleaning_housekeeping: "Housekeeping",
  retail: "Retail",
  maintenance: "Maintenance",
  admin: "Administration",
  instruction: "Other",
  outdoor: "Other",
  other: "Other",
};

/**
 * The 19 options the profile editor offers (JOB_TYPE_OPTIONS), onto the 11
 * the board files jobs under. Several collapse, which is expected — the
 * worker list is finer-grained about roles a person picks for themselves.
 *
 * ⚠️ `Childcare` → "Other" on purpose. No JOB_CATEGORY covers it, and
 * "Entertainment" would be a different job. 28 workers want it, so it is
 * worth its own category one day; filing it under a wrong one hides that.
 */
const WANTED_MAP: Record<string, JobCategory> = {
  "Ski Instructor": "Ski Instruction",
  "Snowboard Instructor": "Ski Instruction",
  "Lift Operator": "Lift Operations",
  "Ski Patrol": "Resort Operations",
  "Snow Grooming": "Resort Operations",
  "Rental Tech": "Maintenance",
  Maintenance: "Maintenance",
  Hospitality: "Hospitality",
  "Hotel / Front Desk": "Hospitality",
  "Food & Beverage": "Food & Beverage",
  Bartender: "Food & Beverage",
  "Chef / Cook": "Food & Beverage",
  Housekeeping: "Housekeeping",
  Retail: "Retail",
  "Admin / Office": "Administration",
  Marketing: "Administration",
  Events: "Entertainment",
  Childcare: "Other",
  Other: "Other",
};

export interface WorkHistoryEntry {
  title?: unknown;
  category?: unknown;
}

const asString = (v: unknown) => (typeof v === "string" ? v.trim() : "");

/**
 * Industries a worker has actually worked in.
 *
 * Title first, stored category second. That order matters: the title is what
 * the worker typed about the job, the category is what they picked from a
 * 9-item dropdown, and the dropdown is where the mistakes are — 6 lift
 * operators, 5 instructors and 4 fruit pickers all share `outdoor`.
 */
export function industriesWorked(workHistory: unknown): JobCategory[] {
  if (!Array.isArray(workHistory)) return [];
  const out = new Set<JobCategory>();
  for (const raw of workHistory) {
    if (!raw || typeof raw !== "object") continue;
    const entry = raw as WorkHistoryEntry;
    const fromTitle = categoryForTitle(asString(entry.title));
    if (fromTitle) {
      out.add(fromTitle);
      continue;
    }
    const fallback = WORKED_FALLBACK[asString(entry.category).toLowerCase()];
    if (fallback) out.add(fallback);
  }
  return [...out];
}

/** Industries a worker says they are looking for. */
export function industriesWanted(preferredJobTypes: unknown): JobCategory[] {
  if (!Array.isArray(preferredJobTypes)) return [];
  const out = new Set<JobCategory>();
  for (const raw of preferredJobTypes) {
    const v = asString(raw);
    if (!v) continue;
    // ⚠️ "full_time" lived in this column until 00099 and may still arrive
    // from an old client. It is a position_type, not a role: drop it rather
    // than let it fall into "Other" and look like a stated preference.
    if (!(v in WANTED_MAP)) continue;
    out.add(WANTED_MAP[v]);
  }
  return [...out];
}

/** Stable order for filter chips — the board's own order, not alphabetical. */
export const INDUSTRY_OPTIONS: readonly JobCategory[] = JOB_CATEGORIES;
