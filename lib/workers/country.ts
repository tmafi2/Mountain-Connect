import {
  normalizeCountry,
  resolveEligibilityFor,
  type WorkAuthorization,
} from "@/lib/work-eligibility";

/**
 * Where a worker can work, and where they WANT to work.
 *
 * Two different questions, stored in two different columns, and only one of
 * them was ever captured with a picker:
 *
 *   work_authorizations  JSONB, one entry per country + visa status. Added by
 *                        a <select> of WORKER_COUNTRIES, so it is mostly
 *                        clean. 208 of 401 profiles have one (2026-11-12).
 *   preferred_countries  text[], written by a FREE-TEXT box until this
 *                        module shipped. 120 of 401 profiles, and the values
 *                        are what free text always becomes — see ALIASES.
 *
 * ⚠️ "HAS AN ENTRY FOR CANADA" IS NOT "CAN WORK IN CANADA", and that is the
 * whole reason `countriesEligible` is not a one-line map over the column.
 * Measured over all 289 authorization entries on 2026-11-12:
 *
 *     25  have no visa_status at all — the country was added and the
 *         dropdown left alone
 *     17  are `no_visa`, i.e. the worker explicitly needs sponsorship
 *     30  carry an expiry date that has already passed
 *
 * So a filter built on "does this column mention Canada" would put a worker
 * whose working holiday lapsed in 2024, and a worker who has no visa and
 * said so, in the same list as someone who can start tomorrow. This module
 * asks `resolveEligibilityFor` instead — the same function the applicant
 * inbox, manage-listings and the interview sidebar render their badge from —
 * so the admin filter and the badge can never disagree.
 *
 * `countriesListed` exists for the other half of that honesty: the UI can
 * say how many workers were EXCLUDED for an expired or unstated visa rather
 * than silently dropping them.
 */

/* ─── The canonical list ────────────────────────────────────────
 * Moved here from app/(worker)/profile/edit/page.tsx, where it was a private
 * const inside a 2,700-line client component — which is why the preferred-
 * countries box next to it was free text: the list was not reachable from
 * anywhere else. It is now the one list the editor's two pickers and the
 * admin's two filters all read.
 *
 * Five names were added when it moved, each because a real row already held
 * it: Georgia (also a resort country — we carry one), Armenia, Azerbaijan,
 * Bangladesh and Niue. A worker had typed every one of those, and leaving
 * them out would have made their stored answer unresolvable.
 */
export interface CountryOption {
  name: string;
  flag: string;
  /** ISO 3166-1 alpha-2, lowercase — used for flagcdn.com image URLs. */
  code: string;
}

export const WORKER_COUNTRIES: readonly CountryOption[] = [
  { name: "Andorra", flag: "🇦🇩", code: "ad" },
  { name: "Argentina", flag: "🇦🇷", code: "ar" },
  { name: "Armenia", flag: "🇦🇲", code: "am" },
  { name: "Australia", flag: "🇦🇺", code: "au" },
  { name: "Austria", flag: "🇦🇹", code: "at" },
  { name: "Azerbaijan", flag: "🇦🇿", code: "az" },
  { name: "Bangladesh", flag: "🇧🇩", code: "bd" },
  { name: "Belgium", flag: "🇧🇪", code: "be" },
  { name: "Brazil", flag: "🇧🇷", code: "br" },
  { name: "Bulgaria", flag: "🇧🇬", code: "bg" },
  { name: "Canada", flag: "🇨🇦", code: "ca" },
  { name: "Chile", flag: "🇨🇱", code: "cl" },
  { name: "China", flag: "🇨🇳", code: "cn" },
  { name: "Colombia", flag: "🇨🇴", code: "co" },
  { name: "Croatia", flag: "🇭🇷", code: "hr" },
  { name: "Czech Republic", flag: "🇨🇿", code: "cz" },
  { name: "Denmark", flag: "🇩🇰", code: "dk" },
  { name: "Ecuador", flag: "🇪🇨", code: "ec" },
  { name: "Estonia", flag: "🇪🇪", code: "ee" },
  { name: "Finland", flag: "🇫🇮", code: "fi" },
  { name: "France", flag: "🇫🇷", code: "fr" },
  { name: "Georgia", flag: "🇬🇪", code: "ge" },
  { name: "Germany", flag: "🇩🇪", code: "de" },
  { name: "Greece", flag: "🇬🇷", code: "gr" },
  { name: "Hong Kong", flag: "🇭🇰", code: "hk" },
  { name: "Hungary", flag: "🇭🇺", code: "hu" },
  { name: "Iceland", flag: "🇮🇸", code: "is" },
  { name: "India", flag: "🇮🇳", code: "in" },
  { name: "Indonesia", flag: "🇮🇩", code: "id" },
  { name: "Ireland", flag: "🇮🇪", code: "ie" },
  { name: "Israel", flag: "🇮🇱", code: "il" },
  { name: "Italy", flag: "🇮🇹", code: "it" },
  { name: "Japan", flag: "🇯🇵", code: "jp" },
  { name: "Latvia", flag: "🇱🇻", code: "lv" },
  { name: "Lithuania", flag: "🇱🇹", code: "lt" },
  { name: "Luxembourg", flag: "🇱🇺", code: "lu" },
  { name: "Malaysia", flag: "🇲🇾", code: "my" },
  { name: "Mexico", flag: "🇲🇽", code: "mx" },
  { name: "Nepal", flag: "🇳🇵", code: "np" },
  { name: "Netherlands", flag: "🇳🇱", code: "nl" },
  { name: "New Zealand", flag: "🇳🇿", code: "nz" },
  { name: "Niue", flag: "🇳🇺", code: "nu" },
  { name: "Norway", flag: "🇳🇴", code: "no" },
  { name: "Peru", flag: "🇵🇪", code: "pe" },
  { name: "Philippines", flag: "🇵🇭", code: "ph" },
  { name: "Poland", flag: "🇵🇱", code: "pl" },
  { name: "Portugal", flag: "🇵🇹", code: "pt" },
  { name: "Romania", flag: "🇷🇴", code: "ro" },
  { name: "Russia", flag: "🇷🇺", code: "ru" },
  { name: "Serbia", flag: "🇷🇸", code: "rs" },
  { name: "Singapore", flag: "🇸🇬", code: "sg" },
  { name: "Slovakia", flag: "🇸🇰", code: "sk" },
  { name: "Slovenia", flag: "🇸🇮", code: "si" },
  { name: "South Africa", flag: "🇿🇦", code: "za" },
  { name: "South Korea", flag: "🇰🇷", code: "kr" },
  { name: "Spain", flag: "🇪🇸", code: "es" },
  { name: "Sweden", flag: "🇸🇪", code: "se" },
  { name: "Switzerland", flag: "🇨🇭", code: "ch" },
  { name: "Taiwan", flag: "🇹🇼", code: "tw" },
  { name: "Thailand", flag: "🇹🇭", code: "th" },
  { name: "Turkey", flag: "🇹🇷", code: "tr" },
  { name: "Ukraine", flag: "🇺🇦", code: "ua" },
  { name: "United Kingdom", flag: "🇬🇧", code: "gb" },
  { name: "United States", flag: "🇺🇸", code: "us" },
  { name: "Uruguay", flag: "🇺🇾", code: "uy" },
  { name: "Venezuela", flag: "🇻🇪", code: "ve" },
  { name: "Vietnam", flag: "🇻🇳", code: "vn" },
  { name: "Country not listed", flag: "🏔️", code: "xx" },
];

/** Canonical name → its row, keyed lowercase. */
const BY_NAME = new Map(WORKER_COUNTRIES.map((c) => [c.name.toLowerCase(), c]));

/**
 * ⚠️ EVERY KEY BELOW IS A VALUE THAT IS ACTUALLY IN THE DATABASE. None is
 * speculative, and nothing is here to be helpful about input we have never
 * seen. The complete set of raw values was read off production on
 * 2026-11-12; case variants ("canada", "New zealand") need no entry because
 * the lookup folds case, and the USA / UK / NZ / AUS families are already
 * handled by normalizeCountry in lib/work-eligibility.ts.
 *
 * ⚠️ THE FIVE AUSTRALIAN STATE CODES ARE NOT A GUESS, and "SA" is not South
 * Africa here. One worker — an Italian national whose location_current is
 * Byron Bay, NSW — answered the free-text box with exactly "NSW / QLD / VIC
 * / SA / WA". The remaining three codes (ACT, NT, TAS) complete the set.
 * Mapping two-letter codes like this is only safe BECAUSE the free-text box
 * is gone: this map now only ever sees values from before the picker, plus
 * canonical picker values, so no future worker can mean Washington by "WA".
 */
const ALIASES: Record<string, string> = {
  // Misspellings
  switcherland: "Switzerland",
  swizterland: "Switzerland",
  // Other languages
  australie: "Australia",
  "españa": "Spain",
  francia: "France",
  suiza: "Switzerland",
  italia: "Italy",
  // Shortened
  korea: "South Korea",
  // Australian states — see the note above
  nsw: "Australia",
  qld: "Australia",
  vic: "Australia",
  sa: "Australia",
  wa: "Australia",
  act: "Australia",
  nt: "Australia",
  tas: "Australia",
};

/**
 * Values that are real answers but are NOT countries, so they resolve to
 * null rather than being forced into one.
 *
 * ⚠️ "Europe" is the interesting one, and expanding it would be a lie. Two
 * workers typed it, and it is a perfectly sensible thing to want — but
 * turning it into the twenty European countries on the board would assert
 * that they want to work in Bulgaria. They are counted as having stated a
 * preference we could not place, which the admin surfaces, and a region
 * filter is the honest way to serve them later.
 *
 * "Country not listed" is the picker's own escape hatch. "Job" and "waiter"
 * are what a free-text box next to a job board eventually receives.
 */
const NOT_A_COUNTRY = new Set(["europe", "country not listed", "job", "waiter", "n/a", "none", "any", "anywhere"]);

/**
 * One raw value → a canonical country name, or null if it is not one.
 *
 * ⚠️ Returns null rather than a fallback. A country we cannot place must not
 * become "Other" or the first entry in the list: the filter's whole job is
 * to say who can work somewhere, and a wrong country is a worker Tyler rings
 * about the wrong season.
 */
export function resolveCountry(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;

  // normalizeCountry owns the USA / UK / NZ / AUS aliases already.
  const key = normalizeCountry(trimmed).toLowerCase();
  if (NOT_A_COUNTRY.has(key)) return null;

  const direct = BY_NAME.get(key);
  if (direct) return direct.name;

  return ALIASES[key] ?? null;
}

/**
 * Split a stored value that may hold several countries in one string.
 *
 * ⚠️ FOUR ROWS JOINED THEM WITH COMMAS — "Austria, France, Italy, Germany",
 * "España, Francia, Suiza, Italia", "France, Canada" and, in the
 * authorizations column, "Canada, Australia". They are single array elements
 * and single JSONB entries, so without this split they resolve to nothing at
 * all and those workers vanish from every country filter. The free-text box
 * invited it by asking for one country at a time and giving no visible list.
 *
 * ⚠️ COMMA AND SLASH ONLY. " and " is tempting and is left out: every real
 * value separates with a comma, and a word-boundary rule loose enough to
 * split "France and Canada" is one tweak away from splitting Finland,
 * Thailand, New Zealand and Andorra. The test file pins all four.
 */
function splitValues(raw: unknown): string[] {
  if (typeof raw !== "string") return [];
  return raw.split(/[,/]/).map((s) => s.trim()).filter(Boolean);
}

/** Resolve a stored array of free-text country values. Deduplicated. */
function resolveMany(values: unknown): string[] {
  if (!Array.isArray(values)) return [];
  const out = new Set<string>();
  for (const v of values) {
    for (const part of splitValues(v)) {
      const canon = resolveCountry(part);
      if (canon) out.add(canon);
    }
  }
  return [...out];
}

/** Countries a worker says they WANT to work in. */
export function countriesWanted(preferredCountries: unknown): string[] {
  return resolveMany(preferredCountries);
}

/**
 * How many stated preferences we could not place onto a country — the count
 * behind "Europe" and the junk values. Lets the UI admit its own blind spot
 * instead of quietly shrinking the result.
 */
export function unplaceableWanted(preferredCountries: unknown): number {
  if (!Array.isArray(preferredCountries)) return 0;
  let n = 0;
  for (const v of preferredCountries) {
    for (const part of splitValues(v)) if (!resolveCountry(part)) n += 1;
  }
  return n;
}

interface EligibilityProfile {
  work_authorizations?: unknown;
  visa_status?: string | null;
  visa_expiry_date?: string | null;
  work_eligible_countries?: string[] | null;
}

/**
 * The worker's authorizations with canonical country names, one entry per
 * country. Built before asking about eligibility because
 * `resolveEligibilityFor` matches on the country string: an entry stored as
 * "Canada, Australia" matches neither Canada nor Australia and would come
 * back "not listed" for both.
 */
function canonicalAuths(profile: EligibilityProfile): WorkAuthorization[] {
  const raw = Array.isArray(profile.work_authorizations) ? profile.work_authorizations : [];
  const out: WorkAuthorization[] = [];
  for (const entry of raw) {
    if (!entry || typeof entry !== "object") continue;
    const auth = entry as WorkAuthorization;
    for (const part of splitValues(auth.country)) {
      const canon = resolveCountry(part);
      if (canon) out.push({ ...auth, country: canon });
    }
  }
  return out;
}

/** Every country the worker has an entry for, eligible or not. */
export function countriesListed(profile: EligibilityProfile): string[] {
  return [...new Set(canonicalAuths(profile).map((a) => a.country))];
}

/**
 * Countries the worker can work in RIGHT NOW — citizen, permanent resident,
 * or a visa that has not expired. Delegates the judgement to
 * `resolveEligibilityFor` so this agrees with the badge the business sees.
 */
export function countriesEligible(profile: EligibilityProfile, now: Date = new Date()): string[] {
  const auths = canonicalAuths(profile);
  if (!auths.length) return [];
  const clean = { ...profile, work_authorizations: auths };
  const out = new Set<string>();
  for (const a of auths) {
    if (resolveEligibilityFor(clean, a.country, now).kind === "eligible") out.add(a.country);
  }
  return [...out];
}

/**
 * Flag emoji for a country name, or null if it names no country.
 *
 * ⚠️ Checks the list BEFORE resolveCountry, so "Country not listed" keeps
 * its 🏔️ placeholder. That value is a real option in the picker and a real
 * stored answer, but it is not a country — resolveCountry returns null for
 * it by design, and going through that first would silently drop the
 * placeholder flag the profile page has always shown.
 */
export function countryFlag(name: string | null | undefined): string | null {
  if (typeof name !== "string") return null;
  const direct = BY_NAME.get(name.trim().toLowerCase());
  if (direct) return direct.flag;
  const canon = resolveCountry(name);
  return canon ? (BY_NAME.get(canon.toLowerCase())?.flag ?? null) : null;
}
