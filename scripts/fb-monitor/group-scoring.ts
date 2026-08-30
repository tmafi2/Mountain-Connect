/**
 * Scoring for candidate Facebook groups.
 *
 * Separate module so it can be unit tested and re-applied to a saved
 * candidate file without re-running a 15-minute Facebook crawl.
 *
 * THE RULES THAT MATTER, and why each exists — every one is a real failure
 * from the first pass over 53 resorts:
 *
 *  1. A group MUST name the place. Without this, "JOBS IN ONTARIO 🇨🇦" and
 *     "JOBS In The Kawarthas" were returned as top hits for Niseko, because
 *     being job-shaped and large scored 55 on its own. Facebook's search
 *     returns loosely-related results and they cannot be accepted on size.
 *
 *  2. The place match MUST respect word boundaries. "Jackson" matched
 *     "Jacksonville", so Jackson Hole's top three were all Florida and
 *     Tennessee groups.
 *
 *  3. A group MUST also be job-shaped. "Whistler Blackcomb Skiers &
 *     Snowboarders" names the place perfectly and is 64k strong, and is a
 *     social group with no job adverts in it.
 *
 *  4. Size is capped and cannot rescue a weak match. A 156k city-wide group
 *     is worth less to us than a 3k group for the actual resort town, and
 *     ranking on members alone puts them the wrong way round.
 */

/**
 * Vocabulary that marks a group as job-carrying.
 *
 * The second half exists because the first half missed the point. A list of
 * formal employment words rejected "Whistler Blackcomb Employees", "Sunshine
 * Village Crew", "Niseko Seasonaires", "Revelstoke Lifties" and "Fernie Ski
 * Season 2026/27" — six of eight realistic resort-crew group names — while
 * happily accepting "Kelowna Jobs" and "Salt Lake City jobs". That is why an
 * earlier shortlist was full of town groups and nearly empty of the resort
 * groups it was supposed to find: seasonal mountain crews do not call it
 * "employment", they call it the crew, the season, or being a liftie.
 */
export const JOB_WORDS = [
  // Formal
  "job", "jobs", "work", "working", "workers", "employment", "hiring", "hire",
  "staff", "staffing", "recruit", "recruitment", "career", "careers",
  "employ", "employee", "employees", "vacancy", "vacancies",
  // How seasonal resort crews actually name themselves
  "seasonaire", "seasonaires", "seasonnaire", "seasonnaires",
  "liftie", "lifties", "working holiday", "winter crew", "snow crew",
  // Boards that carry adverts among other things
  "gig", "gigs", "classifieds", "noticeboard", "notice board",
];

/**
 * Words that suggest a jobs group but do not establish one.
 *
 * "Crew" and "season" are how resort staff groups name themselves — and also
 * how riding groups, charity teams and social circles do. Adding them
 * outright pulled in "Fernie Adventure Crew", "fernie touring crew!",
 * "Green/Blue Crew of Fernie" (32 members) and "Hakuba Hairy Lips Movember
 * Crew" (55 members).
 *
 * A weak word alone is not enough: the group must also be big enough to be a
 * real board. "2026/27 Hakuba Crew" at 10k qualifies; a 32-member group of
 * friends does not, whatever it calls itself.
 */
export const WEAK_JOB_WORDS = [
  "crew", "seasonal", "season", "ski season", "winter season", "snow season",
];
const WEAK_MIN_MEMBERS = 1500;

/** Group themes that are never job adverts, however well they match. */
export const NEGATIVE_WORDS = [
  "for sale", "buy and sell", "buy & sell", "swap", "marketplace",
  "rent", "rental", "housing", "accommodation", "roommate", "room mate",
  "ride share", "rideshare", "carpool", "lost and found", "real estate",
  "condo", "avalanche", "trail", "skiers", "snowboarders", "powder",
  "conditions", "webcam", "for sale or", "dating", "singles",
  // Broadening JOB_WORDS to "season" and "crew" opens the door to social and
  // enthusiast groups that share the vocabulary. These close it again.
  "season pass", "pass holders", "ski club", "race club", "alumni",
  "reunion", "memories", "photos",
  // Recreational uses of "crew" that a size threshold alone would miss.
  "adventure", "touring", "movember", "riding", "shred", "social club",
];


/* ── Wrong-region detection ───────────────────────────────────
 *
 * Resort towns share names across the world: Jackson (Wyoming) vs Jackson
 * TN and Jackson MI; Jasper (Alberta) vs Jasper Texas and Jasper Alabama;
 * Avon (Colorado) vs Stratford-upon-Avon. Matching the town name alone put
 * all of those in the shortlist.
 *
 * If a group names a state, province or prefecture that is NOT the
 * resort's, it is about a different place with the same town name.
 *
 * Two-letter codes are matched CASE-SENSITIVELY and word-bounded, because
 * lowercased they collide with ordinary words — "OR", "IN", "ME", "HI",
 * "OK" and "DE" would otherwise match half the English language.
 */
const REGION_ALIASES: Record<string, string[]> = {
  // US
  Alabama: ["AL"], Alaska: ["AK"], Arizona: ["AZ"], Arkansas: ["AR"],
  California: ["CA"], Colorado: ["CO"], Connecticut: ["CT"], Delaware: ["DE"],
  Florida: ["FL"], Georgia: ["GA"], Idaho: ["ID"], Illinois: ["IL"],
  Indiana: ["IN"], Iowa: ["IA"], Kansas: ["KS"], Kentucky: ["KY"],
  Louisiana: ["LA"], Maine: ["ME"], Maryland: ["MD"], Massachusetts: ["MA"],
  Michigan: ["MI"], Minnesota: ["MN"], Mississippi: ["MS"], Missouri: ["MO"],
  Montana: ["MT"], Nebraska: ["NE"], Nevada: ["NV"], "New Hampshire": ["NH"],
  "New Jersey": ["NJ"], "New Mexico": ["NM"], "New York": ["NY"],
  "North Carolina": ["NC"], "North Dakota": ["ND"], Ohio: ["OH"],
  Oklahoma: ["OK"], Oregon: ["OR"], Pennsylvania: ["PA"], "Rhode Island": ["RI"],
  "South Carolina": ["SC"], "South Dakota": ["SD"], Tennessee: ["TN"],
  Texas: ["TX"], Utah: ["UT"], Vermont: ["VT"], Virginia: ["VA"],
  Washington: ["WA"], "West Virginia": ["WV"], Wisconsin: ["WI"], Wyoming: ["WY"],
  // Canada
  Alberta: ["AB"], "British Columbia": ["BC"], Manitoba: ["MB"],
  "New Brunswick": ["NB"], Newfoundland: ["NL"], "Nova Scotia": ["NS"],
  Ontario: ["ON"], "Prince Edward Island": ["PEI"], Quebec: ["QC", "Québec"],
  Saskatchewan: ["SK"],
  // Japan
  Hokkaido: [], Aomori: [], Iwate: [], Akita: [], Niigata: [], Nagano: [],
  Gunma: [], Yamagata: [], Fukushima: [], Gifu: [], Toyama: [],
};

/** Regions named in `name` that are not `ownRegion`. */
export function conflictingRegions(name: string, ownRegion: string | null): string[] {
  const own = (ownRegion ?? "").toLowerCase();
  const hits: string[] = [];
  for (const [region, codes] of Object.entries(REGION_ALIASES)) {
    if (region.toLowerCase() === own) continue;
    if (namesPlace(name, region)) { hits.push(region); continue; }
    for (const code of codes) {
      // Case-sensitive on purpose: "OR" is Oregon, "or" is a conjunction.
      if (new RegExp(`(^|[^A-Za-z0-9])${code}([^A-Za-z0-9]|$)`).test(name)) {
        if (!own || !namesPlace(own, code)) { hits.push(region); }
        break;
      }
    }
  }
  return hits;
}

export interface ScoreInput {
  name: string;
  members: number;
  /** Resort name plus its linked town names. */
  terms: string[];
  /** The resort's state/province/prefecture, for wrong-region rejection. */
  region?: string | null;
}

export interface ScoreResult {
  score: number;
  matchedPlace: string | null;
  jobShaped: boolean;
  rejected: string | null;
  /** high = matched the resort itself or a multi-word place; medium = a bare town name. */
  confidence?: "high" | "medium";
}

/** Whole-word / whole-phrase containment, so "Jackson" never matches "Jacksonville". */
export function namesPlace(haystack: string, term: string): boolean {
  const t = term.trim().toLowerCase();
  if (t.length < 3) return false;
  const escaped = t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(^|[^a-z0-9])${escaped}([^a-z0-9]|$)`, "i").test(haystack.toLowerCase());
}

export function scoreGroup({ name, members, terms, region = null }: ScoreInput): ScoreResult {
  const lower = name.toLowerCase();

  const negative = NEGATIVE_WORDS.find((w) => lower.includes(w));
  if (negative) {
    return { score: 0, matchedPlace: null, jobShaped: false, rejected: `off-topic ("${negative}")` };
  }

  // Longest term first: prefer matching "Jackson Hole" over "Jackson", and
  // "Lake Louise" over "Louise".
  const sorted = [...terms].sort((a, b) => b.length - a.length);
  const matchedPlace = sorted.find((t) => namesPlace(name, t)) ?? null;
  if (!matchedPlace) {
    return { score: 0, matchedPlace: null, jobShaped: false, rejected: "does not name the resort or its town" };
  }

  const wrongRegion = conflictingRegions(name, region);
  if (wrongRegion.length > 0) {
    return {
      score: 0,
      matchedPlace,
      jobShaped: false,
      rejected: `names ${wrongRegion[0]}, not ${region ?? "this region"} — same town name elsewhere`,
    };
  }

  const strong = JOB_WORDS.some((w) => namesPlace(name, w));
  const weak = WEAK_JOB_WORDS.some((w) => namesPlace(name, w));
  const jobShaped = strong || (weak && members >= WEAK_MIN_MEMBERS);
  if (!jobShaped) {
    return {
      score: 0,
      matchedPlace,
      jobShaped: false,
      rejected: weak
        ? `only a weak signal ("crew"/"season") and too small at ${members || 0} members to be a board`
        : "names the place but is not a jobs group",
    };
  }

  // A weak-signal group is a maybe, not a find.
  let score = strong ? 60 : 45;
  // A multi-word place match is far more specific than a single word.
  if (matchedPlace.includes(" ")) score += 15;
  // Size helps, capped so it can never outweigh relevance.
  score += Math.min(20, Math.log10(Math.max(members, 1)) * 5);

  return {
    score: Math.round(score),
    matchedPlace,
    jobShaped: true,
    rejected: null,
    confidence: matchedPlace.includes(" ") || namesPlace(name, terms[0]) ? "high" : "medium",
  };
}

/** "156K members" -> 156000 */
export function parseMembers(line: string): number {
  const m = line.match(/([\d.,]+)\s*([KM])?\s*members/i);
  if (!m) return 0;
  const n = parseFloat(m[1].replace(/,/g, ""));
  if (Number.isNaN(n)) return 0;
  const unit = m[2]?.toUpperCase();
  return unit === "K" ? n * 1e3 : unit === "M" ? n * 1e6 : n;
}
