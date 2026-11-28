import { test } from "node:test";
import assert from "node:assert/strict";
import {
  SCROLL_GUTTER_PX,
  latLngFromCartesian,
  rayThroughPixel,
  raySphereHit,
  pointerZoomsGlobe,
  sphereScreenRadiusPx,
  wheelZoomRadiusPx,
} from "./screen-geometry";

/** The explore canvas and camera, measured off the live page. */
const CANVAS = { canvasWidth: 1069, canvasHeight: 700, fovDeg: 50, globeRadius: 100 };
/** Altitude 2.0 is where the globe opens; 0.33 is the closest a country gets. */
const WORLD = { ...CANVAS, cameraDistance: 300 };
const COUNTRY = { ...CANVAS, cameraDistance: 133 };

/**
 * ⚠️ A SPHERE'S OUTLINE IS NOT ITS EQUATOR SEEN EDGE-ON, and the naive
 * formula is wrong in the direction that matters: it UNDERSTATES the
 * silhouette, so the zoom area would stop short of the visible rim and a
 * wheel over the edge of the Earth would scroll the page off it.
 */
test("the silhouette is bigger than the naive projection of the equator", () => {
  const naive =
    (100 * (700 / 2)) / (Math.tan((50 * Math.PI) / 360) * WORLD.cameraDistance);
  const real = sphereScreenRadiusPx(WORLD);
  assert.ok(real > naive, `silhouette ${real} is not larger than ${naive}`);
  // d=300, R=100 → tangent = sqrt(80000) = 282.84, so the correction is
  // exactly d/sqrt(d²-R²) = 1.0607.
  assert.ok(Math.abs(real / naive - 300 / Math.sqrt(80000)) < 1e-9);
});

test("the globe looks bigger the closer the camera gets", () => {
  assert.ok(sphereScreenRadiusPx(COUNTRY) > sphereScreenRadiusPx(WORLD));
});

test("a camera inside the sphere gives a finite answer, not a crash", () => {
  const r = sphereScreenRadiusPx({ ...CANVAS, cameraDistance: 50 });
  assert.ok(Number.isFinite(r) && r > 0, `inside the globe gave ${r}`);
});

/**
 * ⚠️ AT WORLD VIEW THE REAL SILHOUETTE WINS, AND IT HAS TO. The globe opens
 * as a disc about 530px across in a 1069px canvas, so there is already a
 * wide margin either side; capping it there would shrink the zoom area below
 * the thing the visitor can see and is pointing at.
 */
test("at world view the zoom area is the globe itself", () => {
  assert.equal(wheelZoomRadiusPx(WORLD), sphereScreenRadiusPx(WORLD));
  assert.ok(sphereScreenRadiusPx(WORLD) < CANVAS.canvasWidth / 2 - SCROLL_GUTTER_PX);
});

/**
 * ⚠️ FLOWN IN, THE GLOBE IS WIDER THAN THE CANVAS, which is the case that
 * makes the honest test useless: "is the pointer on the globe" answers yes
 * everywhere, and the page is trapped again at exactly the moment the
 * visitor most wants to scroll down to the resort list.
 */
test("flown into a country there is still a strip down each side to scroll in", () => {
  assert.ok(
    sphereScreenRadiusPx(COUNTRY) > CANVAS.canvasWidth / 2,
    "this test is meaningless unless the globe really does overflow the canvas",
  );
  const r = wheelZoomRadiusPx(COUNTRY);
  assert.ok(r < CANVAS.canvasWidth / 2, "the zoom area still covers the whole width");
  assert.equal(CANVAS.canvasWidth / 2 - r, SCROLL_GUTTER_PX);

  // Concretely: the far left and right of the canvas scroll the page.
  const mid = CANVAS.canvasHeight / 2;
  assert.equal(pointerZoomsGlobe({ ...COUNTRY, pointerX: 20, pointerY: mid }), false);
  assert.equal(pointerZoomsGlobe({ ...COUNTRY, pointerX: 1049, pointerY: mid }), false);
  assert.equal(pointerZoomsGlobe({ ...COUNTRY, pointerX: 534, pointerY: mid }), true);
});

/**
 * ⚠️ ON A PHONE, HALF THE CANVAS IS NARROWER THAN THE GUTTER. Subtracting it
 * would leave a zoom area of nothing — or a negative radius, which answers
 * "never zoom" for every pointer position on the device. The floor is what
 * stops a desktop convenience from disabling the globe on a phone.
 */
test("a narrow canvas keeps a zoom area rather than losing it to the gutter", () => {
  const phone = { ...COUNTRY, canvasWidth: 375, canvasHeight: 500 };
  const r = wheelZoomRadiusPx(phone);
  assert.ok(r > 0, `a phone gets a zoom radius of ${r}`);
  assert.ok(
    pointerZoomsGlobe({ ...phone, pointerX: 187, pointerY: 250 }),
    "the centre of a phone screen does not zoom",
  );
});

test("the zoom area is a disc around the canvas centre, in both axes", () => {
  const cx = CANVAS.canvasWidth / 2;
  const cy = CANVAS.canvasHeight / 2;
  const r = wheelZoomRadiusPx(WORLD);
  // Just inside and just outside, horizontally and vertically.
  assert.equal(pointerZoomsGlobe({ ...WORLD, pointerX: cx + r - 2, pointerY: cy }), true);
  assert.equal(pointerZoomsGlobe({ ...WORLD, pointerX: cx + r + 2, pointerY: cy }), false);
  assert.equal(pointerZoomsGlobe({ ...WORLD, pointerX: cx, pointerY: cy + r - 2 }), true);
  assert.equal(pointerZoomsGlobe({ ...WORLD, pointerX: cx, pointerY: cy + r + 2 }), false);
  // A corner is further away than either axis, so it must scroll.
  assert.equal(pointerZoomsGlobe({ ...WORLD, pointerX: 0, pointerY: 0 }), false);
});

/* ─── Screen → lat/lng ───────────────────────────────────── */

/** three-globe's own polar2Cartesian, the formula every marker is placed by. */
function threeGlobeCoords(lat: number, lng: number, r: number) {
  const phi = ((90 - lat) * Math.PI) / 180;
  const theta = ((90 - lng) * Math.PI) / 180;
  const s = Math.sin(phi);
  return { x: r * s * Math.cos(theta), y: r * Math.cos(phi), z: r * s * Math.sin(theta) };
}

/**
 * ⚠️ THE INVERSE HAS TO BE THE INVERSE OF THREE-GLOBE'S FORMULA, not of
 * `toSphere` in particles.ts — the two are a quarter turn apart, and the
 * wrong one gives a convincing lat/lng ninety degrees from where the pointer
 * is. Checked by round-tripping rather than by inspection.
 */
test("a point on the globe round-trips back to its own lat/lng", () => {
  const probes: [number, number][] = [
    [0, 0], [0, 90], [0, -90], [0, 179.9], [45, -120], [-33.9, 151.2],
    [78, 15], [51.5, -0.12], [43, 141], [-44.9, 168.7], [89, 10], [-89, -170],
  ];
  for (const [lat, lng] of probes) {
    const back = latLngFromCartesian(threeGlobeCoords(lat, lng, 100));
    assert.ok(Math.abs(back.lat - lat) < 1e-9, `${lat},${lng} → lat ${back.lat}`);
    const dLng = Math.abs(((back.lng - lng + 540) % 360) - 180);
    assert.ok(dLng < 1e-9, `${lat},${lng} → lng ${back.lng}`);
  }
});

test("longitude stays inside -180..180", () => {
  for (let a = 0; a < 360; a += 7) {
    const p = threeGlobeCoords(10, -180 + a, 100);
    const { lng } = latLngFromCartesian(p);
    assert.ok(lng >= -180 && lng <= 180, `got ${lng}`);
  }
});

/**
 * ⚠️ THE NEAR ROOT, NOT EITHER ROOT. A ray through the globe leaves by the
 * far side too; taking the wrong one returns the ANTIPODE of what the
 * visitor is pointing at — which is a real place, so nothing looks broken.
 */
test("a ray through the globe hits the side facing the camera", () => {
  const cam = { x: 0, y: 0, z: 300 };
  const hit = raySphereHit(cam, { x: 0, y: 0, z: -1 }, 100)!;
  assert.ok(hit, "a ray straight at the centre missed");
  assert.ok(Math.abs(hit.z - 100) < 1e-9, `hit the far side at z=${hit.z}`);
});

test("a ray past the globe hits nothing", () => {
  assert.equal(raySphereHit({ x: 0, y: 0, z: 300 }, { x: 0, y: 1, z: -1 }, 100), null);
  assert.equal(raySphereHit({ x: 0, y: 500, z: 300 }, { x: 0, y: 0, z: -1 }, 100), null);
});

test("the centre pixel looks straight down the view axis", () => {
  const d = rayThroughPixel(500, 350, 1000, 700, 50);
  assert.ok(Math.abs(d.x) < 1e-12 && Math.abs(d.y) < 1e-12, "the centre ray is off-axis");
  assert.ok(d.z < 0, "the ray points behind the camera");
});

/**
 * ⚠️ THE RAY HAS TO RESPECT THE ASPECT RATIO. A canvas twice as wide as it
 * is tall sees twice as much world across as up; dropping the aspect term
 * gives a pointer that is correct down the middle of the screen and drifts
 * further out the nearer the edge it gets — which is exactly where someone
 * clicking a country at the edge of the globe is pointing.
 */
test("the ray widens with the canvas, not with its height", () => {
  const wide = rayThroughPixel(1000, 350, 1000, 700, 50);
  const square = rayThroughPixel(700, 350, 700, 700, 50);
  assert.ok(Math.abs(wide.x / square.x - 1000 / 700) < 1e-9, "aspect is not applied");
  assert.equal(wide.y, square.y);
});

/** End to end: a pixel at the centre of the canvas is the point facing the camera. */
test("the pointer maps to the lat/lng it is over", () => {
  // Camera on the +Z axis at 300 units: the near pole of the sphere is the
  // point three-globe puts at lat 0, lng 0 + 90° — check by construction.
  const dir = rayThroughPixel(534, 320, 1069, 641, 50);
  const hit = raySphereHit({ x: 0, y: 0, z: 300 }, dir, 100)!;
  const { lat, lng } = latLngFromCartesian(hit);
  const round = threeGlobeCoords(lat, lng, 100);
  assert.ok(Math.hypot(round.x - hit.x, round.y - hit.y, round.z - hit.z) < 1e-6);
});
