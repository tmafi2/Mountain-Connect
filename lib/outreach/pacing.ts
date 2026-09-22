import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * How much outreach may leave the domain in a rolling day.
 *
 * WHY. On 2026-09-21 a single run put 180 emails on the wire inside one
 * second, from a domain that normally sends a few dozen a day. A spike like
 * that is what a compromised account looks like to a mailbox provider, and it
 * arrives on the same domain as the signup confirmations and Tyler's own
 * inbox. Two days later, 209 follow-ups were queued to fall due at the same
 * minute — the drip cron sends one API call per lead, so that run would also
 * have hit Resend's per-second rate limit, which is the throttling that cost
 * an earlier campaign all but five of its deliveries.
 *
 * 50 is chosen to be boring: a full pass over the current 242 active leads
 * takes five days, which reads as a person working through a list rather than
 * a blast. Raise it slowly if reputation data (Google Postmaster Tools) says
 * there is room; do not raise it because a campaign feels slow.
 *
 * The window is ROLLING, not calendar — a calendar day lets 100 emails go out
 * across 23:59 and 00:01, which is the same spike wearing a hat.
 */
export const DAILY_OUTREACH_LIMIT = 50;

export interface PacedSplit<T> {
  send: T[];
  deferred: T[];
  /** How many more could have gone out today, before this split. */
  roomToday: number;
}

/**
 * Pure, so the arithmetic is testable without a database — the part that has
 * to be right is "never exceed the limit", and it should be provable.
 */
export function paceDaily<T>(
  candidates: T[],
  alreadySentToday: number,
  limit: number = DAILY_OUTREACH_LIMIT
): PacedSplit<T> {
  const roomToday = Math.max(0, limit - Math.max(0, alreadySentToday));
  return {
    send: candidates.slice(0, roomToday),
    deferred: candidates.slice(roomToday),
    roomToday,
  };
}

/** Outreach actually put on the wire in the last 24 hours, by any path. */
export async function outreachSentInLastDay(
  admin: SupabaseClient,
  now: Date = new Date()
): Promise<number> {
  const since = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
  const { count, error } = await admin
    .from("outreach_sends")
    .select("id", { count: "exact", head: true })
    .eq("status", "sent")
    .gte("sent_at", since);

  if (error) {
    // FAIL CLOSED. Not knowing how much we have sent is not a reason to send
    // more: a skipped batch goes out tomorrow, a spike cannot be recalled.
    console.error("pacing: could not count recent sends:", error.message);
    return DAILY_OUTREACH_LIMIT;
  }
  return count ?? 0;
}

/** The message a deferred lead carries, so nobody reads it as a failure. */
export function deferredMessage(roomToday: number): string {
  return roomToday === 0
    ? `Deferred — the ${DAILY_OUTREACH_LIMIT}/day outreach pacing limit is already used up. It will send on the next run.`
    : `Deferred — only ${roomToday} of today's ${DAILY_OUTREACH_LIMIT} outreach sends were left. It will send on the next run.`;
}
