import { seasonLabel } from "./season-label";

/**
 * The badge shelf: what a worker has collected, computed from the seasons they
 * have entered.
 *
 * ⚠️ COMPUTED ON READ, NEVER STORED. A badges table would drift the moment
 * somebody corrects a date, and you would be reconciling two truths forever.
 * Deriving them also makes a rule change retroactive for free: edit a
 * definition and every shelf is correct immediately, with no backfill.
 *
 * ⚠️ EVERY BADGE HERE IS SELF-DECLARED. These seasons are what the worker
 * typed about themselves — nobody confirmed any of it, and the platform holds
 * no evidence that any of them happened (0 accepted applications, 4 contracts
 * at the time of writing). So no badge from this module may ever appear in a
 * business-facing view. A single self-reported badge is harmless; a COLLECTION
 * with milestones is a status system, and the moment a hiring decision can see
 * it, it becomes a credential backed by nothing — the same mistake as the
 * "Verified" chip this codebase already had to take back. When
 * work_history[].verified_by_business_id becomes real, confirmed badges get
 * their own visibly different treatment and only those cross over.
 */

export type BadgeTier = "common" | "uncommon" | "rare";

/** The only fields a badge rule may look at. */
export interface WorkSeason {
  resort_id?: string | null;
  country?: string | null;
  start_date?: string | null;
  end_date?: string | null;
}

export interface BadgeDefinition {
  id: string;
  label: string;
  /** Shown under the label. Says what was done, not how good they are. */
  description: string;
  tier: BadgeTier;
  emoji: string;
  earned: (s: SeasonStats) => boolean;
}

export interface SeasonStats {
  /** Entries that carry dates we can read as a season. */
  seasons: number;
  distinctResorts: number;
  distinctCountries: number;
  /** Longest run of consecutive season start-years, e.g. 2023,2024,2025 = 3. */
  longestStreak: number;
  hemispheres: number;
}

/**
 * Southern-hemisphere ski countries, for the "chased winter both ways" badge.
 * Deliberately NOT lib/outreach/hemisphere.ts: that one answers "south" for an
 * unknown country, which is the right default when picking email copy and the
 * wrong one here — a typo would mint a badge. An unrecognised country counts
 * towards neither hemisphere.
 */
const SOUTHERN = new Set(["Australia", "New Zealand", "Argentina", "Chile"]);
const NORTHERN = new Set([
  "Canada", "United States", "USA", "Japan", "France", "Switzerland", "Austria",
  "Italy", "Germany", "Norway", "Sweden", "Finland", "Andorra", "Spain",
  "Bulgaria", "Georgia", "South Korea", "China",
]);

export function seasonStats(entries: readonly WorkSeason[]): SeasonStats {
  const withSeason = entries.filter((e) => seasonLabel(e.start_date, e.end_date) !== null);
  const resorts = new Set<string>();
  const countries = new Set<string>();
  const years: number[] = [];
  let north = false;
  let south = false;

  for (const e of withSeason) {
    if (e.resort_id) resorts.add(e.resort_id);
    const c = (e.country ?? "").trim();
    if (c) {
      countries.add(c);
      if (SOUTHERN.has(c)) south = true;
      else if (NORTHERN.has(c)) north = true;
    }
    const y = Number((e.start_date ?? "").slice(0, 4));
    if (Number.isFinite(y) && y > 1900) years.push(y);
  }

  return {
    seasons: withSeason.length,
    distinctResorts: resorts.size,
    distinctCountries: countries.size,
    longestStreak: longestRun(years),
    hemispheres: (north ? 1 : 0) + (south ? 1 : 0),
  };
}

/** Longest run of consecutive years. Two seasons in one year are still one. */
function longestRun(years: readonly number[]): number {
  const sorted = [...new Set(years)].sort((a, b) => a - b);
  let best = 0;
  let run = 0;
  for (let i = 0; i < sorted.length; i++) {
    run = i > 0 && sorted[i] === sorted[i - 1] + 1 ? run + 1 : 1;
    if (run > best) best = run;
  }
  return best;
}

/**
 * ORDER IS THE SHELF ORDER, and the ids are stable: they will end up in
 * analytics and in share urls, so rename a label freely and a value never.
 *
 * Tiers are set against real coverage rather than taste. Over the 111 workers
 * who had history on 2026-10-08: 66 would hold two-seasons, 35 two-countries,
 * 13 five-seasons, 8 three-countries and only 4 two-resorts. A tier that
 * nobody can reach is not rare, it is broken, and one everybody holds is not
 * worth collecting.
 */
export const BADGES: readonly BadgeDefinition[] = [
  {
    id: "first-season",
    label: "First Season",
    description: "One season on the mountain",
    tier: "common",
    emoji: "🎿",
    earned: (s) => s.seasons >= 1,
  },
  {
    id: "seasons-3",
    label: "Three Seasons",
    description: "Three seasons recorded",
    tier: "uncommon",
    emoji: "⛷️",
    earned: (s) => s.seasons >= 3,
  },
  {
    id: "seasons-5",
    label: "Five Seasons",
    description: "Five seasons recorded",
    tier: "rare",
    emoji: "🏔️",
    earned: (s) => s.seasons >= 5,
  },
  {
    id: "seasons-10",
    label: "Ten Seasons",
    description: "Ten seasons recorded",
    tier: "rare",
    emoji: "👑",
    earned: (s) => s.seasons >= 10,
  },
  {
    id: "countries-2",
    label: "Two Countries",
    description: "Seasons in two countries",
    tier: "uncommon",
    emoji: "🌍",
    earned: (s) => s.distinctCountries >= 2,
  },
  {
    id: "countries-3",
    label: "Three Countries",
    description: "Seasons in three countries",
    tier: "rare",
    emoji: "🧭",
    earned: (s) => s.distinctCountries >= 3,
  },
  {
    id: "resorts-2",
    label: "Two Mountains",
    description: "Seasons at two different resorts",
    tier: "uncommon",
    emoji: "🚡",
    earned: (s) => s.distinctResorts >= 2,
  },
  {
    id: "resorts-5",
    label: "Five Mountains",
    description: "Seasons at five different resorts",
    tier: "rare",
    emoji: "🗺️",
    earned: (s) => s.distinctResorts >= 5,
  },
  {
    id: "back-to-back",
    label: "Back to Back",
    description: "Two seasons in consecutive years",
    tier: "uncommon",
    emoji: "🔁",
    earned: (s) => s.longestStreak >= 2,
  },
  {
    id: "back-to-back-3",
    label: "Three in a Row",
    description: "Three seasons in consecutive years",
    tier: "rare",
    emoji: "🔥",
    earned: (s) => s.longestStreak >= 3,
  },
  {
    id: "both-hemispheres",
    label: "Endless Winter",
    description: "Seasons in both hemispheres",
    tier: "rare",
    emoji: "❄️",
    earned: (s) => s.hemispheres >= 2,
  },
];

export function earnedBadges(entries: readonly WorkSeason[]): BadgeDefinition[] {
  const stats = seasonStats(entries);
  return BADGES.filter((b) => b.earned(stats));
}

/** Everything not yet earned, so the shelf can show what is left to collect. */
export function unearnedBadges(entries: readonly WorkSeason[]): BadgeDefinition[] {
  const stats = seasonStats(entries);
  return BADGES.filter((b) => !b.earned(stats));
}
