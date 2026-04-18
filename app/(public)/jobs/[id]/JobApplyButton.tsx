"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

interface JobApplyButtonProps {
  jobId: string;
  /** True when the business hasn't claimed the listing yet. Switches the
   *  button from the normal auth-required apply flow to an anonymous
   *  "express interest" flow. */
  isUnclaimed?: boolean;
  jobTitle?: string;
  businessName?: string;
}

export default function JobApplyButton({
  jobId,
  isUnclaimed = false,
  jobTitle,
  businessName,
}: JobApplyButtonProps) {
  if (isUnclaimed) {
    return (
      <ExpressInterestButton jobId={jobId} jobTitle={jobTitle} businessName={businessName} />
    );
  }
  return <RegularApplyButton jobId={jobId} />;
}

/* ───────────────────────────────────────────────────────────── */
/*  Express Interest (anonymous, for unclaimed listings)         */
/* ───────────────────────────────────────────────────────────── */

function ExpressInterestButton({
  jobId,
  jobTitle,
  businessName,
}: {
  jobId: string;
  jobTitle?: string;
  businessName?: string;
}) {
  const [showForm, setShowForm] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({ name: "", email: "", phone: "", message: "" });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch(`/api/jobs/${jobId}/express-interest`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.error || "Could not submit. Try again.");
        setSubmitting(false);
        return;
      }
      setSubmitted(true);
    } catch {
      setError("Could not submit. Try again.");
    }
    setSubmitting(false);
  };

  if (submitted) {
    return (
      <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-4 text-center">
        <svg className="mx-auto h-6 w-6 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <p className="mt-2 text-sm font-semibold text-green-700">Interest submitted</p>
        <p className="mt-1 text-xs text-green-600 leading-relaxed">
          {businessName ? `${businessName} hasn't joined Mountain Connects yet.` : "This business hasn't joined yet."} We&apos;ll pass your details on as soon as they claim this listing.
        </p>
      </div>
    );
  }

  if (showForm) {
    return (
      <form onSubmit={handleSubmit} className="space-y-3">
        <p className="text-xs text-foreground/60 leading-relaxed">
          This listing hasn&apos;t been claimed by the business yet. Leave your details and we&apos;ll pass them on once they join.
        </p>
        <input
          required
          type="text"
          value={form.name}
          onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
          placeholder="Your name *"
          disabled={submitting}
          className="w-full rounded-xl border border-accent bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-foreground/40 focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-50"
        />
        <input
          required
          type="email"
          value={form.email}
          onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
          placeholder="Email *"
          disabled={submitting}
          className="w-full rounded-xl border border-accent bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-foreground/40 focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-50"
        />
        <input
          type="tel"
          value={form.phone}
          onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
          placeholder="Phone (optional)"
          disabled={submitting}
          className="w-full rounded-xl border border-accent bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-foreground/40 focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-50"
        />
        <textarea
          value={form.message}
          onChange={(e) => setForm((p) => ({ ...p, message: e.target.value }))}
          placeholder={jobTitle ? `Why are you a good fit for the ${jobTitle} role?` : "Brief message (optional)"}
          rows={4}
          disabled={submitting}
          className="w-full rounded-xl border border-accent bg-background p-3 text-sm text-foreground placeholder:text-foreground/40 focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-50"
        />
        {error && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">{error}</p>
        )}
        <button
          type="submit"
          disabled={submitting || !form.name.trim() || !form.email.trim()}
          className="w-full rounded-xl bg-primary py-3 text-sm font-semibold text-white transition-all hover:bg-primary/90 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-primary/20 disabled:opacity-50"
        >
          {submitting ? "Submitting..." : "Submit interest"}
        </button>
        <button
          type="button"
          onClick={() => {
            setShowForm(false);
            setError("");
          }}
          disabled={submitting}
          className="w-full rounded-xl border border-accent py-2.5 text-sm font-medium text-foreground/60 hover:bg-accent/20 transition-colors disabled:opacity-50"
        >
          Cancel
        </button>
      </form>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setShowForm(true)}
      className="w-full rounded-xl bg-primary py-3.5 text-sm font-semibold text-white transition-all hover:bg-primary/90 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-primary/20"
    >
      Express Interest
    </button>
  );
}

/* ───────────────────────────────────────────────────────────── */
/*  Regular Apply (auth-required, for claimed listings)          */
/* ───────────────────────────────────────────────────────────── */

function RegularApplyButton({ jobId }: { jobId: string }) {
  const [applying, setApplying] = useState(false);
  const [applied, setApplied] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [coverLetter, setCoverLetter] = useState("");
  const [error, setError] = useState("");

  const handleApply = async () => {
    setApplying(true);
    setError("");
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        window.location.href = `/login?redirect=/jobs/${jobId}`;
        return;
      }

      const { data: wp } = await supabase
        .from("worker_profiles")
        .select("id")
        .eq("user_id", user.id)
        .single();

      if (!wp) {
        setError("You need a worker profile to apply. Complete your profile first.");
        setApplying(false);
        return;
      }

      const { error: insertError } = await supabase.from("applications").insert({
        job_post_id: jobId,
        worker_id: wp.id,
        cover_letter: coverLetter || null,
      });

      if (insertError) {
        if (insertError.code === "23505") {
          setError("You have already applied to this job.");
        } else {
          setError(insertError.message);
        }
      } else {
        setApplied(true);
        setShowForm(false);

        // Send email notifications (non-blocking)
        fetch("/api/emails/application-submitted", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ jobId, workerId: wp.id }),
        }).catch((err) => console.error("Failed to trigger application emails:", err));
      }
    } catch {
      setError("Something went wrong. Please try again.");
    }
    setApplying(false);
  };

  if (applied) {
    return (
      <div className="rounded-xl bg-green-50 border border-green-200 px-4 py-4 text-center">
        <svg className="mx-auto h-6 w-6 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <p className="mt-2 text-sm font-semibold text-green-700">Application Submitted!</p>
        <p className="mt-1 text-xs text-green-600">You&apos;ll be notified when the employer responds.</p>
      </div>
    );
  }

  if (showForm) {
    return (
      <div className="space-y-3">
        <textarea
          value={coverLetter}
          onChange={(e) => setCoverLetter(e.target.value)}
          placeholder="Add a cover letter (optional)..."
          rows={5}
          className="w-full rounded-xl border border-accent bg-background p-3 text-sm text-foreground placeholder:text-foreground/40 focus:outline-none focus:ring-2 focus:ring-primary/20"
        />
        {error && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">{error}</p>
        )}
        <button
          onClick={handleApply}
          disabled={applying}
          className="w-full rounded-xl bg-primary py-3 text-sm font-semibold text-white transition-all hover:bg-primary/90 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-primary/20 disabled:opacity-50"
        >
          {applying ? (
            <span className="flex items-center justify-center gap-2">
              <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
              Submitting...
            </span>
          ) : (
            "Submit Application"
          )}
        </button>
        <button
          onClick={() => {
            setShowForm(false);
            setError("");
          }}
          className="w-full rounded-xl border border-accent py-2.5 text-sm font-medium text-foreground/60 hover:bg-accent/20 transition-colors"
        >
          Cancel
        </button>
      </div>
    );
  }

  return (
    <>
      {error && (
        <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">{error}</p>
      )}
      <button
        type="button"
        onClick={() => setShowForm(true)}
        className="w-full rounded-xl bg-primary py-3.5 text-sm font-semibold text-white transition-all hover:bg-primary/90 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-primary/20"
      >
        Apply Now
      </button>
    </>
  );
}
