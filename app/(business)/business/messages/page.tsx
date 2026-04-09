"use client";

import { useEffect, useState, useRef, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import NewConversationModal, { type ConversationCreatedData } from "@/components/chat/NewConversationModal";

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
export default function BusinessMessagesPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-[calc(100vh-8rem)] items-center justify-center rounded-2xl border border-accent/40 bg-white">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-secondary" />
        </div>
      }
    >
      <BusinessMessagesContent />
    </Suspense>
  );
}

function BusinessMessagesContent() {
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

  // Get current user ID on mount
  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setCurrentUserId(user.id);
    });
  }, []);

  // Load conversations via API
  const loadConversations = useCallback(async (selectConvId?: string) => {
    try {
      const res = await fetch("/api/conversations");
      if (!res.ok) {
        console.error("Failed to load conversations:", await res.text());
        setLoading(false);
        return;
      }
      const data = await res.json();
      let convList: Conversation[] = data.conversations || [];

      setConversations(convList);

      const targetConv = selectConvId || convFromUrl;
      if (targetConv && convList.some((c) => c.id === targetConv)) {
        setActiveConvId(targetConv);
        setMobileShowChat(true);
      }
    } catch (err) {
      console.error("Error loading conversations:", err);
    }
    setLoading(false);
  }, [convFromUrl]);

  // Initial load
  useEffect(() => {
    loadConversations(convFromUrl || undefined);
  }, [loadConversations, convFromUrl]);

  // Load messages via API when conversation changes
  useEffect(() => {
    if (!activeConvId || !currentUserId) return;

    (async () => {
      try {
        const res = await fetch(`/api/conversations/${activeConvId}/messages`);
        if (res.ok) {
          const data = await res.json();
          setMessages(data.messages || []);
        }
      } catch (err) {
        console.error("Error loading messages:", err);
      }

      // Mark as read via API
      fetch(`/api/conversations/${activeConvId}/read`, { method: "POST" }).catch(() => {});

      // Update local unread count
      setConversations((prev) =>
        prev.map((c) => (c.id === activeConvId ? { ...c, unreadCount: 0 } : c))
      );

      setTimeout(scrollToBottom, 100);
    })();
  }, [activeConvId, currentUserId, scrollToBottom]);

  // Poll for new messages every 3s (reliable fallback for Realtime)
  useEffect(() => {
    if (!activeConvId || !currentUserId) return;
    const poll = async () => {
      try {
        const res = await fetch(`/api/conversations/${activeConvId}/messages`);
        if (!res.ok) return;
        const data = await res.json();
        const serverMsgs: Message[] = data.messages || [];
        setMessages((prev) => {
          // Merge: keep optimistic messages not yet confirmed, add new server messages
          const serverIds = new Set(serverMsgs.map((m) => m.id));
          const optimistic = prev.filter((m) => m.id.startsWith("temp-") && !serverIds.has(m.id));
          const lastPrevReal = prev.filter((m) => !m.id.startsWith("temp-"));
          if (serverMsgs.length !== lastPrevReal.length || serverMsgs[serverMsgs.length - 1]?.id !== lastPrevReal[lastPrevReal.length - 1]?.id) {
            const merged = [...serverMsgs, ...optimistic];
            if (merged.length > prev.length) setTimeout(scrollToBottom, 50);
            return merged;
          }
          return prev;
        });
      } catch {}
    };
    const interval = setInterval(poll, 3000);
    return () => clearInterval(interval);
  }, [activeConvId, currentUserId, scrollToBottom]);

  // Also try Realtime as a faster channel (best-effort)
  useEffect(() => {
    if (!currentUserId || conversations.length === 0) return;
    const supabase = createClient();
    const convIds = conversations.map((c) => c.id);

    const channel = supabase
      .channel("biz-messages-realtime")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        (payload) => {
          const newMsg = payload.new as Message;
          if (!convIds.includes(newMsg.conversation_id)) return;

          if (newMsg.conversation_id === activeConvId) {
            setMessages((prev) => {
              if (prev.some((m) => m.id === newMsg.id)) return prev;
              // Remove optimistic message if this is the confirmed version
              const withoutOptimistic = prev.filter(
                (m) => !(m.id.startsWith("temp-") && m.content === newMsg.content && m.sender_id === newMsg.sender_id)
              );
              return [...withoutOptimistic, newMsg];
            });
            setTimeout(scrollToBottom, 50);
            if (newMsg.sender_id !== currentUserId) {
              fetch(`/api/conversations/${activeConvId}/read`, { method: "POST" }).catch(() => {});
            }
          }

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

  // Send message — optimistic UI + API
  const handleSend = async () => {
    if (!newMessage.trim() || !activeConvId || !currentUserId || sending) return;
    const content = newMessage.trim();
    const tempId = `temp-${Date.now()}`;
    setNewMessage("");
    setSending(true);

    // Optimistic: show message instantly
    const optimisticMsg: Message = {
      id: tempId,
      conversation_id: activeConvId,
      sender_id: currentUserId,
      content,
      read: false,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimisticMsg]);
    setTimeout(scrollToBottom, 20);

    // Update conversation list instantly
    setConversations((prev) =>
      prev
        .map((c) =>
          c.id === activeConvId
            ? { ...c, lastMessage: content, lastMessageAt: optimisticMsg.created_at }
            : c
        )
        .sort((a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime())
    );

    try {
      const res = await fetch("/api/messages/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversationId: activeConvId, content }),
      });

      if (!res.ok) {
        // Remove optimistic message on failure
        setMessages((prev) => prev.filter((m) => m.id !== tempId));
        setNewMessage(content);
        setSending(false);
        return;
      }

      const data = await res.json();
      // Replace optimistic message with real one from server
      if (data.message) {
        setMessages((prev) => prev.map((m) => (m.id === tempId ? data.message : m)));
      }

      // Trigger email notification (non-blocking)
      fetch("/api/emails/new-message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversationId: activeConvId, senderId: currentUserId, messageContent: content }),
      }).catch(() => {});
    } catch (err) {
      console.error("Failed to send message:", err);
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
      setNewMessage(content);
    }
    setSending(false);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
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
      {/* Left: Conversation List */}
      <div className={`flex w-full flex-col border-r border-accent/30 md:w-80 md:flex-shrink-0 ${mobileShowChat ? "hidden md:flex" : "flex"}`}>
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
                Conversations will appear here when applicants message you.
              </p>
            </div>
          ) : (
            filteredConversations.map((conv) => (
              <button
                key={conv.id}
                onClick={() => { setActiveConvId(conv.id); setMobileShowChat(true); }}
                className={`flex w-full items-center gap-3 border-b border-accent/20 px-4 py-3.5 text-left transition-colors hover:bg-accent/10 ${
                  activeConvId === conv.id ? "bg-secondary/5 border-l-2 border-l-secondary" : ""
                }`}
              >
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                  {conv.otherName.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between">
                    <p className={`truncate text-sm ${conv.unreadCount > 0 ? "font-bold text-primary" : "font-medium text-foreground/80"}`}>
                      {conv.otherName}
                    </p>
                    <span className="flex-shrink-0 text-[10px] text-foreground/40">{formatTime(conv.lastMessageAt)}</span>
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

      {/* Right: Chat View */}
      <div className={`flex flex-1 flex-col ${mobileShowChat ? "flex" : "hidden md:flex"}`}>
        {activeConv ? (
          <>
            <div className="flex items-center gap-3 border-b border-accent/30 px-5 py-3.5">
              <button onClick={() => setMobileShowChat(false)} className="mr-1 rounded-lg p-1.5 text-foreground/40 hover:bg-accent/20 hover:text-foreground md:hidden">
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

            <div className="flex-1 overflow-y-auto px-5 py-4">
              {messages.length === 0 ? (
                <div className="flex h-full items-center justify-center">
                  <p className="text-sm text-foreground/30">No messages yet. Say hello!</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {messages.map((msg, i) => {
                    const isMe = msg.sender_id === currentUserId;
                    const prevMsg = i > 0 ? messages[i - 1] : null;
                    const showDateSep = new Date(msg.created_at).toDateString() !== (prevMsg ? new Date(prevMsg.created_at).toDateString() : null);
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
                          <div className="max-w-[75%]">
                            <div className={`rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${isMe ? "bg-secondary text-white rounded-br-md" : "bg-accent/30 text-foreground rounded-bl-md"}`}>
                              {msg.content}
                            </div>
                            <div className={`mt-1 flex items-center gap-1.5 ${isMe ? "justify-end" : "justify-start"}`}>
                              <span className="text-[10px] text-foreground/30">{formatMessageTime(msg.created_at)}</span>
                              {isMe && <span className="text-[10px] text-foreground/30">{msg.read ? "✓✓" : "✓"}</span>}
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
                  className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary text-white transition-all hover:bg-secondary-light disabled:opacity-40"
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
          portalType="business"
          currentUserId={currentUserId}
          onClose={() => setShowNewConvModal(false)}
          onConversationCreated={async (data: ConversationCreatedData) => {
            setShowNewConvModal(false);
            setLoading(true);
            await loadConversations(data.conversationId);
          }}
        />
      )}
    </div>
  );
}
