"use client";

import { useState, useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";

interface ContactOption {
  userId: string;
  name: string;
  subtitle: string; // job title context
  avatarInitial: string;
}

export interface ConversationCreatedData {
  conversationId: string;
  otherName: string;
  otherUserId: string;
  initialMessage: string | null;
  isNew: boolean;
}

interface NewConversationModalProps {
  portalType: "worker" | "business";
  currentUserId: string;
  onClose: () => void;
  onConversationCreated: (data: ConversationCreatedData) => void;
}

export default function NewConversationModal({
  portalType,
  currentUserId,
  onClose,
  onConversationCreated,
}: NewConversationModalProps) {
  const [contacts, setContacts] = useState<ContactOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<ContactOption | null>(null);
  const [firstMessage, setFirstMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Load eligible contacts
  useEffect(() => {
    (async () => {
      try {
        const supabase = createClient();

        if (portalType === "worker") {
          // Workers see businesses they've applied to
          const { data: wp } = await supabase
            .from("worker_profiles")
            .select("id")
            .eq("user_id", currentUserId)
            .single();

          if (!wp) { setLoading(false); return; }

          const { data: apps } = await supabase
            .from("applications")
            .select("id, job_post_id, job_posts(title, business_id, business_profiles(user_id, business_name, logo_url))")
            .eq("worker_id", wp.id)
            .order("applied_at", { ascending: false });

          if (apps) {
            const options: ContactOption[] = [];
            for (const app of apps) {
              const jp = app.job_posts as unknown as {
                title: string;
                business_profiles: { user_id: string; business_name: string; logo_url: string | null };
              } | null;
              if (!jp?.business_profiles?.user_id) continue;
              options.push({
                userId: jp.business_profiles.user_id,
                name: jp.business_profiles.business_name || "Business",
                subtitle: jp.title || "Job Application",
                avatarInitial: (jp.business_profiles.business_name || "B").charAt(0).toUpperCase(),
              });
            }
            setContacts(options);
          }
        } else {
          // Businesses see applicants who applied to their jobs
          const { data: bp } = await supabase
            .from("business_profiles")
            .select("id")
            .eq("user_id", currentUserId)
            .single();

          if (!bp) { setLoading(false); return; }

          const { data: jobIds } = await supabase
            .from("job_posts")
            .select("id")
            .eq("business_id", bp.id);

          if (jobIds && jobIds.length > 0) {
            const { data: apps } = await supabase
              .from("applications")
              .select("id, job_post_id, worker_id, worker_profiles(user_id, first_name, last_name, avatar_url), job_posts(title)")
              .in("job_post_id", jobIds.map((j) => j.id))
              .order("applied_at", { ascending: false });

            if (apps) {
              const options: ContactOption[] = [];
              for (const app of apps) {
                const wp = app.worker_profiles as unknown as {
                  user_id: string; first_name: string | null; last_name: string | null; avatar_url: string | null;
                } | null;
                const jp = app.job_posts as unknown as { title: string } | null;
                if (!wp?.user_id) continue;
                const name = [wp.first_name, wp.last_name].filter(Boolean).join(" ") || "Applicant";
                options.push({
                  userId: wp.user_id,
                  name,
                  subtitle: jp?.title || "Job Application",
                  avatarInitial: name.charAt(0).toUpperCase(),
                });
              }
              setContacts(options);
            }
          }
        }
      } catch (err) {
        console.error("Failed to load contacts:", err);
      }
      setLoading(false);
    })();
  }, [currentUserId, portalType]);

  // Focus search on mount
  useEffect(() => {
    setTimeout(() => searchInputRef.current?.focus(), 100);
  }, []);

  const filteredContacts = search.trim()
    ? contacts.filter((c) =>
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        c.subtitle.toLowerCase().includes(search.toLowerCase())
      )
    : contacts;

  const handleStartConversation = async () => {
    if (!selected || !firstMessage.trim()) return;
    setSending(true);
    setError("");

    try {
      // Find or create conversation via API (includes first message)
      const convRes = await fetch("/api/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetUserId: selected.userId,
          initialMessage: firstMessage.trim(),
        }),
      });

      if (!convRes.ok) throw new Error("Failed to create conversation");
      const result = await convRes.json();

      setFirstMessage("");
      onConversationCreated({
        conversationId: result.conversationId,
        otherName: result.otherName || selected.name,
        otherUserId: result.otherUserId || selected.userId,
        initialMessage: result.initialMessage || null,
        isNew: result.isNew ?? true,
      });
    } catch (err) {
      console.error("Failed to start conversation:", err);
      setError("Failed to start conversation. Please try again.");
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-md rounded-2xl bg-white shadow-2xl border border-accent/50">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-accent/30 px-5 py-4">
          <h3 className="text-lg font-bold text-primary">New Conversation</h3>
          <button onClick={onClose} className="rounded-lg p-1.5 text-foreground/40 hover:bg-accent/30 hover:text-foreground/70">
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-5 space-y-4">
          {!selected ? (
            <>
              {/* Search / Select contact */}
              <div>
                <label className="block text-sm font-medium text-foreground/70 mb-1.5">
                  {portalType === "worker" ? "Select Employer" : "Select Applicant"}
                </label>
                <div className="relative">
                  <svg className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <input
                    ref={searchInputRef}
                    type="text"
                    placeholder={portalType === "worker" ? "Search employers..." : "Search applicants..."}
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full rounded-lg border border-accent/40 bg-accent/10 py-2.5 pl-9 pr-3 text-sm text-primary placeholder:text-foreground/40 focus:border-secondary focus:outline-none focus:ring-1 focus:ring-secondary/30"
                  />
                </div>
              </div>

              {/* Contact list */}
              <div className="max-h-60 overflow-y-auto rounded-lg border border-accent/30">
                {loading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="h-6 w-6 animate-spin rounded-full border-2 border-accent border-t-secondary" />
                  </div>
                ) : filteredContacts.length === 0 ? (
                  <div className="px-4 py-8 text-center">
                    <p className="text-sm text-foreground/50">
                      {search ? "No matches found" : portalType === "worker" ? "No employers to message yet. Apply to jobs first!" : "No applicants to message yet."}
                    </p>
                  </div>
                ) : (
                  filteredContacts.map((contact, i) => (
                    <button
                      key={`${contact.userId}-${i}`}
                      onClick={() => setSelected(contact)}
                      className="flex w-full items-center gap-3 border-b border-accent/20 px-4 py-3 text-left transition-colors hover:bg-accent/10 last:border-b-0"
                    >
                      <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                        {contact.avatarInitial}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-primary">{contact.name}</p>
                        <p className="truncate text-xs text-foreground/40">{contact.subtitle}</p>
                      </div>
                      <svg className="h-4 w-4 flex-shrink-0 text-foreground/20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                      </svg>
                    </button>
                  ))
                )}
              </div>
            </>
          ) : (
            <>
              {/* Selected contact */}
              <div className="flex items-center gap-3 rounded-lg bg-accent/10 px-4 py-3">
                <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                  {selected.avatarInitial}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-primary">{selected.name}</p>
                  <p className="truncate text-xs text-foreground/40">{selected.subtitle}</p>
                </div>
                <button
                  onClick={() => { setSelected(null); setFirstMessage(""); }}
                  className="rounded p-1 text-foreground/30 hover:text-foreground/60"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* First message */}
              <div>
                <label className="block text-sm font-medium text-foreground/70 mb-1.5">
                  Message
                </label>
                <textarea
                  value={firstMessage}
                  onChange={(e) => setFirstMessage(e.target.value)}
                  placeholder="Write your first message..."
                  rows={3}
                  className="w-full rounded-lg border border-accent/40 bg-white px-4 py-3 text-sm text-primary placeholder:text-foreground/40 focus:border-secondary focus:outline-none focus:ring-1 focus:ring-secondary/30 resize-none"
                  autoFocus
                />
              </div>

              {error && (
                <p className="text-xs text-red-500">{error}</p>
              )}

              {/* Buttons */}
              <div className="flex gap-3">
                <button
                  onClick={() => { setSelected(null); setFirstMessage(""); setError(""); }}
                  className="flex-1 rounded-lg border border-accent/40 py-2.5 text-sm font-semibold text-foreground/60 transition-colors hover:bg-accent/20"
                >
                  Back
                </button>
                <button
                  onClick={handleStartConversation}
                  disabled={!firstMessage.trim() || sending}
                  className="flex-1 rounded-lg bg-secondary py-2.5 text-sm font-semibold text-white transition-all hover:bg-secondary-light disabled:opacity-50"
                >
                  {sending ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                      Sending...
                    </span>
                  ) : (
                    "Start Conversation"
                  )}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
