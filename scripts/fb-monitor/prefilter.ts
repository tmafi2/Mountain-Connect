/**
 * Drop posts that obviously are not job ads, before they cost anything.
 *
 * Extraction is the only part of this pipeline that costs money, and just
 * over half of what it reads is not a job: across a week of runs the model
 * classified 758 posts as hiring and 865 as something else. Every one of
 * those 865 was paid for at full rate and thrown away.
 *
 * THE RULE, and it only works in this order:
 *
 *   1. Any hiring signal at all  -> SEND. No further questions.
 *   2. Otherwise, a clear non-job signal -> drop.
 *   3. Otherwise -> SEND.
 *
 * Step 1 has to come first because of a trap the real data makes obvious.
 * "Accommodation" is the single most common reason the model gives for
 * rejecting a post — 282 mentions in a week — and it is also in a large
 * share of the genuine ads, because staff housing is the main perk a ski
 * job offers. "Looking for a room in Hakuba" and "Chef wanted, staff
 * accommodation provided" share their most distinctive word. Filtering on
 * the word alone would throw away precisely the best listings on the board.
 *
 * THE TWO ERRORS ARE NOT EQUAL. A junk post that slips through costs one
 * API call and one moment in the approval queue, where a human is already
 * looking. A real job wrongly dropped is never seen by anyone — no error,
 * no log line, no second chance. So this defaults to sending, and every
 * threshold is set to be wrong in the cheap direction.
 */

/**
 * Phrases that mean somebody is offering work. Deliberately broad: a false
 * positive here costs one API call, which is the outcome we already have.
 */
const HIRING_SIGNALS = [
  "hiring", "we're hiring", "now hiring", "join our team", "join the team",
  "vacancy", "vacancies", "position available", "positions available",
  "wanted", "we are looking for", "we're looking for", "looking for staff",
  "seeking staff", "recruiting", "recruitment", "apply now", "applications",
  "send your cv", "send your resume", "email your cv", "dm your cv",
  "full time", "full-time", "part time", "part-time", "casual position",
  "staff wanted", "crew wanted", "team member", "job opening", "opening for",
  "start asap", "immediate start", "seasonal role", "winter role",
  "paid position", "hourly rate", "wage", "salary", "per hour",
  "experience preferred", "experience required", "no experience necessary",
  "visa sponsorship", "sponsor a visa", "we sponsor",
  // Roles: an ad often names the job without ever saying "hiring".
  "chef", "sous chef", "kitchen hand", "kitchenhand", "barista", "bartender",
  "waitstaff", "wait staff", "server", "housekeeper", "housekeeping",
  "lift operator", "liftie", "ski instructor", "snowboard instructor",
  "ski patrol", "front desk", "receptionist", "night porter", "concierge",
  "rental technician", "snowmaker", "groomer", "guide", "driver",
  "cleaner", "dishwasher", "supervisor", "manager",
  // Work-for-accommodation arrangements. Added after a replay over 688 real
  // posts lost exactly two listings, both of them help exchanges — the word
  // "helper" carries them, and a person seeking work never offers one.
  "helper", "help exchange", "helpx", "work exchange", "helper wanted",
];

/**
 * Phrases that mean the post is something else. Only consulted once no
 * hiring signal was found at all, which is what keeps "staff accommodation
 * provided" from matching the accommodation rule.
 */
const NOT_A_JOB_SIGNALS = [
  // Somebody wants housing — the largest category by far.
  "looking for accommodation", "looking for a room", "looking for a place",
  "need accommodation", "need a room", "room available", "rooms available",
  "room for rent", "for rent", "flatmate", "housemate", "roommate",
  "spare room", "anyone got a room", "accommodation wanted", "house share",
  // Buying and selling.
  "for sale", "selling my", "selling a", "wtb", "want to buy", "swap",
  "brand new", "barely used", "pick up only", "$ ono", "or nearest offer",
  // Somebody wants a job, rather than offering one. These are also the
  // posts we deliberately do not process — see the settled call on scraped
  // individuals — so dropping them early is right twice over.
  "looking for work", "seeking work", "looking for a job", "job hunting",
  "available for work", "my cv", "my resume", "i am available",
  "anyone hiring", "any jobs going", "is anyone hiring",
  // Questions, chat and admin.
  "does anyone know", "anyone know", "any recommendations", "recommendations for",
  "has anyone", "what's the best", "whats the best", "any advice",
  "lost and found", "has anyone seen", "i lost my", "found a",
  "visa question", "working holiday visa question", "how do i apply for a visa",
  "snow report", "conditions today", "how much snow", "weather",
  "meet up", "meetup", "who's keen", "whos keen", "anyone up for",
  "closing party", "opening party", "après", "apres ski tonight",
  "happy birthday", "congratulations", "rest in peace", "thank you everyone",
];

/**
 * Phrases that are always somebody ASKING for work, checked before the
 * hiring signals because they contain hiring vocabulary themselves. "Is
 * anyone hiring?" trips the hiring rule on the word "hiring" while being
 * the exact opposite of an ad — no employer has ever written it.
 */
const SEEKER_OVERRIDES = [
  "is anyone hiring", "anyone hiring", "anybody hiring", "who is hiring",
  "who's hiring", "whos hiring", "any jobs going", "any work going",
  "any jobs available", "looking for any work", "still hiring anyone",
];

/**
 * How a person advertising THEMSELVES actually writes, taken from 159 real
 * examples that got past the lists above.
 *
 * They open with a greeting to the group and then introduce themselves:
 * "Hi everyone! My name is Victoria and I am 26yrs old", "Hey there! My name
 * is Tate", "We're Steph & Harry, 26 & 28, from the UK". No business writes
 * that. Role words are what carried these through the hiring check — a
 * seeker naturally names the job they want.
 *
 * These posts are also the ones we have decided not to process at all, so
 * dropping them before extraction is right on both counts.
 */
const SEEKER_SELF_INTRO = [
  "my name is", "our names are", "i'm ", "i am ", "we're ", "we are ",
];
const SEEKER_PERSONAL = [
  "years old", "year old", "yrs old", "yr old", "yo from", "yo aussie",
  "my partner and i", "my girlfriend", "my boyfriend", "couple looking",
  "aussie couple", "my mate and i", "the two of us", "heading over",
  "coming over to", "planning to come", "about to finish our",
  "looking for a job", "looking for a ski season job", "looking for winter work",
  "looking for season work", "looking for a position", "seeking a job",
  "available from november", "available from december", "available from october",
  "i have experience", "i've worked", "my experience", "happy to do anything",
];

/**
 * Markers that a post is from a business even though it greets the group.
 * A small operator really does write "Hi everyone! We're looking for a chef
 * at our cafe" — these keep those out of the seeker rule.
 */
const EMPLOYER_MARKERS = [
  "apply", "applications", "our team", "join our", "join the team",
  "contact us", "email us", "send your cv", "send your resume", "dm us",
  "position available", "positions available", "we are hiring", "we're hiring",
  "now hiring", "per hour", "hourly rate", "wage", "salary", "award rate",
  "our venue", "our restaurant", "our cafe", "our hotel", "our lodge",
  "our business", "our company", "staff accommodation provided",
  // A help exchange is an OFFER, however personally it is written. Without
  // this, "HELP EXCHANGE in Nagano — we are a couple in our forties" is read
  // as a self-advertisement, because the seeker rule runs first by design.
  "help exchange", "helpx", "work exchange", "looking for helper",
];

export interface PrefilterVerdict {
  send: boolean;
  /** Present when dropped — the phrase that decided it, for the run log. */
  reason?: string;
}

const norm = (s: string) => s.toLowerCase().replace(/\s+/g, " ");

/** Whole-word/phrase containment, so "server" never matches "observer". */
function contains(haystack: string, needle: string): boolean {
  const escaped = needle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(^|[^a-z0-9])${escaped}([^a-z0-9]|$)`).test(haystack);
}

export function prefilter(text: string | null | undefined, hasImages = false): PrefilterVerdict {
  const t = norm(text ?? "");

  // An image-only post cannot be judged from its text. Ski ads are often a
  // single poster graphic with no caption at all, so these always go
  // through — the whole point of sending images to the model.
  if (hasImages && t.length < 120) {
    return { send: true };
  }

  // A post with almost no text and no image is not a listing we could use
  // even if it were one.
  if (t.length < 25 && !hasImages) {
    return { send: false, reason: "almost no text" };
  }

  // Step 0 — somebody asking for work, in words that would otherwise read
  // as an ad. Must precede step 1 or the word "hiring" carries it through.
  const seeker = SEEKER_OVERRIDES.find((s) => contains(t, s));
  if (seeker) return { send: false, reason: seeker };

  // Step 0b — a person advertising themselves. Checked before the hiring
  // signals because a seeker names the role they want, which is exactly what
  // trips that check. Requires BOTH a self-introduction and a personal
  // detail, and is overridden by any employer marker, so a sole trader
  // writing "Hi everyone, we're after a chef at our cafe" still gets through.
  const introduces = SEEKER_SELF_INTRO.some((x) => t.includes(x));
  const personal = SEEKER_PERSONAL.find((x) => contains(t, x));
  const employer = EMPLOYER_MARKERS.some((x) => contains(t, x));
  if (introduces && personal && !employer) {
    return { send: false, reason: `self-advertisement (${personal})` };
  }

  // Step 1 — any hiring signal wins outright.
  if (HIRING_SIGNALS.some((s) => contains(t, s))) {
    return { send: true };
  }

  // Step 2 — no hiring signal anywhere, so a clear non-job phrase decides it.
  const hit = NOT_A_JOB_SIGNALS.find((s) => contains(t, s));
  if (hit) return { send: false, reason: hit };

  // Step 3 — unrecognised. Send it; that is what the model is for.
  return { send: true };
}
