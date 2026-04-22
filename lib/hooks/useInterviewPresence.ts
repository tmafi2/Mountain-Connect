"use client";

import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";

export type PresenceStatus = "viewing" | "in_call";

/**
 * Status of the *other* party on an interview.
 * - absent: not currently subscribed to the presence channel
 * - viewing: on the interview page but not yet in the Daily call
 * - in_call: inside the video room
 * - recently_left: dropped off within the last 60s — shown as "was here a
 *   minute ago" so brief reloads / flaky networks do not flash the UI back
 *   to "never arrived"
 */
export type OtherPartyStatus = "absent" | "viewing" | "in_call" | "recently_left";

export interface OtherParty {
  status: OtherPartyStatus;
  displayName: string | null;
  lastSeenAt: Date | null;
}

interface UseInterviewPresenceArgs {
  interviewId: string;
  selfRole: "business" | "worker";
  selfUserId: string | null;
  selfDisplayName: string;
  otherRole: "business" | "worker";
}

interface TrackedPresence {
  role: "business" | "worker";
  status: PresenceStatus;
  display_name: string;
  user_id: string;
}

const RECENTLY_LEFT_MS = 60_000;

export function useInterviewPresence({
  interviewId,
  selfRole,
  selfUserId,
  selfDisplayName,
  otherRole,
}: UseInterviewPresenceArgs): {
  otherParty: OtherParty;
  setStatus: (status: PresenceStatus) => void;
} {
  const [otherParty, setOtherParty] = useState<OtherParty>({
    status: "absent",
    displayName: null,
    lastSeenAt: null,
  });

  // Track our own status via ref so the channel callbacks always read the
  // latest value without forcing re-subscriptions on every change.
  const selfStatusRef = useRef<PresenceStatus>("viewing");
  const channelRef = useRef<ReturnType<ReturnType<typeof createClient>["channel"]> | null>(null);
  const recentlyLeftTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const channelName = useMemo(() => `interview-presence:${interviewId}`, [interviewId]);

  const clearRecentlyLeftTimer = () => {
    if (recentlyLeftTimerRef.current) {
      clearTimeout(recentlyLeftTimerRef.current);
      recentlyLeftTimerRef.current = null;
    }
  };

  const handlePresenceSync = useCallback(
    (state: Record<string, TrackedPresence[]>) => {
      // Flatten all tracked presences and find the first one from the other role
      const all: TrackedPresence[] = Object.values(state).flat() as TrackedPresence[];
      const other = all.find((p) => p?.role === otherRole);

      if (other) {
        clearRecentlyLeftTimer();
        setOtherParty({
          status: other.status,
          displayName: other.display_name || null,
          lastSeenAt: new Date(),
        });
      } else {
        // No other-party presence right now. Promote to recently_left if we
        // had seen them, so brief reloads do not flicker the UI.
        setOtherParty((prev) => {
          if (prev.status === "absent" || prev.status === "recently_left") {
            return prev;
          }
          clearRecentlyLeftTimer();
          recentlyLeftTimerRef.current = setTimeout(() => {
            setOtherParty((p) => ({ ...p, status: "absent" }));
          }, RECENTLY_LEFT_MS);
          return { ...prev, status: "recently_left", lastSeenAt: new Date() };
        });
      }
    },
    [otherRole]
  );

  useEffect(() => {
    if (!selfUserId) return;

    const supabase = createClient();
    const channel = supabase.channel(channelName, {
      config: { presence: { key: `${selfRole}:${selfUserId}` } },
    });
    channelRef.current = channel;

    channel
      .on("presence", { event: "sync" }, () => {
        handlePresenceSync(channel.presenceState<TrackedPresence>() as unknown as Record<string, TrackedPresence[]>);
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await channel.track({
            role: selfRole,
            status: selfStatusRef.current,
            display_name: selfDisplayName,
            user_id: selfUserId,
          } satisfies TrackedPresence);
        }
      });

    return () => {
      clearRecentlyLeftTimer();
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [channelName, selfRole, selfUserId, selfDisplayName, handlePresenceSync]);

  const setStatus = useCallback((status: PresenceStatus) => {
    selfStatusRef.current = status;
    const channel = channelRef.current;
    if (!channel || !selfUserId) return;
    channel.track({
      role: selfRole,
      status,
      display_name: selfDisplayName,
      user_id: selfUserId,
    } satisfies TrackedPresence).catch(() => {});
  }, [selfRole, selfDisplayName, selfUserId]);

  return { otherParty, setStatus };
}
