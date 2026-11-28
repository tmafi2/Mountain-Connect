import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { buildParticleField, dispersionAt, toSphere } from "./particles";
import { FORMATION_STOPS, FORMATION_STYLE, formationAt } from "./shapes";
import { resorts } from "../data/resorts";

const features = JSON.parse(
  readFileSync(join(process.cwd(), "public", "globe", "countries.geojson"), "utf8"),
).features as object[];

const OPTS = {
  radius: 100,
  landColor: [0.2, 0.6, 0.9] as [number, number, number],
  resortColor: [1, 0.6, 0.1] as [number, number, number],
  driftColor: [0.3, 0.5, 0.7] as [number, number, number],
};

test("lat/lng lands on the sphere at the right radius", () => {
  for (const [lat, lng] of [
    [0, 0],
    [45, -120],
    [-33.9, 151.2],
    [78, 15],
  ] as [number, number][]) {
    const [x, y, z] = toSphere(lat, lng, 100);
    assert.ok(Math.abs(Math.hypot(x, y, z) - 100) < 0.001, `${lat},${lng} is off the sphere`);
  }
  // The poles must not collapse to the same point.
  const north = toSphere(90, 0, 100);
  const south = toSphere(-90, 0, 100);
  assert.ok(north[1] > 99 && south[1] < -99, "poles are the wrong way up");
});

test("the field covers land, resorts and drift, with finite coordinates", () => {
  const f = buildParticleField(features, resorts, { ...OPTS, stepDeg: 1.2, driftCount: 100 });
  assert.ok(f.count > 4000, `only ${f.count} particles — the coastlines are too sparse to read`);
  assert.equal(f.home.length, f.count * 3);
  assert.equal(f.scattered.length, f.count * 3);
  assert.equal(f.colors.length, f.count * 3);
  assert.equal(f.sizes.length, f.count);

  for (let i = 0; i < f.count * 3; i++) {
    assert.ok(Number.isFinite(f.home[i]), `home[${i}] is not finite`);
    assert.ok(Number.isFinite(f.scattered[i]), `scattered[${i}] is not finite`);
  }
});

/**
 * Every land particle must sit ON the sphere. A bug in the densify step that
 * emitted a lat/lng pair the wrong way round would still produce a pretty
 * cloud — just not the Earth — and nothing else would catch it.
 */
test("land particles sit on the globe, not near it", () => {
  const f = buildParticleField(features, resorts, { ...OPTS, stepDeg: 1.2, driftCount: 0 });
  let checked = 0;
  for (let i = 0; i < f.count; i++) {
    const r = Math.hypot(f.home[i * 3], f.home[i * 3 + 1], f.home[i * 3 + 2]);
    // Resorts sit marginally proud; nothing should be further out than that.
    assert.ok(r > 99 && r < 102, `particle ${i} is at radius ${r.toFixed(1)}`);
    checked++;
  }
  assert.ok(checked > 4000);
});

/**
 * The scattered formation is derived from home so the cloud keeps the
 * globe's silhouette. If it ever became pure noise, points would stop
 * correlating with where they started — which is what made an earlier
 * version read as a screensaver rather than a globe coming apart.
 */
test("scattered particles fly outward from their own position", () => {
  const f = buildParticleField(features, resorts, { ...OPTS, stepDeg: 2, driftCount: 0 });
  let aligned = 0;
  for (let i = 0; i < f.count; i++) {
    const hx = f.home[i * 3];
    const hy = f.home[i * 3 + 1];
    const hz = f.home[i * 3 + 2];
    const sx = f.scattered[i * 3];
    const sy = f.scattered[i * 3 + 1];
    const sz = f.scattered[i * 3 + 2];
    assert.ok(Math.hypot(sx, sy, sz) > Math.hypot(hx, hy, hz) * 0.9, `particle ${i} fell inward`);
    // Dot product positive = still roughly in the same direction from centre.
    if (hx * sx + hy * sy + hz * sz > 0) aligned++;
  }
  assert.ok(aligned / f.count > 0.97, `only ${Math.round((aligned / f.count) * 100)}% kept direction`);
});

/** The same page must produce the same cloud on every load. */
test("the field is deterministic", () => {
  const a = buildParticleField(features, resorts, { ...OPTS, stepDeg: 2, driftCount: 50 });
  const b = buildParticleField(features, resorts, { ...OPTS, stepDeg: 2, driftCount: 50 });
  assert.deepEqual(Array.from(a.scattered.slice(0, 300)), Array.from(b.scattered.slice(0, 300)));
});

/**
 * The curve is the page's argument: whole where it makes a claim, apart
 * where it talks about a scattered world, whole again where it asks for the
 * signup.
 */
test("the cloud is whole where a shape is held, and apart between them", () => {
  // These holds are the stops in shapes.ts. The two curves are driven by the
  // same scroll position, so a shape held where dispersion peaks is a shape
  // nobody ever sees — which is exactly what happened the first time.
  // ⚠️ IMPORTED, NOT RETYPED. These lists were two hardcoded arrays in two
  // files, which is how they are supposed to agree and exactly how they
  // would silently stop agreeing: moving a hold in shapes.ts leaves this
  // test passing against the old number.
  for (const stop of FORMATION_STOPS) {
    assert.ok(
      dispersionAt(stop.at) < 0.1,
      `cloud is not settled where ${stop.shape} is held, at ${stop.at}`,
    );
  }
  // Half way between consecutive holds the cloud must be travelling.
  //
  // ⚠️ 0.45, DOWN FROM 0.7 WHEN THE HOLDS BECAME BANDS. The gap between two
  // sections is a fixed 0.122 of the page, so every bit of hold comes out of
  // the ramp, and a shorter ramp cannot carry as much dispersion without
  // outrunning the render loop's easing — past which the extra is lost to
  // lag rather than shown. What this has to assert is that the cloud is
  // genuinely broken up while it travels, so the morph from one shape to the
  // next is hidden; at 0.45 a land particle has a random smear on it several
  // times the spacing between particles in any formation, which is that.
  for (let i = 1; i < FORMATION_STOPS.length; i++) {
    const a = FORMATION_STOPS[i - 1].at;
    const b = FORMATION_STOPS[i].at;
    if (FORMATION_STOPS[i - 1].shape === FORMATION_STOPS[i].shape) continue;
    const mid = (a + b) / 2;
    assert.ok(dispersionAt(mid) > 0.45, `cloud is not travelling at ${mid.toFixed(2)}`);
  }
  for (const p of [-1, 0, 0.5, 1, 2]) {
    const d = dispersionAt(p);
    assert.ok(d >= 0 && d <= 1, `dispersion ${d} out of range at ${p}`);
  }
});

/**
 * ⚠️ RAISED FROM 0.06 WHEN THE PAGE WENT FROM THREE FORMATIONS TO SIX, and
 * the limit is now DERIVED rather than watched. The gap between two holds is
 * roughly one over the number of sections — about 0.127 of the page against
 * 0.19 before — so the same travel happens in two thirds of the scroll, and
 * the steepest ramp measures 0.087 per sample where it used to measure 0.040.
 * Lowering the peaks instead would have cost the explode, which is the thing
 * the formations are worth looking at for.
 *
 * What actually bounds this is the render loop, which eases dispersion
 * towards its target by 0.085 of the remaining gap each frame — an 11-frame
 * low-pass that re-smooths any curve on its way to the screen. What it cannot
 * hide is a ramp shorter than its own settling time. The steepest ramp here
 * covers 0.735 of dispersion over 0.0635 of the page, which on this page is
 * about 690px of scroll, three quarters of a screen. A step of 0.15 per
 * 0.005 sample is a ramp of a quarter of a screen — short enough that a flick
 * of the wheel outruns the easing and the cloud snaps. That is the boundary,
 * so that is the limit.
 *
 * It keeps its teeth either way: now that the curve is DERIVED from
 * FORMATION_STOPS it is piecewise-smooth by construction, so the only thing
 * that can produce a step at all is two stops at the same progress — which
 * gives a vertical jump of the full 0.735, five times this limit.
 */
const MAX_STEP = 0.15;

test("dispersion moves smoothly, with no jumps between keyframes", () => {
  let prev = dispersionAt(0);
  let worst = 0;
  for (let p = 0.005; p <= 1; p += 0.005) {
    const d = dispersionAt(p);
    worst = Math.max(worst, Math.abs(d - prev));
    assert.ok(
      Math.abs(d - prev) < MAX_STEP,
      `jump of ${(d - prev).toFixed(3)} at progress ${p.toFixed(3)}`,
    );
    prev = d;
  }
  // And it should not be sitting right on the limit either: a curve that only
  // just passes is one more formation away from failing.
  assert.ok(
    worst < MAX_STEP * 0.7,
    `steepest step is ${worst.toFixed(3)}, too close to the limit`,
  );
});

/**
 * ⚠️ THE CURVE IS DERIVED FROM `FORMATION_STOPS`, AND HAS TO STAY DERIVED.
 * It used to be a hand-written key list sitting beside the stops, which worked
 * while there were three of each. There are now seven holds and six ramps,
 * and a hold whose key is a few thousandths out is a shape nobody ever sees —
 * the cloud renders perfectly happily as dust, with no error anywhere.
 *
 * This counts explodes against shape CHANGES. Add a formation and forget the
 * curve, or hand-type the list again and miss a ramp, and the two disagree.
 */
test("every change of shape gets its own explode, and nothing else does", () => {
  const changes = FORMATION_STOPS.filter(
    (s, i) => i > 0 && FORMATION_STOPS[i - 1].shape !== s.shape,
  ).length;
  assert.ok(changes >= 6, `only ${changes} changes of formation — the page lost a shape`);

  // Count local maxima of the curve on a fine grid.
  let peaks = 0;
  const step = 0.002;
  for (let p = step; p < 1 - step; p += step) {
    const a = dispersionAt(p - step);
    const b = dispersionAt(p);
    const c = dispersionAt(p + step);
    if (b > a && b >= c && b > 0.5) peaks++;
  }
  assert.equal(peaks, changes, `${peaks} explodes for ${changes} changes of formation`);
});

/**
 * ⚠️ EVERY FORMATION GETS A STRETCH OF PAGE WHERE IT IS SIMPLY THERE, and
 * this is the test that says so. The holds used to be single points: the
 * blend reached a shape exactly at its stop and was already leaving a pixel
 * later, and because the render loop eases dispersion towards its target
 * rather than snapping, the cloud was still a fifth apart at the moment it
 * was meant to have arrived. The shapes were never shown — only approached
 * and departed — which is precisely how it looked.
 *
 * "Held" means both halves at once: the blend is between a shape and ITSELF,
 * so nothing is morphing, AND the cloud is settled. Either alone is not it.
 */
test("every formation is held still for a readable stretch of the page", () => {
  const held: Record<string, number> = {};
  const step = 0.0005;
  for (let p = 0; p <= 1; p += step) {
    const f = formationAt(p);
    if (f.from === f.to && dispersionAt(p) <= 0.06) held[f.from] = (held[f.from] ?? 0) + step;
  }
  for (const shape of Object.keys(FORMATION_STYLE)) {
    const span = held[shape] ?? 0;
    // 0.045 of the page is about 500px, over half a screen at a normal
    // viewport — long enough to scroll through and still be looking at it.
    assert.ok(
      span >= 0.045,
      `${shape} is only held still for ${span.toFixed(3)} of the page`,
    );
  }
  // The globe gets the longest hold: it carries the hero, the figures and
  // the closing ask between them.
  assert.ok(held.globe > 0.15, `the globe is only held for ${held.globe?.toFixed(3)}`);
});

/**
 * ⚠️ EACH FEATURE'S LAND PARTICLES MUST STAY CONTIGUOUS. The explore globe
 * lights one country's coastline on hover by repainting a slice of the
 * colour buffer, which is only correct while a feature's points are a single
 * unbroken run. Interleaving the build — densifying all the outer rings
 * first, say — would keep every particle in the right place on screen and
 * light up the wrong country.
 */
test("every feature owns one unbroken run of land particles", () => {
  const field = buildParticleField(features, resorts, { ...OPTS, stepDeg: 1.5, driftCount: 10 });
  assert.equal(field.landRanges.length, features.length, "a feature has no range");

  let cursor = 0;
  for (let i = 0; i < field.landRanges.length; i++) {
    const { start, end } = field.landRanges[i];
    assert.equal(start, cursor, `feature ${i} does not start where the last one ended`);
    assert.ok(end >= start, `feature ${i} has a negative range`);
    cursor = end;
  }
  // The land runs to the start of the resort particles and no further.
  assert.equal(cursor, field.resortRange[0], "the land ranges do not cover the land");
});
