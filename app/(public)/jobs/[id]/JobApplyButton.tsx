"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function JobApplyButton({ jobId }: { jobId: string }) {
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
        <p className="mt-1 text-xs text-green-600">You'll be notified when the employer responds.</p>
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
