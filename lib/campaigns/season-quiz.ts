/**
 * "Find My Season" — the three-question quiz on /go-for-a-season:
 * hemisphere, then country, then what work (pick as many as you like).
 *
 * ORDER MATTERS AND CHANGED 2026-09-22. It used to ask the country first and
 * the hemisphere second, which asked the harder question first: plenty of
 * people know they want a northern winter long before they know whether that
 * means Canada or Japan. Asking the hemisphere first also lets question 2
 * show only the countries that HAVE that winter, so the list is short and
 * every option is a real answer.
 *
 * Content lives here rather than in the components so destinations, seasons
 * and work types can change without touching layout code.
 *
 * VALUES ARE THE STABLE PART. They are stored on the account at signup
 * (auth user_metadata.season_intent) and sent to analytics, so renaming a
 * value orphans every signup and report that used the old one. Change labels
 * freely; change values deliberately.
 *
 * NOTHING HERE IS A RECOMMENDATION. The result screen repeats back what the
 * visitor chose. We do not match anyone to a resort, and the copy must not
 * pretend to.
 */

export type Destination = "canada" | "japan" | "usa" | "australia" | "new-zealand" | "anywhere";
export type Season = "northern-winter" | "southern-winter" | "exploring";
export type WorkType =
  | "hospitality"
  | "mountain-operations"
  | "accommodation"
  | "retail"
  | "trades"
  | "anything";

export interface SeasonAnswers {
  /** Question 1 — the hemisphere. The VALUES are unchanged from when this was
   *  question 2, so every signup, analytics row and GA4 dimension recorded
   *  before the reorder still means what it meant. */
  season: Season;
  /** Question 2 — the country, filtered to the hemisphere chosen above. */
  destination: Destination;
  /** Question 3 — one or more. Was a single value until 2026-09-22; anything
   *  reading it must cope with both (see parseAnswers). */
  workTypes: WorkType[];
}

export interface QuizOption<V extends string = string> {
  value: V;
  /** The wording on tablets and desktops. */
  label: string;
  /** Shorter wording for phones, where the full label would crowd the card.
   *  Only the text changes — both render the same button with the same value,
   *  and CSS decides which one is visible (and so which one is announced). */
  shortLabel?: string;
  /** Decorative emoji shown on the option card, kept on one line. Hidden from
   *  screen readers. */
  emoji?: string;
}

/** The values the worker_profiles.season_preference CHECK constraint allows
 *  that a quiz answer can name. */
export type SeasonPreference = "northern_winter" | "southern_winter";

type Hemisphere = "north" | "south";

interface DestinationOption extends QuizOption<Destination> {
  /** The country exactly as `resorts.country` writes it — what /jobs?country=
   *  matches on and what worker_profiles.preferred_countries mostly holds.
   *  Null for "anywhere": there is no one country to file it under. */
  country: string | null;
  /** Whose winter this destination has. Decides which season option question
   *  2 lists first. Null for "anywhere". */
  hemisphere: Hemisphere | null;
  /** Result-screen heading. */
  calling: string;
}

interface SeasonOption extends QuizOption<Season> {
  /** Completes "You're …" on the result screen. */
  phrase: string;
  /** What onboarding writes to worker_profiles.season_preference, if anything. */
  seasonPreference: SeasonPreference | null;
  /** Null for "Just Exploring", which belongs to neither. */
  hemisphere: Hemisphere | null;
}

interface WorkTypeOption extends QuizOption<WorkType> {
  /** Completes "… and …" on the result screen. */
  phrase: string;
  /** Values from the profile editor's JOB_TYPE_OPTIONS (app/(worker)/profile/
   *  edit/page.tsx) that onboarding pre-selects. Anything not in that list
   *  would be saved but never shown as selected in the editor — the test
   *  checks this against the editor's source. */
  jobTypes: readonly string[];
}

export const DESTINATIONS: readonly DestinationOption[] = [
  { value: "canada", label: "Canada", emoji: "🇨🇦", country: "Canada", hemisphere: "north", calling: "Canada is calling" },
  { value: "japan", label: "Japan", emoji: "🇯🇵", country: "Japan", hemisphere: "north", calling: "Japan is calling" },
  { value: "usa", label: "USA", emoji: "🇺🇸", country: "USA", hemisphere: "north", calling: "The USA is calling" },
  { value: "australia", label: "Australia", emoji: "🇦🇺", country: "Australia", hemisphere: "south", calling: "Australia is calling" },
  { value: "new-zealand", label: "New Zealand", emoji: "🇳🇿", country: "New Zealand", hemisphere: "south", calling: "New Zealand is calling" },
  // Value stays "anywhere" — it is stored on accounts and in analytics — but
  // the wording is now the honest one: this is the answer for somebody who has
  // not decided. It deliberately does NOT promise a recommendation; nothing
  // here matches anyone to anywhere, and the copy must not pretend it does.
  { value: "anywhere", label: "Not sure yet", emoji: "🌎", country: null, hemisphere: null, calling: "The mountains are calling" },
];

export const SEASONS: readonly SeasonOption[] = [
  {
    value: "northern-winter",
    label: "Northern Hemisphere",
    shortLabel: "Northern",
    emoji: "🇨🇦 🇺🇸 🇯🇵",
    phrase: "chasing a Northern Hemisphere winter",
    seasonPreference: "northern_winter",
    hemisphere: "north",
  },
  {
    value: "southern-winter",
    label: "Southern Hemisphere",
    shortLabel: "Southern",
    emoji: "🇦🇺 🇳🇿",
    phrase: "chasing a Southern Hemisphere winter",
    seasonPreference: "southern_winter",
    hemisphere: "south",
  },
  {
    value: "exploring",
    label: "Not sure yet",
    emoji: "🌎",
    phrase: "keeping your options open",
    seasonPreference: null,
    hemisphere: null,
  },
];

export const WORK_TYPES: readonly WorkTypeOption[] = [
  {
    value: "hospitality",
    label: "Bars & Restaurants",
    phrase: "you're interested in hospitality work",
    jobTypes: ["Hospitality", "Food & Beverage", "Bartender"],
  },
  {
    value: "mountain-operations",
    label: "Mountain Operations",
    phrase: "you want to work on the mountain",
    jobTypes: ["Lift Operator", "Snow Grooming", "Rental Tech"],
  },
  {
    value: "accommodation",
    label: "Hotels & Accommodation",
    phrase: "you're interested in hotel and accommodation work",
    jobTypes: ["Hotel / Front Desk", "Housekeeping"],
  },
  { value: "retail", label: "Retail", phrase: "you're interested in retail work", jobTypes: ["Retail"] },
  { value: "trades", label: "Trades", phrase: "you want to put your trade to work", jobTypes: ["Maintenance"] },
  {
    value: "anything",
    label: "Anything — get me there",
    phrase: "you're open to whatever gets you there",
    jobTypes: [],
  },
];

export interface QuizStep {
  key: keyof SeasonAnswers;
  question: string;
  options: readonly QuizOption[];
  /** Takes more than one answer, so it cannot auto-advance on tap — the step
   *  needs its own Continue. Only question 3. */
  multi?: true;
}

export const QUIZ_STEPS: readonly QuizStep[] = [
  { key: "season", question: "Which hemisphere are you thinking?", options: SEASONS },
  { key: "destination", question: "Anywhere in particular?", options: DESTINATIONS },
  { key: "workTypes", question: "What kind of work? Pick as many as you like.", options: WORK_TYPES, multi: true },
];

function byValue<V extends string, O extends QuizOption<V>>(options: readonly O[], value: unknown): O | undefined {
  return options.find((o) => o.value === value);
}

export const destinationOption = (v: Destination) => byValue(DESTINATIONS, v)!;
export const seasonOption = (v: Season) => byValue(SEASONS, v)!;
export const workTypeOption = (v: WorkType) => byValue(WORK_TYPES, v)!;

/**
 * Question 2's countries, narrowed to the hemisphere chosen in question 1.
 * Pick Northern and you are offered Canada, Japan and the USA; pick Southern
 * and you get Australia and New Zealand. "Not sure yet" in question 1 shows
 * every country, which is the whole point of that answer.
 *
 * "Not sure yet" always survives the filter: a visitor who knows the
 * hemisphere but not the country must still have an answer that is true.
 *
 * Filtering rather than reordering, because a country in the wrong hemisphere
 * is not merely unlikely — it does not have that winter at all, and offering
 * it invites an answer we would then have to argue with.
 */
export function destinationsFor(season: Season | undefined): readonly DestinationOption[] {
  const hemisphere = season ? seasonOption(season).hemisphere : null;
  if (!hemisphere) return DESTINATIONS;
  return DESTINATIONS.filter((d) => d.hemisphere === hemisphere || d.hemisphere === null);
}

/** The options a quiz step shows, given the answers so far. */
export function optionsForStep(step: QuizStep, answers: Partial<SeasonAnswers>): readonly QuizOption[] {
  return step.key === "destination" ? destinationsFor(answers.season) : step.options;
}

/**
 * Accepts answers from anywhere untrusted — a URL, localStorage, auth metadata
 * — and returns them only if all three are known values. Takes `work_type` as
 * well as `workType`, because metadata is stored snake_case like the rest of
 * user_metadata.
 */
function parseWorkTypes(input: unknown): WorkType[] | null {
  // An array (the new shape), a comma-joined string (how it travels in a URL
  // and in auth metadata), or a single value (every answer recorded before
  // 2026-09-22). All three have to keep working: the old ones are on real
  // accounts and cannot be rewritten.
  const raw = Array.isArray(input) ? input : typeof input === "string" ? input.split(",") : [];
  const out: WorkType[] = [];
  for (const candidate of raw) {
    const value = byValue(WORK_TYPES, typeof candidate === "string" ? candidate.trim() : candidate)?.value;
    if (value && !out.includes(value)) out.push(value);
  }
  return out.length > 0 ? out : null;
}

export function parseAnswers(input: unknown): SeasonAnswers | null {
  if (!input || typeof input !== "object") return null;
  const o = input as Record<string, unknown>;
  const destination = byValue(DESTINATIONS, o.destination)?.value;
  const season = byValue(SEASONS, o.season)?.value;
  const workTypes = parseWorkTypes(o.workTypes ?? o.work_types ?? o.workType ?? o.work_type);
  if (!destination || !season || !workTypes) return null;
  return { season, destination, workTypes };
}

/** How several work types travel in a URL or in auth metadata. */
export function workTypesToParam(values: readonly WorkType[]): string {
  return values.join(",");
}

/**
 * One work type keeps its own phrase, which is written to read well. Several
 * cannot — "you're interested in hospitality work and you want to work on the
 * mountain and you're interested in retail work" is not a sentence anyone
 * wrote on purpose — so a list of labels is used instead.
 */
function workPhrase(values: readonly WorkType[]): string {
  if (values.length === 1) return workTypeOption(values[0]).phrase;
  const labels = values.map((v) => workTypeOption(v).label);
  const last = labels[labels.length - 1];
  return `you're interested in ${labels.slice(0, -1).join(", ")} and ${last}`;
}

/** "Canada is calling" + flag, and the sentence that repeats the answers back. */
export function resultCopy(a: SeasonAnswers): { heading: string; emoji: string; summary: string } {
  const d = destinationOption(a.destination);
  return {
    heading: d.calling,
    emoji: d.emoji ?? "",
    summary: `You're ${seasonOption(a.season).phrase} and ${workPhrase(a.workTypes)}.`,
  };
}

/** Short labels for the "your season" strip on the signup page — a one-line
 *  summary, so it uses the phone wording on every screen. */
export function answerLabels(a: SeasonAnswers): string[] {
  const d = destinationOption(a.destination);
  const s = seasonOption(a.season);
  // The strip is one line. Two work types fit; beyond that it counts the rest
  // rather than wrapping onto a second line on a phone.
  const work = a.workTypes.map((w) => workTypeOption(w).label);
  const workLabel =
    work.length <= 2 ? work.join(", ") : `${work[0]}, ${work[1]} +${work.length - 2}`;
  return [`${d.emoji} ${d.label}`, s.shortLabel ?? s.label, workLabel];
}

export interface IntentProfileFields {
  preferred_countries?: string[];
  preferred_job_types?: string[];
  season_preference?: SeasonPreference;
}

/**
 * The worker_profiles fields onboarding can fill from the quiz. Only what
 * translates without guessing: "Anywhere" names no country, "Anything" no job
 * type, and "Just Exploring" no season. The season is taken as answered, even
 * where it disagrees with the destination (Canada + Southern Hemisphere
 * Winter): it is the worker's stated preference, not ours to correct.
 */
export function profileFieldsFromAnswers(a: SeasonAnswers): IntentProfileFields {
  const d = destinationOption(a.destination);
  const s = seasonOption(a.season);
  const out: IntentProfileFields = {};
  if (d.country) out.preferred_countries = [d.country];
  if (s.seasonPreference) out.season_preference = s.seasonPreference;
  // The union of every chosen work type, deduped — two answers can name the
  // same job type, and the profile editor would show a duplicate chip.
  const jobTypes: string[] = [];
  for (const w of a.workTypes) {
    for (const t of workTypeOption(w).jobTypes) if (!jobTypes.includes(t)) jobTypes.push(t);
  }
  if (jobTypes.length > 0) out.preferred_job_types = jobTypes;
  return out;
}

/**
 * Where "Browse jobs" goes. Filtered to the chosen country only when that
 * country has live jobs: a filter that returns nothing reads as "there is no
 * work here", which is worse than showing everything.
 */
export function browseJobsHref(destination: Destination | undefined, countriesWithJobs: readonly string[]): string {
  const country = destination ? destinationOption(destination).country : null;
  if (country && countriesWithJobs.includes(country)) {
    return `/jobs?country=${encodeURIComponent(country)}`;
  }
  return "/jobs";
}
