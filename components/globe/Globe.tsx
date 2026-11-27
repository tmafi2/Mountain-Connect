"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Group,
  Mesh,
  ConeGeometry,
  CylinderGeometry,
  TorusGeometry,
  MeshLambertMaterial,
  MeshBasicMaterial,
  MeshPhongMaterial,
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
import { countryViews, viewForOutline, neighbourFeatures } from "@/lib/globe/framing";
import { COUNTRIES } from "@/lib/data/countries";

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
  /** Stop/start the render loop, so an off-screen globe costs nothing. */
  pauseAnimation: () => void;
  resumeAnimation: () => void;
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

/**
 * Where the camera goes for each country. Derived, because the countries
 * differ by an order of magnitude in how much sky they need — see
 * lib/globe/framing.ts.
 */
const COUNTRY_VIEWS = countryViews(
  resorts.map((r) => ({ country: r.country, latitude: r.latitude, longitude: r.longitude })),
);

/** Country copy for the detail panel, by the country name the resorts use. */
const COUNTRY_COPY = new Map(COUNTRIES.map((c) => [c.country, c]));

/** activeRegion is a slug; the hex layer needs the country name. */
const SLUG_TO_COUNTRY = new Map(COUNTRY_CLUSTERS.map((c) => [c.id, c.name]));

/** How many resorts we list in each country — the panel's one live figure. */
const RESORT_COUNT = resorts.reduce<Record<string, number>>((acc, r) => {
  acc[r.country] = (acc[r.country] ?? 0) + 1;
  return acc;
}, {});

/**
 * Framings computed from the country outlines, filled in once the land data
 * arrives. Module-level because the globe is a singleton and both the click
 * handler and the selectedCountry effect need it without threading a ref
 * through either.
 */
const OUTLINE_VIEWS: Record<string, { lat: number; lng: number; altitude: number }> = {};

/**
 * Where the camera goes for a country, best source first:
 *   1. its outline, which is what the visitor asked to see;
 *   2. its resorts, for a country with no geometry in the 110m dataset
 *      (Andorra) or before the land has loaded;
 *   3. the cluster's own point, so the camera always goes somewhere.
 */
function viewFor(cluster: CountryCluster): { lat: number; lng: number; altitude: number } {
  return (
    OUTLINE_VIEWS[cluster.name] ??
    COUNTRY_VIEWS[cluster.name] ?? { lat: cluster.lat, lng: cluster.lng, altitude: 1.0 }
  );
}

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

/* ─── Palette ─────────────────────────────────────────────── */

/**
 * The globe is drawn in the site's own colours, from app/globals.css, rather
 * than in a photograph of the Earth.
 *
 * ⚠️ WHY THERE IS NO TEXTURE ANY MORE. This used to render NASA's Blue Marble
 * JPEG plus a topology bump map — three-globe's demo assets, 1.8 MB of them,
 * fetched from unpkg. Photorealistic Earth fought the navy-and-cyan palette
 * everywhere else on the site and read as a stock library default, which is
 * what it was. The land is now hexagons generated from country outlines:
 * 168 KB of geometry replacing 624 KB of raster, in our colours, and sharp at
 * any zoom because there are no pixels to run out of.
 *
 * ⚠️ HEX COLOUR CARRIES MEANING — it is not decoration. A country we actually
 * have resorts in is drawn in the bright secondary blue; everywhere else is a
 * muted navy barely above the sea. So the globe answers "where can I work?"
 * at a glance, before the visitor reads a single label. HEX_COUNTRIES_WITH
 * is derived from the resort data, so it cannot drift.
 */
const SEA = "#0a1e33"; // --color-primary
const LAND_IDLE = "#294a6d"; // navy, clearly above the sea but recessive
/**
 * ⚠️ This is the OLD --color-secondary, retired from the stylesheet on
 * 2026-10-11 for failing WCAG AA at 2.94:1. That retirement was about TEXT
 * and text grounds. These are 3-pixel hexagons on a sphere, carrying no
 * words, and the brighter blue is what makes "we hire here" legible at a
 * glance against the idle land. Do not swap it for a text-safe colour on
 * contrast grounds — nothing here is read.
 */
const LAND_ACTIVE = "#3b9ede";
/** The country the visitor has selected — the brightest land on the globe. */
const LAND_SELECTED = "#7fd4f5";
/** Everywhere else, once something is selected. */
const LAND_RECEDED = "#22405f";
const GLOW = "#22d3ee"; // --color-highlight, markers and atmosphere
const GLOW_WARM = "#f59e0b"; // --color-warm, the individual resort pins

/**
 * Natural Earth spells a few of these differently from our resort data. Only
 * the ones that actually differ need an entry; everything else matches.
 *
 * ⚠️ ANDORRA IS NOT IN THE DATASET AT ALL and that is not a bug here. The
 * 110m Natural Earth cut drops microstates, so 13 of our 14 countries get
 * highlighted land and Andorra gets none — it is about two hexagons wide at
 * this resolution either way. Its cluster dot and label still render, so the
 * one resort there is as reachable as any other. Check this list before
 * concluding a country's land is mis-coloured; it may simply not exist.
 */
const GEO_NAME_ALIASES: Record<string, string> = {
  "United States of America": "USA",
};

const COUNTRIES_WITH_RESORTS = new Set(resorts.map((r) => r.country));

/** Our country name for a Natural Earth feature. */
function countryOf(feature: object): string {
  const name = (feature as { properties?: { name?: string } }).properties?.name ?? "";
  return GEO_NAME_ALIASES[name] ?? name;
}

/**
 * Land colour, which depends on what the visitor is looking at.
 *
 * At world view it answers "where do you have resorts?". Once a country is
 * selected it answers "which one am I in?" instead: the chosen country holds
 * the bright blue and everything else drops back, so the shape the camera
 * just flew to is unmistakable even before the pins load. Recessive land is
 * dimmed rather than hidden — a country floating alone in a black sea reads
 * as a rendering failure, not as focus.
 */
function hexColorFor(feature: object, selected: string | null): string {
  const ours = countryOf(feature);
  if (selected) return ours === selected ? LAND_SELECTED : LAND_RECEDED;
  return COUNTRIES_WITH_RESORTS.has(ours) ? LAND_ACTIVE : LAND_IDLE;
}

/**
 * The sphere under the hexagons. Phong rather than Basic so the existing
 * lights still model it — a flat fill would read as a circle, not a ball —
 * but low shininess, because a glossy highlight on a stylised globe looks
 * like the plastic it is not.
 */
const globeMaterial = new MeshPhongMaterial({
  color: new Color(SEA),
  shininess: 4,
  specular: new Color("#13293f"),
});

/* ─── 3D object builders ──────────────────────────────────── */

const PIN_COLOR = new Color(GLOW_WARM);
const PIN_DARK = new Color(0xb45309);

function createMountain(d: object): Object3D {
  const marker = d as MountainMarker;
  const group = new Group();
  /* ⚠️ Scaled down for the country view. These were sized when the only way
     to see them was flying in close enough that one country filled the
     frame; framed on the whole country instead, 17 full-size pins merged
     into a single amber blob over the Alps and hid the shape underneath. */
  group.scale.setScalar(0.62);

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
    color: GLOW,
    transparent: true,
    opacity: 0.85,
  });
  const sphere = new Mesh(sphereGeo, sphereMat);
  group.add(sphere);

  // Outer glow ring
  const ringGeo = new RingGeometry(3.0, 5.0, 24);
  const ringMat = new MeshBasicMaterial({
    color: GLOW,
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
  /** No WebGL on this device, or the globe bundle failed to load. */
  const [webglBlocked, setWebglBlocked] = useState(false);
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
  /** Country label elements by cluster id, for the visibility pass. */
  const labelElsRef = useRef<Map<string, HTMLElement>>(new Map());
  /** Mirrors activeRegion for callbacks that must keep a stable identity. */
  const activeRegionRef = useRef<string | null>(null);
  /** Latest camera sub-point, so a re-render can re-run the pass without one. */
  const lastPovRef = useRef<{ lat: number; lng: number } | null>(null);
  /**
   * Country outlines for the hex land layer, fetched rather than bundled:
   * 168 KB of geometry has no business in the JS bundle of a page that also
   * renders a resort grid, and the globe is below the fold anyway. Until it
   * arrives the sphere renders as empty sea, which is a reasonable thing to
   * look at for a moment and never an error state.
   */
  const [landFeatures, setLandFeatures] = useState<object[]>([]);
  /** The library-positioned wrapper of each label, measured but never written. */
  const labelOuterRef = useRef<Map<string, HTMLElement>>(new Map());
  /** Vertical nudge currently applied to each label, so writes stay idempotent. */
  const labelDyRef = useRef<Map<string, number>>(new Map());
  const lastLabelPassRef = useRef(0);
  /**
   * Whatever the HTML layer is currently showing — country pills at world
   * view, resort pills once a country is selected. Read by refreshLabels,
   * which must not be re-created on every render.
   */
  const labelDataRef = useRef<{ id: string; lat: number; lng: number; weight: number }[]>([]);

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
  /**
   * ⚠️ ONE HTML LAYER, TWO JOBS. Zoomed out it labels countries; zoomed into
   * a country it labels that country's resorts. They share the layer because
   * they are never on screen together, and sharing it means the de-collision
   * pass written for country pills works unchanged on resort pills — which is
   * the whole reason individual resorts are now clickable at all.
   */
  const labelData = activeRegion
    ? visibleMarkers.map((m) => ({ id: m.id, lat: m.lat, lng: m.lng, weight: m.height }))
    : visibleClusters.map((c) => ({ id: c.id, lat: c.lat, lng: c.lng, weight: c.count }));
  labelDataRef.current = labelData;
  activeRegionRef.current = activeRegion;
  /** Identity of the current label set — the visibility pass re-runs when it changes. */
  const clusterKey = labelData.map((d) => d.id).join(",");

  // Land outlines. Failure is silent and leaves an empty sea rather than
  // breaking the page: the markers, labels and clicking all work without it.
  useEffect(() => {
    let cancelled = false;
    fetch("/globe/countries.geojson")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        const features = (data as { features?: object[] } | null)?.features;
        if (cancelled || !Array.isArray(features)) return;
        // Frame every country from its outline now the geometry is here.
        for (const name of COUNTRIES_WITH_RESORTS) {
          const view = viewForOutline(features, name, countryOf);
          if (view) OUTLINE_VIEWS[name] = view;
        }
        setLandFeatures(features);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  // Dynamic import, but only where a globe can actually be drawn.
  //
  // react-globe.gl throws "Error creating WebGL context" on a device that
  // cannot give it one — older phones, software rendering, and browsers with
  // hardware acceleration switched off. That reached Sentry from /explore.
  // Probing first turns an uncatchable render crash into a missing globe, and
  // the rest of the page (which is the part with the jobs on it) still works.
  useEffect(() => {
    let cancelled = false;

    const hasWebGL = () => {
      try {
        const canvas = document.createElement("canvas");
        return !!(
          window.WebGLRenderingContext &&
          (canvas.getContext("webgl") || canvas.getContext("experimental-webgl"))
        );
      } catch {
        return false;
      }
    };

    if (!hasWebGL()) {
      setWebglBlocked(true);
      return;
    }

    import("react-globe.gl")
      .then((mod) => {
        if (cancelled) return;
        setGlobeGL(
          () =>
            mod.default as unknown as React.ComponentType<Record<string, unknown>>
        );
      })
      .catch(() => {
        if (!cancelled) setWebglBlocked(true);
      });

    return () => {
      cancelled = true;
    };
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
    lastPovRef.current = { lat: 40, lng: 10 };

    const controls = globeRef.current.controls();
    controls.autoRotate = true;
    controls.autoRotateSpeed = 0.4;
    controls.enableZoom = true;
    // ⚠️ Raised from 150 with the hex globe. The land is drawn at hex
    // resolution 2, which is bold and legible at world scale and turns into
    // chunky blocks close up — so the camera is stopped before the viewer
    // can get close enough to see the seams. If the resolution ever goes up,
    // this can come back down.
    // ⚠️ Must stay at or below 100 * (1 + MIN_ALTITUDE) = 133, or the flight
    // to a small country stops short of where framing.ts aimed it and every
    // one-resort country arrives at the wrong distance.
    controls.minDistance = 128;
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
        viewFor(cluster),
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
  /**
   * A resort's own label, and the fix for not being able to pick one out.
   *
   * ⚠️ THE 3D PINS WERE NEVER REALLY SELECTABLE. Seventeen Italian resorts
   * sit inside a couple of degrees of the Alps, so their cones overlapped
   * into a single amber mass and whichever one the raycaster happened to hit
   * first won. A DOM pill is a real click target with a real name on it, and
   * it goes through the same de-collision pass as the country labels — so
   * they stack instead of piling up, and you can see what you are choosing
   * before you choose it. The cones stay as the marker of the actual spot.
   */
  const resortHtmlElement = useCallback(
    (d: object) => {
      const marker = d as MountainMarker;
      const outer = document.createElement("div");
      outer.style.cssText = "pointer-events:none;";

      const pill = document.createElement("button");
      pill.type = "button";
      pill.textContent = marker.name;
      pill.style.cssText = `
        color: #0d1f33;
        font-size: 10.5px;
        font-weight: 600;
        font-family: var(--font-jakarta), Inter, system-ui, sans-serif;
        background: rgba(245, 158, 11, 0.95);
        padding: 3px 8px;
        border-radius: 999px;
        border: 1px solid rgba(255,255,255,0.35);
        cursor: pointer;
        pointer-events: auto;
        white-space: nowrap;
        box-shadow: 0 1px 8px rgba(0,0,0,0.5);
        transition: opacity 180ms ease-out, transform 180ms ease-out;
        will-change: opacity, transform;
      `;
      pill.addEventListener("click", (e) => {
        e.stopPropagation();
        router.push(`/resorts/${marker.id}`);
      });
      outer.appendChild(pill);
      labelElsRef.current.set(marker.id, pill);
      labelOuterRef.current.set(marker.id, outer);
      return outer;
    },
    [router],
  );

  /**
   * ⚠️ TWO ELEMENTS, AND IT HAS TO BE TWO. three-globe positions each label by
   * writing `transform: translate(-50%,-50%) translate(Xpx, Ypx)` onto the
   * element it was handed, every single frame. Anything this component sets on
   * that element's `transform` is gone by the next tick — which is exactly how
   * the first attempt at de-colliding these labels failed silently: the nudge
   * was computed correctly and then overwritten before it could ever paint.
   * So the outer div belongs to the library, and the inner one — the pill the
   * visitor actually sees — is ours to move and fade.
   */
  const clusterHtmlElement = useCallback((d: object) => {
    const c = d as CountryCluster;
    const outer = document.createElement("div");
    outer.style.cssText = "pointer-events:none;";

    const pill = document.createElement("div");
    pill.innerHTML =
      `<span style="font-weight:600;letter-spacing:0.01em">${c.name}</span>` +
      `<span style="color:${GLOW};font-weight:700;margin-left:7px">${c.count}</span>`;
    /* Dark glass, not a white chip. The old label was opaque white with a
       drop shadow — fine over a photograph of the Earth, but over a dark
       stylised globe it read as a sticker someone left on the lens, and nine
       of them at once were the brightest thing on the page. Sitting the
       label in the globe's own palette lets the land stay the subject. */
    pill.style.cssText = `
      color: #dce9f5;
      font-size: 11px;
      font-family: var(--font-jakarta), Inter, system-ui, sans-serif;
      background: rgba(9, 24, 41, 0.72);
      -webkit-backdrop-filter: blur(6px);
      backdrop-filter: blur(6px);
      padding: 4px 9px;
      border-radius: 999px;
      pointer-events: none;
      white-space: nowrap;
      box-shadow: 0 1px 10px rgba(0,0,0,0.45);
      border: 1px solid rgba(34, 211, 238, 0.28);
      transition: opacity 180ms ease-out, transform 180ms ease-out;
      will-change: opacity, transform;
    `;
    outer.appendChild(pill);
    labelElsRef.current.set(c.id, pill);
    // Measured, never written to. A transform on the pill does not move its
    // parent's layout box, so the outer rect is the label's resting position
    // whatever nudge is currently applied — and, crucially, whatever stage a
    // transition is midway through.
    labelOuterRef.current.set(c.id, outer);
    return outer;
  }, []);

  const clusterHtmlAltitude = useCallback(() => (activeRegionRef.current ? 0.055 : 0.04), []);

  /** Land colour, rebound whenever the selected country changes. */
  const selectedCountryName = activeRegion ? SLUG_TO_COUNTRY.get(activeRegion) ?? null : null;

  /**
   * What the panel shows. Deliberately NOT derived straight from
   * activeRegion: on the way out that goes null first, and a panel that
   * empties itself before it has finished sliding away is the opposite of
   * seamless. Holding the last country means the exit animates intact.
   */
  const [panelCountry, setPanelCountry] = useState<{
    name: string;
    resortCount: number;
    copy: (typeof COUNTRIES)[number] | null;
    resorts: { id: string; name: string }[];
  } | null>(null);

  useEffect(() => {
    if (!selectedCountryName) return;
    setPanelCountry({
      name: selectedCountryName,
      resortCount: RESORT_COUNT[selectedCountryName] ?? 0,
      copy: COUNTRY_COPY.get(selectedCountryName) ?? null,
      resorts: resorts
        .filter((r) => r.country === selectedCountryName)
        .map((r) => ({ id: r.id, name: r.name }))
        .sort((a, b) => a.name.localeCompare(b.name)),
    });
  }, [selectedCountryName]);
  const hexColor = useCallback(
    (f: object) => hexColorFor(f, selectedCountryName),
    [selectedCountryName],
  );
  /**
   * The selected country as an actual filled outline, laid over the hexes.
   *
   * ⚠️ THE HEX GRID CANNOT DRAW ONE COUNTRY'S SHAPE. At the resolution that
   * keeps 177 countries affordable, Italy is about eight hexagons across and
   * reads as a trail of dots rather than a boot — raising the resolution far
   * enough to fix that is what takes h3's browser build down. A polygon has
   * the real border in it, costs one shape, and is the thing that was
   * actually being asked for: the country, recognisably.
   */
  const selectedFeatures = useMemo(
    () =>
      selectedCountryName
        ? landFeatures.filter((f) => countryOf(f) === selectedCountryName)
        : [],
    [landFeatures, selectedCountryName],
  );

  /**
   * The selected country plus the countries around it, all drawn as real
   * borders.
   *
   * ⚠️ WITHOUT THE NEIGHBOURS THERE IS NO GEOGRAPHY. Outlining only the
   * chosen country left it floating in an undifferentiated field of hexagons:
   * the shape was right but nothing around it was, so Italy could have been
   * anywhere. Bordering what surrounds it is what turns "a shape" into "the
   * Alps, with France on one side and Slovenia on the other".
   */
  const outlineFeatures = useMemo(() => {
    if (!selectedCountryName || landFeatures.length === 0) return [];
    const view = OUTLINE_VIEWS[selectedCountryName] ?? COUNTRY_VIEWS[selectedCountryName];
    if (!view) return selectedFeatures;
    return [
      ...selectedFeatures,
      ...neighbourFeatures(landFeatures, view, countryOf, selectedCountryName),
    ];
  }, [landFeatures, selectedCountryName, selectedFeatures]);

  const isSelectedFeature = useCallback(
    (f: object) => countryOf(f) === selectedCountryName,
    [selectedCountryName],
  );

  /** Detail for the country in focus, coarse everywhere else. */
  const hexResolution = useCallback(
    (f: object) => (selectedCountryName && countryOf(f) === selectedCountryName ? 3 : 2),
    [selectedCountryName],
  );

  /**
   * Decide which country labels are readable, and hide the rest.
   *
   * ⚠️ WHY THIS EXISTS. The labels were plain HTML with no visibility logic
   * at all, so every country drew its pill at full strength wherever it
   * landed. Two things went wrong with that. Countries on the FAR SIDE of the
   * globe were as bright as the ones facing you, so you read names off a
   * hemisphere you cannot see. And in Europe seven countries sit within a few
   * degrees, so France, Andorra, Switzerland and Italy drew on top of one
   * another and at least one was completely hidden behind another — on the
   * continent that holds the most resorts.
   *
   * ⚠️ TIES BREAK BY RESORT COUNT, NOT BY DRAW ORDER. When two labels collide
   * the bigger country survives, so the survivor is stable as the globe turns
   * rather than flickering between neighbours. A hidden label is not lost:
   * its dot stays, and hovering it still gives the tooltip.
   */
  const refreshLabels = useCallback((pov?: { lat: number; lng: number }, force = false) => {
    if (!globeRef.current) return;

    const centre = pov ?? lastPovRef.current;
    if (!centre) return;
    lastPovRef.current = centre;

    // Throttle: onZoom fires every frame while the globe auto-rotates, and
    // this pass reads layout. Labels do not need 60 Hz to look settled.
    const now = performance.now();
    if (!force && now - lastLabelPassRef.current < 60) return;
    lastLabelPassRef.current = now;

    const toRad = Math.PI / 180;
    // Most resorts first — that is the label worth keeping in a collision.
    const clusters = [...labelDataRef.current].sort((a, b) => b.weight - a.weight);

    // ⚠️ MEASURE EVERYTHING BEFORE MOVING ANYTHING. Writing a transform
    // invalidates layout, so interleaving reads and writes would both thrash
    // and feed later measurements the earlier decisions. Geometry comes from
    // the DOM rather than globe.getScreenCoords(): that projection did not
    // agree with where three-globe actually places the elements, so the
    // collision test silently never fired and labels kept overlapping. The
    // rect is the position the visitor sees, and cannot disagree with itself.
    type LabelDatum = { id: string; lat: number; lng: number; weight: number };
    type Measured = { c: LabelDatum; el: HTMLElement; x: number; y: number; w: number; h: number };
    const measured: Measured[] = [];
    const offscreen: HTMLElement[] = [];

    for (const c of clusters) {
      const el = labelElsRef.current.get(c.id);
      if (!el) continue;

      // Great-circle angle between the camera's sub-point and this country.
      // Past ~74° the label is on the limb or behind the globe.
      const cosAngle =
        Math.sin(centre.lat * toRad) * Math.sin(c.lat * toRad) +
        Math.cos(centre.lat * toRad) *
          Math.cos(c.lat * toRad) *
          Math.cos((c.lng - centre.lng) * toRad);
      if (Math.acos(Math.min(1, Math.max(-1, cosAngle))) > 74 * toRad) {
        offscreen.push(el);
        continue;
      }

      const outer = labelOuterRef.current.get(c.id);
      if (!outer) continue;
      const r = outer.getBoundingClientRect();
      if (r.width === 0) continue; // not laid out yet; the next pass gets it
      measured.push({ c, el, x: r.left + r.width / 2, y: r.top + r.height / 2, w: r.width, h: r.height });
    }

    const placed: { left: number; right: number; top: number; bottom: number }[] = [];
    const writes: { el: HTMLElement; id: string; opacity: string; dy: number }[] = [];

    for (const m of measured) {
      // Try the natural spot, then nudge up/down before giving up. Hiding a
      // label outright is the last resort: in the Alps, Italy, France,
      // Switzerland and Austria sit within a few degrees, and "biggest wins"
      // alone would leave the other three invisible at the default zoom —
      // a reader would fairly conclude we have no French resorts. Offsetting
      // keeps all four readable and merely stacks them.
      const fits = (dy: number) => {
        const box = {
          left: m.x - m.w / 2 - 2,
          right: m.x + m.w / 2 + 2,
          top: m.y + dy - m.h / 2 - 2,
          bottom: m.y + dy + m.h / 2 + 2,
        };
        const clash = placed.some(
          (p) => box.left < p.right && box.right > p.left && box.top < p.bottom && box.bottom > p.top,
        );
        return clash ? null : box;
      };

      const step = m.h + 3;
      // ⚠️ Enough slots to seat a whole country's resorts. Three steps either
      // way was fine for fourteen country pills spread over a planet; Italy
      // packs seventeen resorts into a couple of degrees of Alps, and a
      // label that finds no slot is HIDDEN — which, now that the label is the
      // click target, means that resort cannot be reached at all. Hiding is
      // acceptable for a duplicate-looking country name and not for a resort
      // somebody is trying to pick.
      // ⚠️ Bounded on purpose. Enough slots to seat most of a country's
      // resorts, but not so many that a label ends up nowhere near its
      // mountain — stacked nine deep, Madonna di Campiglio floated down to
      // central Italy and read as a location rather than a queue position.
      // Whatever still does not fit is reachable from the list in the panel,
      // which is always complete, so no resort depends on winning a slot.
      const slots: number[] = [0];
      for (let k = 1; k <= 4; k++) slots.push(-step * k, step * k);

      let chosen: { left: number; right: number; top: number; bottom: number } | null = null;
      let chosenDy = 0;
      for (const dy of slots) {
        const box = fits(dy);
        if (box) {
          chosen = box;
          chosenDy = dy;
          break;
        }
      }

      if (!chosen) {
        writes.push({ el: m.el, id: m.c.id, opacity: "0", dy: labelDyRef.current.get(m.c.id) ?? 0 });
        continue;
      }
      placed.push(chosen);
      writes.push({ el: m.el, id: m.c.id, opacity: "1", dy: chosenDy });
    }

    for (const el of offscreen) el.style.opacity = "0";
    for (const w of writes) {
      // Safe to own this transform outright: w.el is the inner pill, and the
      // library only ever writes to its parent.
      if ((labelDyRef.current.get(w.id) ?? 0) !== w.dy) {
        w.el.style.transform = w.dy === 0 ? "" : `translateY(${w.dy}px)`;
        labelDyRef.current.set(w.id, w.dy);
      }
      if (w.el.style.opacity !== w.opacity) w.el.style.opacity = w.opacity;
    }
  }, []);

  const handleZoom = useCallback(
    (pov: { lat: number; lng: number; altitude: number }) => refreshLabels(pov),
    [refreshLabels],
  );

  // The set of labels changed (filter, or zooming in or out), so three-globe
  // has built new elements. Re-run the visibility pass against the camera we
  // last saw, after the browser has laid them out — the pass measures each
  // pill's real width and before layout they are all zero.
  useEffect(() => {
    if (!ready) return;
    let frame = 0;
    let timer: ReturnType<typeof setTimeout> | null = null;
    let attempts = 0;

    /**
     * ⚠️ ONE PASS IS NOT ENOUGH, and the reason only shows up zoomed in.
     * three-globe builds its HTML elements on a debounce, so the first pass
     * can run before any of them exist, measure nothing and position
     * nothing. At world view that self-corrects within a frame because the
     * globe is auto-rotating and every camera move re-runs the pass — but
     * flying into a country STOPS the rotation, so there is no second
     * trigger and the labels stay exactly as three-globe left them: all at
     * full opacity, stacked on top of each other, which is the pile this
     * pass exists to prevent. Retry until the elements are actually there.
     */
    const run = () => {
      refreshLabels(undefined, true);
      // ⚠️ KEEP GOING UNTIL THE CAMERA HAS LANDED, not just until the
      // elements exist. Stopping as soon as they were built left the labels
      // placed against positions from mid-flight: the camera was still
      // moving, three-globe kept repositioning them, and with the rotation
      // stopped there was no later trigger to correct it — so a tidy layout
      // drifted back into a pile. The flight is 800ms; this covers it with
      // room, and then stops rather than running forever.
      if (attempts++ < 20) timer = setTimeout(run, 150);
    };
    frame = requestAnimationFrame(run);

    return () => {
      cancelAnimationFrame(frame);
      if (timer) clearTimeout(timer);
    };
  }, [clusterKey, ready, refreshLabels]);

  /**
   * Stop rendering while the globe is scrolled out of view.
   *
   * ⚠️ IT SITS WELL BELOW THE FOLD on /explore — past the hero, the continent
   * chips, a button and a search box — and it auto-rotates, so it was running
   * a WebGL render loop the whole time a visitor read the resort grid under
   * it. On a laptop that is a warm fan; on a phone it is battery, on the page
   * paid traffic lands on.
   *
   * It also means the globe is where you left it when you scroll back,
   * instead of having quietly turned to face the Pacific.
   */
  useEffect(() => {
    const node = containerRef.current;
    if (!ready || !node || typeof IntersectionObserver === "undefined") return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        const globe = globeRef.current;
        if (!globe) return;
        if (entry.isIntersecting) globe.resumeAnimation();
        else globe.pauseAnimation();
      },
      { rootMargin: "100px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [ready]);

  // When continent filter changes, zoom to that region
  useEffect(() => {
    if (!globeRef.current || !ready) return;

    const POV: Record<string, { lat: number; lng: number; altitude: number }> = {
      "All": { lat: 40, lng: 10, altitude: 2.0 },
      "Europe": { lat: 47, lng: 10, altitude: 1.2 },
      "North America": { lat: 45, lng: -105, altitude: 1.2 },
      "Asia": { lat: 37, lng: 139, altitude: 1.2 },
      "Australia / New Zealand": { lat: -38, lng: 155, altitude: 1.2 },
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
          viewFor(cluster),
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

  // Without WebGL the globe never arrives, so say so instead of showing
  // "Loading globe…" forever. Explore's country and resort lists sit below
  // this and work regardless — the globe is the decoration, not the feature.
  if (webglBlocked) {
    return (
      <div
        ref={containerRef}
        className="flex flex-col items-center justify-center gap-2 px-6 text-center"
        style={{ minHeight: 500 }}
      >
        <p className="text-sm font-medium text-foreground/60">
          The 3D globe can&apos;t run on this device.
        </p>
        <p className="max-w-sm text-xs text-foreground/40">
          Everything else works — browse the resorts and countries below, or head
          straight to the jobs.
        </p>
      </div>
    );
  }

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
      {/*
        The country panel, which doubles as the way back out.
        ⚠️ IT STAYS MOUNTED. Rendering it only while a country is selected
        would make it pop in and jump out with no transition, and the whole
        point of this interaction is that flying in and out feels continuous.
        It is hidden from assistive tech and from the pointer while closed,
        so an invisible panel cannot be tabbed into or clicked through.
        Every figure in it is real: the copy is the same per-country content
        the /ski-resort-jobs pages publish, and the resort count is counted
        from resorts.ts rather than written down.
      */}
      <div
        aria-hidden={!activeRegion}
        className={`pointer-events-none absolute left-0 top-0 z-10 h-full w-full max-w-[21rem] p-4 transition-[opacity,transform] duration-500 ease-out ${
          activeRegion ? "translate-x-0 opacity-100" : "-translate-x-4 opacity-0"
        }`}
      >
        <div className="pointer-events-auto flex max-h-full flex-col overflow-y-auto rounded-2xl border border-highlight/20 bg-primary/80 p-4 shadow-2xl backdrop-blur-md">
          <button
            onClick={handleBackToOverview}
            tabIndex={activeRegion ? 0 : -1}
            className="mb-3 flex w-fit items-center gap-1.5 rounded-full border border-highlight/25 px-3 py-1.5 text-xs font-medium text-white/80 transition-colors hover:border-highlight/60 hover:text-white"
          >
            <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            All countries
          </button>

          {panelCountry && (
            <>
              <h3 className="text-xl font-bold leading-tight text-white">{panelCountry.name}</h3>
              <div className="mt-2 flex flex-wrap gap-1.5">
                <span className="rounded-full bg-highlight/15 px-2.5 py-1 text-[11px] font-semibold text-highlight">
                  {panelCountry.resortCount} {panelCountry.resortCount === 1 ? "resort" : "resorts"}
                </span>
                {panelCountry.copy && (
                  <>
                    <span className="rounded-full bg-white/10 px-2.5 py-1 text-[11px] font-medium text-white/75">
                      {panelCountry.copy.season}
                    </span>
                    <span className="rounded-full bg-white/10 px-2.5 py-1 text-[11px] font-medium text-white/75">
                      {panelCountry.copy.hemisphere} hemisphere
                    </span>
                  </>
                )}
              </div>

              {panelCountry.copy && (
                <>
                  <p className="mt-3 text-[13px] leading-relaxed text-white/75">
                    {panelCountry.copy.intro}
                  </p>
                  <p className="mt-3 border-l-2 border-highlight/40 pl-3 text-[12px] leading-relaxed text-white/60">
                    {panelCountry.copy.visaNote}
                  </p>
                  <a
                    href={`/ski-resort-jobs/${panelCountry.copy.slug}`}
                    tabIndex={activeRegion ? 0 : -1}
                    className="mt-4 inline-flex w-fit items-center gap-1.5 rounded-full bg-secondary px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-secondary/85"
                  >
                    Ski resort jobs in {panelCountry.name}
                    <span aria-hidden>→</span>
                  </a>
                </>
              )}
              {/*
                ⚠️ THE COMPLETE LIST, and it is not decoration. The labels on
                the globe are de-collided, so in a tight range a few lose
                their slot and are hidden — fine for a map, not fine when the
                label is the only way to open a resort. This list always has
                every one of them.
              */}
              {/* `?? []` is not defensive theatre: panelCountry is held across
                  the close animation, so a shape change can meet an object
                  set by the previous one — which threw here during a Fast
                  Refresh and took the whole globe down with it. */}
              {(panelCountry.resorts ?? []).length > 0 && (
                <div className="mt-4 border-t border-white/10 pt-3">
                  <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-white/40">
                    All {(panelCountry.resorts ?? []).length} resorts
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {(panelCountry.resorts ?? []).map((r) => (
                      <a
                        key={r.id}
                        href={`/resorts/${r.id}`}
                        tabIndex={activeRegion ? 0 : -1}
                        className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] text-white/75 transition-colors hover:border-warm/50 hover:bg-warm/15 hover:text-white"
                      >
                        {r.name}
                      </a>
                    ))}
                  </div>
                </div>
              )}
              <p className="mt-3 text-[11px] text-white/40">
                Tap a resort name, on the globe or in the list.
              </p>
            </>
          )}
        </div>
      </div>

      <GlobeGL
        ref={globeRef}
        width={dimensions.width}
        height={dimensions.height}
        /* No globeImageUrl: the sphere is a flat sea colour and the land is
           the hex layer below. See the Palette block for why the Blue Marble
           texture went. */
        globeMaterial={globeMaterial}
        backgroundColor="rgba(0,0,0,0)"
        atmosphereColor={GLOW}
        atmosphereAltitude={0.18}
        /* Land, as hexagons. resolution 3 is the readable floor — at 2 the
           Alps collapse into a blob and Japan loses its shape; at 4 the hex
           count roughly quadruples for detail a 360px sphere cannot show.
           useDots stays false: hexagons tile without gaps, so coastlines read
           as edges rather than as stippling. */
        hexPolygonsData={landFeatures}
        /* ⚠️ RESOLUTION IS PER COUNTRY, AND RAISING IT GLOBALLY CRASHES THE
           LAYER. Resolution 2 is bold and right for a 360px world, but flown
           in close it is the resolution the seams show at — so the selected
           country, and only it, is rebuilt at 3. Setting 3 for all 177
           features throws "operation failed (code: 1)" out of h3's BROWSER
           build inside polygonToCells, which takes the whole hex layer down
           with it; the same geometry at the same resolution is fine in h3's
           node build, so it is the browser build's limits rather than bad
           polygons. One country's worth of extra cells stays well clear.
           The rebuild hides behind the camera flight. */
        hexPolygonResolution={hexResolution}
        hexPolygonMargin={0.22}
        hexPolygonUseDots={false}
        hexPolygonAltitude={0.008}
        hexPolygonColor={hexColor}
        /* The selected country's true border, sitting just above the hexes. */
        polygonsData={outlineFeatures}
        /* The selected country is filled; its neighbours are outline only, so
           they give position without competing for attention. */
        polygonCapColor={(f: object) =>
          isSelectedFeature(f) ? "rgba(127, 212, 245, 0.55)" : "rgba(0, 0, 0, 0)"
        }
        polygonSideColor={() => "rgba(34, 211, 238, 0.14)"}
        polygonStrokeColor={(f: object) =>
          isSelectedFeature(f) ? GLOW : "rgba(127, 212, 245, 0.42)"
        }
        polygonAltitude={(f: object) => (isSelectedFeature(f) ? 0.012 : 0.009)}
        polygonsTransitionDuration={400}
        animateIn={true}
        onGlobeReady={onGlobeReady}
        onZoom={handleZoom}
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
        htmlElementsData={ready ? (activeRegion ? visibleMarkers : visibleClusters) : []}
        htmlLat="lat"
        htmlLng="lng"
        htmlAltitude={clusterHtmlAltitude}
        htmlElement={activeRegion ? resortHtmlElement : clusterHtmlElement}
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
          {/* Dark glass, matching the country labels — a white card hovering
              over the dark globe was the one element that still looked
              borrowed from somewhere else. */}
          <div className="flex items-center gap-3 rounded-xl border border-highlight/25 bg-primary/85 px-4 py-3 shadow-xl backdrop-blur-md">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-highlight/15 text-xs font-bold text-highlight">
              {tooltip.name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase()}
            </div>
            <div>
              <p className="text-sm font-semibold text-white">{tooltip.name}</p>
              <p className="text-xs text-white/55">{tooltip.country}</p>
              {/* Only show "View Resort" for individual markers, not clusters */}
              {!COUNTRY_CLUSTERS.find((c) => c.id === tooltip.id) && (
                <p className="mt-0.5 text-[10px] font-medium text-highlight">Click to view resort →</p>
              )}
              {COUNTRY_CLUSTERS.find((c) => c.id === tooltip.id) && (
                <p className="mt-0.5 text-[10px] font-medium text-highlight">Click to explore →</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
