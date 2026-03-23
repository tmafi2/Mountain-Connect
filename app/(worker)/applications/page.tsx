"use client";

import Link from "next/link";

const STATUS_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  pending: { bg: "bg-yellow-50", text: "text-yellow-700", label: "Pending" },
  reviewed: { bg: "bg-blue-50", text: "text-blue-700", label: "Reviewed" },
  interview_scheduled: { bg: "bg-purple-50", text: "text-purple-700", label: "Interview" },
  accepted: { bg: "bg-green-50", text: "text-green-700", label: "Accepted" },
  rejected: { bg: "bg-red-50", text: "text-red-700", label: "Rejected" },
};

// Demo applications from worker perspective
const demoApplications = [
  {
    id: "app-w1",
    job_title: "Ski Instructor — All Levels",
    business_name: "Whistler Blackcomb Ski School",
    resort_name: "Whistler Blackcomb",
    status: "interview_scheduled",
    applied_at: "2026-03-05T11:20:00Z",
    interview_status: "scheduled",
    interview_date: "2026-03-28",
    interview_time: "10:00",
  },
  {
    id: "app-w2",
    job_title: "Guest Services Agent",
    business_name: "Revelstoke Mountain Resort",
    resort_name: "Revelstoke Mountain Resort",
    status: "interview_scheduled",
    applied_at: "2026-03-08T09:00:00Z",
    interview_status: "invited",
    interview_date: null,
    interview_time: null,
  },
  {
    id: "app-w3",
    job_title: "Bartender — Après Ski Lounge",
    business_name: "Whistler Village Hospitality",
    resort_name: "Whistler Blackcomb",
    status: "pending",
    applied_at: "2026-03-12T18:45:00Z",
    interview_status: null,
    interview_date: null,
    interview_time: null,
  },
  {
    id: "app-w4",
    job_title: "Snowboard Instructor",
    business_name: "Big White Ski School",
    resort_name: "Big White",
    status: "reviewed",
    applied_at: "2026-03-14T06:30:00Z",
    interview_status: null,
    interview_date: null,
    interview_time: null,
  },
  {
    id: "app-w5",
    job_title: "Lift Operations Crew",
    business_name: "Whistler Blackcomb Operations",
    resort_name: "Whistler Blackcomb",
    status: "accepted",
    applied_at: "2026-02-20T10:00:00Z",
    interview_status: "completed",
    interview_date: "2026-03-10",
    interview_time: "14:00",
  },
];

export default function ApplicationsPage() {
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const formatShortDate = (dateStr: string) => {
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

  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="text-2xl font-bold text-primary">My Applications</h1>
      <p className="mt-1 text-sm text-foreground/60">
        Track the status of all your job applications.
      </p>

      <div className="mt-6 space-y-3">
        {demoApplications.map((app) => {
          const style = STATUS_STYLES[app.status] || STATUS_STYLES.pending;
          return (
            <div
              key={app.id}
              className="rounded-xl border border-accent bg-white p-5 transition-all hover:border-secondary/50 hover:shadow-sm"
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-primary">{app.job_title}</h3>
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${style.bg} ${style.text}`}>
                      {style.label}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-foreground/60">
                    {app.business_name} · {app.resort_name}
                  </p>
                  <p className="mt-1 text-xs text-foreground/40">
                    Applied {formatDate(app.applied_at)}
                  </p>

                  {/* Interview info */}
                  {app.interview_status === "scheduled" && app.interview_date && (
                    <div className="mt-3 inline-flex items-center gap-2 rounded-lg bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-700">
                      <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      Interview: {formatShortDate(app.interview_date)} at {formatTime12(app.interview_time!)}
                    </div>
                  )}
                  {app.interview_status === "completed" && (
                    <div className="mt-3 inline-flex items-center gap-2 rounded-lg bg-green-50 px-3 py-1.5 text-xs font-medium text-green-700">
                      <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Interview completed
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div>
                  {app.interview_status === "invited" && (
                    <Link
                      href="/interviews/book?token=demo"
                      className="rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-primary/90"
                    >
                      Book Interview
                    </Link>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
