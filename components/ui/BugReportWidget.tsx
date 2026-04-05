"use client";

import { useState, useEffect } from "react";

const CATEGORIES = [
  { value: "bug", label: "Bug Report", icon: "🐛" },
  { value: "feature_request", label: "Feature Request", icon: "✨" },
  { value: "content_issue", label: "Content Issue", icon: "🚩" },
  { value: "account_issue", label: "Account Issue", icon: "🔒" },
  { value: "other", label: "Other", icon: "💬" },
];

export default function BugReportWidget() {
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState("bug");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [currentUrl, setCurrentUrl] = useState("");

  useEffect(() => {
    if (open) setCurrentUrl(window.location.href);
  }, [open]);

  useEffect(() => {
    if (status === "success") {
      const t = setTimeout(() => {
        setOpen(false);
        setStatus("idle");
        setCategory("bug");
        setSubject("");
        setMessage("");
      }, 3000);
      return () => clearTimeout(t);
    }
  }, [status]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("loading");
    setErrorMsg("");

    try {
      const res = await fetch("/api/support/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category, subject, message, page_url: currentUrl }),
      });

      if (res.ok) {
        setStatus("success");
      } else {
        const data = await res.json();
        setErrorMsg(data.error || "Something went wrong");
        setStatus("error");
      }
    } catch {
      setErrorMsg("Network error. Please try again.");
      setStatus("error");
    }
  };

  return (
    <>
      {/* Trigger button */}
      <button
        onClick={() => setOpen(!open)}
        className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-full bg-secondary px-4 py-2.5 text-sm font-medium text-white shadow-lg transition-all hover:bg-secondary/90 hover:shadow-xl active:scale-95"
        aria-label="Send feedback"
      >
        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
        Feedback
      </button>

      {/* Modal overlay */}
      {open && (
        <>
          <div
            className="fixed inset-0 z-50 bg-black/20 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />
          <div className="fixed bottom-20 right-6 z-50 w-[340px] rounded-2xl border border-accent bg-white shadow-2xl sm:w-[380px]">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-accent px-5 py-4">
              <h3 className="text-base font-bold text-primary">Send Feedback</h3>
              <button
                onClick={() => setOpen(false)}
                className="rounded-lg p-1 text-foreground/40 hover:bg-accent/20 hover:text-foreground"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {status === "success" ? (
              <div className="p-8 text-center">
                <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-green-50">
                  <svg className="h-7 w-7 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <p className="font-semibold text-primary">Thank you!</p>
                <p className="mt-1 text-sm text-foreground/60">
                  We&apos;ll review your report within 48 hours.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="p-5">
                {/* Category */}
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-foreground/40">
                  Category
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="mb-4 w-full rounded-lg border border-accent bg-white px-3 py-2 text-sm text-primary focus:border-secondary focus:outline-none"
                >
                  {CATEGORIES.map((c) => (
                    <option key={c.value} value={c.value}>
                      {c.icon} {c.label}
                    </option>
                  ))}
                </select>

                {/* Subject */}
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-foreground/40">
                  Subject
                </label>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Brief description..."
                  required
                  minLength={3}
                  maxLength={200}
                  className="mb-4 w-full rounded-lg border border-accent px-3 py-2 text-sm text-primary placeholder:text-foreground/30 focus:border-secondary focus:outline-none"
                />

                {/* Message */}
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-foreground/40">
                  Details
                </label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Tell us more about the issue..."
                  required
                  minLength={10}
                  maxLength={5000}
                  rows={4}
                  className="mb-1 w-full resize-none rounded-lg border border-accent px-3 py-2 text-sm text-primary placeholder:text-foreground/30 focus:border-secondary focus:outline-none"
                />
                <p className="mb-4 text-right text-xs text-foreground/30">
                  {message.length}/5000
                </p>

                {/* Page URL indicator */}
                <p className="mb-4 truncate text-xs text-foreground/30">
                  📍 {currentUrl}
                </p>

                {/* Error */}
                {status === "error" && (
                  <p className="mb-3 text-sm text-red-500">{errorMsg}</p>
                )}

                {/* Submit */}
                <button
                  type="submit"
                  disabled={status === "loading"}
                  className="w-full rounded-lg bg-primary py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary/90 disabled:opacity-50"
                >
                  {status === "loading" ? "Submitting..." : "Submit Report"}
                </button>
              </form>
            )}
          </div>
        </>
      )}
    </>
  );
}
