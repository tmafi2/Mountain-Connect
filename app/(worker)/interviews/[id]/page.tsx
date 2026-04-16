"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
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
  business_name: string;
  invite_token: string | null;
}

export default function WorkerInterviewDetailPage() {
  const params = useParams();
  const interviewId = params.id as string;

  const [interview, setInterview] = useState<Interview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [canJoin, setCanJoin] = useState(false);
  const [timeMessage, setTimeMessage] = useState("");

  useEffect(() => {
    async function load() {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { setError("Please log in to view this interview."); setLoading(false); return; }

        const { data: wp } = await supabase
          .from("worker_profiles")
          .select("id")
          .eq("user_id", user.id)
          .single();

        if (!wp) { setError("Worker profile not found."); setLoading(false); return; }

        const { data: iv, error: ivErr } = await supabase
          .from("interviews")
          .select(`
            id, status, scheduled_date, scheduled_start_time, scheduled_end_time,
            timezone, video_room_url, business_notes, invite_token,
            invited_at, scheduled_at, completed_at, cancelled_at,
            applications(job_posts(title, business_profiles(business_name)))
          `)
          .eq("id", interviewId)
          .eq("worker_id", wp.id)
          .single();

        if (ivErr || !iv) { setError("Interview not found or you don't have access."); setLoading(false); return; }

        const app = iv.applications as unknown as Record<string, unknown> | null;
        const jp = app?.job_posts as unknown as Record<string, unknown> | null;
        const bp = jp?.business_profiles as unknown as { business_name: string } | null;

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
          job_title: (jp?.title as string) || "Unknown Position",
          business_name: bp?.business_name || "Unknown Business",
          invite_token: iv.invite_token || null,
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

      const joinWindowStart = new Date(start.getTime() - 10 * 60 * 1000); // 10 min before
      const joinWindowEnd = new Date(end.getTime() + 30 * 60 * 1000); // 30 min after

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
    const interval = setInterval(checkTime, 30000); // recheck every 30s
    return () => clearInterval(interval);
  }, [interview]);

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
          <Link href="/interviews" className="mt-4 inline-block text-sm font-medium text-primary hover:underline">
            Back to Interviews
          </Link>
        </div>
      </div>
    );
  }

  const isUpcoming = interview.status === "scheduled";
  const isInvited = interview.status === "invited";

  return (
    <div className="mx-auto max-w-3xl">
      <Link
        href="/interviews"
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
          <p className="mt-1 text-foreground/60">{interview.business_name}</p>
        </div>
      </div>

      {/* Book Time CTA for invited interviews */}
      {isInvited && interview.invite_token && (
        <div className="mt-6 rounded-xl border-2 border-secondary bg-secondary/5 p-6 text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-secondary/15">
            <svg className="h-7 w-7 text-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-primary">You have been invited to interview!</h3>
          <p className="mt-1 text-sm text-foreground/60">
            Choose a time that works for you from {interview.business_name}&apos;s available slots.
          </p>
          <Link
            href={`/interviews/book?token=${interview.invite_token}`}
            className="mt-4 inline-flex items-center gap-2 rounded-xl bg-primary px-8 py-3 text-sm font-semibold text-white transition-all hover:-translate-y-0.5 hover:bg-primary/90 hover:shadow-lg hover:shadow-primary/20"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            Book Interview Time
          </Link>
        </div>
      )}

      {/* Schedule details */}
      {interview.scheduled_date && (
        <div className="mt-6 rounded-xl border border-accent bg-white p-5">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-foreground/50">
            Interview Details
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
                The video call will be available 10 minutes before your scheduled time.
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

      {/* Business notes */}
      {interview.business_notes && (
        <div className="mt-6 rounded-xl border border-accent bg-white p-5">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-foreground/50">
            Notes from {interview.business_name}
          </h2>
          <p className="mt-3 text-sm text-foreground/70 whitespace-pre-line">{interview.business_notes}</p>
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
                Invitation received — {new Date(interview.invited_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
