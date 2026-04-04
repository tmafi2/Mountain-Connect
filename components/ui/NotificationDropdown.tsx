"use client";

import { useEffect, useState } from "react";
import type { Notification } from "@/types/database";

interface NotificationDropdownProps {
  onClose: () => void;
  onMarkAllRead: () => void;
}

export default function NotificationDropdown({
  onClose,
  onMarkAllRead,
}: NotificationDropdownProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/notifications");
        if (res.ok) {
          const data = await res.json();
          const items: Notification[] = data.notifications ?? [];
          setNotifications(items);

          // Auto-mark all as read when dropdown opens
          const unread = items.filter((n) => !n.is_read);
          if (unread.length > 0) {
            onMarkAllRead();
            setNotifications(items.map((n) => ({ ...n, is_read: true })));
          }
        }
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

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

  const iconForType = (type: string) => {
    switch (type) {
      case "interview_invited":
        return "📩";
      case "interview_scheduled":
        return "📅";
      case "interview_cancelled":
        return "❌";
      case "interview_rescheduled":
        return "🔄";
      case "interview_reminder":
        return "⏰";
      case "application_status_changed":
        return "📋";
      case "job_alert_match":
        return "🔔";
      case "new_message":
        return "💬";
      case "reschedule_approved":
        return "✅";
      case "reschedule_declined":
        return "⛔";
      default:
        return "🔔";
    }
  };

  return (
    <div className="absolute right-0 top-full mt-2 w-80 rounded-xl border border-accent bg-white shadow-lg sm:w-96">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-accent px-4 py-3">
        <h3 className="text-sm font-semibold text-primary">Notifications</h3>
        <button
          onClick={() => {
            onMarkAllRead();
            // Update local state immediately
            setNotifications((prev) =>
              prev.map((n) => ({ ...n, is_read: true }))
            );
          }}
          className="text-xs font-medium text-secondary hover:underline"
        >
          Mark all read
        </button>
      </div>

      {/* List */}
      <div className="max-h-80 overflow-y-auto">
        {loading ? (
          <div className="p-6 text-center text-sm text-foreground/50">
            Loading...
          </div>
        ) : notifications.length === 0 ? (
          <div className="p-6 text-center text-sm text-foreground/50">
            No notifications yet
          </div>
        ) : (
          notifications.map((n) => (
            <a
              key={n.id}
              href={n.link || "#"}
              onClick={(e) => {
                if (!n.link) e.preventDefault();
                onClose();
              }}
              className={`flex gap-3 border-b border-accent/50 px-4 py-3 transition-colors hover:bg-accent/10 ${
                !n.is_read ? "bg-secondary/5" : ""
              }`}
            >
              <span className="mt-0.5 text-lg">{iconForType(n.type)}</span>
              <div className="min-w-0 flex-1">
                <p
                  className={`text-sm ${!n.is_read ? "font-semibold text-primary" : "text-foreground"}`}
                >
                  {n.title}
                </p>
                <p className="mt-0.5 text-xs text-foreground/60 line-clamp-2">
                  {n.message}
                </p>
                <p className="mt-1 text-xs text-foreground/40">
                  {formatTime(n.created_at)}
                </p>
              </div>
              {!n.is_read && (
                <span className="mt-2 h-2 w-2 flex-shrink-0 rounded-full bg-secondary" />
              )}
            </a>
          ))
        )}
      </div>
    </div>
  );
}
