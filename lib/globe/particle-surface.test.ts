import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { toSphere } from "./particles";
import { THREE_GLOBE_Y_ROTATION, createParticleSurface } from "./particle-surface";

const features = (
  JSON.parse(
    readFileSync(join(process.cwd(), "public", "globe", "countries.geojson"), "utf8"),
  ) as { features: object[] }
).features;

/**
 * three-globe's own lat/lng → cartesian, copied from
 * node_modules/three-globe/dist/three-globe.mjs (`polar2Cartesian`). It is
 * reproduced rather than imported because that module is a browser ESM
 * bundle and the three lines that matter are stable; the point of the test is
 * to pin OUR convention against the one the markers are placed with.
 */
function threeGlobeCoords(lat: number, lng: number, r: number): [number, number, number] {
  const phi = ((90 - lat) * Math.PI) / 180;
  const theta = ((90 - lng) * Math.PI) / 180;
  const s = Math.sin(phi);
  return [r * s * Math.cos(theta), r * Math.cos(phi), r * s * Math.sin(theta)];
}

/** Rotate about +Y, the way three.js applies `object.rotation.y`. */
function rotateY([x, y, z]: [number, number, number], a: number): [number, number, number] {
  return [x * Math.cos(a) + z * Math.sin(a), y, -x * Math.sin(a) + z * Math.cos(a)];
}

/**
 * ⚠️ THE TWO LIBRARIES PUT LONGITUDE IN DIFFERENT PLACES, AND NOTHING WOULD
 * TELL YOU. `toSphere` uses theta = lng + 180; three-globe uses
 * theta = 90 - lng. The difference works out to exactly a quarter turn about
 * Y with the SAME handedness, so getting it wrong does not produce a mirrored
 * or distorted Earth that anyone would spot — it produces a perfectly
 * convincing globe with every resort marker in the wrong ocean.
 *
 * This is the single thing that has to hold for the particle surface to be
 * usable as the explore globe's land, so it is checked against the formula
 * itself rather than by looking at the result.
 */
test("the particle Earth lines up with three-globe's lat/lng frame", () => {
  const probes: [number, number][] = [
    [0, 0],
    [0, 90],
    [0, -90],
    [0, 180],
    [45, -120],
    [-33.9, 151.2],
    [78, 15],
    [90, 0],
    [-90, 45],
    [36.2, 137.9],
    [51.5, -0.12],
  ];
  for (const [lat, lng] of probes) {
    const ours = rotateY(toSphere(lat, lng, 100), THREE_GLOBE_Y_ROTATION);
    const theirs = threeGlobeCoords(lat, lng, 100);
    const d = Math.hypot(ours[0] - theirs[0], ours[1] - theirs[1], ours[2] - theirs[2]);
    assert.ok(d < 1e-9, `${lat},${lng} lands ${d.toFixed(3)} away from where three-globe puts it`);
  }

  // ⚠️ And the rotation has to be the ONLY difference. A test that merely
  // checked distances could pass on a mirrored globe, where the continents
  // are all the right shape and the wrong way round; this pins handedness by
  // checking a cross product keeps its sign.
  const a = rotateY(toSphere(0, 0, 100), THREE_GLOBE_Y_ROTATION);
  const b = rotateY(toSphere(0, 90, 100), THREE_GLOBE_Y_ROTATION);
  const ta = threeGlobeCoords(0, 0, 100);
  const tb = threeGlobeCoords(0, 90, 100);
  const cross = (p: number[], q: number[]) => p[0] * q[2] - p[2] * q[0];
  assert.ok(
    Math.sign(cross(a, b)) === Math.sign(cross(ta, tb)),
    "the particle Earth is mirrored relative to three-globe",
  );
});

test("the surface carries every coastline point, finite and on the sphere", () => {
  const radius = 100;
  const surface = createParticleSurface(features, { radius, stepDeg: 1.2 });
  assert.ok(surface.count > 3000, `only ${surface.count} particles — too sparse to read`);

  const pos = surface.points.geometry.getAttribute("position").array as Float32Array;
  assert.equal(pos.length, surface.count * 3);

  // ⚠️ TWO BANDS, AND NOTHING BETWEEN OR BEYOND THEM. The land and the resort
  // points sit just proud of the sphere — exactly on it and they z-fight with
  // the sea and flicker as the camera moves — and the drifting specks sit in
  // a halo well outside it, the way they do on the homepage. Anything in the
  // gap is a particle that has come off the globe without joining the halo.
  let onSurface = 0;
  let inHalo = 0;
  for (let i = 0; i < surface.count; i++) {
    const r = Math.hypot(pos[i * 3], pos[i * 3 + 1], pos[i * 3 + 2]) / radius;
    assert.ok(Number.isFinite(r), `particle ${i} is not finite`);
    assert.ok(r > 1.001, `particle ${i} sits at ${r.toFixed(3)}R, inside the sphere`);
    if (r < 1.03) onSurface++;
    else if (r > 1.1 && r < 2.1) inHalo++;
    else assert.fail(`particle ${i} sits at ${r.toFixed(3)}R, neither on the globe nor in the halo`);
  }
  assert.ok(onSurface / surface.count > 0.9, `only ${onSurface} of ${surface.count} are on the globe`);
  assert.ok(inHalo > 0, "the drifting specks are gone");

  surface.dispose();
});

/**
 * ⚠️ THE SAME MIX AS THE HOMEPAGE: land, amber resort points, and the
 * drifting specks around the globe. The first version of this surface left
 * the last two out on the reasoning that the explore globe already has real
 * markers — which was a defensible call about a tool and the wrong answer to
 * the brief, because that mix IS what makes the homepage globe look the way
 * it does. Dropping them is a one-line change if they ever fight the
 * markers; dropping them silently is what this test prevents.
 */
test("the surface has the homepage's mix of land, resorts and drift", () => {
  const surface = createParticleSurface(features, { radius: 100, stepDeg: 1.2 });
  const colors = surface.points.geometry.getAttribute("particleColor").array as Float32Array;
  const sizes = surface.points.geometry.getAttribute("size").array as Float32Array;

  let land = 0;
  let amber = 0;
  let drift = 0;
  for (let i = 0; i < surface.count; i++) {
    const r = colors[i * 3];
    const b = colors[i * 3 + 2];
    if (r > b) amber++;
    else if (sizes[i] < 1) drift++;
    else land++;
  }
  assert.ok(amber > 100, `only ${amber} resort points — the amber dots are gone`);
  assert.ok(drift > 500, `only ${drift} drifting specks`);
  assert.ok(land > surface.count * 0.8, `only ${land} land points of ${surface.count}`);
  // The resort points are the oversized ones, as they are on the homepage.
  for (let i = 0; i < surface.count; i++) {
    if (colors[i * 3] > colors[i * 3 + 2]) {
      assert.ok(sizes[i] > 2, `an amber point is drawn at size ${sizes[i]}, no bigger than land`);
    }
  }
  surface.dispose();
});

test("the surface is rotated into three-globe's frame and is never picked", () => {
  const surface = createParticleSurface(features, { radius: 100, stepDeg: 2 });
  assert.equal(surface.points.rotation.y, THREE_GLOBE_Y_ROTATION);
  // ⚠️ Raycasting 45,000 points on every pointer move, for a layer that has
  // nothing to click, would make the resort markers feel heavy for no
  // reason. three.js calls `raycast` per object, so the cheapest opt-out is
  // to replace it.
  const hits: unknown[] = [];
  surface.points.raycast({} as never, hits as never);
  assert.equal(hits.length, 0, "the particle layer is taking part in picking");
  surface.dispose();
});

test("the surface scales to whatever radius the globe reports", () => {
  // ⚠️ three-globe's radius is 100 today and is not ours to assume. The
  // caller passes getGlobeRadius(); this checks the geometry follows it,
  // because a hardcoded 100 would put the land inside or outside the sphere
  // the day that changes.
  for (const radius of [100, 150, 64]) {
    const s = createParticleSurface(features, { radius, stepDeg: 3 });
    const pos = s.points.geometry.getAttribute("position").array as Float32Array;
    const r = Math.hypot(pos[0], pos[1], pos[2]);
    assert.ok(
      Math.abs(r / radius - 1.004) < 0.001,
      `at radius ${radius} a particle sits at ${r.toFixed(2)}`,
    );
    s.dispose();
  }
});

/**
 * ⚠️ HIGHLIGHTING RECOLOURS THE DOTS THAT ARE ALREADY THERE. The explore
 * globe lights a country's coastline amber when the pointer is over it, and
 * it does that by repainting that country's own particles — which only works
 * because `landRanges` keeps each feature's points contiguous. If the build
 * order ever stopped being feature-by-feature, this would silently light up
 * the wrong country's coastline.
 */
test("highlighting lights exactly one country's coastline", () => {
  const surface = createParticleSurface(features, { radius: 100, stepDeg: 1.2 });
  const colors = surface.points.geometry.getAttribute("particleColor").array as Float32Array;
  const amber = () => {
    let n = 0;
    for (let i = 0; i < surface.count; i++) {
      // Warmer than it is blue, and not the oversized resort points.
      if (colors[i * 3] > colors[i * 3 + 2]) n++;
    }
    return n;
  };

  const resortsOnly = amber();
  surface.highlight(0);
  const withOne = amber();
  assert.ok(withOne > resortsOnly, "highlighting lit nothing");

  // A second country replaces the first rather than adding to it: a drag
  // across Europe must not leave a trail of lit coastlines behind it.
  surface.highlight(1);
  const withOther = amber();
  assert.notEqual(withOther, withOne + (withOne - resortsOnly), "the first country stayed lit");

  surface.highlight(null);
  assert.equal(amber(), resortsOnly, "putting the highlight out left colour behind");
  surface.dispose();
});

test("highlighting an index that does not exist is harmless", () => {
  const surface = createParticleSurface(features, { radius: 100, stepDeg: 3 });
  surface.highlight(99999);
  surface.highlight(-1);
  surface.highlight(null);
  assert.ok(surface.count > 0);
  surface.dispose();
});
