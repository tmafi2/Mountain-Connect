"use client";

import Link from "next/link";

// Demo interview data
interface DemoInterview {
  id: string;
  job_title: string;
  business_name: string;
  status: string;
  scheduled_date: string | null;
  scheduled_start_time: string | null;
  scheduled_end_time: string | null;
  timezone: string | null;
}

const demoInterviews: DemoInterview[] = [
  {
    id: "int1",
    job_title: "Lift Operations Crew",
    business_name: "Whistler Blackcomb",
    status: "scheduled",
    scheduled_date: "2026-03-28",
    scheduled_start_time: "10:00",
    scheduled_end_time: "10:30",
    timezone: "America/Denver",
  },
  {
    id: "int2",
    job_title: "Ski Instructor — All Levels",
    business_name: "Whistler Blackcomb Ski School",
    status: "completed",
    scheduled_date: "2026-03-15",
    scheduled_start_time: "14:00",
    scheduled_end_time: "14:30",
    timezone: "America/Denver",
  },
  {
    id: "int3",
    job_title: "Guest Services Agent",
    business_name: "Revelstoke Mountain Resort",
    status: "invited",
    scheduled_date: null,
    scheduled_start_time: null,
    scheduled_end_time: null,
    timezone: null,
  },
];

const STATUS_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  invited: { bg: "bg-yellow-50", text: "text-yellow-700", label: "Awaiting Booking" },
  scheduled: { bg: "bg-blue-50", text: "text-blue-700", label: "Scheduled" },
  completed: { bg: "bg-green-50", text: "text-green-700", label: "Completed" },
  cancelled: { bg: "bg-red-50", text: "text-red-700", label: "Cancelled" },
  rescheduled: { bg: "bg-orange-50", text: "text-orange-700", label: "Rescheduled" },
};

export default function WorkerInterviewsPage() {
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

  const upcoming = demoInterviews.filter((i) => i.status === "scheduled" || i.status === "invited");
  const past = demoInterviews.filter((i) => i.status === "completed" || i.status === "cancelled");

  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="text-2xl font-bold text-primary">My Interviews</h1>
      <p className="mt-1 text-sm text-foreground/60">
        View your upcoming and past interviews.
      </p>

      {/* Upcoming */}
      <h2 className="mt-8 text-lg font-semibold text-primary">
        Upcoming ({upcoming.length})
      </h2>
      <div className="mt-4 space-y-3">
        {upcoming.length === 0 ? (
          <div className="rounded-xl border border-accent bg-white p-8 text-center">
            <p className="text-sm text-foreground/50">No upcoming interviews.</p>
          </div>
        ) : (
          upcoming.map((interview) => {
            const style = STATUS_STYLES[interview.status];
            return (
              <div
                key={interview.id}
                className="rounded-xl border border-accent bg-white p-5 transition-all hover:border-secondary/50 hover:shadow-sm"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-primary">{interview.job_title}</h3>
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${style.bg} ${style.text}`}>
                        {style.label}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-foreground/60">{interview.business_name}</p>
                    {interview.scheduled_date && interview.scheduled_start_time && (
                      <p className="mt-2 text-sm text-primary font-medium">
                        {formatDate(interview.scheduled_date)} at{" "}
                        {formatTime12(interview.scheduled_start_time)} – {formatTime12(interview.scheduled_end_time!)}
                      </p>
                    )}
                  </div>

                  <div className="flex gap-2">
                    {interview.status === "invited" && (
                      <Link
                        href="/interviews/book?token=demo"
                        className="rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-primary/90"
                      >
                        Book Time
                      </Link>
                    )}
                    {interview.status === "scheduled" && (
                      <button className="rounded-lg bg-secondary/20 px-4 py-2 text-xs font-semibold text-primary transition-colors hover:bg-secondary/30">
                        Join Call
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Past */}
      {past.length > 0 && (
        <>
          <h2 className="mt-8 text-lg font-semibold text-foreground/40">
            Past ({past.length})
          </h2>
          <div className="mt-4 space-y-3 opacity-60">
            {past.map((interview) => {
              const style = STATUS_STYLES[interview.status];
              return (
                <div
                  key={interview.id}
                  className="rounded-xl border border-accent/50 bg-white p-5"
                >
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-primary">{interview.job_title}</h3>
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${style.bg} ${style.text}`}>
                      {style.label}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-foreground/60">{interview.business_name}</p>
                  {interview.scheduled_date && (
                    <p className="mt-1 text-sm text-foreground/40">
                      {formatDate(interview.scheduled_date)}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
