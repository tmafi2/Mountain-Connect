"use client";

import { useState } from "react";

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
  className,
  children,
}: StartConversationButtonProps) {
  const [showToast, setShowToast] = useState(false);

  // Prevent messaging yourself
  if (currentUserId === targetUserId) return null;

  return (
    <>
      <button
        onClick={() => {
          setShowToast(true);
          setTimeout(() => setShowToast(false), 3000);
        }}
        className={className}
      >
        {children || (
          <span className="flex items-center gap-2">
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            Message
          </span>
        )}
      </button>

      {/* Coming Soon Toast */}
      {showToast && (
        <div className="fixed bottom-6 left-1/2 z-[100] -translate-x-1/2 animate-in slide-in-from-bottom-4 duration-300">
          <div className="flex items-center gap-3 rounded-xl border border-accent/40 bg-white px-5 py-3 shadow-2xl">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-secondary/10">
              <svg className="h-4 w-4 text-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <p className="text-sm font-medium text-primary">Messaging coming soon!</p>
          </div>
        </div>
      )}
    </>
  );
}
