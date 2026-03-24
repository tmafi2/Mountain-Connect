"use client";

import { type ChannelPreviewUIComponentProps } from "stream-chat-react";
import { formatDistanceToNow } from "date-fns";

export default function CustomChannelPreview(
  props: ChannelPreviewUIComponentProps
) {
  const { channel, setActiveChannel, active, unread, lastMessage, displayTitle, displayImage } =
    props;

  const timestamp = lastMessage?.created_at
    ? formatDistanceToNow(new Date(lastMessage.created_at), { addSuffix: true })
    : "";

  const preview =
    lastMessage?.text?.slice(0, 60) +
    (lastMessage?.text && lastMessage.text.length > 60 ? "..." : "") ||
    "No messages yet";

  return (
    <button
      onClick={() => setActiveChannel?.(channel)}
      className={`flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left transition-colors ${
        active
          ? "bg-secondary/10 border-l-2 border-secondary"
          : "hover:bg-accent/20"
      }`}
    >
      {/* Avatar */}
      <div className="relative shrink-0">
        {displayImage ? (
          <img
            src={displayImage}
            alt={displayTitle || ""}
            className="h-10 w-10 rounded-full object-cover"
          />
        ) : (
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary/10 text-sm font-bold text-secondary">
            {(displayTitle || "?")[0].toUpperCase()}
          </div>
        )}
        {/* Unread badge */}
        {unread ? (
          <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-secondary px-1 text-[10px] font-bold text-white">
            {unread > 99 ? "99+" : unread}
          </span>
        ) : null}
      </div>

      {/* Content */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <p
            className={`truncate text-sm ${
              unread ? "font-bold text-primary" : "font-medium text-foreground/80"
            }`}
          >
            {displayTitle || "Conversation"}
          </p>
          {timestamp && (
            <span className="shrink-0 text-[11px] text-foreground/40">
              {timestamp}
            </span>
          )}
        </div>
        <p
          className={`mt-0.5 truncate text-xs ${
            unread ? "font-medium text-foreground/70" : "text-foreground/50"
          }`}
        >
          {preview}
        </p>
      </div>
    </button>
  );
}
