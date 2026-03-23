"use client";

import Link from "next/link";
import InterviewStatusBadge from "@/components/ui/InterviewStatusBadge";

interface DemoInterview {
  id: string;
  job_title: string;
  worker_name: string;
  worker_location: string;
  status: string;
  scheduled_date: string | null;
  scheduled_start_time: string | null;
  scheduled_end_time: string | null;
  timezone: string | null;
}

const demoInterviews: DemoInterview[] = [
  {
    id: "int1",
    job_title: "Ski Instructor — All Levels",
    worker_name: "Emma Johansson",
    worker_location: "Stockholm, Sweden",
    status: "scheduled",
    scheduled_date: "2026-03-28",
    scheduled_start_time: "10:00",
    scheduled_end_time: "10:30",
    timezone: "America/Denver",
  },
  {
    id: "int2",
    job_title: "Bartender — Après Ski Lounge",
    worker_name: "Sophie Chen",
    worker_location: "Melbourne, Australia",
    status: "invited",
    scheduled_date: null,
    scheduled_start_time: null,
    scheduled_end_time: null,
    timezone: null,
  },
  {
    id: "int3",
    job_title: "Lift Operations Crew",
    worker_name: "Jake Thompson",
    worker_location: "Queenstown, New Zealand",
    status: "scheduled",
    scheduled_date: "2026-03-30",
    scheduled_start_time: "14:00",
    scheduled_end_time: "14:30",
    timezone: "America/Denver",
  },
  {
    id: "int4",
    job_title: "Ski Instructor — All Levels",
    worker_name: "Marie Dubois",
    worker_location: "Chamonix, France",
    status: "completed",
    scheduled_date: "2026-03-15",
    scheduled_start_time: "11:00",
    scheduled_end_time: "11:30",
    timezone: "America/Denver",
  },
];

export default function BusinessInterviewsPage() {
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr + "T00:00:00");
    return date.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  };

  const formatTime12 = (time: string) => {
    const [h, m] = time.split(":");
    const hour = parseInt(h);
    const ampm = hour >= 12 ? "PM" : "AM";
    return `${hour % 12 || 12}:${m} ${ampm}`;
  };

  const upcoming = demoInterviews.filter(
    (i) => i.status === "scheduled" || i.status === "invited"
  );
  const past = demoInterviews.filter(
    (i) => i.status === "completed" || i.status === "cancelled"
  );

  const initials = (name: string) =>
    name.split(" ").map((n) => n[0]).join("").toUpperCase();

  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="text-2xl font-bold text-primary">Interviews</h1>
      <p className="mt-1 text-sm text-foreground/60">
        View and manage your upcoming and past interviews.
      </p>

      {/* Upcoming */}
      <h2 className="mt-8 text-lg font-semibold text-primary">
        Upcoming ({upcoming.length})
      </h2>
      <div className="mt-4 space-y-3">
        {upcoming.length === 0 ? (
          <div className="rounded-xl border border-accent bg-white p-8 text-center">
            <p className="text-sm text-foreground/50">
              No upcoming interviews. Invite applicants from the Applicants page.
            </p>
          </div>
        ) : (
          upcoming.map((interview) => (
            <Link
              key={interview.id}
              href={`/business/interviews/${interview.id}`}
              className="block rounded-xl border border-accent bg-white p-5 transition-all hover:border-secondary/50 hover:shadow-sm"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-secondary/20 text-xs font-bold text-primary">
                    {initials(interview.worker_name)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-primary">{interview.worker_name}</h3>
                      <InterviewStatusBadge status={interview.status} />
                    </div>
                    <p className="mt-0.5 text-sm text-foreground/60">
                      {interview.job_title}
                    </p>
                    <p className="mt-0.5 text-xs text-foreground/40">
                      {interview.worker_location}
                    </p>
                    {interview.scheduled_date && interview.scheduled_start_time && (
                      <p className="mt-2 text-sm font-medium text-primary">
                        {formatDate(interview.scheduled_date)} at{" "}
                        {formatTime12(interview.scheduled_start_time)} – {formatTime12(interview.scheduled_end_time!)}
                      </p>
                    )}
                  </div>
                </div>

                {interview.status === "scheduled" && (
                  <span className="rounded-lg bg-secondary/20 px-3 py-1.5 text-xs font-semibold text-primary">
                    Join Call
                  </span>
                )}
              </div>
            </Link>
          ))
        )}
      </div>

      {/* Past */}
      {past.length > 0 && (
        <>
          <h2 className="mt-8 text-lg font-semibold text-foreground/40">
            Past ({past.length})
          </h2>
          <div className="mt-4 space-y-3 opacity-60">
            {past.map((interview) => (
              <Link
                key={interview.id}
                href={`/business/interviews/${interview.id}`}
                className="block rounded-xl border border-accent/50 bg-white p-5 transition-all hover:shadow-sm"
              >
                <div className="flex items-start gap-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-secondary/20 text-xs font-bold text-primary">
                    {initials(interview.worker_name)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-primary">{interview.worker_name}</h3>
                      <InterviewStatusBadge status={interview.status} />
                    </div>
                    <p className="mt-0.5 text-sm text-foreground/60">{interview.job_title}</p>
                    {interview.scheduled_date && (
                      <p className="mt-1 text-xs text-foreground/40">
                        {formatDate(interview.scheduled_date)}
                      </p>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
