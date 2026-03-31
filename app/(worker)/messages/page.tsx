"use client";

import { useEffect, useState, useRef, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import NewConversationModal from "@/components/chat/NewConversationModal";

/* ─── types ───────────────────────────────────────────────── */
interface Conversation {
  id: string;
  otherName: string;
  otherRole: string;
  otherUserId: string;
  lastMessage: string;
  lastMessageAt: string;
  unreadCount: number;
}

interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  read: boolean;
  created_at: string;
}

/* ─── helpers ─────────────────────────────────────────────── */
function formatTime(dateStr: string): string {
  const d = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffDays = Math.floor(diffMs / 86400000);
  if (diffDays === 0) return d.toLocaleTimeString("en-AU", { hour: "numeric", minute: "2-digit", hour12: true });
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return d.toLocaleDateString("en-AU", { weekday: "short" });
  return d.toLocaleDateString("en-AU", { month: "short", day: "numeric" });
}

function formatMessageTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString("en-AU", { hour: "numeric", minute: "2-digit", hour12: true });
}

/* ─── main page ───────────────────────────────────────────── */
export default function WorkerMessagesPage() {
  return (
    <Suspense fallback={
      <div className="flex h-[calc(100vh-8rem)] items-center justify-center rounded-2xl border border-accent/40 bg-white">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-secondary" />
      </div>
    }>
      <WorkerMessagesContent />
    </Suspense>
  );
}

function WorkerMessagesContent() {
  const searchParams = useSearchParams();
  const convFromUrl = searchParams.get("conv");
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [mobileShowChat, setMobileShowChat] = useState(false);
  const [showNewConvModal, setShowNewConvModal] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  // Load conversations
  useEffect(() => {
    const supabase = createClient();

    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }
      setCurrentUserId(user.id);

      // Fetch conversations the user participates in
      const { data: participations } = await supabase
        .from("conversation_participants")
        .select("conversation_id, role")
        .eq("user_id", user.id);

      if (!participations || participations.length === 0) {
        setLoading(false);
        return;
      }

      const convIds = participations.map((p) => p.conversation_id);

      // Fetch other participants
      const { data: allParticipants } = await supabase
        .from("conversation_participants")
        .select("conversation_id, user_id, role")
        .in("conversation_id", convIds)
        .neq("user_id", user.id);

      // Fetch other participant names
      const otherUserIds = [...new Set((allParticipants || []).map((p) => p.user_id))];
      const names: Record<string, { name: string; role: string }> = {};

      if (otherUserIds.length > 0) {
        // Try worker_profiles first
        const { data: workerProfiles } = await supabase
          .from("worker_profiles")
          .select("user_id, first_name, last_name")
          .in("user_id", otherUserIds);
        workerProfiles?.forEach((wp) => {
          names[wp.user_id] = {
            name: [wp.first_name, wp.last_name].filter(Boolean).join(" ") || "Worker",
            role: "Worker",
          };
        });

        // Then business_profiles
        const { data: bizProfiles } = await supabase
          .from("business_profiles")
          .select("user_id, business_name")
          .in("user_id", otherUserIds);
        bizProfiles?.forEach((bp) => {
          names[bp.user_id] = {
            name: bp.business_name || "Business",
            role: "Employer",
          };
        });
      }

      // Fetch latest message for each conversation
      const convList: Conversation[] = [];
      for (const convId of convIds) {
        const otherP = allParticipants?.find((p) => p.conversation_id === convId);
        const otherUserId = otherP?.user_id || "";
        const otherInfo = names[otherUserId] || { name: "Unknown", role: "User" };

        const { data: latestMsg } = await supabase
          .from("messages")
          .select("content, created_at")
          .eq("conversation_id", convId)
          .order("created_at", { ascending: false })
          .limit(1)
          .single();

        const { count: unread } = await supabase
          .from("messages")
          .select("id", { count: "exact", head: true })
          .eq("conversation_id", convId)
          .eq("read", false)
          .neq("sender_id", user.id);

        convList.push({
          id: convId,
          otherName: otherInfo.name,
          otherRole: otherInfo.role,
          otherUserId,
          lastMessage: latestMsg?.content || "",
          lastMessageAt: latestMsg?.created_at || new Date().toISOString(),
          unreadCount: unread ?? 0,
        });
      }

      // Sort by most recent
      convList.sort((a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime());
      setConversations(convList);

      // Auto-select conversation from URL param
      if (convFromUrl && convList.some((c) => c.id === convFromUrl)) {
        setActiveConvId(convFromUrl);
        setMobileShowChat(true);
      }

      setLoading(false);
    })();
  }, []);

  // Load messages when conversation changes
  useEffect(() => {
    if (!activeConvId || !currentUserId) return;
    const supabase = createClient();

    (async () => {
      const { data } = await supabase
        .from("messages")
        .select("*")
        .eq("conversation_id", activeConvId)
        .order("created_at", { ascending: true });
      setMessages(data || []);

      // Mark unread messages as read
      await supabase
        .from("messages")
        .update({ read: true })
        .eq("conversation_id", activeConvId)
        .eq("read", false)
        .neq("sender_id", currentUserId);

      // Mark message notifications as read for this conversation
      await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("user_id", currentUserId)
        .eq("type", "new_message")
        .eq("is_read", false)
        .filter("metadata->>conversation_id", "eq", activeConvId);

      // Update local unread count
      setConversations((prev) =>
        prev.map((c) => (c.id === activeConvId ? { ...c, unreadCount: 0 } : c))
      );

      setTimeout(scrollToBottom, 100);
    })();
  }, [activeConvId, currentUserId, scrollToBottom]);

  // Supabase Realtime subscription for new messages
  useEffect(() => {
    if (!currentUserId || conversations.length === 0) return;
    const supabase = createClient();
    const convIds = conversations.map((c) => c.id);

    const channel = supabase
      .channel("messages-realtime")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
        },
        (payload) => {
          const newMsg = payload.new as Message;
          // Only process messages for conversations we're part of
          if (!convIds.includes(newMsg.conversation_id)) return;

          // Append to active conversation
          if (newMsg.conversation_id === activeConvId) {
            setMessages((prev) => {
              if (prev.some((m) => m.id === newMsg.id)) return prev;
              return [...prev, newMsg];
            });
            setTimeout(scrollToBottom, 50);

            // Auto-mark as read if from the other person
            if (newMsg.sender_id !== currentUserId) {
              supabase
                .from("messages")
                .update({ read: true })
                .eq("id", newMsg.id)
                .then(() => {});
            }
          }

          // Update conversation list
          setConversations((prev) =>
            prev
              .map((c) => {
                if (c.id !== newMsg.conversation_id) return c;
                return {
                  ...c,
                  lastMessage: newMsg.content,
                  lastMessageAt: newMsg.created_at,
                  unreadCount:
                    newMsg.sender_id !== currentUserId && newMsg.conversation_id !== activeConvId
                      ? c.unreadCount + 1
                      : c.unreadCount,
                };
              })
              .sort((a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime())
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUserId, conversations.length, activeConvId, scrollToBottom]);

  // Send message
  const handleSend = async () => {
    if (!newMessage.trim() || !activeConvId || !currentUserId || sending) return;
    const content = newMessage.trim();
    setNewMessage("");
    setSending(true);

    try {
      const supabase = createClient();
      await supabase.from("messages").insert({
        conversation_id: activeConvId,
        sender_id: currentUserId,
        content,
      });
      // Also update conversation timestamp
      await supabase
        .from("conversations")
        .update({ updated_at: new Date().toISOString() })
        .eq("id", activeConvId);

      // Trigger email notification (non-blocking)
      fetch("/api/emails/new-message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversationId: activeConvId, senderId: currentUserId, messageContent: content }),
      }).catch(() => {});
    } catch (err) {
      console.error("Failed to send message:", err);
      setNewMessage(content); // restore on failure
    }
    setSending(false);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const activeConv = conversations.find((c) => c.id === activeConvId);
  const filteredConversations = searchQuery.trim()
    ? conversations.filter((c) => c.otherName.toLowerCase().includes(searchQuery.toLowerCase()))
    : conversations;

  if (loading) {
    return (
      <div className="flex h-[calc(100vh-8rem)] items-center justify-center rounded-2xl border border-accent/40 bg-white">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-secondary" />
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-8rem)] overflow-hidden rounded-2xl border border-accent/40 bg-white shadow-sm">
      {/* ── Left: Conversation List ──────────────────────────── */}
      <div className={`flex w-full flex-col border-r border-accent/30 md:w-80 md:flex-shrink-0 ${mobileShowChat ? "hidden md:flex" : "flex"}`}>
        {/* Header */}
        <div className="border-b border-accent/30 px-4 py-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-primary">Messages</h2>
            <button
              onClick={() => setShowNewConvModal(true)}
              className="flex h-8 w-8 items-center justify-center rounded-lg bg-secondary text-white transition-all hover:bg-secondary-light hover:shadow-md"
              title="New message"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
            </button>
          </div>
          <div className="relative mt-3">
            <svg className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-lg border border-accent/40 bg-accent/10 py-2 pl-9 pr-3 text-sm text-primary placeholder:text-foreground/40 focus:border-secondary focus:outline-none focus:ring-1 focus:ring-secondary/30"
            />
          </div>
        </div>

        {/* Conversation list */}
        <div className="flex-1 overflow-y-auto">
          {filteredConversations.length === 0 ? (
            <div className="px-4 py-12 text-center">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-accent/20">
                <svg className="h-6 w-6 text-foreground/30" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <p className="text-sm font-medium text-foreground/50">No conversations yet</p>
              <p className="mt-1 text-xs text-foreground/30">
                Use the &ldquo;Message Business&rdquo; button on your applications to start a conversation.
              </p>
            </div>
          ) : (
            filteredConversations.map((conv) => (
              <button
                key={conv.id}
                onClick={() => {
                  setActiveConvId(conv.id);
                  setMobileShowChat(true);
                }}
                className={`flex w-full items-center gap-3 border-b border-accent/20 px-4 py-3.5 text-left transition-colors hover:bg-accent/10 ${
                  activeConvId === conv.id ? "bg-secondary/5 border-l-2 border-l-secondary" : ""
                }`}
              >
                {/* Avatar */}
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                  {conv.otherName.charAt(0).toUpperCase()}
                </div>

                {/* Content */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between">
                    <p className={`truncate text-sm ${conv.unreadCount > 0 ? "font-bold text-primary" : "font-medium text-foreground/80"}`}>
                      {conv.otherName}
                    </p>
                    <span className="flex-shrink-0 text-[10px] text-foreground/40">
                      {formatTime(conv.lastMessageAt)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <p className={`mt-0.5 truncate text-xs ${conv.unreadCount > 0 ? "font-medium text-foreground/70" : "text-foreground/40"}`}>
                      {conv.lastMessage || "No messages yet"}
                    </p>
                    {conv.unreadCount > 0 && (
                      <span className="ml-2 flex h-5 min-w-5 flex-shrink-0 items-center justify-center rounded-full bg-secondary px-1.5 text-[10px] font-bold text-white">
                        {conv.unreadCount}
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 text-[10px] text-foreground/30">{conv.otherRole}</p>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* ── Right: Chat View ────────────────────────────────── */}
      <div className={`flex flex-1 flex-col ${mobileShowChat ? "flex" : "hidden md:flex"}`}>
        {activeConv ? (
          <>
            {/* Chat header */}
            <div className="flex items-center gap-3 border-b border-accent/30 px-5 py-3.5">
              {/* Mobile back button */}
              <button
                onClick={() => setMobileShowChat(false)}
                className="mr-1 rounded-lg p-1.5 text-foreground/40 hover:bg-accent/20 hover:text-foreground md:hidden"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                {activeConv.otherName.charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="text-sm font-semibold text-primary">{activeConv.otherName}</p>
                <p className="text-[11px] text-foreground/40">{activeConv.otherRole}</p>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-5 py-4">
              {messages.length === 0 ? (
                <div className="flex h-full items-center justify-center">
                  <p className="text-sm text-foreground/30">No messages yet. Say hello!</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {messages.map((msg, i) => {
                    const isMe = msg.sender_id === currentUserId;
                    // Show date separator
                    const prevMsg = i > 0 ? messages[i - 1] : null;
                    const msgDate = new Date(msg.created_at).toDateString();
                    const prevDate = prevMsg ? new Date(prevMsg.created_at).toDateString() : null;
                    const showDateSep = msgDate !== prevDate;

                    return (
                      <div key={msg.id}>
                        {showDateSep && (
                          <div className="my-4 flex items-center gap-3">
                            <div className="h-px flex-1 bg-accent/30" />
                            <span className="text-[10px] font-medium text-foreground/30">
                              {new Date(msg.created_at).toLocaleDateString("en-AU", { weekday: "short", month: "short", day: "numeric" })}
                            </span>
                            <div className="h-px flex-1 bg-accent/30" />
                          </div>
                        )}
                        <div className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
                          <div className={`group max-w-[75%] ${isMe ? "items-end" : "items-start"}`}>
                            <div
                              className={`rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                                isMe
                                  ? "bg-secondary text-white rounded-br-md"
                                  : "bg-accent/30 text-foreground rounded-bl-md"
                              }`}
                            >
                              {msg.content}
                            </div>
                            <div className={`mt-1 flex items-center gap-1.5 ${isMe ? "justify-end" : "justify-start"}`}>
                              <span className="text-[10px] text-foreground/30">
                                {formatMessageTime(msg.created_at)}
                              </span>
                              {isMe && (
                                <span className="text-[10px] text-foreground/30">
                                  {msg.read ? "✓✓" : "✓"}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </div>
              )}
            </div>

            {/* Message input */}
            <div className="border-t border-accent/30 px-4 py-3">
              <div className="flex items-end gap-2">
                <textarea
                  ref={inputRef}
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Type a message..."
                  rows={1}
                  className="max-h-24 flex-1 resize-none rounded-xl border border-accent/40 bg-accent/10 px-4 py-2.5 text-sm text-primary placeholder:text-foreground/40 focus:border-secondary focus:outline-none focus:ring-1 focus:ring-secondary/30"
                  style={{ minHeight: "2.5rem" }}
                />
                <button
                  onClick={handleSend}
                  disabled={!newMessage.trim() || sending}
                  className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary text-white transition-all hover:bg-secondary-light disabled:opacity-40 disabled:hover:bg-secondary"
                >
                  {sending ? (
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  ) : (
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
                    </svg>
                  )}
                </button>
              </div>
            </div>
          </>
        ) : (
          /* Empty state */
          <div className="flex flex-1 items-center justify-center">
            <div className="text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-accent/20">
                <svg className="h-8 w-8 text-foreground/20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <p className="text-sm font-medium text-foreground/50">Select a conversation</p>
              <p className="mt-1 text-xs text-foreground/30">Choose a conversation from the list to start messaging.</p>
            </div>
          </div>
        )}
      </div>

      {/* New Conversation Modal */}
      {showNewConvModal && currentUserId && (
        <NewConversationModal
          portalType="worker"
          currentUserId={currentUserId}
          onClose={() => setShowNewConvModal(false)}
          onConversationCreated={(convId) => {
            setShowNewConvModal(false);
            setActiveConvId(convId);
            setMobileShowChat(true);
            // Reload the page to pick up the new conversation
            window.location.href = `/messages?conv=${convId}`;
          }}
        />
      )}
    </div>
  );
}
