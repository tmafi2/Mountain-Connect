"use client";

interface TimezonePickerProps {
  value: string;
  onChange: (tz: string) => void;
}

const TIMEZONE_GROUPS = [
  {
    label: "North America",
    zones: [
      { value: "America/Vancouver", label: "Pacific (Vancouver)" },
      { value: "America/Denver", label: "Mountain (Denver)" },
      { value: "America/Chicago", label: "Central (Chicago)" },
      { value: "America/New_York", label: "Eastern (New York)" },
      { value: "America/Halifax", label: "Atlantic (Halifax)" },
      { value: "America/St_Johns", label: "Newfoundland (St. John's)" },
    ],
  },
  {
    label: "Europe",
    zones: [
      { value: "Europe/London", label: "GMT (London)" },
      { value: "Europe/Paris", label: "CET (Paris)" },
      { value: "Europe/Zurich", label: "CET (Zurich)" },
      { value: "Europe/Oslo", label: "CET (Oslo)" },
      { value: "Europe/Helsinki", label: "EET (Helsinki)" },
    ],
  },
  {
    label: "Asia & Pacific",
    zones: [
      { value: "Asia/Tokyo", label: "JST (Tokyo)" },
      { value: "Asia/Seoul", label: "KST (Seoul)" },
      { value: "Australia/Sydney", label: "AEST (Sydney)" },
      { value: "Pacific/Auckland", label: "NZST (Auckland)" },
    ],
  },
  {
    label: "South America",
    zones: [
      { value: "America/Santiago", label: "CLT (Santiago)" },
      { value: "America/Argentina/Buenos_Aires", label: "ART (Buenos Aires)" },
    ],
  },
];

export default function TimezonePicker({ value, onChange }: TimezonePickerProps) {
  return (
    <div>
      <label className="block text-sm font-medium text-foreground">
        Your Timezone
      </label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-lg border border-accent bg-white px-4 py-2.5 text-primary focus:border-secondary focus:outline-none focus:ring-1 focus:ring-secondary"
      >
        {TIMEZONE_GROUPS.map((group) => (
          <optgroup key={group.label} label={group.label}>
            {group.zones.map((tz) => (
              <option key={tz.value} value={tz.value}>
                {tz.label}
              </option>
            ))}
          </optgroup>
        ))}
      </select>
    </div>
  );
}
