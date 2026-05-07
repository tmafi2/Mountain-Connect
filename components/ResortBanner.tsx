import { gradientForCountry } from "@/lib/resort-banner";

interface Props {
  country: string | null | undefined;
  className?: string;
  showSilhouette?: boolean;
}

export function ResortBanner({
  country,
  className = "",
  showSilhouette = true,
}: Props) {
  return (
    <div
      className={`relative overflow-hidden ${className}`}
      style={{ backgroundImage: gradientForCountry(country) }}
    >
      {showSilhouette && <MountainSilhouette />}
    </div>
  );
}

function MountainSilhouette() {
  return (
    <svg
      className="pointer-events-none absolute inset-x-0 bottom-0 h-full w-full"
      viewBox="0 0 1200 400"
      preserveAspectRatio="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        d="M0 400 L0 240 L120 130 L260 230 L400 110 L540 220 L680 120 L820 210 L960 100 L1100 200 L1200 150 L1200 400 Z"
        fill="rgba(0,0,0,0.22)"
      />
      <path
        d="M0 400 L0 300 L130 230 L280 290 L420 210 L560 290 L720 220 L860 290 L1000 215 L1140 290 L1200 250 L1200 400 Z"
        fill="rgba(0,0,0,0.38)"
      />
    </svg>
  );
}
