"use client";

import { useState, useEffect, useCallback } from "react";
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
  worker_profile_id: string | null;
  worker_cv_url: string | null;
  worker_years_experience: number | null;
  worker_languages: string[];
  worker_nationality: string | null;
  worker_second_nationality: string | null;
  worker_bio: string | null;
  worker_phone: string | null;
  cover_letter: string | null;
  is_instant: boolean;
  room_expires_at: string | null;
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
            timezone, video_room_url, business_notes, is_instant, room_expires_at,
            invited_at, scheduled_at, completed_at, cancelled_at,
            applications(
              cover_letter,
              job_posts(title),
              worker_profiles(
                id, first_name, last_name, location_current, skills, profile_photo_url,
                cv_url, years_seasonal_experience, languages, nationality, second_nationality,
                bio, phone
              )
            )
          `)
          .eq("id", interviewId)
          .eq("business_id", bp.id)
          .single();

        if (ivErr || !iv) { setError("Interview not found or you don't have access."); setLoading(false); return; }

        const app = iv.applications as unknown as Record<string, unknown> | null;
        const jp = app?.job_posts as unknown as { title: string } | null;
        const wp = app?.worker_profiles as unknown as {
          id: string | null;
          first_name: string | null;
          last_name: string | null;
          location_current: string | null;
          skills: string[] | null;
          profile_photo_url: string | null;
          cv_url: string | null;
          years_seasonal_experience: number | null;
          languages: unknown;
          nationality: string | null;
          second_nationality: string | null;
          bio: string | null;
          phone: string | null;
        } | null;

        const workerName = [wp?.first_name, wp?.last_name].filter(Boolean).join(" ") || "Unknown Applicant";

        // languages may come back as string[] or [{language: string}] depending on schema
        const langArr: string[] = Array.isArray(wp?.languages)
          ? (wp!.languages as unknown[]).map((l) => typeof l === "string" ? l : (l as { language?: string })?.language || "").filter(Boolean)
          : [];

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
          worker_name: workerName,
          worker_location: wp?.location_current || "",
          worker_skills: wp?.skills || [],
          worker_avatar_url: wp?.profile_photo_url || null,
          worker_profile_id: wp?.id || null,
          worker_cv_url: wp?.cv_url || null,
          worker_years_experience: wp?.years_seasonal_experience ?? null,
          worker_languages: langArr,
          worker_nationality: wp?.nationality || null,
          worker_second_nationality: wp?.second_nationality || null,
          worker_bio: wp?.bio || null,
          worker_phone: wp?.phone || null,
          cover_letter: (app?.cover_letter as string) || null,
          is_instant: iv.is_instant || false,
          room_expires_at: iv.room_expires_at || null,
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
    if (!interview || interview.status !== "scheduled") {
      setCanJoin(false);
      return;
    }

    // Instant interviews bypass the time gate — once the worker accepts and a
    // video_room_url exists, business should be able to join immediately.
    if (interview.is_instant && interview.video_room_url) {
      setCanJoin(true);
      setTimeMessage("");
      return;
    }

    if (!interview.scheduled_date || !interview.scheduled_start_time || !interview.scheduled_end_time) {
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

  // Poll for status changes when interview is "live" (waiting for worker to accept)
  const [liveTimeLeft, setLiveTimeLeft] = useState("");
  const [liveExpired, setLiveExpired] = useState(false);

  useEffect(() => {
    if (!interview || interview.status !== "live") return;

    // Poll every 3 seconds to check if worker accepted (room URL appears)
    const pollInterval = setInterval(async () => {
      const supabase = createClient();
      const { data } = await supabase
        .from("interviews")
        .select("status, video_room_url")
        .eq("id", interview.id)
        .single();

      if (data) {
        if (data.status === "scheduled" && data.video_room_url) {
          // Worker accepted — update interview and show video room
          setInterview({ ...interview, status: "scheduled", video_room_url: data.video_room_url });
        } else if (data.status === "declined") {
          setInterview({ ...interview, status: "declined" });
        } else if (data.status === "reschedule_requested") {
          setInterview({ ...interview, status: "reschedule_requested" });
        }
      }
    }, 3000);

    // Countdown timer for room expiry
    const timerInterval = setInterval(() => {
      if (!interview.room_expires_at) return;
      const diff = new Date(interview.room_expires_at).getTime() - Date.now();
      if (diff <= 0) {
        setLiveExpired(true);
        setLiveTimeLeft("0:00");
      } else {
        const mins = Math.floor(diff / 60000);
        const secs = Math.floor((diff % 60000) / 1000);
        setLiveTimeLeft(`${mins}:${secs.toString().padStart(2, "0")}`);
      }
    }, 1000);

    return () => {
      clearInterval(pollInterval);
      clearInterval(timerInterval);
    };
  }, [interview?.id, interview?.status]);

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

  const handleCancelInstant = async () => {
    if (!interview) return;
    setActionLoading("cancel");
    try {
      const res = await fetch("/api/interviews/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ interview_id: interview.id }),
      });
      if (res.ok) {
        setInterview({ ...interview, status: "cancelled", cancelled_at: new Date().toISOString() });
      } else {
        const err = await res.json().catch(() => ({ error: "Failed to cancel" }));
        alert(err.error || "Failed to cancel request");
      }
    } catch {
      alert("Failed to cancel request. Please try again.");
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
  const isLive = interview.status === "live";

  return (
    <div className="mx-auto max-w-3xl xl:max-w-7xl">
      <Link
        href="/business/interviews"
        className="mb-4 inline-flex items-center gap-1 text-sm text-foreground/50 hover:text-foreground"
      >
        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Back to Interviews
      </Link>

      <div className="xl:grid xl:grid-cols-[minmax(280px,_320px)_minmax(0,_1fr)_minmax(280px,_320px)] xl:gap-6">
        {/* ============================================================
            LEFT SIDEBAR — RESUME (xl+ only)
            ============================================================ */}
        <aside className="hidden xl:block xl:sticky xl:top-6 xl:self-start xl:max-h-[calc(100vh-3rem)] xl:overflow-y-auto">
          <div className="rounded-xl border border-accent bg-white p-4">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-foreground/50">
                Resume
              </h3>
              {interview.worker_cv_url && (
                <a
                  href={interview.worker_cv_url}
                  target="_blank"
                  rel="noopener"
                  className="inline-flex items-center gap-1 text-[11px] font-medium text-secondary hover:underline"
                >
                  Open
                  <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </a>
              )}
            </div>
            {interview.worker_cv_url ? (
              <div className="overflow-hidden rounded-lg border border-accent/50 bg-accent/5">
                <iframe
                  src={interview.worker_cv_url}
                  title={`${interview.worker_name} resume`}
                  className="h-[calc(100vh-10rem)] w-full"
                />
              </div>
            ) : (
              <div className="rounded-lg border border-dashed border-accent/50 bg-accent/5 p-6 text-center">
                <svg className="mx-auto h-8 w-8 text-foreground/30" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <p className="mt-2 text-xs text-foreground/50">No resume uploaded</p>
              </div>
            )}
          </div>
        </aside>

        {/* ============================================================
            MAIN COLUMN
            ============================================================ */}
        <div className="min-w-0">

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

      {/* Schedule details — hidden for instant interviews and live status,
          since the 'scheduled_date' is just a placeholder and would make
          the page look like a previously-scheduled interview. */}
      {interview.scheduled_date && interview.status !== "live" && !interview.is_instant && (
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

      {/* Live Instant Interview — Waiting for worker */}
      {isLive && (
        <div className="mt-6 rounded-xl border-2 border-emerald-300 bg-emerald-50/50 p-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
            <div className="relative">
              <svg className="h-8 w-8 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              <span className="absolute -top-1 -right-1 flex h-3 w-3">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex h-3 w-3 rounded-full bg-emerald-500" />
              </span>
            </div>
          </div>
          <h3 className="text-lg font-semibold text-primary">Waiting for {interview.worker_name} to join...</h3>
          <p className="mt-2 text-sm text-foreground/60">
            {interview.worker_name} has been notified. The video call will start as soon as they accept.
          </p>
          {!liveExpired ? (
            <div className="mt-4 inline-flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2">
              <svg className="h-4 w-4 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-sm font-medium text-amber-800">
                Room expires in <span className="font-mono font-bold">{liveTimeLeft}</span>
              </span>
            </div>
          ) : (
            <div className="mt-4 inline-flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-2">
              <span className="text-sm font-medium text-red-700">Room has expired. The worker did not join in time.</span>
            </div>
          )}
          {!liveExpired && (
            <div className="mt-4 flex justify-center gap-1">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-bounce" style={{ animationDelay: "0ms" }} />
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-bounce" style={{ animationDelay: "150ms" }} />
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-bounce" style={{ animationDelay: "300ms" }} />
            </div>
          )}
          {/* Cancel request button */}
          <div className="mt-6">
            <button
              onClick={() => handleCancelInstant()}
              disabled={actionLoading === "cancel"}
              className="inline-flex items-center gap-2 rounded-xl border border-red-200 bg-white px-5 py-2.5 text-sm font-medium text-red-600 transition-all hover:bg-red-50 hover:border-red-300 disabled:opacity-50"
            >
              {actionLoading === "cancel" ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-red-300 border-t-red-600" />
                  Cancelling...
                </>
              ) : (
                <>
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  Cancel Request
                </>
              )}
            </button>
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

      {/* Below-xl quick-access row — on wide screens these live in the sidebars */}
      <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:hidden">
        {interview.worker_cv_url && (
          <a
            href={interview.worker_cv_url}
            target="_blank"
            rel="noopener"
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-accent bg-white px-4 py-2.5 text-sm font-semibold text-primary transition-colors hover:bg-accent/10"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            View resume
          </a>
        )}
        {interview.worker_profile_id && (
          <Link
            href={`/business/workers/${interview.worker_profile_id}`}
            target="_blank"
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-accent bg-white px-4 py-2.5 text-sm font-semibold text-primary transition-colors hover:bg-accent/10"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            View full profile
          </Link>
        )}
      </div>

        </div>
        {/* ============================================================
            RIGHT SIDEBAR — WORKER PROFILE (xl+ only)
            ============================================================ */}
        <aside className="hidden xl:block xl:sticky xl:top-6 xl:self-start xl:max-h-[calc(100vh-3rem)] xl:overflow-y-auto">
          <div className="rounded-xl border border-accent bg-white p-5">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-foreground/50">
                Candidate
              </h3>
              {interview.worker_profile_id && (
                <Link
                  href={`/business/workers/${interview.worker_profile_id}`}
                  target="_blank"
                  className="inline-flex items-center gap-1 text-[11px] font-medium text-secondary hover:underline"
                >
                  Full profile
                  <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </Link>
              )}
            </div>

            <div className="flex items-center gap-3">
              {interview.worker_avatar_url ? (
                <img
                  src={interview.worker_avatar_url}
                  alt={interview.worker_name}
                  className="h-14 w-14 rounded-full border border-accent object-cover"
                />
              ) : (
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-secondary/20 text-base font-bold text-primary">
                  {initials}
                </div>
              )}
              <div className="min-w-0">
                <p className="truncate font-semibold text-primary">{interview.worker_name}</p>
                {interview.worker_location && (
                  <p className="truncate text-xs text-foreground/60">{interview.worker_location}</p>
                )}
              </div>
            </div>

            <div className="mt-4 space-y-3 text-sm">
              {interview.worker_nationality && (
                <ProfileField label="Nationality">
                  {interview.worker_nationality}
                  {interview.worker_second_nationality && ` · ${interview.worker_second_nationality}`}
                </ProfileField>
              )}
              {interview.worker_years_experience !== null && interview.worker_years_experience !== undefined && (
                <ProfileField label="Seasonal experience">
                  {interview.worker_years_experience} year{interview.worker_years_experience === 1 ? "" : "s"}
                </ProfileField>
              )}
              {interview.worker_languages.length > 0 && (
                <ProfileField label="Languages">
                  {interview.worker_languages.join(", ")}
                </ProfileField>
              )}
              {interview.worker_phone && (
                <ProfileField label="Phone">
                  {interview.worker_phone}
                </ProfileField>
              )}
              {interview.worker_skills.length > 0 && (
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-foreground/40">Skills</p>
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    {interview.worker_skills.map((skill) => (
                      <span
                        key={skill}
                        className="inline-flex rounded-full bg-accent/30 px-2 py-0.5 text-[11px] text-foreground/70"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {interview.worker_bio && (
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-foreground/40">About</p>
                  <p className="mt-1 text-xs leading-relaxed text-foreground/70">
                    {interview.worker_bio}
                  </p>
                </div>
              )}
              {interview.cover_letter && (
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-foreground/40">Cover letter</p>
                  <p className="mt-1 whitespace-pre-line text-xs leading-relaxed text-foreground/70">
                    {interview.cover_letter}
                  </p>
                </div>
              )}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

function ProfileField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-wider text-foreground/40">{label}</p>
      <p className="mt-0.5 text-xs text-foreground/80">{children}</p>
    </div>
  );
}
