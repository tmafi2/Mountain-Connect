"use client";

import { useState, useRef, useEffect } from "react";
import { useMessageNotifications } from "@/hooks/useMessageNotifications";
import MessageNotificationDropdown from "./MessageNotificationDropdown";

interface MessageNotificationBellProps {
  messagesHref?: string;
}

export default function MessageNotificationBell({
  messagesHref = "/messages",
}: MessageNotificationBellProps) {
  const { unreadCount } = useMessageNotifications();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <div className="relative" ref={containerRef}>
      <button
        onClick={() => setOpen(!open)}
        className="relative rounded-lg p-2 text-foreground transition-colors hover:bg-accent/30"
        aria-label="Messages"
      >
        {/* Chat bubble icon */}
        <svg
          className="h-5 w-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
          />
        </svg>

        {/* Badge */}
        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-secondary px-1 text-[10px] font-bold text-white">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <MessageNotificationDropdown
          onClose={() => setOpen(false)}
          messagesHref={messagesHref}
        />
      )}
    </div>
  );
}
