/**
 * Where the globe actually is on screen, in CSS pixels.
 *
 * ⚠️ THIS IS WHAT DECIDES WHETHER THE WHEEL ZOOMS OR SCROLLS. The canvas is
 * a wide rectangle and the globe is a disc in the middle of it, so for most
 * of the canvas's width the visitor is pointing at empty space — and until
 * now a wheel there was swallowed by OrbitControls all the same, which meant
 * the page could not be scrolled past the globe without first finding the
 * narrow strip outside the canvas.
 */

export interface SphereScreenInput {
  /** Distance from the camera to the globe's centre, in world units. */
  cameraDistance: number;
  /** The globe's own radius, from getGlobeRadius(). */
  globeRadius: number;
  /** The camera's vertical field of view, in degrees. */
  fovDeg: number;
  /** The canvas height in CSS pixels. */
  canvasHeight: number;
}

/**
 * The radius of the globe's silhouette on screen, in CSS pixels.
 *
 * ⚠️ IT IS NOT R*h/(2*d*tan(f/2)), WHICH IS THE OBVIOUS ANSWER AND IS WRONG.
 * A sphere's outline is not its equator seen edge-on: the silhouette is the
 * circle where the camera's tangent lines touch, which sits nearer the camera
 * than the centre and is smaller than the sphere. Working it through, the
 * tangent circle has radius R*sqrt(d²-R²)/d at depth (d²-R²)/d, and the two
 * corrections do not cancel — they leave
 *
 *     radius = R * (h/2) / (tan(f/2) * sqrt(d² - R²))
 *
 * which is larger than the naive answer, by about 6% at the altitude the
 * globe opens at and much more close in. Getting it wrong would put the edge
 * of the zoom area inside the visible globe, so a wheel over the rim of the
 * Earth would scroll the page off it.
 */
export function sphereScreenRadiusPx(o: SphereScreenInput): number {
  const halfFov = (o.fovDeg * Math.PI) / 360;
  // Outside the sphere the tangent length is real; inside it is not, and the
  // honest answer is then "the globe fills the view".
  const tangent = Math.sqrt(Math.max(o.cameraDistance ** 2 - o.globeRadius ** 2, 1e-6));
  return (o.globeRadius * (o.canvasHeight / 2)) / (Math.tan(halfFov) * tangent);
}

/**
 * How wide a strip down each side of the canvas always scrolls the page,
 * however close the camera is.
 *
 * ⚠️ WITHOUT THIS THERE IS NO WAY OUT WHEN YOU ARE ZOOMED IN. Flown in to a
 * country the globe's silhouette is about 857px across a 700px-tall canvas —
 * wider than the canvas itself — so the honest "is the pointer on the globe"
 * test answers yes everywhere and the page is trapped again, at exactly the
 * moment the visitor is most likely to want to read what is below it.
 */
export const SCROLL_GUTTER_PX = 140;

export interface ZoomZoneInput extends SphereScreenInput {
  /** The canvas width in CSS pixels. */
  canvasWidth: number;
}

/** The radius around the canvas centre within which the wheel zooms. */
export function wheelZoomRadiusPx(o: ZoomZoneInput): number {
  const sphere = sphereScreenRadiusPx(o);
  // The gutter is given up only as far as it can be: on a phone, half the
  // canvas is narrower than the gutter, and a zoom zone of nothing would be
  // worse than no gutter at all.
  const cap = Math.max(o.canvasWidth / 2 - SCROLL_GUTTER_PX, o.canvasWidth * 0.22);
  return Math.min(sphere, cap);
}

export interface PointerInput extends ZoomZoneInput {
  /** Pointer position relative to the canvas's top-left, in CSS pixels. */
  pointerX: number;
  pointerY: number;
}

/**
 * Whether a wheel at this pointer position should zoom the globe.
 *
 * The globe's centre is always the canvas centre: the camera orbits the
 * origin and looks at it, so the sphere cannot be off-centre however the
 * camera is moved.
 */
export function pointerZoomsGlobe(o: PointerInput): boolean {
  const dx = o.pointerX - o.canvasWidth / 2;
  const dy = o.pointerY - o.canvasHeight / 2;
  return Math.hypot(dx, dy) <= wheelZoomRadiusPx(o);
}

/* ─── Screen → the lat/lng under the pointer ──────────────── */

/**
 * ⚠️ THIS REPLACES globe.gl's `toGlobeCoords`, WHICH COST 2.1ms A CALL.
 * Measured: the pointer probe ran at 2.6ms median and 2.1 of that was one
 * call to `toGlobeCoords`, which answers the question by building a
 * Raycaster and walking the scene — the sphere, the hex layer, the polygon
 * layer, the marker layer and the eighteen thousand point cloud. At 25 probes
 * a second that is five percent of a core spent re-deriving something the
 * geometry already gives in closed form: the globe is a sphere of known
 * radius centred on the origin, so the answer is a quadratic.
 *
 * The three steps below are separated so each can be checked on its own, and
 * the whole thing is pinned against three-globe's own `polar2Cartesian` —
 * which is the formula that decides where every marker on this globe is
 * placed, so agreeing with it is the only definition of correct.
 */

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

/**
 * The ray through a pixel, in CAMERA space, pointing away from the viewer.
 *
 * Not normalised: the caller rotates it into world space, and the
 * intersection below does not care about its length.
 */
export function rayThroughPixel(
  pointerX: number,
  pointerY: number,
  canvasWidth: number,
  canvasHeight: number,
  fovDeg: number,
): Vec3 {
  const t = Math.tan((fovDeg * Math.PI) / 360);
  const ndcX = (pointerX / canvasWidth) * 2 - 1;
  const ndcY = 1 - (pointerY / canvasHeight) * 2;
  return { x: ndcX * t * (canvasWidth / canvasHeight), y: ndcY * t, z: -1 };
}

/**
 * Where a ray first meets a sphere centred on the origin, or null if it misses.
 *
 * ⚠️ THE NEAR ROOT, NOT EITHER ROOT. A ray through the globe leaves by the
 * far side as well, and taking the wrong root returns a point on the
 * hemisphere facing away from the camera — a perfectly plausible lat/lng
 * that is the antipode of what the visitor is pointing at.
 */
export function raySphereHit(origin: Vec3, dir: Vec3, radius: number): Vec3 | null {
  const a = dir.x * dir.x + dir.y * dir.y + dir.z * dir.z;
  const b = 2 * (origin.x * dir.x + origin.y * dir.y + origin.z * dir.z);
  const c = origin.x * origin.x + origin.y * origin.y + origin.z * origin.z - radius * radius;
  const disc = b * b - 4 * a * c;
  if (disc < 0) return null;
  const root = Math.sqrt(disc);
  // The smaller positive root is the near surface.
  const t1 = (-b - root) / (2 * a);
  const t2 = (-b + root) / (2 * a);
  const t = t1 >= 0 ? t1 : t2;
  if (t < 0) return null;
  return { x: origin.x + dir.x * t, y: origin.y + dir.y * t, z: origin.z + dir.z * t };
}

/**
 * A cartesian point on the globe, back to lat/lng.
 *
 * ⚠️ THIS IS THREE-GLOBE'S CONVENTION, NOT OURS. Its `polar2Cartesian` uses
 * phi = (90 - lat) and theta = (90 - lng); `toSphere` in ./particles.ts uses
 * theta = lng + 180, a quarter turn away. Every marker, label and cluster on
 * the explore globe is placed by the FORMER, so the pointer has to be read in
 * the former too — getting it wrong gives a convincing lat/lng ninety degrees
 * from where the visitor is pointing.
 */
export function latLngFromCartesian(p: Vec3): { lat: number; lng: number } {
  const r = Math.sqrt(p.x * p.x + p.y * p.y + p.z * p.z);
  const lat = 90 - (Math.acos(Math.min(1, Math.max(-1, p.y / r))) * 180) / Math.PI;
  let lng = 90 - (Math.atan2(p.z, p.x) * 180) / Math.PI;
  // atan2 spans 360°, so the subtraction can land outside [-180, 180].
  while (lng > 180) lng -= 360;
  while (lng < -180) lng += 360;
  return { lat, lng };
}
