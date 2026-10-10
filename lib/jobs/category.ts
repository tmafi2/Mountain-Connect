/**
 * What kind of job this is, worked out from its title.
 *
 * ⚠️ WHY: `job_posts.category` is empty on 354 of 355 open listings — the one
 * value present is "Maintenance". Nothing was ever writing it for imported
 * listings, and imports are 349 of the board.
 *
 * It LOOKS populated on the site, which is why it went unnoticed for so long:
 * /jobs maps a blank to "Other" in its view model, so the board's category
 * filter renders and offers exactly two options — "Maintenance" and "Other" —
 * for 355 jobs. A filter that cannot filter is worse than no filter, because
 * a worker reads it as "there are no chef jobs here".
 *
 * ⚠️ THE TAXONOMY IS THE EXISTING ONE, deliberately. These are the categories
 * the business post-job form already offers, which is what a business picks
 * when it posts by hand and what the board filters on. Inventing a second,
 * better set would have split the board in two: imported listings in one
 * vocabulary and employer-posted ones in another, with the filter matching
 * neither.
 */

/** The categories a job post may carry. Order is the form's display order. */
export const JOB_CATEGORIES = [
  "Ski Instruction",
  "Hospitality",
  "Food & Beverage",
  "Retail",
  "Resort Operations",
  "Lift Operations",
  "Housekeeping",
  "Maintenance",
  "Administration",
  "Entertainment",
  "Other",
] as const;

export type JobCategory = (typeof JOB_CATEGORIES)[number];

/**
 * Ordered — the FIRST match wins, so this runs from the most specific signal
 * to the most general.
 *
 * Two deliberate orderings worth knowing about:
 *   - "Lift Operations" is tested before "Resort Operations", or every lift
 *     role would be swallowed by the broader operations rule.
 *   - "Administration" comes near the end, so "restaurant manager" lands in
 *     Food & Beverage and "operations manager" lands in Administration. The
 *     noun the job is about beats the seniority word attached to it.
 */
const RULES: Array<[JobCategory, RegExp]> = [
  // ⚠️ FIRST, and the order is the whole point. Spa roles were landing in
  // Maintenance because "Aesthetician/Nail Technician" hit `technician`, and
  // Pilates, swim, skating and bike coaches were landing in Ski Instruction
  // because `instructor|coach` has no snow in it. Both were visible only by
  // reading the assignments, not the rules.
  ["Hospitality", /\b(spa|massage|nail|esthetic|aesthetic|therapist|pilates|yoga|swim|skating|conditioning|gym|fitness|sauna|wellness|bike coach|bike instructor|cycling coach)/],
  ["Ski Instruction", /\b(ski instructor|snowboard instructor|instructor|ski school|snowsport|coach)\b/],
  ["Lift Operations", /\b(lift op|lift att|liftie|lift crew|chairlift|gondola)/],
  ["Housekeeping", /\b(housekeep|room attendant|cleaner|cleaning|laundry|janitor|houseperson|housman|turndown|linen|accommodation staff)/],
  ["Food & Beverage", /\b(chef|cook|kitchen|dishwash|dish wash|prep|pastry|baker|commis|sous|butcher|server|waiter|waitress|bartender|bar staff|barista|busser|cafe|café|restaurant|food|beverage|front of house|foh|service staff|host|hostess|sommelier|deli\b|cheesemonger|bottle|floor staff|hall staff|wait staff|waitstaff|bar attendant|\bbar\b|catering|pizza|burger|sushi|ramen|izakaya|grill)/],
  ["Retail", /\b(retail|sales associate|shop assistant|shop|cashier|store|merchandis|rental tech|boot fit|bootfit|ski tech|sales assistant|rental|merchandise)/],
  ["Maintenance", /\b(maintenance|carpenter|plumber|electrician|handyman|painter|mechanic|technician|skid steer|excavator|builder|joiner|repair|labour|labor|carpentry|electrical|flooring|roofing|cladding|renovation|construction|landscap|install|refinish|weld|groundskeep|tradesperson|plumbing|hvac|warehouse)/],
  ["Resort Operations", /\b(ski patrol|patroller|snowmak|groomer|grooming|snow clearing|snow removal|shovel|terrain park|driver|shuttle|transport|guide|mountain op|operations|parking|security|valet|plow|loader operator|truck operator|machine operator)/],
  ["Hospitality", /\b(front desk|reception|concierge|guest service|night audit|reservation|check-in|bell|porter|spa|massage|nail|esthetic|aesthetic|therapist|hotel|lodge|chalet|host family|nanny|childcare|daycare|hospitality|guest experience|coat check|property services|front office|yoga|all-rounder|all - rounder|rounder)/],
  ["Entertainment", /\b(entertain|dj\b|musician|performer|events|event coordinator|photograph|videograph|social media|brand ambassador|content creator|photo booth|tattoo)/],
  ["Administration", /\b(manager|supervisor|director|administrat|coordinator|office|accounts|bookkeep|payroll|\bhr\b|recruit|assistant manager)/],
];

/**
 * The category for a job title, or null when nothing matches.
 *
 * ⚠️ RETURNS NULL RATHER THAN "Other". A caller writing this to the database
 * must be able to tell "we classified this as miscellaneous" from "we could
 * not classify it" — the second is a rule worth adding, the first is not, and
 * collapsing them loses the only signal that says which. The /jobs view model
 * still shows an unset category as "Other" to a visitor, which is a display
 * choice, not a stored fact.
 */
export function categoryForTitle(title: string | null | undefined): JobCategory | null {
  const t = ` ${(title ?? "").toLowerCase().trim()} `;
  if (t.trim() === "") return null;
  for (const [category, re] of RULES) if (re.test(t)) return category;
  return null;
}
