"use client";

import { useEffect, useState } from "react";

interface ConversationPreview {
  id: string;
  otherName: string;
  otherRole: string;
  otherUserId: string;
  lastMessage: string;
  lastMessageAt: string;
  unreadCount: number;
}

interface MessageNotificationDropdownProps {
  onClose: () => void;
  messagesHref: string;
}

export default function MessageNotificationDropdown({
  onClose,
  messagesHref,
}: MessageNotificationDropdownProps) {
  const [conversations, setConversations] = useState<ConversationPreview[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/conversations");
        if (res.ok) {
          const data = await res.json();
          setConversations(data.conversations ?? []);
        }
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60_000);
    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  // Sort: unread conversations first, then by most recent
  const sorted = [...conversations].sort((a, b) => {
    if (a.unreadCount > 0 && b.unreadCount === 0) return -1;
    if (a.unreadCount === 0 && b.unreadCount > 0) return 1;
    return new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime();
  });

  return (
    <div className="absolute right-0 top-full mt-2 w-80 rounded-xl border border-accent bg-white shadow-lg sm:w-96">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-accent px-4 py-3">
        <h3 className="text-sm font-semibold text-primary">Messages</h3>
        <a
          href={messagesHref}
          onClick={onClose}
          className="text-xs font-medium text-secondary hover:underline"
        >
          View all
        </a>
      </div>

      {/* List */}
      <div className="max-h-80 overflow-y-auto">
        {loading ? (
          <div className="p-6 text-center text-sm text-foreground/50">
            Loading...
          </div>
        ) : sorted.length === 0 ? (
          <div className="p-6 text-center text-sm text-foreground/50">
            No conversations yet
          </div>
        ) : (
          sorted.slice(0, 10).map((conv) => (
            <a
              key={conv.id}
              href={`${messagesHref}?conv=${conv.id}`}
              onClick={onClose}
              className={`flex gap-3 border-b border-accent/50 px-4 py-3 transition-colors hover:bg-accent/10 ${
                conv.unreadCount > 0 ? "bg-secondary/5" : ""
              }`}
            >
              {/* Avatar */}
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-secondary/20">
                <span className="text-sm font-bold text-secondary">
                  {conv.otherName.charAt(0).toUpperCase()}
                </span>
              </div>

              {/* Content */}
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between">
                  <p
                    className={`text-sm truncate ${
                      conv.unreadCount > 0
                        ? "font-semibold text-primary"
                        : "font-medium text-foreground"
                    }`}
                  >
                    {conv.otherName}
                  </p>
                  <span className="ml-2 flex-shrink-0 text-[10px] text-foreground/40">
                    {formatTime(conv.lastMessageAt)}
                  </span>
                </div>
                <p className="mt-0.5 text-xs text-foreground/60 line-clamp-1">
                  {conv.lastMessage || "No messages yet"}
                </p>
                {conv.otherRole && (
                  <span className="mt-0.5 inline-block text-[10px] text-foreground/40">
                    {conv.otherRole}
                  </span>
                )}
              </div>

              {/* Unread badge */}
              {conv.unreadCount > 0 && (
                <span className="mt-2 flex h-5 min-w-[20px] flex-shrink-0 items-center justify-center rounded-full bg-secondary px-1.5 text-[10px] font-bold text-white">
                  {conv.unreadCount > 99 ? "99+" : conv.unreadCount}
                </span>
              )}
            </a>
          ))
        )}
      </div>

      {/* Footer */}
      <div className="border-t border-accent px-4 py-2.5">
        <a
          href={messagesHref}
          onClick={onClose}
          className="block text-center text-xs font-medium text-secondary hover:underline"
        >
          Open messages
        </a>
      </div>
    </div>
  );
}
