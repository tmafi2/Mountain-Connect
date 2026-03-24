"use client";

import {
  createContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { StreamChat } from "stream-chat";

export const ChatUnreadContext = createContext<number>(0);

export default function ChatUnreadProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [unreadCount, setUnreadCount] = useState(0);
  const clientRef = useRef<StreamChat | null>(null);
  const initRef = useRef(false);

  useEffect(() => {
    if (initRef.current) return;
    initRef.current = true;

    let didCancel = false;

    async function init() {
      try {
        const res = await fetch("/api/chat/token", { method: "POST" });
        if (!res.ok) return;

        const { token, userId, userName, apiKey } = await res.json();
        const chatClient = StreamChat.getInstance(apiKey);
        clientRef.current = chatClient;

        const connection = await chatClient.connectUser(
          { id: userId, name: userName },
          token
        );

        if (!didCancel && connection?.me) {
          setUnreadCount(connection.me.total_unread_count ?? 0);
        }

        // Listen for unread count changes
        chatClient.on((event) => {
          if (!didCancel && event.total_unread_count !== undefined) {
            setUnreadCount(event.total_unread_count);
          }
        });
      } catch {
        // Stream not configured — silently ignore
      }
    }

    init();

    return () => {
      didCancel = true;
      if (clientRef.current) {
        clientRef.current.disconnectUser().catch(() => {});
        clientRef.current = null;
      }
      initRef.current = false;
    };
  }, []);

  return (
    <ChatUnreadContext.Provider value={unreadCount}>
      {children}
    </ChatUnreadContext.Provider>
  );
}
