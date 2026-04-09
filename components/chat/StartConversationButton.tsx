"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface StartConversationButtonProps {
  currentUserId: string;
  targetUserId: string;
  portalType: "worker" | "business";
  className?: string;
  children?: React.ReactNode;
}

export default function StartConversationButton({
  currentUserId,
  targetUserId,
  portalType,
  className,
  children,
}: StartConversationButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  // Prevent messaging yourself
  if (currentUserId === targetUserId) return null;

  const handleClick = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetUserId,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        console.error("Failed to create conversation:", data);
        return;
      }

      const convId = data.conversationId;
      const messagesPath =
        portalType === "business"
          ? `/business/messages?conv=${convId}`
          : `/messages?conv=${convId}`;

      router.push(messagesPath);
    } catch (err) {
      console.error("Error starting conversation:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className={className}
    >
      {loading ? (
        <span className="flex items-center gap-2">
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-current/30 border-t-current" />
          Opening...
        </span>
      ) : (
        children || (
          <span className="flex items-center gap-2">
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            Message
          </span>
        )
      )}
    </button>
  );
}
