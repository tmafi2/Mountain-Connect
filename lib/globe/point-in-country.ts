/**
 * Which country a point on the globe falls in.
 *
 * ⚠️ THIS EXISTS SO THE WHOLE COUNTRY IS THE CLICK TARGET. Picking a country
 * used to mean hitting its cluster dot — a 5px sphere that also has to be on
 * the side of the globe facing you, is one of fourteen crowded into Europe,
 * and gives no clue that it is the only thing you are allowed to click. The
 * landmass is the thing a visitor is actually pointing at, and it is a
 * hundred times the area.
 *
 * three-globe can hit-test a polygon layer for us, but only for polygons it
 * is already drawing — and drawing every resort country's fill at world view
 * to buy a click target would change what the globe looks like in order to
 * change what it does. Testing the point ourselves changes nothing on screen.
 */

type Ring = number[][];

/**
 * Ray casting, counting crossings of a horizontal line.
 *
 * ⚠️ GEOJSON IS [LONGITUDE, LATITUDE], WHICH IS x, y — the opposite order to
 * every lat/lng signature in this codebase, and a swap produces a function
 * that works perfectly for the handful of places near the diagonal and is
 * wrong everywhere else. The ring's pairs are read as [x, y] here precisely
 * once, and the callers below all speak lat/lng.
 */
function inRing(ring: Ring, lng: number, lat: number): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    if (yi > lat !== yj > lat && lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) {
      inside = !inside;
    }
  }
  return inside;
}

/**
 * One polygon: an outer ring, then any number of holes.
 *
 * ⚠️ THE HOLES MATTER AND ARE CHEAP. Without them a click in the middle of a
 * lake, or inside an enclave, lands on the country that surrounds it — and
 * the one enclave on this board's doorstep is the kind of detail that makes
 * a map feel broken rather than approximate.
 */
function inPolygon(rings: Ring[], lng: number, lat: number): boolean {
  if (rings.length === 0 || !inRing(rings[0], lng, lat)) return false;
  for (let i = 1; i < rings.length; i++) {
    if (inRing(rings[i], lng, lat)) return false;
  }
  return true;
}

interface GeoFeature {
  geometry?: {
    type?: string;
    coordinates?: unknown;
  };
}

/**
 * Each feature's bounding box, computed once and remembered.
 *
 * ⚠️ WITHOUT THIS, EVERY PROBE WALKS ALL 10,593 COORDINATE PAIRS. The pointer
 * is tested against the whole dataset roughly 25 times a second, and the
 * answer for 176 of the 177 countries is "no" — which a box rejects in four
 * comparisons and ray casting rejects only after tracing every ring of the
 * country's coastline. Measured over the whole set: 0.29ms a probe before,
 * and open sea was the WORST case rather than the cheapest, because nothing
 * ever short-circuited.
 *
 * A WeakMap rather than a field on the feature: the geojson is parsed from a
 * fetch and handed round as plain objects, and writing a cache key onto
 * somebody else's data is how two unrelated things end up sharing a bug.
 */
const BOXES = new WeakMap<object, [number, number, number, number] | null>();

function boxOf(feature: object): [number, number, number, number] | null {
  const cached = BOXES.get(feature);
  if (cached !== undefined) return cached;

  const geom = (feature as GeoFeature).geometry;
  let box: [number, number, number, number] | null = null;
  if (geom && (geom.type === "Polygon" || geom.type === "MultiPolygon")) {
    const polys =
      geom.type === "Polygon" ? [geom.coordinates as Ring[]] : (geom.coordinates as Ring[][]);
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    for (const rings of polys) {
      // Only the outer ring matters: a hole is inside it by definition.
      const outer = rings[0];
      if (!outer) continue;
      for (const [x, y] of outer) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
    if (minX <= maxX) box = [minX, minY, maxX, maxY];
  }
  BOXES.set(feature, box);
  return box;
}

/** Whether this GeoJSON feature's geometry contains the point. */
export function featureContains(feature: object, lat: number, lng: number): boolean {
  const box = boxOf(feature);
  if (!box) return false;
  if (lng < box[0] || lng > box[2] || lat < box[1] || lat > box[3]) return false;

  const geom = (feature as GeoFeature).geometry;
  if (!geom) return false;
  if (geom.type === "Polygon") {
    return inPolygon(geom.coordinates as Ring[], lng, lat);
  }
  if (geom.type === "MultiPolygon") {
    return (geom.coordinates as Ring[][]).some((rings) => inPolygon(rings, lng, lat));
  }
  return false;
}

/**
 * The name of the country under a point, or null for open sea.
 *
 * `nameOf` is the caller's own accessor, so the aliases that reconcile the
 * geometry's names with the resort data's ("United States of America" against
 * "USA") are applied here too rather than reimplemented.
 *
 * ⚠️ A COUNTRY THAT STRADDLES THE ANTIMERIDIAN IS NOT HANDLED, and does not
 * need to be: the 110m dataset splits Russia and Fiji into separate polygons
 * either side of ±180, and none of the fourteen countries with resorts goes
 * near it. A ski resort at 180° longitude would need this revisited.
 */
export function countryAt(
  features: object[],
  lat: number,
  lng: number,
  nameOf: (feature: object) => string,
): string | null {
  for (const f of features) {
    if (featureContains(f, lat, lng)) return nameOf(f);
  }
  return null;
}
