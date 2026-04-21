import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import PrintTrigger from "./PrintTrigger";

export const dynamic = "force-dynamic";

interface PrintPageProps {
  searchParams: Promise<{ view?: string; date?: string }>;
}

function toDateKey(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function getWeekStart(date: Date) {
  const d = new Date(date);
  const dow = d.getDay();
  const diff = dow === 0 ? -6 : 1 - dow; // week starts Monday
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function addDays(d: Date, days: number) {
  const copy = new Date(d);
  copy.setDate(copy.getDate() + days);
  return copy;
}

function formatTime12(time: string) {
  const [h, m] = time.split(":");
  const hour = parseInt(h);
  const ampm = hour >= 12 ? "PM" : "AM";
  return `${hour % 12 || 12}:${m} ${ampm}`;
}

function formatLongDate(d: Date) {
  return d.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

const statusStyles: Record<string, { label: string; bg: string; text: string }> = {
  scheduled: { label: "Scheduled", bg: "#ecfdf5", text: "#047857" },
  invited: { label: "Invited", bg: "#eff6ff", text: "#1d4ed8" },
  completed: { label: "Completed", bg: "#f3f4f6", text: "#4b5563" },
  cancelled: { label: "Cancelled", bg: "#fef2f2", text: "#b91c1c" },
  missed: { label: "Missed", bg: "#fef3c7", text: "#92400e" },
  reschedule_requested: { label: "Reschedule", bg: "#fef3c7", text: "#92400e" },
  rescheduled: { label: "Rescheduled", bg: "#f3e8ff", text: "#6d28d9" },
  live: { label: "Live", bg: "#fee2e2", text: "#b91c1c" },
  declined: { label: "Declined", bg: "#fef2f2", text: "#b91c1c" },
};

export default async function InterviewsPrintPage({ searchParams }: PrintPageProps) {
  const { view: viewParam, date: dateParam } = await searchParams;
  const view = viewParam === "week" ? "week" : "day";

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("business_profiles")
    .select("id, business_name")
    .eq("user_id", user.id)
    .single();

  if (!profile) redirect("/business/dashboard");

  // Determine date range
  const baseDate = dateParam ? new Date(dateParam + "T00:00:00") : new Date();
  let rangeStart: Date;
  let rangeEnd: Date;
  let rangeLabel: string;
  if (view === "week") {
    rangeStart = getWeekStart(baseDate);
    rangeEnd = addDays(rangeStart, 6);
    const startLabel = rangeStart.toLocaleDateString("en-US", { month: "long", day: "numeric" });
    const endLabel = rangeEnd.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
    rangeLabel = `${startLabel} – ${endLabel}`;
  } else {
    rangeStart = new Date(baseDate);
    rangeStart.setHours(0, 0, 0, 0);
    rangeEnd = new Date(rangeStart);
    rangeLabel = formatLongDate(rangeStart);
  }

  const { data } = await supabase
    .from("interviews")
    .select(`
      id, status, scheduled_date, scheduled_start_time, scheduled_end_time,
      applications(job_posts(title)),
      worker_profiles(first_name, last_name, location_current, users(email))
    `)
    .eq("business_id", profile.id)
    .not("scheduled_date", "is", null)
    .gte("scheduled_date", toDateKey(rangeStart))
    .lte("scheduled_date", toDateKey(rangeEnd))
    .order("scheduled_date", { ascending: true })
    .order("scheduled_start_time", { ascending: true });

  const rows = (data || []).map((iv: Record<string, unknown>) => {
    const wp = iv.worker_profiles as Record<string, unknown> | null;
    const app = iv.applications as Record<string, unknown> | null;
    const jp = app?.job_posts as { title?: string } | null;
    const wpUser = wp?.users as { email?: string } | null;
    return {
      id: iv.id as string,
      status: iv.status as string,
      date: iv.scheduled_date as string,
      start: iv.scheduled_start_time ? (iv.scheduled_start_time as string).slice(0, 5) : null,
      end: iv.scheduled_end_time ? (iv.scheduled_end_time as string).slice(0, 5) : null,
      workerName: `${(wp?.first_name as string) || ""} ${(wp?.last_name as string) || ""}`.trim() || "Unknown",
      workerLocation: (wp?.location_current as string) || null,
      workerEmail: wpUser?.email || null,
      jobTitle: jp?.title || "Interview",
    };
  });

  // Group rows by date for easy day-by-day rendering in week view
  const groups = new Map<string, typeof rows>();
  for (const r of rows) {
    if (!groups.has(r.date)) groups.set(r.date, []);
    groups.get(r.date)!.push(r);
  }

  const daysToRender = view === "week"
    ? Array.from({ length: 7 }, (_, i) => toDateKey(addDays(rangeStart, i)))
    : [toDateKey(rangeStart)];

  const generatedAt = new Date().toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

  return (
    <div className="print-root bg-white">
      <style>{`
        @media print {
          @page { size: A4; margin: 14mm; }
          .no-print { display: none !important; }
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
        .print-root { color: #0a1e33; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
      `}</style>

      <PrintTrigger />

      {/* Screen-only action bar */}
      <div className="no-print sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white px-6 py-3">
        <p className="text-sm text-slate-500">
          Preview — use your browser print dialog to save as PDF or print.
        </p>
        <div className="flex items-center gap-2">
          <a
            href="/business/interviews"
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Close
          </a>
          <button
            type="button"
            className="rounded-lg bg-[#0a1e33] px-3 py-1.5 text-sm font-semibold text-white hover:bg-[#132d4a]"
            data-print-button
          >
            Print
          </button>
        </div>
      </div>

      <div className="mx-auto max-w-4xl px-8 py-10">
        {/* Header with logo */}
        <div className="flex items-start justify-between border-b-2 border-[#0a1e33] pb-5">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#0a1e33]">
              <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="#22d3ee" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M3 21l5-10 5 7 3-5 5 8H3z" />
              </svg>
            </div>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#22d3ee]">Mountain Connects</p>
              <h1 className="mt-0.5 text-2xl font-extrabold text-[#0a1e33]">Interview Schedule</h1>
            </div>
          </div>
          <div className="text-right">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              {view === "week" ? "Week of" : "Date"}
            </p>
            <p className="mt-1 text-base font-bold text-[#0a1e33]">{rangeLabel}</p>
            <p className="mt-0.5 text-xs text-slate-500">{profile.business_name}</p>
          </div>
        </div>

        {/* Summary */}
        <div className="mt-5 flex items-center gap-6 text-sm text-slate-600">
          <span>
            <strong className="text-[#0a1e33]">{rows.length}</strong> interview{rows.length === 1 ? "" : "s"} scheduled
          </span>
          {view === "week" && (
            <span>
              Across <strong className="text-[#0a1e33]">{groups.size}</strong> day{groups.size === 1 ? "" : "s"}
            </span>
          )}
        </div>

        {/* Days */}
        {rows.length === 0 ? (
          <div className="mt-10 rounded-xl border border-dashed border-slate-300 bg-slate-50/50 p-10 text-center">
            <p className="text-base font-semibold text-slate-600">No interviews scheduled</p>
            <p className="mt-1 text-sm text-slate-500">
              You have no scheduled interviews for {view === "week" ? "this week" : "this day"}.
            </p>
          </div>
        ) : (
          <div className="mt-6 space-y-6">
            {daysToRender.map((dateKey) => {
              const dayRows = groups.get(dateKey) || [];
              if (view === "day" || dayRows.length > 0) {
                const d = new Date(dateKey + "T00:00:00");
                return (
                  <section key={dateKey} className="break-inside-avoid">
                    {view === "week" && (
                      <div className="mb-2 flex items-baseline gap-3 border-b border-slate-200 pb-1">
                        <p className="text-sm font-bold text-[#0a1e33]">
                          {d.toLocaleDateString("en-US", { weekday: "long" })}
                        </p>
                        <p className="text-xs text-slate-500">
                          {d.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                        </p>
                        <span className="ml-auto text-[11px] text-slate-400">
                          {dayRows.length} interview{dayRows.length === 1 ? "" : "s"}
                        </span>
                      </div>
                    )}

                    {dayRows.length === 0 ? (
                      <p className="py-2 text-xs italic text-slate-400">No interviews</p>
                    ) : (
                      <table className="w-full border-collapse text-sm">
                        <thead>
                          <tr className="text-left text-[11px] uppercase tracking-wider text-slate-500">
                            <th className="w-32 border-b border-slate-200 py-2 font-semibold">Time</th>
                            <th className="border-b border-slate-200 py-2 font-semibold">Candidate</th>
                            <th className="border-b border-slate-200 py-2 font-semibold">Position</th>
                            <th className="w-28 border-b border-slate-200 py-2 font-semibold">Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {dayRows.map((r) => {
                            const s = statusStyles[r.status] || { label: r.status, bg: "#f3f4f6", text: "#4b5563" };
                            return (
                              <tr key={r.id} className="align-top break-inside-avoid">
                                <td className="border-b border-slate-100 py-2.5 pr-3">
                                  <p className="font-semibold text-[#0a1e33]">
                                    {r.start ? formatTime12(r.start) : "—"}
                                  </p>
                                  {r.end && (
                                    <p className="text-[11px] text-slate-400">
                                      to {formatTime12(r.end)}
                                    </p>
                                  )}
                                </td>
                                <td className="border-b border-slate-100 py-2.5 pr-3">
                                  <p className="font-semibold text-[#0a1e33]">{r.workerName}</p>
                                  {r.workerLocation && (
                                    <p className="text-[11px] text-slate-500">{r.workerLocation}</p>
                                  )}
                                  {r.workerEmail && (
                                    <p className="text-[11px] text-slate-400">{r.workerEmail}</p>
                                  )}
                                </td>
                                <td className="border-b border-slate-100 py-2.5 pr-3 text-slate-600">
                                  {r.jobTitle}
                                </td>
                                <td className="border-b border-slate-100 py-2.5">
                                  <span
                                    className="inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider"
                                    style={{ backgroundColor: s.bg, color: s.text }}
                                  >
                                    {s.label}
                                  </span>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    )}
                  </section>
                );
              }
              return null;
            })}
          </div>
        )}

        {/* Footer */}
        <div className="mt-12 border-t border-slate-200 pt-4 text-[11px] text-slate-400 flex items-center justify-between">
          <span>Generated {generatedAt} — mountainconnects.com</span>
          <span>{profile.business_name}</span>
        </div>
      </div>
    </div>
  );
}
