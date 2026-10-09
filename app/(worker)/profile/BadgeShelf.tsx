"use client";

import { BADGES, earnedBadges, seasonStats, type WorkSeason } from "@/lib/badges/achievements";

/**
 * What the worker has collected, and what is still out there.
 *
 * ⚠️ WORKER-FACING ONLY. Every badge here is computed from seasons the worker
 * entered about themselves; nobody confirmed any of it. A single self-reported
 * badge is harmless, but a collection with milestones is a status system, and
 * in front of a hiring decision it would read as a credential backed by
 * nothing — see the header of lib/badges/achievements.ts. Do not render this
 * on an applicant, interview or any other business-facing view.
 *
 * Unearned badges are shown greyed rather than hidden: a shelf with gaps is
 * what makes it a collection, and it tells a worker what linking a resort or
 * adding a season would get them.
 */

const TIER_STYLE = {
  common: "border-accent bg-white",
  uncommon: "border-secondary/40 bg-secondary/10",
  rare: "border-warm/50 bg-warm/10",
} as const;

export default function BadgeShelf({ seasons }: { seasons: readonly WorkSeason[] }) {
  const earned = earnedBadges(seasons);
  const stats = seasonStats(seasons);
  const earnedIds = new Set(earned.map((b) => b.id));

  // Nothing entered yet: a shelf of eleven locked badges is discouraging, and
  // the useful thing to say is how to start one.
  if (stats.seasons === 0) {
    return (
      <p className="text-sm text-foreground/60">
        Add a season with its dates to start collecting badges.
      </p>
    );
  }

  return (
    <div>
      <p className="mb-4 text-sm text-foreground/60">
        <span className="font-semibold text-primary">{earned.length}</span> of {BADGES.length} collected
        {stats.seasons > 0 && (
          <>
            {" · "}
            {stats.seasons} {stats.seasons === 1 ? "season" : "seasons"}
            {stats.distinctCountries > 1 && ` · ${stats.distinctCountries} countries`}
          </>
        )}
      </p>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {BADGES.map((b) => {
          const has = earnedIds.has(b.id);
          return (
            <div
              key={b.id}
              className={`rounded-xl border p-3 text-center transition ${
                has ? TIER_STYLE[b.tier] : "border-accent/40 bg-accent/5 opacity-45"
              }`}
            >
              <div className="text-2xl" aria-hidden="true">
                {has ? b.emoji : "🔒"}
              </div>
              <p className="mt-1 text-sm font-bold text-primary">{b.label}</p>
              <p className="mt-0.5 text-[11px] leading-tight text-foreground/60">{b.description}</p>
            </div>
          );
        })}
      </div>

      {/* Not a disclaimer in small print somewhere else: the honesty belongs
          where the claim is made. */}
      <p className="mt-4 text-xs text-foreground/50">
        Badges come from the seasons you&apos;ve entered yourself. They&apos;re not verified by employers.
      </p>
    </div>
  );
}
