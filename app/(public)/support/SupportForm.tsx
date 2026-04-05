"use client";

import { useState } from "react";
import Link from "next/link";

const CATEGORIES = [
  { value: "bug", label: "Bug Report", icon: "🐛", description: "Something isn't working as expected" },
  { value: "feature_request", label: "Feature Request", icon: "✨", description: "Suggest an improvement or new feature" },
  { value: "content_issue", label: "Content Issue", icon: "🚩", description: "Report incorrect or inappropriate content" },
  { value: "account_issue", label: "Account Issue", icon: "🔒", description: "Problem with your account or login" },
  { value: "other", label: "Other", icon: "💬", description: "General feedback or questions" },
];

interface SupportFormProps {
  userName: string;
  userEmail: string;
}

export default function SupportForm({ userName, userEmail }: SupportFormProps) {
  const [category, setCategory] = useState("bug");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("loading");
    setErrorMsg("");

    try {
      const res = await fetch("/api/support/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category,
          subject,
          message,
          page_url: window.location.href,
        }),
      });

      if (res.ok) {
        setStatus("success");
      } else {
        const data = await res.json();
        setErrorMsg(data.error || "Something went wrong. Please try again.");
        setStatus("error");
      }
    } catch {
      setErrorMsg("Network error. Please try again.");
      setStatus("error");
    }
  };

  if (status === "success") {
    return (
      <div className="mt-10 rounded-2xl border border-accent bg-white p-10 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-50">
          <svg className="h-8 w-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="text-xl font-bold text-primary">Report Submitted</h2>
        <p className="mt-2 text-foreground/60">
          Thank you for your feedback. Our team will review your report within 48 hours.
        </p>
        <p className="mt-1 text-sm text-foreground/40">
          A confirmation email has been sent to {userEmail}.
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <button
            onClick={() => {
              setStatus("idle");
              setCategory("bug");
              setSubject("");
              setMessage("");
            }}
            className="rounded-lg border border-accent px-5 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-accent/20"
          >
            Submit Another
          </button>
          <Link
            href="/dashboard"
            className="rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-primary/90"
          >
            Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="mt-8 space-y-6">
      {/* Submitting as */}
      <div className="rounded-xl border border-accent bg-accent/10 px-5 py-4">
        <p className="text-xs font-semibold uppercase tracking-wider text-foreground/40">
          Submitting as
        </p>
        <p className="mt-1 text-sm font-medium text-primary">
          {userName} ({userEmail})
        </p>
      </div>

      {/* Category */}
      <div>
        <label className="mb-2 block text-sm font-semibold text-primary">
          What can we help with?
        </label>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {CATEGORIES.map((c) => (
            <button
              key={c.value}
              type="button"
              onClick={() => setCategory(c.value)}
              className={`rounded-xl border p-4 text-left transition-all ${
                category === c.value
                  ? "border-secondary bg-secondary/5 shadow-sm"
                  : "border-accent bg-white hover:border-secondary/50"
              }`}
            >
              <span className="text-lg">{c.icon}</span>
              <p className="mt-1 text-sm font-semibold text-primary">{c.label}</p>
              <p className="mt-0.5 text-xs text-foreground/50">{c.description}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Subject */}
      <div>
        <label htmlFor="subject" className="mb-2 block text-sm font-semibold text-primary">
          Subject
        </label>
        <input
          id="subject"
          type="text"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          placeholder="Brief description of your issue or feedback..."
          required
          minLength={3}
          maxLength={200}
          className="w-full rounded-xl border border-accent px-4 py-3 text-sm text-primary placeholder:text-foreground/30 focus:border-secondary focus:outline-none"
        />
      </div>

      {/* Message */}
      <div>
        <label htmlFor="message" className="mb-2 block text-sm font-semibold text-primary">
          Details
        </label>
        <textarea
          id="message"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Please provide as much detail as possible. If it's a bug, include what you expected to happen and what actually happened."
          required
          minLength={10}
          maxLength={5000}
          rows={6}
          className="w-full resize-none rounded-xl border border-accent px-4 py-3 text-sm text-primary placeholder:text-foreground/30 focus:border-secondary focus:outline-none"
        />
        <p className="mt-1 text-right text-xs text-foreground/30">{message.length}/5000</p>
      </div>

      {/* Info box */}
      <div className="rounded-xl border-l-4 border-highlight bg-highlight/5 px-5 py-4">
        <p className="text-sm font-semibold text-primary">What happens next?</p>
        <ul className="mt-2 space-y-1 text-sm text-foreground/60">
          <li>✅ Our team reviews all reports within 48 hours</li>
          <li>🔍 We&apos;ll investigate and take appropriate action</li>
          <li>📩 You&apos;ll receive a confirmation email</li>
        </ul>
      </div>

      {/* Error */}
      {status === "error" && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-5 py-3">
          <p className="text-sm text-red-600">{errorMsg}</p>
        </div>
      )}

      {/* Submit */}
      <button
        type="submit"
        disabled={status === "loading"}
        className="w-full rounded-xl bg-primary py-3.5 text-sm font-bold text-white transition-colors hover:bg-primary/90 disabled:opacity-50"
      >
        {status === "loading" ? "Submitting..." : "Submit Report"}
      </button>
    </form>
  );
}
