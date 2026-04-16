"use client";

import { createContext, useContext, useEffect, useState, useCallback, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import InstantInterviewModal from "./InstantInterviewModal";

interface InstantInterviewData {
  interview_id: string;
  business_name: string;
  job_title: string;
  room_expires_at: string;
  business_id?: string;
}

interface InstantInterviewContextValue {
  activeRequest: InstantInterviewData | null;
}

const InstantInterviewContext = createContext<InstantInterviewContextValue>({
  activeRequest: null,
});

export function useInstantInterview() {
  return useContext(InstantInterviewContext);
}

export default function InstantInterviewProvider({ children }: { children: React.ReactNode }) {
  const [activeRequest, setActiveRequest] = useState<InstantInterviewData | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const channelRef = useRef<ReturnType<ReturnType<typeof createClient>["channel"]> | null>(null);

  // Get current user on mount
  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        setUserId(data.user.id);
      }
    });
  }, []);

  // Check for existing unread instant interview notifications on mount
  useEffect(() => {
    if (!userId) return;

    const supabase = createClient();

    async function checkExisting() {
      const { data: notifications } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", userId)
        .eq("type", "instant_interview_request")
        .eq("is_read", false)
        .order("created_at", { ascending: false })
        .limit(1);

      if (notifications && notifications.length > 0) {
        const n = notifications[0];
        const metadata = n.metadata as Record<string, unknown> | null;
        if (metadata?.room_expires_at) {
          const expiresAt = new Date(metadata.room_expires_at as string).getTime();
          if (expiresAt > Date.now()) {
            setActiveRequest({
              interview_id: metadata.interview_id as string,
              business_name: metadata.business_name as string,
              job_title: metadata.job_title as string,
              room_expires_at: metadata.room_expires_at as string,
              business_id: metadata.business_id as string | undefined,
            });
          }
        }
      }
    }

    checkExisting();
  }, [userId]);

  // Subscribe to realtime notifications
  useEffect(() => {
    if (!userId) return;

    const supabase = createClient();

    const channel = supabase
      .channel(`instant-interview-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const notification = payload.new as Record<string, unknown>;
          if (notification.type === "instant_interview_request") {
            const metadata = notification.metadata as Record<string, unknown> | null;
            if (metadata) {
              setActiveRequest({
                interview_id: metadata.interview_id as string,
                business_name: metadata.business_name as string,
                job_title: metadata.job_title as string,
                room_expires_at: metadata.room_expires_at as string,
                business_id: metadata.business_id as string | undefined,
              });
            }
          }
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  const handleDismiss = useCallback(() => {
    setActiveRequest(null);

    // Mark the notification as read
    if (userId && activeRequest) {
      const supabase = createClient();
      supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("user_id", userId)
        .eq("type", "instant_interview_request")
        .eq("is_read", false)
        .then(() => {});
    }
  }, [userId, activeRequest]);

  return (
    <InstantInterviewContext.Provider value={{ activeRequest }}>
      {children}
      {activeRequest && (
        <InstantInterviewModal
          data={activeRequest}
          onDismiss={handleDismiss}
        />
      )}
    </InstantInterviewContext.Provider>
  );
}
