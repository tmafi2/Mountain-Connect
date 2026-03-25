"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

interface SavedJob {
  id: string;
  job_post_id: string;
  title: string;
  business_name: string;
  resort_name: string;
  resort_country: string;
  salary_range: string;
  position_type: string;
  saved_at: string;
}

export default function SavedJobsPage() {
  const [savedJobs, setSavedJobs] = useState<SavedJob[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { setLoading(false); return; }

        const { data } = await supabase
          .from("saved_jobs")
          .select("id, job_post_id, created_at, job_posts(title, salary_range, position_type, business_profiles(business_name), resorts(name, country))")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false });

        if (data && data.length > 0) {
          const mapped: SavedJob[] = data.map((s: Record<string, unknown>) => {
            const jp = s.job_posts as Record<string, unknown> | null;
            const bp = jp?.business_profiles as { business_name: string } | null;
            const resort = jp?.resorts as { name: string; country: string } | null;
            return {
              id: s.id as string,
              job_post_id: s.job_post_id as string,
              title: (jp?.title as string) || "Unknown Job",
              business_name: bp?.business_name || "Unknown Business",
              resort_name: resort?.name || "",
              resort_country: resort?.country || "",
              salary_range: (jp?.salary_range as string) || "",
              position_type: (jp?.position_type as string) || "full_time",
              saved_at: s.created_at as string,
            };
          });
          setSavedJobs(mapped);
        }
      } catch {
        // No saved jobs
      }
      setLoading(false);
    })();
  }, []);

  const handleUnsave = async (savedJobId: string) => {
    setSavedJobs((prev) => prev.filter((j) => j.id !== savedJobId));
    const supabase = createClient();
    await supabase.from("saved_jobs").delete().eq("id", savedJobId);
  };

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary/20 border-t-primary" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="text-2xl font-bold text-primary">Saved Jobs</h1>
      <p className="mt-1 text-sm text-foreground/60">
        Jobs you&apos;ve bookmarked for later.
      </p>

      {savedJobs.length === 0 ? (
        <div className="mt-8 rounded-xl border border-accent bg-white p-10 text-center">
          <svg
            className="mx-auto h-12 w-12 text-foreground/20"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"
            />
          </svg>
          <h2 className="mt-4 text-lg font-semibold text-primary">
            No saved jobs
          </h2>
          <p className="mt-2 text-sm text-foreground/60">
            Bookmark jobs while browsing to save them here for easy access.
          </p>
          <Link
            href="/jobs"
            className="mt-4 inline-block rounded-lg bg-primary px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary/90"
          >
            Browse Jobs
          </Link>
        </div>
      ) : (
        <div className="mt-6 space-y-3">
          {savedJobs.map((job) => (
            <div
              key={job.id}
              className="flex items-center justify-between rounded-xl border border-accent bg-white p-5 transition-colors hover:border-secondary/50"
            >
              <div className="min-w-0 flex-1">
                <Link href={`/jobs?job=${job.job_post_id}`} className="text-sm font-semibold text-primary hover:underline">
                  {job.title}
                </Link>
                <p className="mt-1 text-sm text-foreground/60">
                  {job.business_name} · {job.resort_name}{job.resort_country ? `, ${job.resort_country}` : ""}
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {job.salary_range && (
                    <span className="inline-flex rounded-full bg-accent/30 px-2.5 py-0.5 text-xs font-medium text-foreground/60">
                      {job.salary_range}
                    </span>
                  )}
                  <span className="inline-flex rounded-full bg-accent/30 px-2.5 py-0.5 text-xs font-medium text-foreground/60">
                    {job.position_type === "full_time" ? "Full-Time" : job.position_type === "part_time" ? "Part-Time" : "Casual"}
                  </span>
                </div>
              </div>
              <button
                onClick={() => handleUnsave(job.id)}
                className="ml-4 shrink-0 rounded-lg border border-accent p-2 text-foreground/40 transition-colors hover:bg-red-50 hover:text-red-500"
                title="Remove bookmark"
              >
                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
