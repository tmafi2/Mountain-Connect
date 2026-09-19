/**
 * "Find My Season" — the three-question quiz on /go-for-a-season.
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
  destination: Destination;
  season: Season;
  workType: WorkType;
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
  { value: "anywhere", label: "Anywhere", emoji: "🌎", country: null, hemisphere: null, calling: "The mountains are calling" },
];

export const SEASONS: readonly SeasonOption[] = [
  {
    value: "northern-winter",
    label: "Northern Hemisphere Winter",
    shortLabel: "Northern Winter",
    emoji: "🇨🇦 🇺🇸 🇯🇵",
    phrase: "chasing a Northern Hemisphere winter",
    seasonPreference: "northern_winter",
    hemisphere: "north",
  },
  {
    value: "southern-winter",
    label: "Southern Hemisphere Winter",
    shortLabel: "Southern Winter",
    emoji: "🇦🇺 🇳🇿",
    phrase: "chasing a Southern Hemisphere winter",
    seasonPreference: "southern_winter",
    hemisphere: "south",
  },
  {
    value: "exploring",
    label: "Just Exploring",
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
}

export const QUIZ_STEPS: readonly QuizStep[] = [
  { key: "destination", question: "Where could your next season take you?", options: DESTINATIONS },
  { key: "season", question: "Which season are you chasing?", options: SEASONS },
  { key: "workType", question: "What could you see yourself doing?", options: WORK_TYPES },
];

function byValue<V extends string, O extends QuizOption<V>>(options: readonly O[], value: unknown): O | undefined {
  return options.find((o) => o.value === value);
}

export const destinationOption = (v: Destination) => byValue(DESTINATIONS, v)!;
export const seasonOption = (v: Season) => byValue(SEASONS, v)!;
export const workTypeOption = (v: WorkType) => byValue(WORK_TYPES, v)!;

/**
 * Question 2's options in the order to show them: the winter the destination
 * actually has first (Southern Hemisphere Winter leads for Australia and New
 * Zealand), then the other hemisphere, then "Just Exploring". "Anywhere", or
 * no destination yet, keeps the default order.
 *
 * Nothing is removed or preselected — someone going to Canada may still want
 * a southern season too. The order only makes the likely answer the easy one.
 */
export function seasonOptionsFor(destination: Destination | undefined): readonly SeasonOption[] {
  const hemisphere = destination ? destinationOption(destination).hemisphere : null;
  if (!hemisphere) return SEASONS;
  const rank = (s: SeasonOption) => (s.hemisphere === hemisphere ? 0 : s.hemisphere ? 1 : 2);
  return [...SEASONS].sort((a, b) => rank(a) - rank(b));
}

/** The options a quiz step shows, given the answers so far. */
export function optionsForStep(step: QuizStep, answers: Partial<SeasonAnswers>): readonly QuizOption[] {
  return step.key === "season" ? seasonOptionsFor(answers.destination) : step.options;
}

/**
 * Accepts answers from anywhere untrusted — a URL, localStorage, auth metadata
 * — and returns them only if all three are known values. Takes `work_type` as
 * well as `workType`, because metadata is stored snake_case like the rest of
 * user_metadata.
 */
export function parseAnswers(input: unknown): SeasonAnswers | null {
  if (!input || typeof input !== "object") return null;
  const o = input as Record<string, unknown>;
  const destination = byValue(DESTINATIONS, o.destination)?.value;
  const season = byValue(SEASONS, o.season)?.value;
  const workType = byValue(WORK_TYPES, o.workType ?? o.work_type)?.value;
  if (!destination || !season || !workType) return null;
  return { destination, season, workType };
}

/** "Canada is calling" + flag, and the sentence that repeats the answers back. */
export function resultCopy(a: SeasonAnswers): { heading: string; emoji: string; summary: string } {
  const d = destinationOption(a.destination);
  return {
    heading: d.calling,
    emoji: d.emoji ?? "",
    summary: `You're ${seasonOption(a.season).phrase} and ${workTypeOption(a.workType).phrase}.`,
  };
}

/** Short labels for the "your season" strip on the signup page — a one-line
 *  summary, so it uses the phone wording on every screen. */
export function answerLabels(a: SeasonAnswers): string[] {
  const d = destinationOption(a.destination);
  const s = seasonOption(a.season);
  return [`${d.emoji} ${d.label}`, s.shortLabel ?? s.label, workTypeOption(a.workType).label];
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
  const w = workTypeOption(a.workType);
  const out: IntentProfileFields = {};
  if (d.country) out.preferred_countries = [d.country];
  if (s.seasonPreference) out.season_preference = s.seasonPreference;
  if (w.jobTypes.length > 0) out.preferred_job_types = [...w.jobTypes];
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
