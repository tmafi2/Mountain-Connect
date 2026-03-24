"use client";

import { useRouter } from "next/navigation";
import { getDmChannelId } from "@/lib/stream/channels";

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

  const handleClick = () => {
    const channelId = getDmChannelId(currentUserId, targetUserId);
    const basePath =
      portalType === "business" ? "/business/messages" : "/messages";
    router.push(`${basePath}?channel=${channelId}`);
  };

  return (
    <button onClick={handleClick} className={className}>
      {children || (
        <span className="flex items-center gap-2">
          <svg
            className="h-4 w-4"
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
          Message
        </span>
      )}
    </button>
  );
}
