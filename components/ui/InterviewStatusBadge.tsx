"use client";

const STATUS_CONFIG: Record<string, { bg: string; text: string; label: string; pulse?: boolean }> = {
  invited: { bg: "bg-yellow-50", text: "text-yellow-700", label: "Awaiting Booking" },
  scheduled: { bg: "bg-blue-50", text: "text-blue-700", label: "Scheduled" },
  completed: { bg: "bg-green-50", text: "text-green-700", label: "Completed" },
  cancelled: { bg: "bg-red-50", text: "text-red-700", label: "Cancelled" },
  rescheduled: { bg: "bg-orange-50", text: "text-orange-700", label: "Rescheduled" },
  live: { bg: "bg-emerald-50", text: "text-emerald-700", label: "Live", pulse: true },
  declined: { bg: "bg-gray-100", text: "text-gray-600", label: "Declined" },
};

interface InterviewStatusBadgeProps {
  status: string;
}

export default function InterviewStatusBadge({ status }: InterviewStatusBadgeProps) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.invited;
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${config.bg} ${config.text}`}
    >
      {config.pulse && (
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
        </span>
      )}
      {config.label}
    </span>
  );
}
