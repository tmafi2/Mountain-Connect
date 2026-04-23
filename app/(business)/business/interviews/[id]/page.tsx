"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import InterviewStatusBadge from "@/components/ui/InterviewStatusBadge";
import VideoRoom from "@/components/ui/VideoRoom";
import OtherPartyPresencePill from "@/components/ui/OtherPartyPresencePill";
import { useInterviewPresence } from "@/lib/hooks/useInterviewPresence";
import type { WorkerProfile } from "@/types/database";

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
  worker_profile: WorkerProfile | null;
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
  const [businessUserId, setBusinessUserId] = useState<string | null>(null);
  const [businessDisplayName, setBusinessDisplayName] = useState<string>("");

  const { otherParty, setStatus: setPresenceStatus } = useInterviewPresence({
    interviewId,
    selfRole: "business",
    selfUserId: businessUserId,
    selfDisplayName: businessDisplayName,
    otherRole: "worker",
  });

  useEffect(() => {
    async function load() {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { setError("Please log in."); setLoading(false); return; }
        setBusinessUserId(user.id);

        const { data: bp } = await supabase
          .from("business_profiles")
          .select("id, business_name")
          .eq("user_id", user.id)
          .single();

        if (!bp) { setError("Business profile not found."); setLoading(false); return; }
        setBusinessDisplayName(bp.business_name || "Business");

        const { data: iv, error: ivErr } = await supabase
          .from("interviews")
          .select(`
            id, status, scheduled_date, scheduled_start_time, scheduled_end_time,
            timezone, video_room_url, business_notes, is_instant, room_expires_at,
            invited_at, scheduled_at, completed_at, cancelled_at,
            applications(
              cover_letter,
              job_posts(title),
              worker_profiles(*)
            )
          `)
          .eq("id", interviewId)
          .eq("business_id", bp.id)
          .single();

        if (ivErr || !iv) { setError("Interview not found or you don't have access."); setLoading(false); return; }

        const app = iv.applications as unknown as Record<string, unknown> | null;
        const jp = app?.job_posts as unknown as { title: string } | null;
        const wp = app?.worker_profiles as unknown as WorkerProfile | null;

        const workerName = [wp?.first_name, wp?.last_name].filter(Boolean).join(" ") || "Unknown Applicant";

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
          worker_profile: wp,
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

      <div className="xl:grid xl:grid-cols-[minmax(0,_1fr)_minmax(300px,_360px)] xl:gap-6">
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
          {/* Live presence pill — visible before and alongside the video */}
          <div className="mb-3 flex justify-center">
            <OtherPartyPresencePill
              otherParty={otherParty}
              otherPartyLabel={interview.worker_name}
            />
          </div>
          {canJoin ? (
            <VideoRoom
              interviewId={interview.id}
              roomUrl={interview.video_room_url || undefined}
              otherParty={otherParty}
              otherPartyLabel={interview.worker_name}
              onStatusChange={setPresenceStatus}
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

      {/* Below-xl quick-access row — on wide screens the candidate sidebar
          is visible; below that we expose the full-profile link here. */}
      {interview.worker_profile_id && (
        <div className="mt-8 xl:hidden">
          <Link
            href={`/business/workers/${interview.worker_profile_id}`}
            target="_blank"
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-accent bg-white px-4 py-2.5 text-sm font-semibold text-primary transition-colors hover:bg-accent/10"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            View full profile
          </Link>
        </div>
      )}

        </div>
        {/* ============================================================
            RIGHT SIDEBAR — WORKER PROFILE (xl+ only)
            ============================================================ */}
        <aside className="hidden xl:block xl:sticky xl:top-6 xl:self-start xl:max-h-[calc(100vh-3rem)]">
          <CandidateSidebar
            profile={interview.worker_profile}
            workerName={interview.worker_name}
            workerProfileId={interview.worker_profile_id}
            avatarUrl={interview.worker_avatar_url}
            initials={initials}
            coverLetter={interview.cover_letter}
          />
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

function formatLabel(s: string) {
  return s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatShortDate(iso: string | null) {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function CandidateSidebar({
  profile,
  workerName,
  workerProfileId,
  avatarUrl,
  initials,
  coverLetter,
}: {
  profile: WorkerProfile | null;
  workerName: string;
  workerProfileId: string | null;
  avatarUrl: string | null;
  initials: string;
  coverLetter: string | null;
}) {
  type Tab = "about" | "experience" | "availability" | "letter";
  const [tab, setTab] = useState<Tab>("about");
  // Single-open accordion for work history — selecting a new job collapses
  // the previously expanded one.
  const [expandedJobId, setExpandedJobId] = useState<string | null>(null);

  const languages: string[] = Array.isArray(profile?.languages)
    ? (profile!.languages as unknown[])
        .map((l) => typeof l === "string" ? l : (l as { language?: string })?.language || "")
        .filter(Boolean)
    : [];

  const workHistory = Array.isArray(profile?.work_history) ? profile!.work_history! : [];
  const certifications = Array.isArray(profile?.certifications) ? profile!.certifications! : [];

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-xl border border-accent bg-white">
      {/* Header — identity + full profile link */}
      <div className="border-b border-accent/40 p-4">
        <div className="flex items-center gap-3">
          {avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={avatarUrl}
              alt={workerName}
              className="h-12 w-12 rounded-full border border-accent object-cover"
            />
          ) : (
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-secondary/20 text-sm font-bold text-primary">
              {initials}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate font-semibold text-primary">{workerName}</p>
            {profile?.location_current && (
              <p className="truncate text-xs text-foreground/60">{profile.location_current}</p>
            )}
          </div>
        </div>
        {workerProfileId && (
          <Link
            href={`/business/workers/${workerProfileId}`}
            target="_blank"
            className="mt-3 inline-flex items-center gap-1 text-[11px] font-medium text-secondary hover:underline"
          >
            Open full profile
            <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </Link>
        )}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-accent/40 text-[11px] font-semibold uppercase tracking-wider">
        {(
          [
            ["about", "About"],
            ["experience", "Experience"],
            ["availability", "Avail."],
            ["letter", "Letter"],
          ] as [Tab, string][]
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={`flex-1 border-b-2 px-2 py-2 transition-colors ${
              tab === key
                ? "border-primary text-primary"
                : "border-transparent text-foreground/50 hover:text-foreground/80"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Tab content — scrollable */}
      <div className="flex-1 overflow-y-auto p-4 text-sm">
        {!profile ? (
          <p className="text-xs text-foreground/50">No worker profile available.</p>
        ) : tab === "about" ? (
          <div className="space-y-3">
            {profile.bio && (
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-foreground/40">Bio</p>
                <p className="mt-1 whitespace-pre-line text-xs leading-relaxed text-foreground/80">{profile.bio}</p>
              </div>
            )}
            {profile.phone && <ProfileField label="Phone">{profile.phone}</ProfileField>}
            {profile.date_of_birth && (
              <ProfileField label="Date of birth">{formatShortDate(profile.date_of_birth)}</ProfileField>
            )}
            {(profile.nationality || profile.second_nationality) && (
              <ProfileField label="Nationality">
                {[profile.nationality, profile.second_nationality].filter(Boolean).join(" · ")}
              </ProfileField>
            )}
            {profile.country_of_residence && (
              <ProfileField label="Country of residence">{profile.country_of_residence}</ProfileField>
            )}
            {profile.visa_status && (
              <ProfileField label="Visa status">
                {formatLabel(profile.visa_status)}
                {profile.visa_expiry_date && ` (exp. ${formatShortDate(profile.visa_expiry_date)})`}
              </ProfileField>
            )}
            {profile.drivers_license !== null && profile.drivers_license !== undefined && (
              <ProfileField label="Driver's license">
                {profile.drivers_license ? `Yes${profile.drivers_license_country ? ` (${profile.drivers_license_country})` : ""}` : "No"}
              </ProfileField>
            )}
            {profile.has_car !== null && profile.has_car !== undefined && (
              <ProfileField label="Has car">{profile.has_car ? "Yes" : "No"}</ProfileField>
            )}
            {!profile.bio && !profile.phone && !profile.nationality && !profile.visa_status && (
              <p className="text-xs text-foreground/50">No personal details shared.</p>
            )}
          </div>
        ) : tab === "experience" ? (
          <div className="space-y-3">
            {profile.years_seasonal_experience !== null && profile.years_seasonal_experience !== undefined && (
              <ProfileField label="Seasonal experience">
                {profile.years_seasonal_experience} year{profile.years_seasonal_experience === 1 ? "" : "s"}
              </ProfileField>
            )}
            {languages.length > 0 && (
              <ProfileField label="Languages">{languages.join(", ")}</ProfileField>
            )}
            {Array.isArray(profile.skills) && profile.skills.length > 0 && (
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-foreground/40">Skills</p>
                <div className="mt-1.5 flex flex-wrap gap-1">
                  {profile.skills.map((skill) => (
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
            {certifications.length > 0 && (
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-foreground/40">Certifications</p>
                <ul className="mt-1.5 space-y-1">
                  {certifications.map((c, i) => (
                    <li key={i} className="text-xs text-foreground/80">
                      {c.name}
                      {c.issuing_body && <span className="text-foreground/50"> · {c.issuing_body}</span>}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {workHistory.length > 0 && (
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-foreground/40">Work history</p>
                <ul className="mt-1.5 space-y-2">
                  {workHistory.map((w) => {
                    const isOpen = expandedJobId === w.id;
                    return (
                      <li key={w.id} className="overflow-hidden rounded-lg border border-accent/40 bg-accent/5 text-xs">
                        <button
                          type="button"
                          onClick={() => setExpandedJobId(isOpen ? null : w.id)}
                          aria-expanded={isOpen}
                          className="flex w-full items-start gap-2 p-2 text-left transition-colors hover:bg-accent/10"
                        >
                          <div className="min-w-0 flex-1">
                            <p className="font-semibold text-primary">{w.title}</p>
                            <p className="text-foreground/60">
                              {w.company}{w.location ? ` · ${w.location}` : ""}
                            </p>
                            <p className="mt-0.5 text-[10px] text-foreground/40">
                              {formatShortDate(w.start_date)}
                              {w.end_date
                                ? ` – ${formatShortDate(w.end_date)}`
                                : w.is_current
                                  ? " – Present"
                                  : ""}
                            </p>
                          </div>
                          <svg
                            className={`mt-0.5 h-3.5 w-3.5 shrink-0 text-foreground/40 transition-transform ${isOpen ? "rotate-180" : ""}`}
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                            strokeWidth={2.5}
                            aria-hidden="true"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                          </svg>
                        </button>
                        {isOpen && (
                          <div className="border-t border-accent/40 bg-white p-2 text-xs text-foreground/80">
                            {(w.country || w.category) && (
                              <div className="mb-1.5 flex flex-wrap gap-2 text-[10px] text-foreground/50">
                                {w.country && <span>{w.country}</span>}
                                {w.category && (
                                  <span className="rounded-full bg-accent/30 px-1.5 py-0.5 text-foreground/60">
                                    {formatLabel(w.category)}
                                  </span>
                                )}
                                {w.is_verified && (
                                  <span className="rounded-full bg-green-50 px-1.5 py-0.5 text-green-700">
                                    Verified
                                  </span>
                                )}
                              </div>
                            )}
                            {w.description ? (
                              <p className="whitespace-pre-line leading-relaxed">{w.description}</p>
                            ) : (
                              <p className="italic text-foreground/40">No description provided.</p>
                            )}
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
            {profile.pay_range_min != null && profile.pay_range_max != null && (
              <ProfileField label="Pay range">
                {profile.pay_currency || "$"}{profile.pay_range_min}–{profile.pay_range_max}
              </ProfileField>
            )}
          </div>
        ) : tab === "availability" ? (
          <div className="space-y-3">
            {(profile.availability_start || profile.availability_end) && (
              <ProfileField label="Available">
                {formatShortDate(profile.availability_start) || "—"}
                {" to "}
                {formatShortDate(profile.availability_end) || "open"}
              </ProfileField>
            )}
            {profile.season_preference && (
              <ProfileField label="Season preference">{formatLabel(profile.season_preference)}</ProfileField>
            )}
            {profile.position_type && (
              <ProfileField label="Position type">{formatLabel(profile.position_type)}</ProfileField>
            )}
            {profile.housing_preference && (
              <ProfileField label="Housing">{formatLabel(profile.housing_preference)}</ProfileField>
            )}
            {profile.willing_to_relocate !== null && profile.willing_to_relocate !== undefined && (
              <ProfileField label="Willing to relocate">{profile.willing_to_relocate ? "Yes" : "No"}</ProfileField>
            )}
            {profile.available_immediately !== null && profile.available_immediately !== undefined && (
              <ProfileField label="Available immediately">{profile.available_immediately ? "Yes" : "No"}</ProfileField>
            )}
            {profile.available_nights !== null && profile.available_nights !== undefined && (
              <ProfileField label="Nights">{profile.available_nights ? "Yes" : "No"}</ProfileField>
            )}
            {profile.available_weekends !== null && profile.available_weekends !== undefined && (
              <ProfileField label="Weekends">{profile.available_weekends ? "Yes" : "No"}</ProfileField>
            )}
            {profile.open_to_second_job !== null && profile.open_to_second_job !== undefined && (
              <ProfileField label="Open to second job">{profile.open_to_second_job ? "Yes" : "No"}</ProfileField>
            )}
            {profile.traveling_with_partner !== null && profile.traveling_with_partner !== undefined && (
              <ProfileField label="Traveling with partner">{profile.traveling_with_partner ? "Yes" : "No"}</ProfileField>
            )}
            {profile.traveling_with_pets !== null && profile.traveling_with_pets !== undefined && (
              <ProfileField label="Traveling with pets">{profile.traveling_with_pets ? "Yes" : "No"}</ProfileField>
            )}
          </div>
        ) : (
          <div>
            {coverLetter ? (
              <p className="whitespace-pre-line text-xs leading-relaxed text-foreground/80">
                {coverLetter}
              </p>
            ) : (
              <p className="text-xs text-foreground/50">
                No cover letter submitted with this application.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
