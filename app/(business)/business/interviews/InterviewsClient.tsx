"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import InterviewStatusBadge from "@/components/ui/InterviewStatusBadge";

/* ------------------------------------------------------------------ */
/*  Types & Data                                                       */
/* ------------------------------------------------------------------ */

export interface Interview {
  id: string;
  job_title: string;
  worker_name: string;
  worker_email: string;
  worker_location: string;
  worker_skills: string[];
  years_experience: number;
  languages: string[];
  cover_letter: string;
  status: "scheduled" | "invited" | "completed" | "cancelled" | "missed" | "reschedule_requested" | "rescheduled" | "live" | "declined";
  scheduled_date: string | null;
  scheduled_start_time: string | null;
  scheduled_end_time: string | null;
  timezone: string | null;
  worker_resume_url: string | null;
  worker_avatar_url: string | null;
  worker_user_id: string | null;
  worker_profile_id: string | null;
  is_instant: boolean;
  room_expires_at: string | null;
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

const initials = (name: string) =>
  name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase();

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

const parseHour = (time: string) => parseInt(time.split(":")[0]);

// Convert an "HH:MM" or "HH:MM:SS" string to minutes from midnight
const timeToMinutes = (time: string) => {
  const [h, m] = time.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
};

// Greedy lane assignment for interval scheduling. Returns an array the same
// length as `events` where each element is the lane index for that event.
// Events that don't overlap any other event share lane 0, so consecutive
// bookings (e.g. 1:00-1:30 + 1:30-2:00) stay full-width.
function assignLanes(events: Interview[]): number[] {
  const indexed = events.map((e, i) => ({ e, i }));
  indexed.sort((a, b) => {
    const sa = a.e.scheduled_start_time ? timeToMinutes(a.e.scheduled_start_time) : 0;
    const sb = b.e.scheduled_start_time ? timeToMinutes(b.e.scheduled_start_time) : 0;
    return sa - sb;
  });
  const laneEnds: number[] = [];
  const result: number[] = new Array(events.length).fill(0);
  for (const { e, i } of indexed) {
    if (!e.scheduled_start_time) continue;
    const start = timeToMinutes(e.scheduled_start_time);
    const end = e.scheduled_end_time ? timeToMinutes(e.scheduled_end_time) : start + 30;
    let assigned = -1;
    for (let l = 0; l < laneEnds.length; l++) {
      if (start >= laneEnds[l]) {
        laneEnds[l] = end;
        assigned = l;
        break;
      }
    }
    if (assigned === -1) {
      laneEnds.push(end);
      assigned = laneEnds.length - 1;
    }
    result[i] = assigned;
  }
  return result;
}

const isSameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate();

const toDateKey = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

const statusDotColor: Record<string, string> = {
  scheduled: "bg-green-500",
  invited: "bg-yellow-400",
  completed: "bg-gray-400",
  cancelled: "bg-gray-400",
  live: "bg-emerald-500",
  declined: "bg-gray-400",
};

const statusBlockColor: Record<string, string> = {
  scheduled: "bg-green-100 border-green-400 text-green-800",
  invited: "bg-yellow-100 border-yellow-400 text-yellow-800",
  completed: "bg-gray-100 border-gray-400 text-gray-600",
  cancelled: "bg-red-100 border-red-400 text-red-700",
  live: "bg-emerald-100 border-emerald-400 text-emerald-800",
  declined: "bg-gray-100 border-gray-300 text-gray-600",
};

/* ------------------------------------------------------------------ */
/*  Calendar date utilities                                            */
/* ------------------------------------------------------------------ */

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number) {
  return new Date(year, month, 1).getDay(); // 0=Sun
}

function getWeekStart(date: Date) {
  const d = new Date(date);
  const day = d.getDay(); // 0=Sun
  d.setDate(d.getDate() - day);
  d.setHours(0, 0, 0, 0);
  return d;
}

function addDays(date: Date, n: number) {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

/* Build map: dateKey -> interviews */
function buildInterviewMap(interviews: Interview[]) {
  const map: Record<string, Interview[]> = {};
  interviews.forEach((iv) => {
    if (iv.scheduled_date) {
      if (!map[iv.scheduled_date]) map[iv.scheduled_date] = [];
      map[iv.scheduled_date].push(iv);
    }
  });
  return map;
}

const today = new Date();
today.setHours(0, 0, 0, 0);

/* ------------------------------------------------------------------ */
/*  Sub-components                                                     */
/* ------------------------------------------------------------------ */

/* ---------- Avatar helper ---------- */
function Avatar({ interview, size = "md" }: { interview: Interview; size?: "sm" | "md" | "lg" }) {
  const sizeClass = size === "lg" ? "h-14 w-14 text-2xl" : size === "md" ? "h-10 w-10 text-xs" : "h-8 w-8 text-[10px]";
  const isFlag = interview.worker_avatar_url?.startsWith("flag:");
  if (isFlag) {
    const emoji = interview.worker_avatar_url!.replace("flag:", "");
    return (
      <div className={`flex ${sizeClass} shrink-0 items-center justify-center rounded-full bg-accent/50`}>
        {emoji}
      </div>
    );
  }
  return (
    <div className={`flex ${sizeClass} shrink-0 items-center justify-center rounded-full bg-secondary/20 font-bold text-primary`}>
      {initials(interview.worker_name)}
    </div>
  );
}

/* ---------- Interview Card (List View) ---------- */
function InterviewCard({
  interview,
  onSelect,
  onMessage,
  faded,
}: {
  interview: Interview;
  onSelect: (iv: Interview) => void;
  onMessage: (workerUserId: string | null) => void;
  faded?: boolean;
}) {
  const cardRouter = useRouter();
  return (
    <div
      className={`w-full rounded-2xl border border-accent/40 bg-white p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md hover:border-secondary/30 ${faded ? "opacity-50" : ""}`}
    >
      <div className="flex items-start justify-between">
        <button onClick={() => onSelect(interview)} className="flex items-start gap-4 text-left flex-1 min-w-0">
          <Avatar interview={interview} />
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-primary">
                {interview.worker_name}
              </h3>
              <InterviewStatusBadge status={interview.status} />
            </div>
            <p className="mt-0.5 text-sm text-foreground/60">
              {interview.job_title}
            </p>
            <p className="mt-0.5 text-xs text-foreground/40">
              {interview.worker_location}
            </p>
            {interview.scheduled_date && interview.scheduled_start_time && (
              <p className="mt-2 text-sm font-semibold text-primary">
                {formatDate(interview.scheduled_date)} at{" "}
                {formatTime12(interview.scheduled_start_time)} &ndash;{" "}
                {formatTime12(interview.scheduled_end_time!)}
              </p>
            )}
          </div>
        </button>
        {/* Quick action icons */}
        <div className="flex items-center gap-1 shrink-0 ml-3">
          <button
            onClick={() => onSelect(interview)}
            title="View Profile"
            className="rounded-xl p-2 text-foreground/40 hover:bg-secondary/10 hover:text-primary transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </button>
          {interview.worker_resume_url && (
            <a
              href={interview.worker_resume_url}
              target="_blank"
              rel="noopener noreferrer"
              title="View Resume"
              onClick={(e) => e.stopPropagation()}
              className="rounded-xl p-2 text-foreground/40 hover:bg-secondary/10 hover:text-primary transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </a>
          )}
          <button
            title="Message"
            onClick={(e) => { e.stopPropagation(); onMessage(interview.worker_user_id); }}
            className="rounded-xl p-2 text-foreground/40 hover:bg-secondary/10 hover:text-primary transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          </button>
          {interview.status === "live" && (
            <button
              onClick={(e) => { e.stopPropagation(); cardRouter.push(`/business/interviews/${interview.id}`); }}
              className="rounded-xl bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white whitespace-nowrap ml-1 transition-colors hover:bg-emerald-700 flex items-center gap-1.5"
            >
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-white" />
              </span>
              Join Call
            </button>
          )}
          {interview.status === "scheduled" && (
            <button
              onClick={(e) => { e.stopPropagation(); cardRouter.push(`/business/interviews/${interview.id}`); }}
              className="rounded-xl bg-secondary px-3 py-1.5 text-xs font-semibold text-white whitespace-nowrap ml-1 transition-colors hover:bg-secondary/90"
            >
              Join Call
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/* ---------- Applicant Info Panel ---------- */
function ApplicantPanel({
  interview,
  onClose,
  onSendOffer,
  onReschedule,
  onCancel,
  actionLoading,
  actionFeedback,
  onMessage,
}: {
  interview: Interview;
  onClose: () => void;
  onSendOffer: () => void;
  onReschedule: () => void;
  onCancel: () => void;
  actionLoading: string | null;
  actionFeedback: { type: "success" | "error"; message: string } | null;
  onMessage: (workerUserId: string | null) => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-end">
      {/* overlay */}
      <div
        className="absolute inset-0 bg-black/20"
        onClick={onClose}
      />
      {/* panel */}
      <div className="relative z-10 h-full w-full max-w-md overflow-y-auto bg-white shadow-xl border-l border-accent/40">
        {/* header */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-accent/40 bg-white px-6 py-4">
          <h2 className="text-lg font-bold text-primary">Applicant Details</h2>
          <button
            onClick={onClose}
            className="rounded-xl p-1.5 text-foreground/40 hover:bg-accent/50 hover:text-foreground/70 transition-colors"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <div className="space-y-6 p-6">
          {/* Avatar + name */}
          <div className="flex items-center gap-4">
            <Avatar interview={interview} size="lg" />
            <div>
              <h3 className="text-lg font-semibold text-primary">
                {interview.worker_name}
              </h3>
              <p className="text-sm text-foreground/60">
                {interview.worker_location}
              </p>
              <p className="text-sm text-foreground/50">
                {interview.worker_email}
              </p>
            </div>
          </div>

          {/* Quick action bar — Profile, Resume, Message */}
          <div className="flex gap-2">
            {interview.worker_profile_id ? (
              <a
                href={`/business/workers/${interview.worker_profile_id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-accent/50 bg-accent/20 py-2.5 text-sm font-semibold text-primary hover:bg-accent/40 transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                Profile
              </a>
            ) : (
              <button disabled className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-accent/30 bg-accent/10 py-2.5 text-sm font-semibold text-foreground/30 cursor-not-allowed">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                Profile
              </button>
            )}
            {interview.worker_resume_url ? (
              <a
                href={interview.worker_resume_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-accent/50 bg-accent/20 py-2.5 text-sm font-semibold text-primary hover:bg-accent/40 transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Resume
              </a>
            ) : (
              <span className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-accent/30 bg-accent/10 py-2.5 text-sm font-semibold text-foreground/30 cursor-not-allowed">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                No Resume
              </span>
            )}
            <button
              onClick={() => onMessage(interview.worker_user_id)}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-primary py-2.5 text-sm font-semibold text-white hover:bg-primary/90 transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              Message
            </button>
          </div>

          {/* Resume file indicator */}
          {interview.worker_resume_url && (
            <a
              href={interview.worker_resume_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 rounded-xl border border-accent/40 bg-accent/10 p-3 hover:bg-accent/20 transition-colors group"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-100 text-red-600">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-primary truncate">
                  {interview.worker_name.replace(/\s+/g, "-").toLowerCase()}-resume.pdf
                </p>
                <p className="text-xs text-foreground/40">PDF Document</p>
              </div>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-foreground/30 group-hover:text-primary transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
            </a>
          )}

          {/* Job + Status */}
          <div className="rounded-xl border border-accent/40 bg-accent/20 p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium uppercase tracking-wider text-foreground/50">
                Applied for
              </span>
              <InterviewStatusBadge status={interview.status} />
            </div>
            <p className="font-semibold text-primary">{interview.job_title}</p>
            {interview.scheduled_date && interview.scheduled_start_time && (
              <p className="text-sm text-foreground/60">
                {formatDate(interview.scheduled_date)} at{" "}
                {formatTime12(interview.scheduled_start_time)} &ndash;{" "}
                {formatTime12(interview.scheduled_end_time!)}
              </p>
            )}
          </div>

          {/* Quick stats */}
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-xl border border-accent/40 bg-white p-3 text-center">
              <p className="text-lg font-bold text-primary">
                {interview.years_experience}
              </p>
              <p className="text-xs text-foreground/50">Yrs Exp</p>
            </div>
            <div className="rounded-xl border border-accent/40 bg-white p-3 text-center">
              <p className="text-lg font-bold text-primary">
                {interview.languages.length}
              </p>
              <p className="text-xs text-foreground/50">Languages</p>
            </div>
            <div className="rounded-xl border border-accent/40 bg-white p-3 text-center">
              <p className="text-lg font-bold text-primary">
                {interview.worker_skills.length}
              </p>
              <p className="text-xs text-foreground/50">Skills</p>
            </div>
          </div>

          {/* Skills */}
          <div>
            <h4 className="text-sm font-semibold uppercase tracking-wider text-foreground/50 mb-2">
              Skills
            </h4>
            <div className="flex flex-wrap gap-2">
              {interview.worker_skills.map((skill) => (
                <span
                  key={skill}
                  className="rounded-full bg-secondary/10 px-3 py-1 text-xs font-medium text-primary"
                >
                  {skill}
                </span>
              ))}
            </div>
          </div>

          {/* Languages */}
          <div>
            <h4 className="text-sm font-semibold uppercase tracking-wider text-foreground/50 mb-2">
              Languages
            </h4>
            <p className="text-sm text-foreground/70">
              {interview.languages.join(", ")}
            </p>
          </div>

          {/* Cover letter */}
          <div>
            <h4 className="text-sm font-semibold uppercase tracking-wider text-foreground/50 mb-2">
              Cover Letter
            </h4>
            <p className="text-sm leading-relaxed text-foreground/70">
              {interview.cover_letter}
            </p>
          </div>

          {/* Action feedback */}
          {actionFeedback && (
            <div className={`rounded-xl px-4 py-3 text-sm font-medium ${
              actionFeedback.type === "success" ? "bg-green-50 text-green-700 border border-green-200" : "bg-red-50 text-red-700 border border-red-200"
            }`}>
              {actionFeedback.message}
            </div>
          )}

          {/* Action buttons */}
          <div className="space-y-2 pt-2">
            <button
              onClick={onSendOffer}
              disabled={actionLoading === "offer"}
              className="w-full rounded-xl bg-secondary py-2.5 text-sm font-semibold text-white hover:bg-secondary/90 transition-all hover:-translate-y-0.5 disabled:opacity-50"
            >
              {actionLoading === "offer" ? "Sending Offer..." : "Send Offer"}
            </button>
            <div className="flex gap-2">
              <button
                onClick={onReschedule}
                disabled={!!actionLoading}
                className="flex-1 rounded-xl border border-accent/50 py-2.5 text-sm font-semibold text-primary hover:bg-accent/30 transition-colors disabled:opacity-50"
              >
                {actionLoading === "reschedule" ? "Rescheduling..." : "Reschedule"}
              </button>
              <button
                onClick={onCancel}
                disabled={!!actionLoading}
                className="flex-1 rounded-xl border border-red-200 py-2.5 text-sm font-semibold text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
              >
                {actionLoading === "cancel" ? "Cancelling..." : "Cancel Interview"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------- Monthly Calendar ---------- */
function MonthlyCalendar({
  year,
  month,
  selectedDate,
  onSelectDate,
  interviewsByDate,
}: {
  year: number;
  month: number;
  selectedDate: Date | null;
  onSelectDate: (d: Date) => void;
  interviewsByDate: Record<string, Interview[]>;
}) {
  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);
  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const cells: (number | null)[] = [];

  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  return (
    <div>
      <div className="grid grid-cols-7 gap-px">
        {dayNames.map((dn) => (
          <div
            key={dn}
            className="py-2 text-center text-xs font-semibold uppercase tracking-wider text-foreground/50"
          >
            {dn}
          </div>
        ))}
        {cells.map((day, idx) => {
          if (day === null) {
            return <div key={`empty-${idx}`} className="h-14" />;
          }
          const cellDate = new Date(year, month, day);
          const key = toDateKey(cellDate);
          const interviews = interviewsByDate[key] || [];
          const isToday = isSameDay(cellDate, today);
          const isSelected =
            selectedDate !== null && isSameDay(cellDate, selectedDate);

          return (
            <button
              key={key}
              onClick={() => onSelectDate(cellDate)}
              className={`relative flex h-14 flex-col items-center justify-center rounded-xl transition-colors
                ${isSelected ? "bg-secondary text-white" : isToday ? "ring-2 ring-secondary/50" : "hover:bg-accent/30"}
              `}
            >
              <span
                className={`text-sm font-medium ${isSelected ? "text-white" : "text-primary"}`}
              >
                {day}
              </span>
              {interviews.length > 0 && (
                <div className="mt-0.5 flex gap-0.5">
                  {interviews.slice(0, 3).map((iv) => (
                    <span
                      key={iv.id}
                      className={`block h-1.5 w-1.5 rounded-full ${isSelected ? "bg-white/80" : statusDotColor[iv.status]}`}
                    />
                  ))}
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ---------- Weekly Calendar ---------- */
function WeeklyCalendar({
  weekStart,
  selectedDate,
  onSelectDate,
  onSelectInterview,
  interviewsByDate,
}: {
  weekStart: Date;
  selectedDate: Date | null;
  onSelectDate: (d: Date) => void;
  onSelectInterview: (iv: Interview) => void;
  interviewsByDate: Record<string, Interview[]>;
}) {
  const hours = Array.from({ length: 12 }, (_, i) => i + 7); // 7 AM - 6 PM
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[700px]">
        {/* Day headers */}
        <div className="grid grid-cols-[60px_repeat(7,1fr)] border-b border-accent/40">
          <div />
          {days.map((d) => {
            const isToday = isSameDay(d, today);
            const isSelected =
              selectedDate !== null && isSameDay(d, selectedDate);
            return (
              <button
                key={toDateKey(d)}
                onClick={() => onSelectDate(d)}
                className={`flex flex-col items-center py-2 transition-colors ${isSelected ? "bg-secondary/10" : ""}`}
              >
                <span className="text-xs font-medium uppercase text-foreground/50">
                  {d.toLocaleDateString("en-US", { weekday: "short" })}
                </span>
                <span
                  className={`mt-0.5 flex h-7 w-7 items-center justify-center rounded-full text-sm font-semibold
                    ${isSelected ? "bg-secondary text-white" : isToday ? "ring-2 ring-secondary/50 text-primary" : "text-primary"}
                  `}
                >
                  {d.getDate()}
                </span>
              </button>
            );
          })}
        </div>

        {/* Time grid */}
        <div className="grid grid-cols-[60px_repeat(7,1fr)]">
          {hours.map((hour) => (
            <div key={hour} className="contents">
              <div className="flex h-16 items-start justify-end pr-2 pt-1 text-xs text-foreground/40">
                {formatTime12(`${hour}:00`)}
              </div>
              {days.map((d) => {
                const key = toDateKey(d);
                const dayInterviews = interviewsByDate[key] || [];
                const atHour = dayInterviews.filter(
                  (iv) => iv.scheduled_start_time && parseHour(iv.scheduled_start_time) === hour
                );
                // Assign side-by-side lanes only when events genuinely overlap
                // in time. Consecutive bookings in the same hour (e.g. 1:00 +
                // 1:30) get separate vertical slots from top/height alone.
                const lanes = assignLanes(atHour);
                const laneCount = lanes.reduce((max, l) => Math.max(max, l + 1), 1);
                return (
                  <div
                    key={`${key}-${hour}`}
                    className="relative h-16 border-l border-t border-accent/40"
                  >
                    {atHour.map((iv, idx) => {
                      const startMin = timeToMinutes(iv.scheduled_start_time!);
                      const endMin = iv.scheduled_end_time
                        ? timeToMinutes(iv.scheduled_end_time)
                        : startMin + 30;
                      const hourStart = hour * 60;
                      const topPct = ((startMin - hourStart) / 60) * 100;
                      // Clamp so events that overflow into the next hour
                      // don't visually leak over the row below.
                      const rawHeight = ((endMin - startMin) / 60) * 100;
                      const heightPct = Math.min(rawHeight, 100 - topPct);
                      const lane = lanes[idx];
                      const leftPct = (lane / laneCount) * 100;
                      const widthPct = 100 / laneCount;
                      const duration = endMin - startMin;
                      return (
                        <button
                          key={iv.id}
                          onClick={() => onSelectInterview(iv)}
                          className={`absolute rounded-lg border-l-2 px-1.5 py-0.5 text-left transition-opacity hover:opacity-80 ${statusBlockColor[iv.status]}`}
                          style={{
                            top: `calc(${topPct}% + 2px)`,
                            height: `calc(${heightPct}% - 4px)`,
                            left: `calc(${leftPct}% + 2px)`,
                            width: `calc(${widthPct}% - 4px)`,
                          }}
                        >
                          <p className="truncate text-[10px] font-semibold leading-tight">
                            {iv.worker_name}
                          </p>
                          {duration >= 25 && (
                            <p className="truncate text-[10px] leading-tight opacity-70">
                              {formatTime12(iv.scheduled_start_time!)}
                            </p>
                          )}
                        </button>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Client Component                                              */
/* ------------------------------------------------------------------ */

interface InterviewsClientProps {
  initialInterviews: Interview[];
  currentUserId: string | null;
}

export default function InterviewsClient({ initialInterviews, currentUserId }: InterviewsClientProps) {
  const [view, setView] = useState<"list" | "calendar">("list");
  const toISO = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  };
  const [printDate, setPrintDate] = useState<string>(() => toISO(new Date()));
  const [printRangeStart, setPrintRangeStart] = useState<string>(() => toISO(new Date()));
  const [printRangeEnd, setPrintRangeEnd] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 6);
    return toISO(d);
  });
  const rangeValid = printRangeStart && printRangeEnd && printRangeStart <= printRangeEnd;
  const [calendarMode, setCalendarMode] = useState<"month" | "week">("month");
  const [selectedInterview, setSelectedInterview] = useState<Interview | null>(null);
  const [calYear, setCalYear] = useState(today.getFullYear());
  const [calMonth, setCalMonth] = useState(today.getMonth());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [weekStart, setWeekStart] = useState<Date>(getWeekStart(today));
  const [interviews, setInterviews] = useState<Interview[]>(initialInterviews);
  const router = useRouter();

  const interviewsByDate = buildInterviewMap(interviews);

  const [scheduledSort, setScheduledSort] = useState<"date" | "listing">("date");

  /* ---- list sections ---- */
  const todayStr = new Date().toISOString().slice(0, 10);

  const liveNow = interviews.filter((i) => i.status === "live");

  // Build a sortable key per interview so ties broken on date fall
  // through to time, then listing. Missing dates sort last so the
  // upcoming list always shows the next interview first.
  const dateTimeKey = (i: Interview) => {
    const d = i.scheduled_date || "9999-12-31";
    const t = i.scheduled_start_time || "99:99";
    return `${d}T${t}`;
  };
  const scheduledBase = interviews.filter(
    (i) => i.status === "scheduled" && (!i.scheduled_date || i.scheduled_date >= todayStr)
  );
  const scheduled = [...scheduledBase].sort((a, b) => {
    if (scheduledSort === "listing") {
      const ta = (a.job_title || "").toLowerCase();
      const tb = (b.job_title || "").toLowerCase();
      const cmp = ta.localeCompare(tb);
      if (cmp !== 0) return cmp;
      return dateTimeKey(a).localeCompare(dateTimeKey(b));
    }
    return dateTimeKey(a).localeCompare(dateTimeKey(b));
  });

  const awaiting = interviews.filter((i) => i.status === "invited");

  // Reschedule requests — needs business action
  const rescheduleRequests = interviews.filter(
    (i) => i.status === "reschedule_requested" || (i.status === "missed" && i.scheduled_date && i.scheduled_date < todayStr)
  );

  // Missed/past-date scheduled interviews
  const missedScheduled = interviews.filter(
    (i) => i.status === "scheduled" && i.scheduled_date && i.scheduled_date < todayStr
  );

  const past = interviews.filter(
    (i) => i.status === "completed" || i.status === "cancelled" || i.status === "declined"
  );

  const [respondingId, setRespondingId] = useState<string | null>(null);
  const [panelActionLoading, setPanelActionLoading] = useState<string | null>(null);
  const [actionFeedback, setActionFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [messagingWorker, setMessagingWorker] = useState<string | null>(null);
  const [showPast, setShowPast] = useState(false);

  const handleMessageWorker = async (workerUserId: string | null) => {
    if (!workerUserId || !currentUserId || messagingWorker) return;
    setMessagingWorker(workerUserId);
    try {
      const res = await fetch("/api/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetUserId: workerUserId }),
      });
      const data = await res.json();
      if (res.ok && data.conversationId) {
        router.push(`/business/messages?conv=${data.conversationId}`);
      }
    } catch (err) {
      console.error("Error starting conversation:", err);
    } finally {
      setMessagingWorker(null);
    }
  };

  // Panel action handlers
  const handleSendOffer = async () => {
    if (!selectedInterview) return;
    setPanelActionLoading("offer");
    setActionFeedback(null);
    try {
      const res = await fetch("/api/applications/send-offer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ interviewId: selectedInterview.id }),
      });
      if (res.ok) {
        setInterviews((prev) => prev.map((i) => i.id === selectedInterview.id ? { ...i, status: "completed" as const } : i));
        setActionFeedback({ type: "success", message: "Offer sent successfully!" });
        setTimeout(() => { setSelectedInterview(null); setActionFeedback(null); }, 1500);
      } else {
        const err = await res.json().catch(() => ({ error: "Unknown error" }));
        setActionFeedback({ type: "error", message: err.error || "Failed to send offer" });
      }
    } catch (err) {
      console.error("Send offer failed:", err);
      setActionFeedback({ type: "error", message: "Failed to send offer. Please try again." });
    }
    setPanelActionLoading(null);
  };

  const handlePanelReschedule = async () => {
    if (!selectedInterview) return;
    setPanelActionLoading("reschedule");
    setActionFeedback(null);
    try {
      const res = await fetch("/api/interviews/reschedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ interview_id: selectedInterview.id }),
      });
      if (res.ok) {
        setInterviews((prev) => prev.map((i) => i.id === selectedInterview.id ? { ...i, status: "rescheduled" as const } : i));
        setActionFeedback({ type: "success", message: "Interview rescheduled. Worker will be notified." });
        setTimeout(() => { setSelectedInterview(null); setActionFeedback(null); }, 1500);
      } else {
        const err = await res.json().catch(() => ({ error: "Unknown error" }));
        setActionFeedback({ type: "error", message: err.error || "Failed to reschedule" });
      }
    } catch (err) {
      console.error("Reschedule failed:", err);
      setActionFeedback({ type: "error", message: "Failed to reschedule. Please try again." });
    }
    setPanelActionLoading(null);
  };

  const handlePanelCancel = async () => {
    if (!selectedInterview) return;
    if (!confirm("Are you sure you want to cancel this interview? The worker will be notified.")) return;
    setPanelActionLoading("cancel");
    setActionFeedback(null);
    try {
      const res = await fetch("/api/interviews/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ interview_id: selectedInterview.id }),
      });
      if (res.ok) {
        setInterviews((prev) => prev.map((i) => i.id === selectedInterview.id ? { ...i, status: "cancelled" as const } : i));
        setActionFeedback({ type: "success", message: "Interview cancelled. Worker notified." });
        setTimeout(() => { setSelectedInterview(null); setActionFeedback(null); }, 1500);
      } else {
        const err = await res.json().catch(() => ({ error: "Unknown error" }));
        setActionFeedback({ type: "error", message: err.error || "Failed to cancel" });
      }
    } catch (err) {
      console.error("Cancel failed:", err);
      setActionFeedback({ type: "error", message: "Failed to cancel. Please try again." });
    }
    setPanelActionLoading(null);
  };

  /* ---- calendar nav ---- */
  const monthLabel = new Date(calYear, calMonth).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  const weekLabel = (() => {
    const end = addDays(weekStart, 6);
    const fmt = (d: Date) =>
      d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    return `${fmt(weekStart)} — ${fmt(end)}, ${end.getFullYear()}`;
  })();

  function prevMonth() {
    if (calMonth === 0) {
      setCalMonth(11);
      setCalYear(calYear - 1);
    } else {
      setCalMonth(calMonth - 1);
    }
  }
  function nextMonth() {
    if (calMonth === 11) {
      setCalMonth(0);
      setCalYear(calYear + 1);
    } else {
      setCalMonth(calMonth + 1);
    }
  }
  function prevWeek() {
    setWeekStart(addDays(weekStart, -7));
  }
  function nextWeek() {
    setWeekStart(addDays(weekStart, 7));
  }
  function goToday() {
    setCalYear(today.getFullYear());
    setCalMonth(today.getMonth());
    setWeekStart(getWeekStart(today));
    setSelectedDate(new Date(today));
  }

  /* interviews for selected calendar day */
  const selectedDayInterviews = selectedDate
    ? interviewsByDate[toDateKey(selectedDate)] || []
    : [];

  /* ---- render ---- */
  return (
    <div className="mx-auto max-w-5xl">
      {/* Corporate gradient header */}
      <div
        className="relative -mx-6 -mt-6 mb-8 overflow-hidden rounded-2xl px-8 py-10 sm:px-10 sm:py-12">
        <div className="absolute inset-0 bg-gradient-to-br from-[#0a1e33] via-[#0f2942] to-[#132d4a]" />
        <div className="pointer-events-none absolute -right-12 -top-12 h-48 w-48 rounded-3xl bg-secondary/8 blur-2xl rotate-12" />
        <div className="pointer-events-none absolute bottom-0 left-1/3 h-32 w-64 rounded-full bg-secondary/6 blur-3xl" />
        <div className="pointer-events-none absolute right-0 bottom-0 h-24 w-24 rounded-2xl bg-highlight/5 blur-xl" />
        <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: "radial-gradient(circle at 1px 1px, white 1px, transparent 0)", backgroundSize: "32px 32px" }} />

        <div className="relative flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <svg className="h-4 w-4 text-secondary/70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.069A1 1 0 0121 8.82v6.36a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              <span className="text-xs font-medium uppercase tracking-widest text-secondary/70">Candidate Review</span>
            </div>
            <h1 className="text-2xl font-bold text-white">Interviews</h1>
            <p className="mt-1 text-sm text-white/50">
              View and manage your upcoming and past interviews.
            </p>
          </div>
          <button
            onClick={() => setView(view === "list" ? "calendar" : "list")}
            className="shrink-0 flex items-center gap-2 rounded-xl bg-white/10 border border-white/20 px-4 py-2 text-sm font-semibold text-white transition-all hover:bg-white/20 hover:-translate-y-0.5"
          >
            {view === "list" ? (
              <>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
                Calendar View
              </>
            ) : (
              <>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M4 6h16M4 12h16M4 18h16"
                  />
                </svg>
                List View
              </>
            )}
          </button>
        </div>

        {/* Print actions */}
        <div className="relative mt-5 flex flex-wrap items-center gap-2">
          <span className="text-[11px] font-semibold uppercase tracking-widest text-white/40">
            Print schedule
          </span>
          <input
            type="date"
            value={printDate}
            onChange={(e) => setPrintDate(e.target.value)}
            className="rounded-lg bg-white/10 border border-white/15 px-2 py-1.5 text-xs font-medium text-white [color-scheme:dark] focus:bg-white/15 focus:outline-none"
            aria-label="Date to print"
          />
          <a
            href={`/business/interviews/print?view=day&date=${printDate}`}
            target="_blank"
            rel="noopener"
            className="inline-flex items-center gap-1.5 rounded-lg bg-white/10 border border-white/15 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-white/20"
          >
            <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            Print day
          </a>
          <a
            href={`/business/interviews/print?view=week&date=${printDate}`}
            target="_blank"
            rel="noopener"
            className="inline-flex items-center gap-1.5 rounded-lg bg-white/10 border border-white/15 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-white/20"
          >
            <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            Print week
          </a>
        </div>

        {/* Custom date range */}
        <div className="relative mt-2 flex flex-wrap items-center gap-2">
          <span className="text-[11px] font-semibold uppercase tracking-widest text-white/40">
            Custom range
          </span>
          <input
            type="date"
            value={printRangeStart}
            onChange={(e) => setPrintRangeStart(e.target.value)}
            className="rounded-lg bg-white/10 border border-white/15 px-2 py-1.5 text-xs font-medium text-white [color-scheme:dark] focus:bg-white/15 focus:outline-none"
            aria-label="Range start"
          />
          <span className="text-white/40 text-xs">to</span>
          <input
            type="date"
            value={printRangeEnd}
            min={printRangeStart}
            onChange={(e) => setPrintRangeEnd(e.target.value)}
            className="rounded-lg bg-white/10 border border-white/15 px-2 py-1.5 text-xs font-medium text-white [color-scheme:dark] focus:bg-white/15 focus:outline-none"
            aria-label="Range end"
          />
          <a
            href={rangeValid
              ? `/business/interviews/print?view=range&start=${printRangeStart}&end=${printRangeEnd}`
              : undefined}
            target="_blank"
            rel="noopener"
            aria-disabled={!rangeValid}
            onClick={(e) => { if (!rangeValid) e.preventDefault(); }}
            className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold text-white transition-colors ${
              rangeValid
                ? "bg-white/10 border-white/15 hover:bg-white/20"
                : "bg-white/5 border-white/10 opacity-50 cursor-not-allowed"
            }`}
          >
            <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            Print range
          </a>
        </div>
      </div>

      {/* ============================================================ */}
      {/*  LIST VIEW                                                    */}
      {/* ============================================================ */}
      {view === "list" && (
        <div className="space-y-8">
          {/* Live Now */}
          {liveNow.length > 0 && (
            <section>
              <div className="flex items-center gap-3 mb-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-400/15">
                  <span className="relative flex h-3 w-3">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex h-3 w-3 rounded-full bg-emerald-500" />
                  </span>
                </div>
                <h2 className="text-lg font-semibold text-primary">
                  Live Now
                  <span className="ml-2 text-sm font-normal text-foreground/40">({liveNow.length})</span>
                </h2>
              </div>
              <div className="space-y-3">
                {liveNow.map((iv) => (
                  <div
                    key={iv.id}
                    className="rounded-2xl border-2 border-emerald-300 bg-emerald-50/50 p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
                  >
                    <div className="flex items-start justify-between">
                      <button onClick={() => setSelectedInterview(iv)} className="flex items-start gap-4 text-left flex-1 min-w-0">
                        <Avatar interview={iv} />
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold text-primary">{iv.worker_name}</h3>
                            <InterviewStatusBadge status={iv.status} />
                          </div>
                          <p className="mt-0.5 text-sm text-foreground/60">{iv.job_title}</p>
                          {iv.room_expires_at && (
                            <p className="mt-1 text-xs text-emerald-600">
                              Waiting for worker to accept...
                            </p>
                          )}
                        </div>
                      </button>
                      <div className="flex items-center gap-2 shrink-0 ml-3">
                        <button
                          onClick={() => router.push(`/business/interviews/${iv.id}`)}
                          className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white whitespace-nowrap transition-colors hover:bg-emerald-700 flex items-center gap-2"
                        >
                          <span className="relative flex h-2 w-2">
                            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-75" />
                            <span className="relative inline-flex h-2 w-2 rounded-full bg-white" />
                          </span>
                          Join Call
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Scheduled */}
          <section>
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-foreground/50">
                Scheduled ({scheduled.length})
              </h2>
              {scheduled.length > 1 && (
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-foreground/40">Sort by</span>
                  <div className="inline-flex overflow-hidden rounded-lg border border-accent/40">
                    <button
                      type="button"
                      onClick={() => setScheduledSort("date")}
                      className={`px-2.5 py-1 font-medium transition-colors ${
                        scheduledSort === "date"
                          ? "bg-primary text-white"
                          : "bg-white text-foreground/60 hover:bg-accent/10"
                      }`}
                    >
                      Date &amp; time
                    </button>
                    <button
                      type="button"
                      onClick={() => setScheduledSort("listing")}
                      className={`px-2.5 py-1 font-medium border-l border-accent/40 transition-colors ${
                        scheduledSort === "listing"
                          ? "bg-primary text-white"
                          : "bg-white text-foreground/60 hover:bg-accent/10"
                      }`}
                    >
                      Listing
                    </button>
                  </div>
                </div>
              )}
            </div>
            <div className="space-y-3">
              {scheduled.length === 0 ? (
                <div className="rounded-2xl border border-accent/40 bg-white p-8 text-center shadow-sm">
                  <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-xl bg-accent/20">
                    <svg className="h-5 w-5 text-foreground/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <p className="text-sm text-foreground/50">
                    No scheduled interviews yet.
                  </p>
                </div>
              ) : (
                scheduled.map((iv) => (
                  <InterviewCard
                    key={iv.id}
                    interview={iv}
                    onSelect={setSelectedInterview}
                    onMessage={handleMessageWorker}
                  />
                ))
              )}
            </div>
          </section>

          {/* Awaiting Confirmation */}
          <section>
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-foreground/50">
              Awaiting Confirmation ({awaiting.length})
            </h2>
            <div className="space-y-3">
              {awaiting.length === 0 ? (
                <div className="rounded-2xl border border-accent/40 bg-white p-8 text-center shadow-sm">
                  <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-xl bg-accent/20">
                    <svg className="h-5 w-5 text-foreground/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <p className="text-sm text-foreground/50">
                    No pending invitations.
                  </p>
                </div>
              ) : (
                awaiting.map((iv) => (
                  <InterviewCard
                    key={iv.id}
                    interview={iv}
                    onSelect={setSelectedInterview}
                    onMessage={handleMessageWorker}
                  />
                ))
              )}
            </div>
          </section>

          {/* Reschedule Requests */}
          {rescheduleRequests.length > 0 && (
            <section>
              <div className="flex items-center gap-3 mb-4">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-400/15">
                  <span className="block h-2.5 w-2.5 rounded-full bg-amber-400" />
                </div>
                <h2 className="text-lg font-semibold text-primary">
                  Reschedule Requests
                  <span className="ml-2 text-sm font-normal text-foreground/40">({rescheduleRequests.length})</span>
                </h2>
              </div>
              <div className="space-y-3">
                {rescheduleRequests.map((iv) => (
                  <div key={iv.id} className="rounded-xl border border-amber-200 bg-amber-50/30 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-primary">{iv.worker_name}</p>
                        <p className="text-xs text-foreground/60">{iv.job_title}</p>
                        {iv.scheduled_date && (
                          <p className="mt-1 text-xs text-foreground/40">
                            Original date: {new Date(iv.scheduled_date + "T00:00:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {respondingId === iv.id ? (
                          <span className="h-5 w-5 animate-spin rounded-full border-2 border-secondary/30 border-t-secondary" />
                        ) : (
                          <>
                            <button
                              onClick={async () => {
                                setRespondingId(iv.id);
                                try {
                                  const res = await fetch("/api/interviews/reschedule-respond", {
                                    method: "POST",
                                    headers: { "Content-Type": "application/json" },
                                    body: JSON.stringify({ interviewId: iv.id, action: "approve" }),
                                  });
                                  if (res.ok) {
                                    setInterviews((prev) => prev.map((i) => i.id === iv.id ? { ...i, status: "invited" as const } : i));
                                  }
                                } catch { /* ignore */ }
                                setRespondingId(null);
                              }}
                              className="rounded-lg bg-green-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-green-700 transition-colors"
                            >
                              Approve
                            </button>
                            <button
                              onClick={async () => {
                                setRespondingId(iv.id);
                                try {
                                  const res = await fetch("/api/interviews/reschedule-respond", {
                                    method: "POST",
                                    headers: { "Content-Type": "application/json" },
                                    body: JSON.stringify({ interviewId: iv.id, action: "decline", declineReason: "Unable to reschedule at this time." }),
                                  });
                                  if (res.ok) {
                                    setInterviews((prev) => prev.map((i) => i.id === iv.id ? { ...i, status: "declined" as const } : i));
                                  } else {
                                    const data = await res.json().catch(() => ({}));
                                    alert(data.error || "Failed to decline reschedule request.");
                                  }
                                } catch (err) {
                                  console.error("Decline failed:", err);
                                  alert("Failed to decline reschedule request. Please try again.");
                                }
                                setRespondingId(null);
                              }}
                              className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50 transition-colors"
                            >
                              Decline
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Past */}
          {past.length > 0 && (
            <section>
              <button
                onClick={() => setShowPast(!showPast)}
                className="flex w-full items-center justify-between rounded-xl border border-accent/40 bg-white px-5 py-3 text-left transition-colors hover:bg-accent/10"
              >
                <h2 className="text-sm font-semibold uppercase tracking-wider text-foreground/50">
                  Past ({past.length})
                </h2>
                <svg
                  className={`h-4 w-4 text-foreground/40 transition-transform duration-200 ${showPast ? "rotate-180" : ""}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {showPast && (
                <div className="mt-3 space-y-3">
                  {past.map((iv) => (
                    <InterviewCard
                      key={iv.id}
                      interview={iv}
                      onSelect={setSelectedInterview}
                      onMessage={handleMessageWorker}
                      faded
                    />
                  ))}
                </div>
              )}
            </section>
          )}
        </div>
      )}

      {/* ============================================================ */}
      {/*  CALENDAR VIEW                                                */}
      {/* ============================================================ */}
      {view === "calendar" && (
        <div>
          {/* Calendar card */}
          <div className="rounded-2xl border border-accent/40 bg-white overflow-hidden shadow-sm">
            {/* Dark header */}
            <div className="bg-primary px-5 py-4">
              <div className="flex items-center justify-between">
                {/* Month/Week toggle */}
                <div className="flex items-center gap-1 rounded-xl bg-white/10 p-0.5">
                  <button
                    onClick={() => setCalendarMode("month")}
                    className={`rounded-lg px-3 py-1 text-xs font-semibold transition-colors ${
                      calendarMode === "month"
                        ? "bg-white text-primary"
                        : "text-white/70 hover:text-white"
                    }`}
                  >
                    Month
                  </button>
                  <button
                    onClick={() => setCalendarMode("week")}
                    className={`rounded-lg px-3 py-1 text-xs font-semibold transition-colors ${
                      calendarMode === "week"
                        ? "bg-white text-primary"
                        : "text-white/70 hover:text-white"
                    }`}
                  >
                    Week
                  </button>
                </div>

                {/* Title + Nav */}
                <div className="flex items-center gap-3">
                  <button
                    onClick={calendarMode === "month" ? prevMonth : prevWeek}
                    className="rounded-xl p-1.5 text-white/70 hover:bg-white/10 hover:text-white"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-4 w-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M15 19l-7-7 7-7"
                      />
                    </svg>
                  </button>
                  <span className="min-w-[180px] text-center text-sm font-semibold text-white">
                    {calendarMode === "month" ? monthLabel : weekLabel}
                  </span>
                  <button
                    onClick={calendarMode === "month" ? nextMonth : nextWeek}
                    className="rounded-xl p-1.5 text-white/70 hover:bg-white/10 hover:text-white"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-4 w-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M9 5l7 7-7 7"
                      />
                    </svg>
                  </button>
                </div>

                {/* Today button */}
                <button
                  onClick={goToday}
                  className="rounded-xl border border-white/20 px-3 py-1 text-xs font-semibold text-white hover:bg-white/10"
                >
                  Today
                </button>
              </div>
            </div>

            {/* Calendar body */}
            <div className="p-4">
              {calendarMode === "month" ? (
                <div className="flex gap-6">
                  {/* Monthly grid */}
                  <div className="flex-1">
                    <MonthlyCalendar
                      year={calYear}
                      month={calMonth}
                      selectedDate={selectedDate}
                      onSelectDate={setSelectedDate}
                      interviewsByDate={interviewsByDate}
                    />
                  </div>
                  {/* Side panel for selected day */}
                  <div className="w-64 shrink-0 border-l border-accent/40 pl-5">
                    {selectedDate ? (
                      <>
                        <h3 className="text-sm font-semibold text-primary">
                          {selectedDate.toLocaleDateString("en-US", {
                            weekday: "long",
                            month: "long",
                            day: "numeric",
                          })}
                        </h3>
                        {selectedDayInterviews.length === 0 ? (
                          <p className="mt-3 text-xs text-foreground/40">
                            No interviews this day.
                          </p>
                        ) : (
                          <div className="mt-3 space-y-2">
                            {selectedDayInterviews.map((iv) => (
                              <button
                                key={iv.id}
                                onClick={() => setSelectedInterview(iv)}
                                className={`w-full rounded-xl border-l-2 px-3 py-2 text-left transition-colors hover:bg-accent/20 ${statusBlockColor[iv.status]}`}
                              >
                                <p className="text-xs font-semibold">
                                  {iv.worker_name}
                                </p>
                                <p className="text-[10px] opacity-70">
                                  {iv.scheduled_start_time
                                    ? `${formatTime12(iv.scheduled_start_time)} — ${formatTime12(iv.scheduled_end_time!)}`
                                    : "Time TBD"}
                                </p>
                                <p className="mt-0.5 truncate text-[10px] opacity-60">
                                  {iv.job_title}
                                </p>
                              </button>
                            ))}
                          </div>
                        )}
                      </>
                    ) : (
                      <p className="text-xs text-foreground/40">
                        Select a day to view interviews.
                      </p>
                    )}
                  </div>
                </div>
              ) : (
                <WeeklyCalendar
                  weekStart={weekStart}
                  selectedDate={selectedDate}
                  onSelectDate={setSelectedDate}
                  onSelectInterview={setSelectedInterview}
                  interviewsByDate={interviewsByDate}
                />
              )}
            </div>
          </div>

          {/* Legend */}
          <div className="mt-3 flex items-center gap-4 px-1">
            <div className="flex items-center gap-1.5">
              <span className="block h-2 w-2 rounded-full bg-green-500" />
              <span className="text-xs text-foreground/50">Scheduled</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="block h-2 w-2 rounded-full bg-yellow-400" />
              <span className="text-xs text-foreground/50">Invited</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="block h-2 w-2 rounded-full bg-gray-400" />
              <span className="text-xs text-foreground/50">Completed</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="block h-2 w-2 rounded-full bg-red-400" />
              <span className="text-xs text-foreground/50">Cancelled</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="block h-2 w-2 rounded-full bg-emerald-500" />
              <span className="text-xs text-foreground/50">Live</span>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/*  APPLICANT INFO PANEL (overlay)                               */}
      {/* ============================================================ */}
      {selectedInterview && (
        <ApplicantPanel
          interview={selectedInterview}
          onClose={() => { setSelectedInterview(null); setActionFeedback(null); }}
          onSendOffer={handleSendOffer}
          onReschedule={handlePanelReschedule}
          onCancel={handlePanelCancel}
          actionLoading={panelActionLoading}
          actionFeedback={actionFeedback}
          onMessage={handleMessageWorker}
        />
      )}

    </div>
  );
}
