"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Group,
  Mesh,
  ConeGeometry,
  CylinderGeometry,
  TorusGeometry,
  MeshLambertMaterial,
  MeshBasicMaterial,
  RingGeometry,
  SphereGeometry,
  DoubleSide,
  Object3D,
  Vector3,
  Color,
  Scene,
  Camera,
} from "three";
import { resorts } from "@/lib/data/resorts";
import { regionHierarchy } from "@/lib/data/region-hierarchy";

/* ─── Types ──────────────────────────────────────────────── */

interface MountainMarker {
  id: string;
  name: string;
  country: string;
  lat: number;
  lng: number;
  height: number;
  region: string;
}

interface CountryCluster {
  id: string;
  name: string;
  lat: number;
  lng: number;
  count: number;
  continent: string;
}

interface GlobeMethods {
  pointOfView: (
    pov?: { lat?: number; lng?: number; altitude?: number },
    transitionMs?: number
  ) => void;
  controls: () => {
    autoRotate: boolean;
    autoRotateSpeed: number;
    enableZoom: boolean;
    minDistance: number;
    maxDistance: number;
  };
  getGlobeRadius: () => number;
  getCoords: (
    lat: number,
    lng: number,
    altitude?: number
  ) => { x: number; y: number; z: number };
  camera: () => Camera;
  scene: () => Scene;
}

/* ─── Country definitions (derived from regionHierarchy) ── */

const COUNTRY_MAP: Record<string, { country: string; countrySlug: string; continent: string }> = {};
regionHierarchy.forEach((continent) => {
  continent.countries.forEach((country) => {
    const slug = country.name.toLowerCase().replace(/\s+/g, "-");
    country.resorts.forEach((resort) => {
      COUNTRY_MAP[resort.id] = { country: country.name, countrySlug: slug, continent: continent.name };
    });
  });
});

const COUNTRY_COORDS: Record<string, { lat: number; lng: number; altitude?: number }> = {
  "Andorra": { lat: 42.5, lng: 1.5 },
  "Argentina": { lat: -38.4, lng: -63.6 },
  "Australia": { lat: -37.0, lng: 147.0 },
  "Austria": { lat: 47.2, lng: 13.4 },
  "Canada": { lat: 51.0, lng: -116.0 },
  "Chile": { lat: -33.4, lng: -70.6 },
  "France": { lat: 45.8, lng: 6.2 },
  "Georgia": { lat: 42.3, lng: 44.5 },
  "Italy": { lat: 46.5, lng: 11.5 },
  "Japan": { lat: 43.0, lng: 141.0 },
  "New Zealand": { lat: -44.5, lng: 168.5 },
  "Sweden": { lat: 63.0, lng: 13.0 },
  "Switzerland": { lat: 46.8, lng: 8.2 },
  "USA": { lat: 40.0, lng: -111.5, altitude: 0.8 },
};

const COUNTRY_CLUSTERS: CountryCluster[] = [];
regionHierarchy.forEach((continent) => {
  continent.countries.forEach((country) => {
    const coords = COUNTRY_COORDS[country.name];
    if (!coords) return;
    const slug = country.name.toLowerCase().replace(/\s+/g, "-");
    COUNTRY_CLUSTERS.push({
      id: slug,
      name: country.name,
      lat: coords.lat,
      lng: coords.lng,
      count: country.resorts.length,
      continent: continent.name,
    });
  });
});

/* ─── Marker data ─────────────────────────────────────────── */

const drops = resorts.map((r) => r.vertical_drop_m ?? 500);
const minDrop = Math.min(...drops);
const maxDrop = Math.max(...drops);

const rawMarkers: MountainMarker[] = resorts.map((resort) => {
  const drop = resort.vertical_drop_m ?? 500;
  const normalized = maxDrop > minDrop ? (drop - minDrop) / (maxDrop - minDrop) : 0.5;
  const mapping = COUNTRY_MAP[resort.id];
  return {
    id: resort.id,
    name: resort.name,
    country: resort.country,
    lat: resort.latitude,
    lng: resort.longitude,
    height: 3 + normalized * 5,
    region: mapping ? mapping.countrySlug : "other",
  };
});

// Space out pins that are too close together
function spaceOutMarkers(markers: MountainMarker[], minDist: number): MountainMarker[] {
  const result = markers.map((m) => ({ ...m }));
  for (let pass = 0; pass < 3; pass++) {
    for (let i = 0; i < result.length; i++) {
      for (let j = i + 1; j < result.length; j++) {
        const dLat = result[i].lat - result[j].lat;
        const dLng = result[i].lng - result[j].lng;
        const dist = Math.sqrt(dLat * dLat + dLng * dLng);
        if (dist < minDist && dist > 0) {
          const push = (minDist - dist) / 2;
          const angle = Math.atan2(dLat, dLng);
          result[i].lat += Math.sin(angle) * push;
          result[i].lng += Math.cos(angle) * push;
          result[j].lat -= Math.sin(angle) * push;
          result[j].lng -= Math.cos(angle) * push;
        }
      }
    }
  }
  return result;
}

const markerData = spaceOutMarkers(rawMarkers, 1.2);

/* ─── 3D object builders ──────────────────────────────────── */

const PIN_COLOR = new Color(0xef5350);
const PIN_DARK = new Color(0xc62828);

function createMountain(d: object): Object3D {
  const marker = d as MountainMarker;
  const group = new Group();

  const pinMat = new MeshLambertMaterial({
    color: PIN_COLOR,
    emissive: PIN_DARK,
    emissiveIntensity: 0.2,
  });

  // Rounded head (top sphere)
  const headGeo = new SphereGeometry(1.8, 16, 16);
  const head = new Mesh(headGeo, pinMat);
  head.position.y = 4.5;
  group.add(head);

  // Pointed bottom (cone tapering down)
  const pointGeo = new ConeGeometry(1.8, 3.5, 16);
  const point = new Mesh(pointGeo, pinMat);
  point.position.y = 1.5;
  point.rotation.x = Math.PI; // flip cone to point downward
  group.add(point);

  // Inner circle/ring (the hole in the pin)
  const ringGeo = new TorusGeometry(0.85, 0.25, 8, 16);
  const ringMat = new MeshBasicMaterial({ color: 0xffffff });
  const ring = new Mesh(ringGeo, ringMat);
  ring.position.y = 4.5;
  ring.rotation.x = Math.PI / 2;
  group.add(ring);

  // Dark circle fill inside the ring
  const innerGeo = new CylinderGeometry(0.6, 0.6, 0.15, 12);
  const innerMat = new MeshLambertMaterial({
    color: PIN_DARK,
    emissive: PIN_DARK,
    emissiveIntensity: 0.3,
  });
  const inner = new Mesh(innerGeo, innerMat);
  inner.position.y = 4.5;
  group.add(inner);

  group.userData = { marker, currentRise: 0 };
  return group;
}

function createClusterDot(d: object): Object3D {
  const cluster = d as CountryCluster;
  const group = new Group();

  // Glowing sphere
  const sphereGeo = new SphereGeometry(2.5, 16, 16);
  const sphereMat = new MeshBasicMaterial({
    color: 0xa9cbe3,
    transparent: true,
    opacity: 0.85,
  });
  const sphere = new Mesh(sphereGeo, sphereMat);
  group.add(sphere);

  // Outer glow ring
  const ringGeo = new RingGeometry(3.0, 5.0, 24);
  const ringMat = new MeshBasicMaterial({
    color: 0xa9cbe3,
    transparent: true,
    opacity: 0.25,
    side: DoubleSide,
  });
  const ring = new Mesh(ringGeo, ringMat);
  ring.rotation.x = -Math.PI / 2;
  group.add(ring);

  group.userData = { cluster, currentRise: 0 };
  return group;
}

/* ─── Props ───────────────────────────────────────────────── */

interface GlobeProps {
  continentFilter: string;
  selectedCountry?: string | null;
}

/* ─── Component ───────────────────────────────────────────── */

export default function Globe({ continentFilter, selectedCountry }: GlobeProps) {
  const globeRef = useRef<GlobeMethods | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const [GlobeGL, setGlobeGL] = useState<React.ComponentType<
    Record<string, unknown>
  > | null>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  const [ready, setReady] = useState(false);
  const hoveredIdRef = useRef<string | null>(null);
  const hoverTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const targetScalesRef = useRef<Map<string, number>>(new Map());
  const animFrameRef = useRef<number>(0);
  const mountainObjectsRef = useRef<Map<string, Object3D>>(new Map());
  const clusterObjectsRef = useRef<Map<string, Object3D>>(new Map());
  const isMouseOverRef = useRef(false);
  const mousePosRef = useRef({ x: 0, y: 0 });
  const shouldAutoRotateRef = useRef(true);

  // View mode: "clusters" or a country slug for zoomed-in
  const [activeRegion, setActiveRegion] = useState<string | null>(null);

  // Hover tooltip state
  const [tooltip, setTooltip] = useState<{
    name: string;
    country: string;
    id: string;
    x: number;
    y: number;
  } | null>(null);

  // Compute visible data based on activeRegion and continentFilter
  const visibleMarkers = markerData.filter((m) => {
    if (!activeRegion) return false; // clusters mode — hide individual markers
    if (m.region !== activeRegion) return false;
    const mapping = COUNTRY_MAP[m.id];
    if (continentFilter !== "All" && mapping && mapping.continent !== continentFilter) return false;
    return true;
  });

  const visibleClusters = COUNTRY_CLUSTERS.filter((c) => {
    if (activeRegion) return false; // zoomed in — hide clusters
    if (continentFilter !== "All" && c.continent !== continentFilter) return false;
    return c.count > 0;
  });

  // Dynamic import
  useEffect(() => {
    import("react-globe.gl").then((mod) => {
      setGlobeGL(
        () =>
          mod.default as unknown as React.ComponentType<Record<string, unknown>>
      );
    });
  }, []);

  // Responsive sizing — bigger globe
  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        const width = containerRef.current.clientWidth;
        const height = Math.min(700, Math.max(500, width * 0.6));
        setDimensions({ width, height });
      }
    };
    updateSize();
    const observer = new ResizeObserver(updateSize);
    if (containerRef.current) observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  // Animation loop
  useEffect(() => {
    if (!ready) return;

    const animate = () => {
      const globe = globeRef.current;
      if (!globe) {
        animFrameRef.current = requestAnimationFrame(animate);
        return;
      }

      const cam = globe.camera();
      const cameraPos = cam.position;
      const radius = globe.getGlobeRadius();
      const camDist = cameraPos.length();
      // Scale pins relative to camera distance — smaller when zoomed in
      const distRatio = Math.min(camDist / (radius * 3.5), 1.0);
      const pinScale = 0.005 + distRatio * 0.007; // ranges from 0.005 (close) to 0.012 (far)

      // Animate individual pins
      mountainObjectsRef.current.forEach((obj) => {
        const ud = obj.userData;
        const marker = ud.marker as MountainMarker;
        if (!marker) return;

        const coords = globe.getCoords(marker.lat, marker.lng, 0.01);
        const markerDir = new Vector3(coords.x, coords.y, coords.z).normalize();
        const cameraDir = cameraPos.clone().normalize();
        const dot = markerDir.dot(cameraDir);

        let target = 0;
        if (dot > 0.55) target = 1;
        else if (dot > 0.15) target = (dot - 0.15) / 0.4;

        const current = ud.currentRise as number;
        const lerped = current + (target - current) * 0.08;
        ud.currentRise = lerped;

        const isHovered = hoveredIdRef.current === marker.id;
        const targetScale = radius * pinScale * (isHovered ? 1.3 : 1.0);
        const currentScale = targetScalesRef.current.get(marker.id) ?? targetScale;
        const smoothedScale = currentScale + (targetScale - currentScale) * 0.12;
        targetScalesRef.current.set(marker.id, smoothedScale);
        const s = smoothedScale * Math.max(lerped, 0.01);
        obj.scale.set(s, s, s);

        obj.position.set(coords.x, coords.y, coords.z);
        obj.lookAt(0, 0, 0);
        obj.rotateX(-Math.PI / 2);
      });

      // Animate cluster dots
      clusterObjectsRef.current.forEach((obj) => {
        const ud = obj.userData;
        const cluster = ud.cluster as CountryCluster;
        if (!cluster) return;

        const coords = globe.getCoords(cluster.lat, cluster.lng, 0.015);
        const markerDir = new Vector3(coords.x, coords.y, coords.z).normalize();
        const cameraDir = cameraPos.clone().normalize();
        const dot = markerDir.dot(cameraDir);

        let target = 0;
        if (dot > 0.4) target = 1;
        else if (dot > 0.1) target = (dot - 0.1) / 0.3;

        const current = ud.currentRise as number;
        const lerped = current + (target - current) * 0.06;
        ud.currentRise = lerped;

        const isHovered = hoveredIdRef.current === cluster.id;
        const targetCs = radius * (isHovered ? 0.04 : 0.032);
        const currentCs = targetScalesRef.current.get(cluster.id) ?? targetCs;
        const smoothedCs = currentCs + (targetCs - currentCs) * 0.12;
        targetScalesRef.current.set(cluster.id, smoothedCs);
        const cs = smoothedCs * Math.max(lerped, 0.01);
        obj.scale.set(cs, cs, cs);

        obj.position.set(coords.x, coords.y, coords.z);
        obj.lookAt(0, 0, 0);
        obj.rotateX(-Math.PI / 2);
      });

      animFrameRef.current = requestAnimationFrame(animate);
    };

    animFrameRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animFrameRef.current);
  }, [ready]);

  // Stop/resume auto-rotate on mouse enter/leave
  const handleMouseEnter = useCallback(() => {
    isMouseOverRef.current = true;
    if (globeRef.current) {
      globeRef.current.controls().autoRotate = false;
    }
  }, []);

  const handleMouseLeave = useCallback(() => {
    isMouseOverRef.current = false;
    setTooltip(null);
    if (globeRef.current && shouldAutoRotateRef.current) {
      globeRef.current.controls().autoRotate = true;
    }
  }, []);

  // Track mouse position for tooltip
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    mousePosRef.current = { x: e.clientX, y: e.clientY };
    setTooltip((prev) => prev ? { ...prev, x: e.clientX, y: e.clientY } : null);
  }, []);

  const onGlobeReady = useCallback(() => {
    if (!globeRef.current) return;
    setReady(true);

    globeRef.current.pointOfView({ lat: 40, lng: 10, altitude: 2.0 }, 1000);

    const controls = globeRef.current.controls();
    controls.autoRotate = true;
    controls.autoRotateSpeed = 0.4;
    controls.enableZoom = true;
    controls.minDistance = 150;
    controls.maxDistance = 600;
  }, []);

  // Click individual mountain — go to resort page
  const handleMarkerClick = useCallback(
    (obj: object) => {
      const marker = obj as MountainMarker;
      if (marker.id) router.push(`/resorts/${marker.id}`);
    },
    [router]
  );

  // Click cluster — zoom into country
  const handleClusterClick = useCallback(
    (obj: object) => {
      const cluster = obj as CountryCluster;
      if (!globeRef.current || !cluster.id) return;

      shouldAutoRotateRef.current = false;
      if (globeRef.current) {
        globeRef.current.controls().autoRotate = false;
      }

      setActiveRegion(cluster.id);
      globeRef.current.pointOfView(
        { lat: cluster.lat, lng: cluster.lng, altitude: 0.6 },
        800
      );
    },
    []
  );

  // Hover handlers — debounced to prevent flickering
  const handleMarkerHover = useCallback((obj: object | null) => {
    const marker = obj as MountainMarker | null;
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
    if (marker) {
      hoveredIdRef.current = marker.id;
      if (containerRef.current) containerRef.current.style.cursor = "pointer";
      const { x, y } = mousePosRef.current;
      setTooltip({ name: marker.name, country: marker.country, id: marker.id, x, y });
    } else {
      // Delay clearing hover to prevent flicker between pin parts
      hoverTimeoutRef.current = setTimeout(() => {
        hoveredIdRef.current = null;
        if (containerRef.current) containerRef.current.style.cursor = "default";
        setTooltip(null);
      }, 150);
    }
  }, []);

  const handleClusterHover = useCallback((obj: object | null) => {
    const cluster = obj as CountryCluster | null;
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
    if (cluster) {
      hoveredIdRef.current = cluster.id;
      if (containerRef.current) containerRef.current.style.cursor = "pointer";
      const { x, y } = mousePosRef.current;
      setTooltip({ name: cluster.name, country: `${cluster.count} resorts`, id: cluster.id, x, y });
    } else {
      hoverTimeoutRef.current = setTimeout(() => {
        hoveredIdRef.current = null;
        if (containerRef.current) containerRef.current.style.cursor = "default";
        setTooltip(null);
      }, 150);
    }
  }, []);

  // Back to clusters view
  const handleBackToOverview = useCallback(() => {
    setActiveRegion(null);
    setTooltip(null);
    shouldAutoRotateRef.current = true;
    if (globeRef.current) {
      globeRef.current.controls().autoRotate = true;
      globeRef.current.pointOfView({ lat: 40, lng: 10, altitude: 2.0 }, 800);
    }
  }, []);

  // Register mountain objects for animation
  const customMountainUpdate = useCallback(
    (obj: Object3D, d: object) => {
      if (!globeRef.current) return;
      const marker = d as MountainMarker;
      mountainObjectsRef.current.set(marker.id, obj);

      const coords = globeRef.current.getCoords(marker.lat, marker.lng, 0.01);
      obj.position.set(coords.x, coords.y, coords.z);
      obj.lookAt(0, 0, 0);
      obj.rotateX(-Math.PI / 2);

      const radius = globeRef.current.getGlobeRadius();
      const s = radius * 0.005 * 0.01;
      obj.scale.set(s, s, s);
    },
    []
  );

  // Register cluster objects for animation
  const customClusterUpdate = useCallback(
    (obj: Object3D, d: object) => {
      if (!globeRef.current) return;
      const cluster = d as CountryCluster;
      clusterObjectsRef.current.set(cluster.id, obj);

      const coords = globeRef.current.getCoords(cluster.lat, cluster.lng, 0.015);
      obj.position.set(coords.x, coords.y, coords.z);
      obj.lookAt(0, 0, 0);
      obj.rotateX(-Math.PI / 2);

      const radius = globeRef.current.getGlobeRadius();
      const cs = radius * 0.032 * 0.01;
      obj.scale.set(cs, cs, cs);
    },
    []
  );

  // Cluster HTML labels
  const clusterHtmlElement = useCallback((d: object) => {
    const c = d as CountryCluster;
    const el = document.createElement("div");
    el.innerHTML = `<span style="font-weight:700">${c.name}</span> <span style="opacity:0.7">· ${c.count}</span>`;
    el.style.cssText = `
      color: #0e2439;
      font-size: 11px;
      font-family: Inter, system-ui, sans-serif;
      background: rgba(255,255,255,0.92);
      padding: 4px 10px;
      border-radius: 8px;
      pointer-events: none;
      white-space: nowrap;
      transform: translateX(-50%);
      box-shadow: 0 2px 8px rgba(0,0,0,0.12);
      border: 1px solid rgba(169,203,227,0.5);
    `;
    return el;
  }, []);

  const clusterHtmlAltitude = useCallback(() => 0.04, []);

  // When continent filter changes, zoom to that region
  useEffect(() => {
    if (!globeRef.current || !ready) return;

    const POV: Record<string, { lat: number; lng: number; altitude: number }> = {
      "All": { lat: 40, lng: 10, altitude: 2.0 },
      "Europe": { lat: 47, lng: 10, altitude: 1.2 },
      "North America": { lat: 45, lng: -105, altitude: 1.2 },
      "Asia": { lat: 37, lng: 139, altitude: 1.2 },
      "Oceania": { lat: -38, lng: 155, altitude: 1.2 },
      "South America": { lat: -34, lng: -70, altitude: 1.2 },
    };

    const target = POV[continentFilter] || POV["All"];

    if (continentFilter === "All") {
      setActiveRegion(null);
    } else if (activeRegion) {
      // If active region (country) is not in the selected continent, clear it
      const activeCluster = COUNTRY_CLUSTERS.find((c) => c.id === activeRegion);
      if (activeCluster && activeCluster.continent !== continentFilter) {
        setActiveRegion(null);
      }
    }

    globeRef.current.pointOfView(target, 800);
  }, [continentFilter, ready]);

  // Respond to selectedCountry prop
  useEffect(() => {
    if (!globeRef.current || !ready) return;

    if (selectedCountry) {
      const cluster = COUNTRY_CLUSTERS.find((c) => c.id === selectedCountry);
      if (cluster) {
        shouldAutoRotateRef.current = false;
        globeRef.current.controls().autoRotate = false;
        setActiveRegion(cluster.id);
        globeRef.current.pointOfView(
          { lat: cluster.lat, lng: cluster.lng, altitude: 0.6 },
          800
        );
      }
    } else {
      shouldAutoRotateRef.current = true;
      if (globeRef.current) {
        globeRef.current.controls().autoRotate = true;
      }
      setActiveRegion(null);
      globeRef.current.pointOfView({ lat: 40, lng: 10, altitude: 2.0 }, 800);
    }
  }, [selectedCountry, ready]);

  if (!GlobeGL) {
    return (
      <div
        ref={containerRef}
        className="flex items-center justify-center text-foreground/40"
        style={{ minHeight: 500 }}
      >
        Loading globe…
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="relative flex items-center justify-center overflow-hidden"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onMouseMove={handleMouseMove}
    >
      {/* Back button when zoomed into a country */}
      {activeRegion && (
        <button
          onClick={handleBackToOverview}
          className="absolute left-4 top-4 z-10 flex items-center gap-1.5 rounded-lg bg-white/90 px-3 py-2 text-sm font-medium text-primary shadow-md backdrop-blur-sm transition-colors hover:bg-white"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          All Countries
        </button>
      )}

      <GlobeGL
        ref={globeRef}
        width={dimensions.width}
        height={dimensions.height}
        globeImageUrl="//unpkg.com/three-globe/example/img/earth-blue-marble.jpg"
        bumpImageUrl="//unpkg.com/three-globe/example/img/earth-topology.png"
        backgroundColor="rgba(0,0,0,0)"
        atmosphereColor="#a9cbe3"
        atmosphereAltitude={0.25}
        animateIn={true}
        onGlobeReady={onGlobeReady}
        // Individual mountains (zoomed in)
        customLayerData={ready ? visibleMarkers : []}
        customThreeObject={createMountain}
        customThreeObjectUpdate={customMountainUpdate}
        onCustomLayerClick={handleMarkerClick}
        onCustomLayerHover={handleMarkerHover}
        // Cluster dots (zoomed out)
        objectsData={ready ? visibleClusters : []}
        objectThreeObject={createClusterDot}
        objectThreeObjectUpdate={customClusterUpdate}
        onObjectClick={handleClusterClick}
        onObjectHover={handleClusterHover}
        // Cluster HTML labels (zoomed out only)
        htmlElementsData={ready ? visibleClusters : []}
        htmlLat="lat"
        htmlLng="lng"
        htmlAltitude={clusterHtmlAltitude}
        htmlElement={clusterHtmlElement}
        htmlTransitionDuration={0}
      />

      {/* Hover tooltip card */}
      {tooltip && tooltip.x > 0 && tooltip.y > 0 && (
        <div
          className="pointer-events-none fixed z-50"
          style={{
            left: `${tooltip.x + 16}px`,
            top: `${tooltip.y - 20}px`,
          }}
        >
          <div className="flex items-center gap-3 rounded-xl border border-accent bg-white px-4 py-3 shadow-lg">
            {/* Logo placeholder */}
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-xs font-bold text-primary">
              {tooltip.name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase()}
            </div>
            <div>
              <p className="text-sm font-semibold text-primary">{tooltip.name}</p>
              <p className="text-xs text-foreground/60">{tooltip.country}</p>
              {/* Only show "View Resort" for individual markers, not clusters */}
              {!COUNTRY_CLUSTERS.find((c) => c.id === tooltip.id) && (
                <p className="mt-0.5 text-[10px] font-medium text-secondary">Click to view resort →</p>
              )}
              {COUNTRY_CLUSTERS.find((c) => c.id === tooltip.id) && (
                <p className="mt-0.5 text-[10px] font-medium text-secondary">Click to explore →</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
