"use client";

const STATUS_CONFIG: Record<string, { bg: string; text: string; label: string }> = {
  invited: { bg: "bg-yellow-50", text: "text-yellow-700", label: "Awaiting Booking" },
  scheduled: { bg: "bg-blue-50", text: "text-blue-700", label: "Scheduled" },
  completed: { bg: "bg-green-50", text: "text-green-700", label: "Completed" },
  cancelled: { bg: "bg-red-50", text: "text-red-700", label: "Cancelled" },
  rescheduled: { bg: "bg-orange-50", text: "text-orange-700", label: "Rescheduled" },
};

interface InterviewStatusBadgeProps {
  status: string;
}

export default function InterviewStatusBadge({ status }: InterviewStatusBadgeProps) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.invited;
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${config.bg} ${config.text}`}
    >
      {config.label}
    </span>
  );
}
