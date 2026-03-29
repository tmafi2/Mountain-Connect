"use client";

import {
  createContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { createClient } from "@/lib/supabase/client";

export const ChatUnreadContext = createContext<number>(0);

export default function ChatUnreadProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const supabase = createClient();
    let userId: string | null = null;
    let convIds: string[] = [];

    async function init() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      userId = user.id;

      // Get conversations the user is in
      const { data: participations } = await supabase
        .from("conversation_participants")
        .select("conversation_id")
        .eq("user_id", user.id);

      if (!participations || participations.length === 0) return;
      convIds = participations.map((p) => p.conversation_id);

      // Get initial unread count
      const { count } = await supabase
        .from("messages")
        .select("id", { count: "exact", head: true })
        .in("conversation_id", convIds)
        .eq("read", false)
        .neq("sender_id", user.id);

      setUnreadCount(count ?? 0);

      // Subscribe to new messages for real-time unread updates
      const channel = supabase
        .channel("unread-messages")
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "messages" },
          (payload) => {
            const msg = payload.new as { conversation_id: string; sender_id: string; read: boolean };
            if (convIds.includes(msg.conversation_id) && msg.sender_id !== userId) {
              setUnreadCount((prev) => prev + 1);
            }
          }
        )
        .on(
          "postgres_changes",
          { event: "UPDATE", schema: "public", table: "messages" },
          (payload) => {
            const msg = payload.new as { conversation_id: string; sender_id: string; read: boolean };
            const old = payload.old as { read: boolean };
            // Message was marked as read
            if (convIds.includes(msg.conversation_id) && msg.sender_id !== userId && !old.read && msg.read) {
              setUnreadCount((prev) => Math.max(0, prev - 1));
            }
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }

    const cleanupPromise = init();

    return () => {
      cleanupPromise.then((cleanup) => cleanup?.());
    };
  }, []);

  return (
    <ChatUnreadContext.Provider value={unreadCount}>
      {children}
    </ChatUnreadContext.Provider>
  );
}
