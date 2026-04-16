"use client";

import type { ReactNode } from "react";

/**
 * Placeholder — messaging is disabled ("Coming Soon").
 * stream-chat and stream-chat-react have been removed to reduce bundle size.
 * Restore dependencies and original implementation when re-enabling messaging.
 */
export default function ChatProvider({ children }: { children: ReactNode }) {
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
