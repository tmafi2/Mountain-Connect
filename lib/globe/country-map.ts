/**
 * Flatten one country out of the globe's GeoJSON so it can fill a box.
 *
 * ⚠️ WHY NOT JUST ZOOM THE GLOBE FURTHER. A country on a sphere is always
 * seen on a curved surface, always foreshortened towards the limb, and can
 * never fill a rectangle — past a point, zooming in just magnifies the
 * curvature and the hexagons. Once a visitor has chosen a country the globe
 * has done its job; the country is the subject, and a subject wants the whole
 * frame. So this projects it flat.
 *
 * ⚠️ NO IMAGES, DELIBERATELY. The outlines are already shipped as geometry for
 * the globe's land layer, so the same bytes draw a flat map at any size and
 * stay sharp. A rendered image per country would be 14 new assets to make,
 * optimise, store and keep in step with the data — and would be wrong the
 * moment a border or a resort moved.
 */

export interface Projection {
  /** Lat/lng to pixels inside the box. */
  project: (lat: number, lng: number) => { x: number; y: number };
  width: number;
  height: number;
}

export interface CountryMapShapes {
  projection: Projection;
  /** SVG path data for the chosen country. */
  country: string;
  /** SVG path data for everything else nearby, drawn as context. */
  neighbours: string;
}

type Ring = number[][];

function ringsOf(feature: object): Ring[] {
  const geom = (feature as { geometry?: { type?: string; coordinates?: unknown } }).geometry;
  if (!geom?.coordinates) return [];
  const polys = (geom.type === "Polygon" ? [geom.coordinates] : geom.coordinates) as Ring[][];
  // Outer rings only. Holes are a handful of enclaves at this scale and
  // drawing them as solid land is less wrong than drawing them as sea.
  return polys.map((p) => p[0]).filter((r): r is Ring => Array.isArray(r) && r.length >= 4);
}

function ringArea(ring: Ring): number {
  let a = 0;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    a += (ring[j][0] + ring[i][0]) * (ring[j][1] - ring[i][1]);
  }
  return Math.abs(a / 2);
}

/**
 * Bounds of a country's mainland, ignoring distant territory.
 *
 * ⚠️ The same Alaska problem the camera framing has: fitting the USA's full
 * extent puts the lower 48 in a corner. Rings further than `spread` times the
 * mainland's own size from its centre are left out of the fit — they still
 * get DRAWN, they just do not get a vote on the zoom.
 */
export function mainlandBounds(
  rings: Ring[],
  spread = 1.6,
): { minLat: number; maxLat: number; minLng: number; maxLng: number } | null {
  if (rings.length === 0) return null;

  const biggest = rings.reduce((best, r) => (ringArea(r) > ringArea(best) ? r : best), rings[0]);
  const bLats = biggest.map((c) => c[1]);
  const bLngs = biggest.map((c) => c[0]);
  const cLat = (Math.min(...bLats) + Math.max(...bLats)) / 2;
  const cLng = (Math.min(...bLngs) + Math.max(...bLngs)) / 2;
  const reach =
    Math.max(Math.max(...bLats) - Math.min(...bLats), Math.max(...bLngs) - Math.min(...bLngs)) *
      spread +
    1;

  let minLat = Infinity;
  let maxLat = -Infinity;
  let minLng = Infinity;
  let maxLng = -Infinity;
  for (const ring of rings) {
    const lats = ring.map((c) => c[1]);
    const lngs = ring.map((c) => c[0]);
    const rLat = (Math.min(...lats) + Math.max(...lats)) / 2;
    const rLng = (Math.min(...lngs) + Math.max(...lngs)) / 2;
    if (Math.abs(rLat - cLat) > reach || Math.abs(rLng - cLng) > reach) continue;
    minLat = Math.min(minLat, ...lats);
    maxLat = Math.max(maxLat, ...lats);
    minLng = Math.min(minLng, ...lngs);
    maxLng = Math.max(maxLng, ...lngs);
  }
  if (!Number.isFinite(minLat)) return null;
  return { minLat, maxLat, minLng, maxLng };
}

/**
 * Fit a country to a box.
 *
 * ⚠️ LONGITUDE IS SQUEEZED BY LATITUDE, and skipping that is what makes a
 * flat map look wrong rather than merely simple. A degree of longitude at
 * 60°N covers half the ground it does at the equator, so plotting lat and lng
 * on the same scale stretches Sweden sideways into something nobody would
 * recognise. Multiplying longitude by cos(latitude) at the country's own
 * centre is the cheap version of a proper projection and is accurate enough
 * across a single country.
 */
export interface Insets {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

/**
 * ⚠️ INSETS, NOT A SINGLE PADDING. The country panel covers the left of the
 * box, so a country centred in the full width sits half behind it — which is
 * exactly what happened: Sauze d'Oulx and Santa Caterina Valfurva were drawn
 * underneath the panel and unreadable. The drawing is fitted to the space the
 * visitor can actually see.
 */
export function fitProjection(
  bounds: { minLat: number; maxLat: number; minLng: number; maxLng: number },
  width: number,
  height: number,
  insets: Insets,
): Projection {
  const midLat = (bounds.minLat + bounds.maxLat) / 2;
  const kx = Math.cos((midLat * Math.PI) / 180);

  const spanX = Math.max(1e-6, (bounds.maxLng - bounds.minLng) * kx);
  const spanY = Math.max(1e-6, bounds.maxLat - bounds.minLat);

  const usableW = Math.max(1, width - insets.left - insets.right);
  const usableH = Math.max(1, height - insets.top - insets.bottom);
  const scale = Math.min(usableW / spanX, usableH / spanY);

  const drawnW = spanX * scale;
  const drawnH = spanY * scale;
  const offsetX = insets.left + (usableW - drawnW) / 2;
  const offsetY = insets.top + (usableH - drawnH) / 2;

  return {
    width,
    height,
    project: (lat: number, lng: number) => ({
      x: offsetX + (lng - bounds.minLng) * kx * scale,
      // SVG y grows downward; latitude grows upward.
      y: offsetY + (bounds.maxLat - lat) * scale,
    }),
  };
}

function ringsToPath(rings: Ring[], projection: Projection): string {
  const parts: string[] = [];
  for (const ring of rings) {
    const pts = ring.map(([lng, lat]) => {
      const p = projection.project(lat, lng);
      return `${p.x.toFixed(1)},${p.y.toFixed(1)}`;
    });
    if (pts.length) parts.push(`M${pts.join("L")}Z`);
  }
  return parts.join("");
}

/**
 * Everything needed to draw a country flat: the fitted projection, the
 * country's own path, and the surrounding land as context.
 */
export function countryMapShapes(
  features: object[],
  country: string,
  nameOf: (feature: object) => string,
  width: number,
  height: number,
  insets: Insets,
): CountryMapShapes | null {
  const own = features.filter((f) => nameOf(f) === country).flatMap(ringsOf);
  const bounds = mainlandBounds(own);
  if (!bounds) return null;

  const projection = fitProjection(bounds, width, height, insets);

  // Context: anything that lands inside the box once projected. Cheap test —
  // a ring is kept if any of its points fall in frame, and the SVG clips it.
  const inFrame = (rings: Ring[]) =>
    rings.some((ring) =>
      ring.some(([lng, lat]) => {
        const p = projection.project(lat, lng);
        return p.x > -width && p.x < width * 2 && p.y > -height && p.y < height * 2;
      }),
    );

  const neighbourRings: Ring[] = [];
  for (const f of features) {
    if (nameOf(f) === country) continue;
    const rings = ringsOf(f);
    if (rings.length && inFrame(rings)) neighbourRings.push(...rings);
  }

  return {
    projection,
    country: ringsToPath(own, projection),
    neighbours: ringsToPath(neighbourRings, projection),
  };
}
