"use client";

import { useEffect, useState } from "react";
import InterviewStatusBadge from "@/components/ui/InterviewStatusBadge";
import { createClient } from "@/lib/supabase/client";

/* ------------------------------------------------------------------ */
/*  Types & Data                                                       */
/* ------------------------------------------------------------------ */

interface Interview {
  id: string;
  job_id: string | null;
  business_id: string | null;
  job_title: string;
  business_name: string;
  business_location: string;
  status: "scheduled" | "invited" | "completed" | "cancelled";
  scheduled_date: string | null;
  scheduled_start_time: string | null;
  scheduled_end_time: string | null;
  timezone: string | null;
  notes: string;
  // Extra job details for the popup
  job_description: string | null;
  job_pay: string | null;
  job_position_type: string | null;
  job_start_date: string | null;
  job_accommodation: boolean;
  job_ski_pass: boolean;
}

const DEMO_EXTRA = { job_id: null, business_id: null, job_description: null, job_pay: null, job_position_type: null, job_start_date: null, job_accommodation: false, job_ski_pass: false };

const demoInterviews: Interview[] = [
  {
    ...DEMO_EXTRA,
    id: "int1",
    job_title: "Ski Instructor — All Levels",
    business_name: "Whistler Blackcomb Ski School",
    business_location: "Whistler, BC",
    status: "scheduled",
    scheduled_date: "2026-03-26",
    scheduled_start_time: "10:00",
    scheduled_end_time: "10:30",
    timezone: "America/Vancouver",
    notes:
      "Please have your CSIA certification number ready. The interview will cover teaching philosophy and a short scenario exercise.",
  },
  {
    ...DEMO_EXTRA,
    id: "int2",
    job_title: "Guest Services Agent",
    business_name: "Revelstoke Mountain Resort",
    business_location: "Revelstoke, BC",
    status: "invited",
    scheduled_date: null,
    scheduled_start_time: null,
    scheduled_end_time: null,
    timezone: null,
    notes:
      "You've been invited to interview! Please book a time that works for you using the link below.",
  },
  {
    ...DEMO_EXTRA,
    id: "int3",
    job_title: "Lift Operations Crew",
    business_name: "Whistler Blackcomb Operations",
    business_location: "Whistler, BC",
    status: "scheduled",
    scheduled_date: "2026-03-28",
    scheduled_start_time: "14:00",
    scheduled_end_time: "14:30",
    timezone: "America/Vancouver",
    notes:
      "This will be a group interview with the operations team. Dress warmly — part of the interview is on-mountain.",
  },
  {
    ...DEMO_EXTRA,
    id: "int4",
    job_title: "Resort Host",
    business_name: "Sun Peaks Grand Hotel",
    business_location: "Sun Peaks, BC",
    status: "scheduled",
    scheduled_date: "2026-03-27",
    scheduled_start_time: "09:00",
    scheduled_end_time: "09:30",
    timezone: "America/Vancouver",
    notes:
      "A casual conversation with the front-desk manager. Be prepared to discuss guest experience scenarios.",
  },
  {
    ...DEMO_EXTRA,
    id: "int5",
    job_title: "Bartender",
    business_name: "Whistler Village Hospitality",
    business_location: "Whistler, BC",
    status: "completed",
    scheduled_date: "2026-03-15",
    scheduled_start_time: "11:00",
    scheduled_end_time: "11:30",
    timezone: "America/Vancouver",
    notes:
      "Interview completed. Thank you for your time — the hiring team will follow up within a week.",
  },
  {
    ...DEMO_EXTRA,
    id: "int6",
    job_title: "Snowboard Instructor",
    business_name: "Big White Ski School",
    business_location: "Kelowna, BC",
    status: "cancelled",
    scheduled_date: "2026-03-20",
    scheduled_start_time: "13:00",
    scheduled_end_time: "13:30",
    timezone: "America/Vancouver",
    notes: "This interview was cancelled by the employer. The position has been filled.",
  },
];

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

const businessInitials = (name: string) =>
  name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

const formatDate = (dateStr: string) => {
  const date = new Date(dateStr + "T00:00:00");
  return date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
};

const formatDateLong = (dateStr: string) => {
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

const parseHour = (time: string) => parseInt(time.split(":")[0]);

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
  cancelled: "bg-red-400",
};

const statusBlockColor: Record<string, string> = {
  scheduled: "bg-green-100 border-green-400 text-green-800",
  invited: "bg-yellow-100 border-yellow-400 text-yellow-800",
  completed: "bg-gray-100 border-gray-400 text-gray-600",
  cancelled: "bg-red-100 border-red-400 text-red-700",
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

/* ---------- Interview Card (List View) ---------- */
function InterviewCard({
  interview,
  onSelect,
  faded,
}: {
  interview: Interview;
  onSelect: (iv: Interview) => void;
  faded?: boolean;
}) {
  const statusBubble: Record<string, string> = {
    scheduled: "bg-green-500/15",
    invited: "bg-yellow-400/15",
    completed: "bg-gray-400/15",
    cancelled: "bg-red-400/15",
  };
  const statusIcon: Record<string, string> = {
    scheduled: "text-green-600",
    invited: "text-yellow-600",
    completed: "text-gray-500",
    cancelled: "text-red-500",
  };

  return (
    <button
      onClick={() => onSelect(interview)}
      className={`w-full text-left rounded-2xl border border-accent/50 bg-white/70 p-5 backdrop-blur-sm transition-all hover:-translate-y-0.5 hover:shadow-lg hover:shadow-secondary/5 ${faded ? "opacity-50" : ""}`}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-4">
          <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${statusBubble[interview.status] || "bg-secondary/15"} text-xs font-bold ${statusIcon[interview.status] || "text-secondary"}`}>
            {businessInitials(interview.business_name)}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-primary">
                {interview.job_title}
              </h3>
              <InterviewStatusBadge status={interview.status} />
            </div>
            <p className="mt-0.5 text-sm text-foreground/60">
              {interview.business_name}
            </p>
            <p className="mt-0.5 text-xs text-foreground/40">
              {interview.business_location}
            </p>
            {interview.scheduled_date && interview.scheduled_start_time && (
              <p className="mt-2 text-sm font-medium text-secondary">
                {formatDate(interview.scheduled_date)} at{" "}
                {formatTime12(interview.scheduled_start_time)} &ndash;{" "}
                {formatTime12(interview.scheduled_end_time!)}
              </p>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          {interview.status === "invited" && (
            <span className="rounded-xl bg-primary px-3 py-1.5 text-xs font-semibold text-white whitespace-nowrap shadow-sm shadow-primary/20">
              Book Time
            </span>
          )}
          {interview.status === "scheduled" && (
            <span className="rounded-xl bg-secondary/15 px-3 py-1.5 text-xs font-semibold text-secondary whitespace-nowrap">
              Join Call
            </span>
          )}
        </div>
      </div>
    </button>
  );
}

/* ---------- Job Detail Popup ---------- */
function JobDetailPopup({
  interview,
  onClose,
}: {
  interview: Interview;
  onClose: () => void;
}) {
  const posTypeLabel: Record<string, string> = {
    full_time: "Full-Time",
    part_time: "Part-Time",
    casual: "Casual",
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-lg max-h-[80vh] overflow-y-auto rounded-2xl bg-white shadow-2xl border border-accent/50">
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-accent/50 bg-white px-6 py-4 rounded-t-2xl">
          <h3 className="text-lg font-bold text-primary">Job Details</h3>
          <button onClick={onClose} className="rounded-xl p-1.5 text-foreground/40 transition-colors hover:bg-accent/50 hover:text-foreground/70">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Title + business */}
          <div>
            <h4 className="text-xl font-bold text-primary">{interview.job_title}</h4>
            <p className="mt-1 text-sm text-foreground/60">{interview.business_name} · {interview.business_location}</p>
          </div>

          {/* Quick info pills */}
          <div className="flex flex-wrap gap-2">
            {interview.job_position_type && (
              <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700">
                {posTypeLabel[interview.job_position_type] || interview.job_position_type}
              </span>
            )}
            {interview.job_pay && (
              <span className="rounded-full bg-green-50 px-3 py-1 text-xs font-medium text-green-700">
                {interview.job_pay}
              </span>
            )}
            {interview.job_start_date && (
              <span className="rounded-full bg-purple-50 px-3 py-1 text-xs font-medium text-purple-700">
                Starts {interview.job_start_date}
              </span>
            )}
          </div>

          {/* Perks */}
          {(interview.job_accommodation || interview.job_ski_pass) && (
            <div className="flex flex-wrap gap-2">
              {interview.job_accommodation && (
                <span className="flex items-center gap-1.5 rounded-full bg-orange-50 px-3 py-1 text-xs font-medium text-orange-700">
                  <span>🏠</span> Accommodation Included
                </span>
              )}
              {interview.job_ski_pass && (
                <span className="flex items-center gap-1.5 rounded-full bg-sky-50 px-3 py-1 text-xs font-medium text-sky-700">
                  <span>🎿</span> Ski Pass Included
                </span>
              )}
            </div>
          )}

          {/* Description */}
          {interview.job_description && (
            <div>
              <h5 className="text-xs font-semibold uppercase tracking-wider text-foreground/50 mb-2">About the Role</h5>
              <p className="text-sm leading-relaxed text-foreground/70 whitespace-pre-line">{interview.job_description}</p>
            </div>
          )}

          {/* Link to full job page */}
          {interview.job_id && (
            <a
              href={`/jobs/${interview.job_id}`}
              className="block w-full rounded-xl bg-primary py-2.5 text-center text-sm font-semibold text-white transition-all hover:-translate-y-0.5 hover:bg-primary/90 hover:shadow-md"
            >
              View Full Job Listing
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

/* ---------- Interview Detail Panel ---------- */
function InterviewDetailPanel({
  interview,
  onClose,
  onRequestReschedule,
}: {
  interview: Interview;
  onClose: () => void;
  onRequestReschedule: (iv: Interview) => void;
}) {
  const [showJobPopup, setShowJobPopup] = useState(false);

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-start justify-end">
        {/* overlay */}
        <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" onClick={onClose} />
        {/* panel */}
        <div className="relative z-10 h-full w-full max-w-md overflow-y-auto bg-white/95 shadow-2xl border-l border-accent/50 backdrop-blur-md">
          {/* header */}
          <div className="sticky top-0 z-10 flex items-center justify-between border-b border-accent/50 bg-white/90 px-6 py-4 backdrop-blur-sm">
            <h2 className="text-lg font-bold text-primary">Interview Details</h2>
            <button
              onClick={onClose}
              className="rounded-xl p-1.5 text-foreground/40 transition-colors hover:bg-accent/50 hover:text-foreground/70"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="space-y-6 p-6">
            {/* Business avatar + name — clickable link to business page */}
            {interview.business_id ? (
              <a href={`/business/${interview.business_id}`} className="flex items-center gap-4 group rounded-2xl p-2 -m-2 transition-colors hover:bg-secondary/5">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-secondary/15 text-base font-bold text-secondary">
                  {businessInitials(interview.business_name)}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-semibold text-primary group-hover:text-secondary transition-colors flex items-center gap-1.5">
                    {interview.business_name}
                    <svg className="h-4 w-4 text-foreground/30 group-hover:text-secondary shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                  </h3>
                  <p className="text-sm text-foreground/60">{interview.business_location}</p>
                </div>
              </a>
            ) : (
              <div className="flex items-center gap-4">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-secondary/15 text-base font-bold text-secondary">
                  {businessInitials(interview.business_name)}
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-primary">{interview.business_name}</h3>
                  <p className="text-sm text-foreground/60">{interview.business_location}</p>
                </div>
              </div>
            )}

            {/* Job + Status + Date/Time — position is clickable */}
            <div className="rounded-2xl border border-accent/50 bg-accent/20 p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium uppercase tracking-wider text-foreground/50">
                  Position
                </span>
                <InterviewStatusBadge status={interview.status} />
              </div>
              <button
                onClick={() => setShowJobPopup(true)}
                className="text-left group flex items-center gap-1.5 w-full"
              >
                <p className="font-semibold text-primary group-hover:text-secondary transition-colors">
                  {interview.job_title}
                </p>
                <svg className="h-3.5 w-3.5 text-foreground/30 group-hover:text-secondary shrink-0 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </button>
              {interview.scheduled_date && interview.scheduled_start_time ? (
                <div className="flex items-center gap-2 text-sm text-foreground/60">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <span>
                    {formatDateLong(interview.scheduled_date)} at{" "}
                    {formatTime12(interview.scheduled_start_time)} &ndash;{" "}
                    {formatTime12(interview.scheduled_end_time!)}
                  </span>
                </div>
              ) : (
                <p className="text-sm text-yellow-600 font-medium">
                  No date scheduled yet — book a time below
                </p>
              )}
            </div>

            {/* Notes */}
            <div>
              <h4 className="text-sm font-semibold uppercase tracking-wider text-foreground/50 mb-2">
                Notes
              </h4>
              <p className="text-sm leading-relaxed text-foreground/70">
                {interview.notes}
              </p>
            </div>

            {/* Action buttons */}
            <div className="space-y-2 pt-2">
              {interview.status === "scheduled" && (
                <button className="w-full rounded-xl bg-secondary py-2.5 text-sm font-semibold text-white transition-all hover:-translate-y-0.5 hover:bg-secondary/90 hover:shadow-md hover:shadow-secondary/20">
                  Join Call
                </button>
              )}
              {interview.status === "invited" && (
                <button className="w-full rounded-xl bg-primary py-2.5 text-sm font-semibold text-white transition-all hover:-translate-y-0.5 hover:bg-primary/90 hover:shadow-md hover:shadow-primary/20">
                  Book Time
                </button>
              )}
              {(interview.status === "scheduled" ||
                interview.status === "invited") && (
                <button className="w-full rounded-xl border border-accent/50 py-2.5 text-sm font-semibold text-primary transition-colors hover:bg-accent/30">
                  Add to Calendar
                </button>
              )}
              {interview.status === "scheduled" && (
                <button
                  onClick={() => onRequestReschedule(interview)}
                  className="w-full rounded-xl border border-yellow-300 bg-yellow-50 py-2.5 text-sm font-semibold text-yellow-700 transition-colors hover:bg-yellow-100"
                >
                  <span className="flex items-center justify-center gap-2">
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Request Reschedule
                  </span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Job detail popup — rendered on top of the detail panel */}
      {showJobPopup && (
        <JobDetailPopup interview={interview} onClose={() => setShowJobPopup(false)} />
      )}
    </>
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
              className={`relative flex h-14 flex-col items-center justify-center rounded-xl transition-all
                ${isSelected ? "bg-secondary text-white shadow-md shadow-secondary/30" : isToday ? "ring-2 ring-secondary/50" : "hover:bg-accent/30"}
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
        <div className="grid grid-cols-[60px_repeat(7,1fr)] border-b border-accent/50">
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
                  (iv) =>
                    iv.scheduled_start_time &&
                    parseHour(iv.scheduled_start_time) === hour
                );
                return (
                  <div
                    key={`${key}-${hour}`}
                    className="relative h-16 border-l border-t border-accent/50"
                  >
                    {atHour.map((iv) => (
                      <button
                        key={iv.id}
                        onClick={() => onSelectInterview(iv)}
                        className={`absolute inset-x-0.5 top-0.5 rounded-lg border-l-2 px-1.5 py-1 text-left transition-opacity hover:opacity-80 ${statusBlockColor[iv.status]}`}
                        style={{ height: "calc(100% - 4px)" }}
                      >
                        <p className="truncate text-[10px] font-semibold leading-tight">
                          {iv.business_name}
                        </p>
                        <p className="truncate text-[10px] leading-tight opacity-70">
                          {formatTime12(iv.scheduled_start_time!)}
                        </p>
                      </button>
                    ))}
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
/*  Main Page                                                          */
/* ------------------------------------------------------------------ */

export default function WorkerInterviewsPage() {
  const [view, setView] = useState<"list" | "calendar">("list");
  const [calendarMode, setCalendarMode] = useState<"month" | "week">("month");
  const [selectedInterview, setSelectedInterview] =
    useState<Interview | null>(null);
  const [rescheduleInterview, setRescheduleInterview] = useState<Interview | null>(null);
  const [rescheduleReason, setRescheduleReason] = useState("");
  const [rescheduleSending, setRescheduleSending] = useState(false);
  const [rescheduleSuccess, setRescheduleSuccess] = useState(false);
  const [rescheduleError, setRescheduleError] = useState("");
  const [calYear, setCalYear] = useState(today.getFullYear());
  const [calMonth, setCalMonth] = useState(today.getMonth());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [weekStart, setWeekStart] = useState<Date>(getWeekStart(today));
  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          // Not logged in — show demo data
          setInterviews(demoInterviews);
          setLoading(false);
          return;
        }

        const { data: profile } = await supabase
          .from("worker_profiles")
          .select("id")
          .eq("user_id", user.id)
          .single();
        if (!profile) { setLoading(false); return; }

        const { data } = await supabase
          .from("interviews")
          .select(`
            id, status, scheduled_date, scheduled_start_time, scheduled_end_time, timezone, business_notes,
            applications(job_posts(id, title, description, salary_range, pay_amount, pay_currency, position_type, start_date, accommodation_included, ski_pass_included, business_id, business_profiles(id, business_name, location)))
          `)
          .eq("worker_id", profile.id)
          .order("created_at", { ascending: false });

        if (data && data.length > 0) {
          const mapped: Interview[] = data.map((iv: Record<string, unknown>) => {
            const app = iv.applications as Record<string, unknown> | null;
            const jp = app?.job_posts as Record<string, unknown> | null;
            const bp = jp?.business_profiles as { id: string; business_name: string; location: string } | null;
            const statusVal = iv.status as string;
            const validStatuses = ["scheduled", "invited", "completed", "cancelled"];
            const payDisplay = (jp?.pay_amount as string) ? `${(jp?.pay_currency as string) || "AUD"} ${jp?.pay_amount}` : (jp?.salary_range as string) || null;
            return {
              id: iv.id as string,
              job_id: (jp?.id as string) || null,
              business_id: bp?.id || (jp?.business_id as string) || null,
              job_title: (jp?.title as string) || "Unknown Position",
              business_name: bp?.business_name || "Unknown Business",
              business_location: bp?.location || "",
              status: (validStatuses.includes(statusVal) ? statusVal : "invited") as Interview["status"],
              scheduled_date: iv.scheduled_date as string | null,
              scheduled_start_time: iv.scheduled_start_time ? (iv.scheduled_start_time as string).slice(0, 5) : null,
              scheduled_end_time: iv.scheduled_end_time ? (iv.scheduled_end_time as string).slice(0, 5) : null,
              timezone: iv.timezone as string | null,
              notes: (iv.business_notes as string) || "",
              job_description: (jp?.description as string) || null,
              job_pay: payDisplay,
              job_position_type: (jp?.position_type as string) || null,
              job_start_date: (jp?.start_date as string) || null,
              job_accommodation: (jp?.accommodation_included as boolean) || false,
              job_ski_pass: (jp?.ski_pass_included as boolean) || false,
            };
          });
          setInterviews(mapped);
        }
      } catch {
        // On error, keep current state
      }
      setLoading(false);
    })();
  }, []);

  const interviewsByDate = buildInterviewMap(interviews);

  /* ---- list sections ---- */
  const upcoming = interviews
    .filter((i) => i.status === "scheduled")
    .sort((a, b) => {
      if (!a.scheduled_date || !b.scheduled_date) return 0;
      return a.scheduled_date.localeCompare(b.scheduled_date);
    });

  const awaiting = interviews.filter((i) => i.status === "invited");

  const past = interviews.filter(
    (i) => i.status === "completed" || i.status === "cancelled"
  );

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

  async function handleRescheduleSubmit() {
    if (!rescheduleInterview) return;
    setRescheduleSending(true);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        // Update interview status to indicate reschedule requested
        const { error: updateError } = await supabase
          .from("interviews")
          .update({ status: "reschedule_requested", worker_notes: rescheduleReason })
          .eq("id", rescheduleInterview.id);

        if (updateError) throw updateError;

        // Create a notification for the business
        if (rescheduleInterview.business_id) {
          try {
            await supabase.from("notifications").insert({
              user_id: rescheduleInterview.business_id,
              type: "interview_rescheduled",
              title: "Interview Reschedule Requested",
              message: `A worker has requested to reschedule their interview for ${rescheduleInterview.job_title}. Reason: ${rescheduleReason || "No reason provided"}`,
              metadata: { interview_id: rescheduleInterview.id },
            });
          } catch {
            // notification insert failed — non-critical, continue
          }
        }
      }
      setRescheduleSuccess(true);
      // Auto-close modal after showing success
      setTimeout(() => setRescheduleInterview(null), 2500);
    } catch (err) {
      console.error("Reschedule request failed:", err);
      setRescheduleError("Failed to send reschedule request. Please try again.");
    } finally {
      setRescheduleSending(false);
    }
  }

  /* interviews for selected calendar day */
  const selectedDayInterviews = selectedDate
    ? interviewsByDate[toDateKey(selectedDate)] || []
    : [];

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-secondary" />
      </div>
    );
  }

  /* ---- render ---- */
  return (
    <div className="mx-auto max-w-5xl">
      {/* Gradient header */}
      <div className="relative -mx-6 -mt-6 mb-8 overflow-hidden rounded-b-3xl bg-gradient-to-br from-primary via-primary-light to-primary px-6 pb-8 pt-8 sm:-mx-8 sm:px-8">
        <div className="pointer-events-none absolute -left-10 -top-10 h-44 w-44 rounded-full bg-secondary/20 blur-3xl" />
        <div className="pointer-events-none absolute right-0 top-0 h-36 w-36 rounded-full bg-highlight/15 blur-3xl" />
        <div className="pointer-events-none absolute left-1/3 bottom-0 h-28 w-28 rounded-full bg-warm/10 blur-3xl" />
        <div className="relative flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">My Interviews</h1>
            <p className="mt-1 text-sm text-white/60">
              Track your upcoming interviews and manage your schedule.
            </p>
          </div>
          <button
            onClick={() => setView(view === "list" ? "calendar" : "list")}
            className="flex items-center gap-2 rounded-xl border border-white/20 bg-white/15 px-4 py-2 text-sm font-semibold text-white backdrop-blur-sm transition-all hover:-translate-y-0.5 hover:bg-white/25 hover:shadow-lg"
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
      </div>

      {/* ============================================================ */}
      {/*  LIST VIEW                                                    */}
      {/* ============================================================ */}
      {view === "list" && (
        <div className="space-y-8">
          {/* Upcoming */}
          <section>
            <div className="flex items-center gap-3 mb-4">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-green-500/15">
                <span className="block h-2.5 w-2.5 rounded-full bg-green-500" />
              </div>
              <h2 className="text-lg font-semibold text-primary">
                Upcoming
                <span className="ml-2 text-sm font-normal text-foreground/40">({upcoming.length})</span>
              </h2>
            </div>
            <div className="space-y-3">
              {upcoming.length === 0 ? (
                <div className="rounded-2xl border border-accent/50 bg-white/70 p-8 text-center backdrop-blur-sm">
                  <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-green-500/10">
                    <svg className="h-6 w-6 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <p className="text-sm text-foreground/50">
                    No upcoming interviews scheduled.
                  </p>
                </div>
              ) : (
                upcoming.map((iv) => (
                  <InterviewCard
                    key={iv.id}
                    interview={iv}
                    onSelect={setSelectedInterview}
                  />
                ))
              )}
            </div>
          </section>

          {/* Awaiting Confirmation */}
          <section>
            <div className="flex items-center gap-3 mb-4">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-yellow-400/15">
                <span className="block h-2.5 w-2.5 rounded-full bg-yellow-400" />
              </div>
              <h2 className="text-lg font-semibold text-primary">
                Awaiting Confirmation
                <span className="ml-2 text-sm font-normal text-foreground/40">({awaiting.length})</span>
              </h2>
            </div>
            <div className="space-y-3">
              {awaiting.length === 0 ? (
                <div className="rounded-2xl border border-accent/50 bg-white/70 p-8 text-center backdrop-blur-sm">
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
                  />
                ))
              )}
            </div>
          </section>

          {/* Past */}
          {past.length > 0 && (
            <section>
              <div className="flex items-center gap-3 mb-4">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gray-400/15">
                  <span className="block h-2.5 w-2.5 rounded-full bg-gray-400" />
                </div>
                <h2 className="text-lg font-semibold text-primary">
                  Past
                  <span className="ml-2 text-sm font-normal text-foreground/40">({past.length})</span>
                </h2>
              </div>
              <div className="space-y-3">
                {past.map((iv) => (
                  <InterviewCard
                    key={iv.id}
                    interview={iv}
                    onSelect={setSelectedInterview}
                    faded
                  />
                ))}
              </div>
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
          <div className="rounded-2xl border border-accent/50 bg-white/70 overflow-hidden backdrop-blur-sm shadow-sm">
            {/* Gradient header matching design language */}
            <div className="relative overflow-hidden bg-gradient-to-br from-primary via-primary-light to-primary px-5 py-4">
              <div className="pointer-events-none absolute -left-8 -top-8 h-32 w-32 rounded-full bg-secondary/20 blur-2xl" />
              <div className="pointer-events-none absolute right-0 bottom-0 h-24 w-24 rounded-full bg-highlight/15 blur-2xl" />
              <div className="relative flex items-center justify-between">
                {/* Month/Week toggle */}
                <div className="flex items-center gap-1 rounded-xl bg-white/10 p-0.5 backdrop-blur-sm">
                  <button
                    onClick={() => setCalendarMode("month")}
                    className={`rounded-lg px-3 py-1 text-xs font-semibold transition-all ${
                      calendarMode === "month"
                        ? "bg-white text-primary shadow-sm"
                        : "text-white/70 hover:text-white"
                    }`}
                  >
                    Month
                  </button>
                  <button
                    onClick={() => setCalendarMode("week")}
                    className={`rounded-lg px-3 py-1 text-xs font-semibold transition-all ${
                      calendarMode === "week"
                        ? "bg-white text-primary shadow-sm"
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
                    className="rounded-xl p-1.5 text-white/70 transition-colors hover:bg-white/10 hover:text-white"
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
                    className="rounded-xl p-1.5 text-white/70 transition-colors hover:bg-white/10 hover:text-white"
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
                  className="rounded-xl border border-white/20 px-3 py-1 text-xs font-semibold text-white transition-all hover:bg-white/10 hover:shadow-sm"
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
                  <div className="w-64 shrink-0 border-l border-accent/50 pl-5">
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
                                className={`w-full rounded-xl border-l-2 px-3 py-2 text-left transition-colors hover:bg-accent/30 ${statusBlockColor[iv.status]}`}
                              >
                                <p className="text-xs font-semibold">
                                  {iv.business_name}
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
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/*  INTERVIEW DETAIL PANEL (overlay)                             */}
      {/* ============================================================ */}
      {selectedInterview && (
        <InterviewDetailPanel
          interview={selectedInterview}
          onClose={() => setSelectedInterview(null)}
          onRequestReschedule={(iv) => {
            setRescheduleInterview(iv);
            setRescheduleReason("");
            setRescheduleSuccess(false);
            setRescheduleError("");
          }}
        />
      )}

      {/* Reschedule Request Modal */}
      {rescheduleInterview && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center">
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={() => setRescheduleInterview(null)} />
          <div className="relative z-10 w-full max-w-md rounded-2xl bg-white shadow-2xl border border-accent/50">
            <div className="flex items-center justify-between border-b border-accent/50 px-6 py-4">
              <h3 className="text-lg font-bold text-primary">Request Reschedule</h3>
              <button onClick={() => setRescheduleInterview(null)} className="rounded-xl p-1.5 text-foreground/40 hover:bg-accent/50 hover:text-foreground/70">
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-6 space-y-4">
              {rescheduleSuccess ? (
                <div className="text-center py-4">
                  <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-green-100">
                    <svg className="h-7 w-7 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <h4 className="text-lg font-semibold text-primary">Request Sent</h4>
                  <p className="mt-1 text-sm text-foreground/60">
                    {rescheduleInterview.business_name} has been notified of your reschedule request. They will get back to you with a new time.
                  </p>
                  <button
                    onClick={() => setRescheduleInterview(null)}
                    className="mt-4 rounded-xl bg-primary px-6 py-2.5 text-sm font-semibold text-white hover:bg-primary/90"
                  >
                    Done
                  </button>
                </div>
              ) : (
                <>
                  {/* Current interview info */}
                  <div className="rounded-xl bg-accent/20 p-4">
                    <p className="text-sm font-medium text-primary">{rescheduleInterview.job_title}</p>
                    <p className="text-xs text-foreground/60">{rescheduleInterview.business_name}</p>
                    {rescheduleInterview.scheduled_date && rescheduleInterview.scheduled_start_time && (
                      <p className="mt-1 text-sm text-foreground/50">
                        Currently: {formatDateLong(rescheduleInterview.scheduled_date)} at {formatTime12(rescheduleInterview.scheduled_start_time)}
                      </p>
                    )}
                  </div>

                  {/* Reason */}
                  <div>
                    <label className="block text-sm font-medium text-foreground/70 mb-1.5">
                      Reason for rescheduling <span className="text-foreground/40">(optional)</span>
                    </label>
                    <textarea
                      value={rescheduleReason}
                      onChange={(e) => setRescheduleReason(e.target.value)}
                      placeholder="e.g. I have a scheduling conflict on that date and would appreciate a different time..."
                      rows={3}
                      className="w-full rounded-xl border border-accent/50 bg-white px-4 py-3 text-sm text-foreground placeholder:text-foreground/40 focus:border-secondary focus:outline-none focus:ring-1 focus:ring-secondary"
                    />
                  </div>

                  {/* Error message */}
                  {rescheduleError && (
                    <div className="rounded-lg bg-red-50 border border-red-100 px-4 py-2.5 text-sm text-red-600">
                      {rescheduleError}
                    </div>
                  )}

                  {/* Buttons */}
                  <div className="flex gap-3">
                    <button
                      onClick={() => setRescheduleInterview(null)}
                      disabled={rescheduleSending}
                      className="flex-1 rounded-xl border border-accent/50 py-2.5 text-sm font-semibold text-foreground/70 transition-colors hover:bg-accent/30 disabled:opacity-50"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleRescheduleSubmit}
                      disabled={rescheduleSending}
                      className="flex-1 rounded-xl bg-yellow-500 py-2.5 text-sm font-semibold text-white transition-all hover:bg-yellow-600 disabled:opacity-50"
                    >
                      {rescheduleSending ? (
                        <span className="flex items-center justify-center gap-2">
                          <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                          Sending...
                        </span>
                      ) : (
                        "Send Request"
                      )}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
