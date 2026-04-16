"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import InterviewStatusBadge from "@/components/ui/InterviewStatusBadge";
import VideoRoom from "@/components/ui/VideoRoom";

interface Interview {
  id: string;
  status: string;
  scheduled_date: string | null;
  scheduled_start_time: string | null;
  scheduled_end_time: string | null;
  timezone: string | null;
  video_room_url: string | null;
  business_notes: string | null;
  invited_at: string | null;
  scheduled_at: string | null;
  completed_at: string | null;
  cancelled_at: string | null;
  job_title: string;
  worker_name: string;
  worker_location: string;
  worker_skills: string[];
  worker_avatar_url: string | null;
}

export default function BusinessInterviewDetailPage() {
  const params = useParams();
  const router = useRouter();
  const interviewId = params.id as string;

  const [interview, setInterview] = useState<Interview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [canJoin, setCanJoin] = useState(false);
  const [timeMessage, setTimeMessage] = useState("");

  useEffect(() => {
    async function load() {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { setError("Please log in."); setLoading(false); return; }

        const { data: bp } = await supabase
          .from("business_profiles")
          .select("id")
          .eq("user_id", user.id)
          .single();

        if (!bp) { setError("Business profile not found."); setLoading(false); return; }

        const { data: iv, error: ivErr } = await supabase
          .from("interviews")
          .select(`
            id, status, scheduled_date, scheduled_start_time, scheduled_end_time,
            timezone, video_room_url, business_notes,
            invited_at, scheduled_at, completed_at, cancelled_at,
            applications(
              job_posts(title),
              worker_profiles(full_name, location, skills, avatar_url)
            )
          `)
          .eq("id", interviewId)
          .eq("business_id", bp.id)
          .single();

        if (ivErr || !iv) { setError("Interview not found or you don't have access."); setLoading(false); return; }

        const app = iv.applications as unknown as Record<string, unknown> | null;
        const jp = app?.job_posts as unknown as { title: string } | null;
        const wp = app?.worker_profiles as unknown as {
          full_name: string;
          location: string | null;
          skills: string[] | null;
          avatar_url: string | null;
        } | null;

        setInterview({
          id: iv.id,
          status: iv.status,
          scheduled_date: iv.scheduled_date,
          scheduled_start_time: iv.scheduled_start_time?.slice(0, 5) || null,
          scheduled_end_time: iv.scheduled_end_time?.slice(0, 5) || null,
          timezone: iv.timezone,
          video_room_url: iv.video_room_url,
          business_notes: iv.business_notes,
          invited_at: iv.invited_at,
          scheduled_at: iv.scheduled_at,
          completed_at: iv.completed_at,
          cancelled_at: iv.cancelled_at,
          job_title: jp?.title || "Unknown Position",
          worker_name: wp?.full_name || "Unknown Applicant",
          worker_location: wp?.location || "",
          worker_skills: wp?.skills || [],
          worker_avatar_url: wp?.avatar_url || null,
        });
      } catch {
        setError("Failed to load interview details.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [interviewId]);

  // Time-gate: check if user can join (10 min before through 30 min after end)
  useEffect(() => {
    if (!interview || interview.status !== "scheduled" || !interview.scheduled_date || !interview.scheduled_start_time || !interview.scheduled_end_time) {
      setCanJoin(false);
      return;
    }

    function checkTime() {
      const now = new Date();
      const startStr = `${interview!.scheduled_date}T${interview!.scheduled_start_time}:00`;
      const endStr = `${interview!.scheduled_date}T${interview!.scheduled_end_time}:00`;
      const start = new Date(startStr);
      const end = new Date(endStr);

      const joinWindowStart = new Date(start.getTime() - 10 * 60 * 1000);
      const joinWindowEnd = new Date(end.getTime() + 30 * 60 * 1000);

      if (now >= joinWindowStart && now <= joinWindowEnd) {
        setCanJoin(true);
        setTimeMessage("");
      } else if (now < joinWindowStart) {
        const diffMs = joinWindowStart.getTime() - now.getTime();
        const diffMins = Math.ceil(diffMs / 60000);
        if (diffMins <= 60) {
          setTimeMessage(`You can join in ${diffMins} minute${diffMins === 1 ? "" : "s"}`);
        } else {
          const diffHours = Math.floor(diffMins / 60);
          setTimeMessage(`You can join in ${diffHours} hour${diffHours === 1 ? "" : "s"} ${diffMins % 60} min`);
        }
        setCanJoin(false);
      } else {
        setTimeMessage("This interview time has passed");
        setCanJoin(false);
      }
    }

    checkTime();
    const interval = setInterval(checkTime, 30000);
    return () => clearInterval(interval);
  }, [interview]);

  const handleAction = async (action: "cancel" | "complete") => {
    if (!interview) return;
    setActionLoading(action);

    try {
      if (action === "cancel") {
        const res = await fetch("/api/interviews/cancel", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ interview_id: interview.id }),
        });
        if (res.ok) {
          setInterview({ ...interview, status: "cancelled", cancelled_at: new Date().toISOString() });
        }
      } else if (action === "complete") {
        const supabase = createClient();
        await supabase
          .from("interviews")
          .update({ status: "completed", completed_at: new Date().toISOString() })
          .eq("id", interview.id);
        setInterview({ ...interview, status: "completed", completed_at: new Date().toISOString() });
      }
    } catch {
      // silent fail
    } finally {
      setActionLoading(null);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr + "T00:00:00");
    return date.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });
  };

  const formatTime12 = (time: string) => {
    const [h, m] = time.split(":");
    const hour = parseInt(h);
    const ampm = hour >= 12 ? "PM" : "AM";
    return `${hour % 12 || 12}:${m} ${ampm}`;
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-primary" />
      </div>
    );
  }

  if (error || !interview) {
    return (
      <div className="mx-auto max-w-3xl pt-8">
        <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center">
          <p className="text-sm text-red-700">{error || "Interview not found."}</p>
          <Link href="/business/interviews" className="mt-4 inline-block text-sm font-medium text-primary hover:underline">
            Back to Interviews
          </Link>
        </div>
      </div>
    );
  }

  const initials = interview.worker_name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const isUpcoming = interview.status === "scheduled";

  return (
    <div className="mx-auto max-w-3xl">
      <Link
        href="/business/interviews"
        className="mb-4 inline-flex items-center gap-1 text-sm text-foreground/50 hover:text-foreground"
      >
        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Back to Interviews
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-primary">{interview.job_title}</h1>
            <InterviewStatusBadge status={interview.status} />
          </div>
        </div>
      </div>

      {/* Applicant info */}
      <div className="mt-6 rounded-xl border border-accent bg-white p-5">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-foreground/50">
          Applicant
        </h2>
        <div className="mt-3 flex items-center gap-4">
          {interview.worker_avatar_url ? (
            <img
              src={interview.worker_avatar_url}
              alt={interview.worker_name}
              className="h-12 w-12 rounded-full border border-accent object-cover"
            />
          ) : (
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-secondary/20 text-sm font-bold text-primary">
              {initials}
            </div>
          )}
          <div>
            <p className="font-semibold text-primary">{interview.worker_name}</p>
            {interview.worker_location && (
              <p className="text-sm text-foreground/60">{interview.worker_location}</p>
            )}
          </div>
        </div>
        {interview.worker_skills.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {interview.worker_skills.map((skill) => (
              <span
                key={skill}
                className="inline-flex rounded-full bg-accent/30 px-2.5 py-0.5 text-xs text-foreground/70"
              >
                {skill}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Schedule details */}
      {interview.scheduled_date && (
        <div className="mt-4 rounded-xl border border-accent bg-white p-5">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-foreground/50">
            Schedule
          </h2>
          <div className="mt-3 space-y-2">
            <div className="flex items-center gap-3">
              <svg className="h-5 w-5 text-foreground/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span className="text-primary font-medium">{formatDate(interview.scheduled_date)}</span>
            </div>
            {interview.scheduled_start_time && interview.scheduled_end_time && (
              <div className="flex items-center gap-3">
                <svg className="h-5 w-5 text-foreground/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-primary font-medium">
                  {formatTime12(interview.scheduled_start_time)} – {formatTime12(interview.scheduled_end_time)}
                </span>
              </div>
            )}
            {interview.timezone && (
              <div className="flex items-center gap-3">
                <svg className="h-5 w-5 text-foreground/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-foreground/60 text-sm">{interview.timezone.replace(/_/g, " ")}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Video Interview Section */}
      {isUpcoming && (
        <div className="mt-6">
          {canJoin ? (
            <VideoRoom
              interviewId={interview.id}
              roomUrl={interview.video_room_url || undefined}
            />
          ) : (
            <div className="rounded-xl border border-accent bg-white p-8 text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-secondary/10">
                <svg className="h-8 w-8 text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-primary">Video Interview</h3>
              <p className="mt-2 text-sm text-foreground/60">
                The video call will be available 10 minutes before the scheduled time.
              </p>
              {timeMessage && (
                <p className="mt-3 rounded-lg bg-amber-50 border border-amber-200 px-4 py-2 text-sm font-medium text-amber-700 inline-block">
                  {timeMessage}
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Actions */}
      {isUpcoming && (
        <div className="mt-6 flex gap-3">
          <button
            onClick={() => handleAction("cancel")}
            disabled={actionLoading !== null}
            className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-100 disabled:opacity-50"
          >
            {actionLoading === "cancel" ? "Cancelling..." : "Cancel Interview"}
          </button>
          <button
            onClick={() => handleAction("complete")}
            disabled={actionLoading !== null}
            className="rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-green-700 disabled:opacity-50"
          >
            {actionLoading === "complete" ? "Completing..." : "Mark as Completed"}
          </button>
        </div>
      )}

      {/* Timeline */}
      <div className="mt-8">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-foreground/50">
          Timeline
        </h2>
        <div className="space-y-3">
          {interview.completed_at && (
            <div className="flex items-center gap-3 text-sm">
              <div className="h-2 w-2 rounded-full bg-green-500" />
              <span className="text-foreground/60">
                Interview completed — {new Date(interview.completed_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
              </span>
            </div>
          )}
          {interview.cancelled_at && (
            <div className="flex items-center gap-3 text-sm">
              <div className="h-2 w-2 rounded-full bg-red-500" />
              <span className="text-foreground/60">
                Interview cancelled — {new Date(interview.cancelled_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
              </span>
            </div>
          )}
          {interview.scheduled_at && (
            <div className="flex items-center gap-3 text-sm">
              <div className="h-2 w-2 rounded-full bg-blue-500" />
              <span className="text-foreground/60">
                Interview booked — {new Date(interview.scheduled_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
              </span>
            </div>
          )}
          {interview.invited_at && (
            <div className="flex items-center gap-3 text-sm">
              <div className="h-2 w-2 rounded-full bg-yellow-500" />
              <span className="text-foreground/60">
                Invitation sent — {new Date(interview.invited_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
