"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import InterviewStatusBadge from "@/components/ui/InterviewStatusBadge";
import VideoRoom from "@/components/ui/VideoRoom";

// Demo data
const demoInterviewDetail = {
  id: "int1",
  job_title: "Ski Instructor — All Levels",
  worker_name: "Emma Johansson",
  worker_location: "Stockholm, Sweden",
  worker_skills: ["CSIA Level 3", "First Aid", "Swedish", "English", "French"],
  status: "scheduled",
  scheduled_date: "2026-03-28",
  scheduled_start_time: "10:00",
  scheduled_end_time: "10:30",
  timezone: "America/Denver",
  video_room_url: null,
  business_notes: null,
  invited_at: "2026-03-18T10:00:00Z",
  scheduled_at: "2026-03-20T14:30:00Z",
};

export default function BusinessInterviewDetailPage() {
  const params = useParams();
  const router = useRouter();
  const interviewId = params.id as string;
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [interviewStatus, setInterviewStatus] = useState(demoInterviewDetail.status);

  const interview = { ...demoInterviewDetail, status: interviewStatus };

  const handleAction = async (action: "cancel" | "reschedule" | "complete") => {
    setActionLoading(action);

    // Demo mode — simulate with delay
    await new Promise((r) => setTimeout(r, 1000));

    if (action === "cancel") {
      setInterviewStatus("cancelled");
      alert("Interview cancelled! (Demo mode — in production this calls /api/interviews/cancel)");
    } else if (action === "reschedule") {
      setInterviewStatus("rescheduled");
      alert("Interview rescheduled! Worker will receive a new booking link. (Demo mode)");
    } else if (action === "complete") {
      setInterviewStatus("completed");
      alert("Interview marked as completed! (Demo mode)");
    }

    setActionLoading(null);
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr + "T00:00:00");
    return date.toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  };

  const formatTime12 = (time: string) => {
    const [h, m] = time.split(":");
    const hour = parseInt(h);
    const ampm = hour >= 12 ? "PM" : "AM";
    return `${hour % 12 || 12}:${m} ${ampm}`;
  };

  const initials = interview.worker_name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase();

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
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-secondary/20 text-sm font-bold text-primary">
            {initials}
          </div>
          <div>
            <p className="font-semibold text-primary">{interview.worker_name}</p>
            <p className="text-sm text-foreground/60">{interview.worker_location}</p>
          </div>
        </div>
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
            <div className="flex items-center gap-3">
              <svg className="h-5 w-5 text-foreground/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-primary font-medium">
                {formatTime12(interview.scheduled_start_time)} – {formatTime12(interview.scheduled_end_time)}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <svg className="h-5 w-5 text-foreground/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-foreground/60 text-sm">{interview.timezone.replace(/_/g, " ")}</span>
            </div>
          </div>
        </div>
      )}

      {/* Video room */}
      {isUpcoming && (
        <div className="mt-6">
          <h2 className="mb-4 text-lg font-semibold text-primary">Video Call</h2>
          <VideoRoom
            interviewId={interviewId}
            roomUrl={interview.video_room_url || undefined}
            isDemo
          />
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
            {actionLoading === "cancel" ? "Cancelling…" : "Cancel Interview"}
          </button>
          <button
            onClick={() => handleAction("reschedule")}
            disabled={actionLoading !== null}
            className="rounded-lg border border-accent bg-white px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent/20 disabled:opacity-50"
          >
            {actionLoading === "reschedule" ? "Rescheduling…" : "Reschedule"}
          </button>
          <button
            onClick={() => handleAction("complete")}
            disabled={actionLoading !== null}
            className="rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-green-700 disabled:opacity-50"
          >
            {actionLoading === "complete" ? "Completing…" : "Mark as Completed"}
          </button>
        </div>
      )}

      {/* Timeline */}
      <div className="mt-8">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-foreground/50">
          Timeline
        </h2>
        <div className="space-y-3">
          {interview.scheduled_at && (
            <div className="flex items-center gap-3 text-sm">
              <div className="h-2 w-2 rounded-full bg-blue-500" />
              <span className="text-foreground/60">
                Interview booked by applicant — {new Date(interview.scheduled_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
              </span>
            </div>
          )}
          <div className="flex items-center gap-3 text-sm">
            <div className="h-2 w-2 rounded-full bg-yellow-500" />
            <span className="text-foreground/60">
              Invitation sent — {new Date(interview.invited_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
