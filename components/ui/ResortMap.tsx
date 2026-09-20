"use client";

import dynamic from "next/dynamic";
import type { MapPin } from "./Map";
import { MAPS_ENABLED } from "@/lib/config/features";

const Map = dynamic(() => import("./Map"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center rounded-xl bg-accent/10">
      <div className="h-5 w-5 animate-spin rounded-full border-2 border-secondary border-t-transparent" />
    </div>
  ),
});

interface ResortMapProps {
  pins: MapPin[];
  center?: { lat: number; lng: number };
  zoom?: number;
  height?: string;
  className?: string;
  singlePin?: boolean;
}

export default function ResortMap(props: ResortMapProps) {
  // The single choke point while maps are switched off: no dynamic import, so
  // no request to Google and no BillingNotEnabledMapError, wherever a map is
  // called for. Call sites hide their own surrounding card as well, or they
  // would leave an empty box behind.
  if (!MAPS_ENABLED) return null;

  return <Map {...props} />;
}
