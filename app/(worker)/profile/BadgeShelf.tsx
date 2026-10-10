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

/**
 * The card behind the badge carries the tier, not the badge itself. The
 * artwork tiers by METAL (copper / silver / gold) and that distinction is
 * nearly invisible once a hexagon is 56px wide, so the card does the work.
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
                has ? TIER_STYLE[b.tier] : "border-accent/40 bg-accent/5"
              }`}
            >
              {/* `public/badges/<id>.png` — the id is the filename, so a
                  renamed badge silently loses its artwork. 200x200 against a
                  56px slot gives room on a retina screen. Locked badges are
                  the same image desaturated, so the shelf shows the shape of
                  what is missing rather than a row of padlocks. */}
              <img
                src={`/badges/${b.id}.png`}
                alt=""
                width={56}
                height={56}
                loading="lazy"
                className={`mx-auto h-14 w-14 ${has ? "" : "opacity-60 grayscale"}`}
              />
              <p className={`mt-1 text-sm font-bold ${has ? "text-primary" : "text-foreground/45"}`}>{b.label}</p>
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
