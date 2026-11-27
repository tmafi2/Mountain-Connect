/**
 * Where to put the camera when a visitor picks a country on the globe.
 *
 * ⚠️ ONE ALTITUDE CANNOT WORK, which is why this exists rather than a
 * constant. Canada's resorts span about 35° of arc from Whistler to Quebec;
 * Andorra's span 0°, because there is one. The old behaviour flew to a fixed
 * altitude for every country, so Canada arrived cropped and Andorra arrived
 * looking at a continent.
 *
 * ⚠️ FRAMED ON THE RESORTS, NOT THE COUNTRY OUTLINE. Framing the outline
 * sounds more correct and is worse: the USA's outline includes Alaska and
 * Hawaii, so fitting it would point the camera at the north Pacific, with
 * every American resort — all of them in the lower 48 — squeezed into a
 * corner. The resorts are what the visitor came to see, and the selected
 * country is highlighted underneath them, so its shape still reads.
 */

export interface CountryView {
  lat: number;
  lng: number;
  /** Camera altitude in globe radii, as react-globe.gl's pointOfView wants. */
  altitude: number;
}

export interface FramingPoint {
  country: string;
  latitude: number;
  longitude: number;
}

/**
 * Altitude floor, calibrated by looking rather than by arithmetic: 0.6 fills
 * the frame with one country and no context, and 0.85-0.95 shows a country
 * with its neighbours around it, which is what makes the outline read. An
 * earlier version of this file used 0.38 and flew the camera so close that
 * Italy arrived as an unrecognisable diagonal of hexagons.
 *
 * It is also the contract with `controls.minDistance`, which rejects
 * anything closer and would leave the flight stopping short of where this
 * said to go.
 */
export const MIN_ALTITUDE = 0.85;
/** Ceiling: past this you are looking at the whole globe, which is the view
 *  the visitor just chose to leave. */
export const MAX_ALTITUDE = 1.9;
/** Degrees of arc per unit of altitude — tuned against Canada and Italy. */
const DEGREES_PER_ALTITUDE = 41;

/**
 * Longitude degrees are narrower than latitude degrees everywhere but the
 * equator, so a raw longitude span overstates how much screen a country
 * needs. Japan at 40°N loses about a quarter of it; Sweden at 63°N, over
 * half. Without this, northern countries are framed too far out.
 */
function effectiveLngSpan(spanDeg: number, atLatitude: number): number {
  return spanDeg * Math.cos((atLatitude * Math.PI) / 180);
}

/**
 * The camera position that frames one country's resorts.
 *
 * Returns null when the country has no resorts, which is the caller's signal
 * to leave the camera alone rather than fly somewhere arbitrary.
 */
export function viewForCountry(country: string, points: FramingPoint[]): CountryView | null {
  const mine = points.filter((p) => p.country === country);
  if (mine.length === 0) return null;

  const lats = mine.map((p) => p.latitude);
  const lngs = mine.map((p) => p.longitude);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);

  const lat = (minLat + maxLat) / 2;
  const lng = (minLng + maxLng) / 2;

  const span = Math.max(maxLat - minLat, effectiveLngSpan(maxLng - minLng, lat));
  const altitude = Math.min(MAX_ALTITUDE, MIN_ALTITUDE + span / DEGREES_PER_ALTITUDE);

  return { lat, lng, altitude };
}

type Ring = number[][];

/** Shoelace area of a ring in degrees² — only ever compared, never used as a
 *  real area, so no projection is needed. */
function ringArea(ring: Ring): number {
  let a = 0;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    a += (ring[j][0] + ring[i][0]) * (ring[j][1] - ring[i][1]);
  }
  return Math.abs(a / 2);
}

/**
 * The camera position that frames a country's OUTLINE.
 *
 * ⚠️ ONLY THE LARGEST LANDMASS COUNTS, and that is the whole trick. Framing a
 * country's full extent sounds right until the USA drags in Alaska and Hawaii
 * and the camera ends up pointed at the north Pacific with the lower 48 in a
 * corner. Taking the biggest polygon gives the mainland every time — the
 * contiguous USA, mainland Italy rather than Sicily and Sardinia — which is
 * the shape a person pictures when they think of the country.
 *
 * Returns null for a country with no geometry at all (Andorra is absent from
 * the 110m dataset), so the caller can fall back to framing the resorts.
 */
export function viewForOutline(
  features: object[],
  country: string,
  nameOf: (feature: object) => string,
): CountryView | null {
  let best: Ring | null = null;
  let bestArea = 0;

  for (const f of features) {
    if (nameOf(f) !== country) continue;
    const geom = (f as { geometry?: { type?: string; coordinates?: unknown } }).geometry;
    if (!geom?.coordinates) continue;
    const polys = (geom.type === "Polygon" ? [geom.coordinates] : geom.coordinates) as Ring[][];
    for (const poly of polys) {
      const outer = poly[0];
      if (!outer || outer.length < 4) continue;
      const area = ringArea(outer);
      if (area > bestArea) {
        bestArea = area;
        best = outer;
      }
    }
  }
  if (!best) return null;

  const lngs = best.map((c) => c[0]);
  const lats = best.map((c) => c[1]);
  const lat = (Math.min(...lats) + Math.max(...lats)) / 2;
  const lng = (Math.min(...lngs) + Math.max(...lngs)) / 2;
  const span = Math.max(
    Math.max(...lats) - Math.min(...lats),
    effectiveLngSpan(Math.max(...lngs) - Math.min(...lngs), lat),
  );
  return {
    lat,
    lng,
    altitude: Math.min(MAX_ALTITUDE, MIN_ALTITUDE + span / DEGREES_PER_ALTITUDE),
  };
}

/** Every country's framing, computed once. */
export function countryViews(points: FramingPoint[]): Record<string, CountryView> {
  const out: Record<string, CountryView> = {};
  for (const country of new Set(points.map((p) => p.country))) {
    const view = viewForCountry(country, points);
    if (view) out[country] = view;
  }
  return out;
}
