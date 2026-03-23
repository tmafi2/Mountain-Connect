"use client";

import { useCallback, useState } from "react";
import {
  GoogleMap,
  useJsApiLoader,
  Marker,
  InfoWindow,
} from "@react-google-maps/api";

/* ─── Types ──────────────────────────────────────────────── */

export interface MapPin {
  id: string;
  lat: number;
  lng: number;
  label: string;
  sublabel?: string;
  href?: string;
}

interface MapProps {
  pins: MapPin[];
  center?: { lat: number; lng: number };
  zoom?: number;
  height?: string;
  className?: string;
  /** If true, show a single pin with no info window interaction */
  singlePin?: boolean;
}

/* ─── Styles ─────────────────────────────────────────────── */

// Muted terrain-style map that matches the app's color palette
const mapStyles = [
  { featureType: "water", elementType: "geometry.fill", stylers: [{ color: "#a9cbe3" }] },
  { featureType: "landscape.natural", elementType: "geometry.fill", stylers: [{ color: "#e8eef3" }] },
  { featureType: "landscape.man_made", elementType: "geometry.fill", stylers: [{ color: "#f7f9fb" }] },
  { featureType: "poi", elementType: "labels", stylers: [{ visibility: "off" }] },
  { featureType: "poi.park", elementType: "geometry.fill", stylers: [{ color: "#c5ddd0" }] },
  { featureType: "road", elementType: "geometry.fill", stylers: [{ color: "#ffffff" }] },
  { featureType: "road", elementType: "geometry.stroke", stylers: [{ color: "#ced7dd" }] },
  { featureType: "road", elementType: "labels.text.fill", stylers: [{ color: "#4e5d6c" }] },
  { featureType: "administrative", elementType: "labels.text.fill", stylers: [{ color: "#0e2439" }] },
  { featureType: "transit", stylers: [{ visibility: "off" }] },
];

const defaultMapOptions: google.maps.MapOptions = {
  disableDefaultUI: false,
  zoomControl: true,
  mapTypeControl: false,
  streetViewControl: false,
  fullscreenControl: true,
  styles: mapStyles,
};

/* ─── Component ──────────────────────────────────────────── */

export default function Map({
  pins,
  center,
  zoom,
  height = "300px",
  className = "",
  singlePin = false,
}: MapProps) {
  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "",
  });

  const [selectedPin, setSelectedPin] = useState<MapPin | null>(null);
  const [map, setMap] = useState<google.maps.Map | null>(null);

  const onLoad = useCallback(
    (mapInstance: google.maps.Map) => {
      setMap(mapInstance);

      // If multiple pins, fit bounds to show all
      if (pins.length > 1 && !center) {
        const bounds = new google.maps.LatLngBounds();
        pins.forEach((pin) => bounds.extend({ lat: pin.lat, lng: pin.lng }));
        mapInstance.fitBounds(bounds, { top: 40, right: 40, bottom: 40, left: 40 });
      }
    },
    [pins, center]
  );

  // Determine center point
  const mapCenter = center ||
    (pins.length === 1
      ? { lat: pins[0].lat, lng: pins[0].lng }
      : pins.length > 0
        ? {
            lat: pins.reduce((sum, p) => sum + p.lat, 0) / pins.length,
            lng: pins.reduce((sum, p) => sum + p.lng, 0) / pins.length,
          }
        : { lat: 46.8, lng: 8.2 }); // Default: Swiss Alps

  const mapZoom = zoom || (pins.length === 1 ? 12 : 4);

  if (loadError) {
    return (
      <div
        className={`flex items-center justify-center rounded-xl bg-accent/10 ${className}`}
        style={{ height }}
      >
        <p className="text-sm text-foreground/40">Failed to load map</p>
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div
        className={`flex items-center justify-center rounded-xl bg-accent/10 ${className}`}
        style={{ height }}
      >
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-secondary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className={`overflow-hidden rounded-xl ${className}`} style={{ height }}>
      <GoogleMap
        mapContainerStyle={{ width: "100%", height: "100%" }}
        center={mapCenter}
        zoom={mapZoom}
        onLoad={onLoad}
        options={defaultMapOptions}
      >
        {pins.map((pin) => (
          <Marker
            key={pin.id}
            position={{ lat: pin.lat, lng: pin.lng }}
            title={pin.label}
            onClick={() => !singlePin && setSelectedPin(pin)}
            icon={{
              path: "M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z",
              fillColor: "#0e2439",
              fillOpacity: 1,
              strokeColor: "#ffffff",
              strokeWeight: 2,
              scale: 1.5,
              anchor: new google.maps.Point(12, 22),
            }}
          />
        ))}

        {selectedPin && (
          <InfoWindow
            position={{ lat: selectedPin.lat, lng: selectedPin.lng }}
            onCloseClick={() => setSelectedPin(null)}
            options={{ pixelOffset: new google.maps.Size(0, -30) }}
          >
            <div className="min-w-[140px] p-1">
              <p className="font-semibold text-[#0e2439] text-sm">{selectedPin.label}</p>
              {selectedPin.sublabel && (
                <p className="text-xs text-[#4e5d6c] mt-0.5">{selectedPin.sublabel}</p>
              )}
              {selectedPin.href && (
                <a
                  href={selectedPin.href}
                  className="mt-1.5 inline-block text-xs font-medium text-[#0e2439] hover:underline"
                >
                  View details →
                </a>
              )}
            </div>
          </InfoWindow>
        )}
      </GoogleMap>
    </div>
  );
}
