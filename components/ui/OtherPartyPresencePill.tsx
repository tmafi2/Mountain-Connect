"use client";

import type { OtherParty } from "@/lib/hooks/useInterviewPresence";

interface Props {
  otherParty: OtherParty;
  otherPartyLabel: string;
}

function formatLastSeen(d: Date | null): string {
  if (!d) return "";
  const diff = Date.now() - d.getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins === 1) return "1 minute ago";
  return `${mins} minutes ago`;
}

export default function OtherPartyPresencePill({ otherParty, otherPartyLabel }: Props) {
  const { status, displayName } = otherParty;
  const name = displayName || otherPartyLabel;

  let label: string;
  let tone: string;
  let dot: string;
  let dotPulse = false;

  switch (status) {
    case "in_call":
      label = `🎥 ${name} is in the call`;
      tone = "bg-emerald-50 text-emerald-700 border-emerald-200";
      dot = "bg-emerald-500";
      dotPulse = true;
      break;
    case "viewing":
      label = `🟢 ${name} is here — ready to start`;
      tone = "bg-secondary/10 text-secondary border-secondary/30";
      dot = "bg-secondary";
      dotPulse = true;
      break;
    case "recently_left":
      label = `${name} was here ${formatLastSeen(otherParty.lastSeenAt)}`;
      tone = "bg-amber-50 text-amber-700 border-amber-200";
      dot = "bg-amber-400";
      break;
    case "absent":
    default:
      label = `${otherPartyLabel} hasn't joined yet`;
      tone = "bg-gray-50 text-foreground/60 border-accent";
      dot = "bg-gray-300";
      break;
  }

  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium ${tone}`}
      role="status"
      aria-live="polite"
    >
      <span className="relative flex h-2 w-2">
        {dotPulse && (
          <span className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-60 ${dot}`} />
        )}
        <span className={`relative inline-flex h-2 w-2 rounded-full ${dot}`} />
      </span>
      {label}
    </span>
  );
}
