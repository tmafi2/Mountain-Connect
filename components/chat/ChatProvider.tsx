"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { StreamChat } from "stream-chat";
import { Chat } from "stream-chat-react";
import "stream-chat-react/dist/css/v2/index.css";
import "@/styles/stream-chat-overrides.css";

interface ChatProviderProps {
  children: ReactNode;
}

export default function ChatProvider({ children }: ChatProviderProps) {
  const [client, setClient] = useState<StreamChat | null>(null);
  const [loading, setLoading] = useState(true);
  const [unavailable, setUnavailable] = useState(false);
  const clientRef = useRef<StreamChat | null>(null);
  const connectingRef = useRef(false);

  useEffect(() => {
    if (connectingRef.current) return;
    connectingRef.current = true;

    let didCancel = false;

    async function init() {
      try {
        const res = await fetch("/api/chat/token", { method: "POST" });

        if (res.status === 503) {
          if (!didCancel) setUnavailable(true);
          return;
        }

        if (!res.ok) {
          console.error("Failed to get chat token:", res.status);
          if (!didCancel) setUnavailable(true);
          return;
        }

        const { token, userId, userName, apiKey } = await res.json();

        const chatClient = StreamChat.getInstance(apiKey);
        clientRef.current = chatClient;

        await chatClient.connectUser(
          { id: userId, name: userName },
          token
        );

        if (!didCancel) {
          setClient(chatClient);
        }
      } catch (err) {
        console.error("Chat init error:", err);
        if (!didCancel) setUnavailable(true);
      } finally {
        if (!didCancel) setLoading(false);
      }
    }

    init();

    return () => {
      didCancel = true;
      if (clientRef.current) {
        clientRef.current.disconnectUser().catch(() => {});
        clientRef.current = null;
      }
      connectingRef.current = false;
    };
  }, []);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-secondary" />
          <p className="text-sm text-foreground/50">Connecting to messages...</p>
        </div>
      </div>
    );
  }

  if (unavailable || !client) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-accent/30">
            <svg
              className="h-8 w-8 text-foreground/30"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
              />
            </svg>
          </div>
          <h3 className="mt-4 text-lg font-bold text-primary">
            Messaging Coming Soon
          </h3>
          <p className="mt-2 text-sm text-foreground/50">
            Real-time messaging is being set up. Check back shortly!
          </p>
        </div>
      </div>
    );
  }

  return <Chat client={client}>{children}</Chat>;
}
