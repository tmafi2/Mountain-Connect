import type { SupabaseClient } from "@supabase/supabase-js";
import { resolveEffectiveTier, type BusinessTier } from "@/lib/tier";
import { EXPIRY_WARNING_DAYS, JOB_POST_LIFESPAN_DAYS } from "./expiry";
import {
  JOB_EXPIRY_MODE,
  jobExpirySendsEmail,
  jobExpiryWrites,
  type JobExpiryMode,
} from "@/lib/config/features";

/**
 * The daily job-post expiry sweep.
 *
 * Deciding what should happen is separated from doing it, so that the same
 * code path runs in every rollout stage and "log_only" exercises the real
 * queries rather than a rehearsal of them. A dry run that takes a different
 * route through the code proves nothing about the wet one.
 *
 * THREE PASSES, IN THIS ORDER:
 *
 *   1. warn      — expiring within EXPIRY_WARNING_DAYS, not yet warned
 *   2. renew     — already expired, auto_renew on, business genuinely paid
 *   3. expire    — already expired, everything else
 *
 * Order matters. Renewal must be settled before expiry is applied, or a
 * paid business's auto-renewing post would be paused and resurrected in the
 * same run — visible to workers as a listing that blinks out.
 *
 * SCOPE: claimed businesses only. Unclaimed imported shells are already
 * governed by /api/cron/unclaimed-dormancy-sweep, which warns at day 14 and
 * takes their posts down at day 21 — earlier than this would. Two timers on
 * the same rows means two contradictory emails and a race over who paused
 * what.
 *
 * BATCHING: results are grouped by business. A business with twelve roles
 * lapsing the same week gets one email listing twelve, not twelve emails.
 * That is the lesson of migration 00088, where the outreach cadence would
 * have sent 76 emails where 21 were meant.
 */

export interface SweepJob {
  id: string;
  title: string;
  business_id: string;
  expires_at: string;
  auto_renew: boolean;
}

export interface SweepBusiness {
  id: string;
  business_name: string | null;
  email: string | null;
  tier: BusinessTier | null;
  selected_tier: BusinessTier | null;
  subscription_status: string | null;
  grace_period_ends_at: string | null;
}

/** One business and the posts of theirs a pass selected. */
export interface BusinessGroup {
  businessId: string;
  businessName: string | null;
  email: string | null;
  effectiveTier: BusinessTier;
  jobs: Array<{ id: string; title: string; expiresAt: string }>;
}

export interface SweepReport {
  mode: JobExpiryMode;
  wouldSendEmail: boolean;
  wouldWrite: boolean;
  ranAt: string;
  /** Businesses to warn, and the posts expiring within the warning window. */
  warn: BusinessGroup[];
  /** Posts that auto-renew because the business is on a paid tier. */
  renew: BusinessGroup[];
  /** Posts that lapse. */
  expire: BusinessGroup[];
  /** Past due but still owed their notice period, or unwarnable. */
  holding: BusinessGroup[];
  counts: { warn: number; renew: number; expire: number; holding: number; businesses: number };
  errors: string[];
}

function group(
  jobs: SweepJob[],
  businesses: Map<string, SweepBusiness>,
  tierOf: (b: SweepBusiness) => BusinessTier
): BusinessGroup[] {
  const out = new Map<string, BusinessGroup>();
  for (const j of jobs) {
    const biz = businesses.get(j.business_id);
    if (!biz) continue;
    let g = out.get(j.business_id);
    if (!g) {
      g = {
        businessId: biz.id,
        businessName: biz.business_name,
        email: biz.email,
        effectiveTier: tierOf(biz),
        jobs: [],
      };
      out.set(j.business_id, g);
    }
    g.jobs.push({ id: j.id, title: j.title, expiresAt: j.expires_at });
  }
  return [...out.values()];
}

/**
 * Work out what today's sweep should do.
 *
 * Reads only. Returns the full plan so the caller can act on it, or — in
 * log_only — simply report it.
 */
export async function planExpirySweep(
  admin: SupabaseClient,
  now: Date = new Date(),
  mode: JobExpiryMode = JOB_EXPIRY_MODE,
  /**
   * Diagnostic only, for scripts/expiry-sweep-preview.ts. Drops the
   * claimed-business filter so the date arithmetic can be checked against
   * real rows. Every live post today belongs to an unclaimed shell, so with
   * the filter on there is nothing to observe and a passing preview would
   * only be proving that the scope rule excludes everything. The cron never
   * passes this.
   */
  includeUnclaimed = false
): Promise<SweepReport> {
  const errors: string[] = [];
  const warnCutoff = new Date(now.getTime() + EXPIRY_WARNING_DAYS * 86_400_000);

  // Every active post with a window that is nearly up or already past. One
  // read covers all three passes; splitting them into three round trips
  // would let the board change underneath the sweep between queries.
  const { data: jobRows, error: jobErr } = await admin
    .from("job_posts")
    .select("id, title, business_id, expires_at, auto_renew, expiry_warning_sent_at")
    .eq("status", "active")
    .not("expires_at", "is", null)
    .lte("expires_at", warnCutoff.toISOString())
    .order("expires_at", { ascending: true });

  if (jobErr) {
    return {
      mode,
      wouldSendEmail: jobExpirySendsEmail(mode),
      wouldWrite: jobExpiryWrites(mode),
      ranAt: now.toISOString(),
      warn: [],
      renew: [],
      expire: [],
      holding: [],
      counts: { warn: 0, renew: 0, expire: 0, holding: 0, businesses: 0 },
      errors: [`job read failed: ${jobErr.message}`],
    };
  }

  const jobs = (jobRows ?? []) as Array<SweepJob & { expiry_warning_sent_at: string | null }>;
  if (jobs.length === 0) {
    return {
      mode,
      wouldSendEmail: jobExpirySendsEmail(mode),
      wouldWrite: jobExpiryWrites(mode),
      ranAt: now.toISOString(),
      warn: [],
      renew: [],
      expire: [],
      holding: [],
      counts: { warn: 0, renew: 0, expire: 0, holding: 0, businesses: 0 },
      errors,
    };
  }

  // Fetch every owner, then filter in code below rather than in SQL, so the
  // diagnostic override has something to switch off. The set is small — it
  // is the distinct owners of posts already narrowed to one expiry window.
  const businessIds = [...new Set(jobs.map((j) => j.business_id))];
  const { data: bizRows, error: bizErr } = await admin
    .from("business_profiles")
    .select(
      "id, business_name, email, tier, selected_tier, subscription_status, grace_period_ends_at, user_id"
    )
    .in("id", businessIds);

  if (bizErr) errors.push(`business read failed: ${bizErr.message}`);

  // Claimed businesses only: a NULL user_id is an imported shell nobody has
  // taken ownership of, and /api/cron/unclaimed-dormancy-sweep already takes
  // those posts down at day 21 — sooner than this would.
  const businesses = new Map<string, SweepBusiness>();
  for (const b of (bizRows ?? []) as Array<SweepBusiness & { user_id: string | null }>) {
    if (!includeUnclaimed && b.user_id === null) continue;
    businesses.set(b.id, b);
  }

  const tierOf = (b: SweepBusiness) =>
    resolveEffectiveTier(
      {
        tier: b.tier,
        selected_tier: b.selected_tier,
        subscription_status: b.subscription_status,
        grace_period_ends_at: b.grace_period_ends_at,
      },
      now
    );

  const claimed = jobs.filter((j) => businesses.has(j.business_id));
  const nowMs = now.getTime();
  const isPast = (j: SweepJob) => new Date(j.expires_at).getTime() <= nowMs;

  // Pass 1 — never warned, and close enough to matter. Deliberately NOT
  // restricted to posts that are still in date: a post can slip past its
  // expiry unwarned (a cron outage, a business address added late), and
  // those need warning most of all.
  const toWarn = claimed.filter((j) => j.expiry_warning_sent_at === null);

  // Pass 2 — expired, opted into auto-renew, and actually entitled to it.
  // The tier is re-resolved rather than trusted from a flag: a business can
  // set auto_renew while paid and later lapse, and a cancelled subscription
  // must not keep renewing listings for free.
  const past = claimed.filter(isPast);
  const toRenew = past.filter((j) => {
    const biz = businesses.get(j.business_id);
    return j.auto_renew && !!biz && tierOf(biz) !== "free";
  });

  // Pass 3 — expired, not renewing, AND warned a full warning period ago.
  //
  // THE RULE THAT MAKES THE PROMISE TRUE. The email says a week's notice, so
  // nothing lapses without having had one. Testing that the warning is old
  // enough — rather than merely that one was sent — is what survives an
  // outage: if the sweep misses a fortnight, the first run back warns, and
  // expiry waits another seven days rather than pausing the board that
  // afternoon.
  //
  // It also removes a deadlock. Gating expiry on "was warned" while gating
  // warnings on "not yet expired" would strand any post that slipped past
  // its date unwarned: never warnable because it is late, never expirable
  // because it was never warned. Pass 1 warns regardless of date, and this
  // gives that warning its full run.
  const warnedLongEnough = (j: SweepJob & { expiry_warning_sent_at: string | null }) =>
    j.expiry_warning_sent_at !== null &&
    new Date(j.expiry_warning_sent_at).getTime() <= nowMs - EXPIRY_WARNING_DAYS * 86_400_000;

  const renewIds = new Set(toRenew.map((j) => j.id));
  const toExpire = past.filter((j) => !renewIds.has(j.id) && warnedLongEnough(j));

  // Past due but not yet expirable — waiting out their notice, or never
  // warnable because the business has no address on file. Surfaced so a
  // post stuck here is visible rather than silently immortal.
  const awaitingNotice = past.filter(
    (j) => !renewIds.has(j.id) && !warnedLongEnough(j)
  );

  const warn = group(toWarn, businesses, tierOf);
  const renew = group(toRenew, businesses, tierOf);
  const expire = group(toExpire, businesses, tierOf);
  const holding = group(awaitingNotice, businesses, tierOf);

  return {
    mode,
    wouldSendEmail: jobExpirySendsEmail(mode),
    wouldWrite: jobExpiryWrites(mode),
    ranAt: now.toISOString(),
    warn,
    renew,
    expire,
    holding,
    counts: {
      warn: toWarn.length,
      renew: toRenew.length,
      expire: toExpire.length,
      holding: awaitingNotice.length,
      businesses: new Set([...warn, ...renew, ...expire, ...holding].map((g) => g.businessId)).size,
    },
    errors,
  };
}

/** Human-readable summary for the cron log. */
export function describeSweep(r: SweepReport): string {
  const lines = [
    `[job-expiry] mode=${r.mode} email=${r.wouldSendEmail} write=${r.wouldWrite} ` +
      `warn=${r.counts.warn} renew=${r.counts.renew} expire=${r.counts.expire} ` +
      `holding=${r.counts.holding} ` +
      `across ${r.counts.businesses} business(es), window=${JOB_POST_LIFESPAN_DAYS}d`,
  ];
  for (const [label, groups] of [
    ["WARN", r.warn],
    ["RENEW", r.renew],
    ["EXPIRE", r.expire],
    ["HOLDING", r.holding],
  ] as const) {
    for (const g of groups) {
      lines.push(
        `[job-expiry]   ${label} ${g.businessName ?? g.businessId} (${g.effectiveTier}` +
          `${g.email ? "" : ", NO EMAIL"}): ${g.jobs.map((j) => j.title).join(" | ")}`
      );
    }
  }
  if (r.errors.length) lines.push(`[job-expiry]   errors: ${r.errors.join("; ")}`);
  return lines.join("\n");
}
