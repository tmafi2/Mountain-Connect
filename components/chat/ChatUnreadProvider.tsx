"use client";

import { createContext, type ReactNode } from "react";

export const ChatUnreadContext = createContext<number>(0);

/**
 * No-op provider — messaging is disabled ("Coming Soon").
 * Skips all Supabase queries and Realtime subscriptions.
 * Restore the original implementation when messaging is re-enabled.
 */
export default function ChatUnreadProvider({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <ChatUnreadContext.Provider value={0}>
      {children}
    </ChatUnreadContext.Provider>
  );
}
