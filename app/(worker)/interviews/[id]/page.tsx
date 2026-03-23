"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import InterviewStatusBadge from "@/components/ui/InterviewStatusBadge";
import VideoRoom from "@/components/ui/VideoRoom";

// Demo data — in production this would be fetched from the API
const demoInterviewDetail = {
  id: "int1",
  job_title: "Lift Operations Crew",
  business_name: "Whistler Blackcomb",
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

export default function WorkerInterviewDetailPage() {
  const params = useParams();
  const interviewId = params.id as string;

  // In production, fetch interview by ID. For now, use demo data.
  const interview = demoInterviewDetail;

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

  const isUpcoming = interview.status === "scheduled";

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
                Interview booked — {new Date(interview.scheduled_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
              </span>
            </div>
          )}
          <div className="flex items-center gap-3 text-sm">
            <div className="h-2 w-2 rounded-full bg-yellow-500" />
            <span className="text-foreground/60">
              Invitation received — {new Date(interview.invited_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
