import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  COUNTRY_FILL_ALTITUDE,
  COUNTRY_OUTLINE_ALTITUDE,
  DOT_ALTITUDE,
  DOT_RADIUS_PX,
  LEADER_MIN_PX,
  SIDEWAYS_COLUMNS,
  STACK_ROWS,
  dotWorldRadius,
  labelSlots,
} from "./marker-layout";

/**
 * ⚠️ A FLAT DOT HAS TO CLEAR THE COUNTRY'S OWN FILL, and nothing else would
 * tell you it does not. The 3D pins this replaced were three units tall, so
 * they poked through whatever was beneath them; the disc that replaced them
 * inherited their altitude of 0.01, which is UNDER the selected country's
 * polygon — so every resort dot was drawn, correctly, and then painted over
 * by the one country it belongs to. The symptom was "the markers have
 * disappeared", with no error anywhere, and only on the selected country.
 */
test("a resort dot floats clear of the country fill under it", () => {
  assert.ok(
    DOT_ALTITUDE > COUNTRY_FILL_ALTITUDE,
    `dots at ${DOT_ALTITUDE} are under the country fill at ${COUNTRY_FILL_ALTITUDE}`,
  );
  assert.ok(DOT_ALTITUDE > COUNTRY_OUTLINE_ALTITUDE);
  // …and not so far out that it reads as floating above the ground rather
  // than sitting on it. One percent of the radius is a kilometre or two.
  assert.ok(DOT_ALTITUDE < 0.04, "the dots are hovering above the globe");
});

/**
 * ⚠️ THE DOT IS SIZED IN PIXELS, AND ITS WORLD SIZE THEREFORE GROWS WITH
 * DISTANCE. This is the inversion that fixed the blob: the pins were a
 * fraction of the globe's radius, damped by a camera-distance ratio that only
 * ever halved them, so flying in made them bigger relative to the frame until
 * nineteen Japanese markers merged into one amber mass the length of Honshu.
 * A test that only checked "it returns a number" would have passed on that.
 */
test("a dot keeps the same screen size however far the camera is", () => {
  const base = { globeRadius: 100, fovDeg: 50, canvasHeight: 700 };
  const near = dotWorldRadius({ ...base, cameraDistance: 133 });
  const far = dotWorldRadius({ ...base, cameraDistance: 270 });

  assert.ok(far > near, "the world size must GROW with distance, not shrink");

  // The screen size is what has to stay put: at depth d, a world length L
  // subtends L * h / (2 d tan(f/2)) pixels.
  const px = (world: number, camDist: number) =>
    (world * base.canvasHeight) /
    (2 * (camDist - base.globeRadius) * Math.tan((base.fovDeg * Math.PI) / 360));
  assert.ok(Math.abs(px(near, 133) - DOT_RADIUS_PX) < 1e-9);
  assert.ok(Math.abs(px(far, 270) - DOT_RADIUS_PX) < 1e-9);
});

test("a camera driven inside the sphere still gives a finite dot", () => {
  // The controls stop at 128, but a flight that overshoots or a future
  // minDistance must not produce a zero or negative size — which would make
  // every marker on the globe vanish rather than merely look wrong.
  const r = dotWorldRadius({
    cameraDistance: 40,
    globeRadius: 100,
    fovDeg: 50,
    canvasHeight: 700,
  });
  assert.ok(Number.isFinite(r) && r > 0, `degenerate camera gave ${r}`);
});

test("a taller canvas draws smaller dots, so the dot stays 5px", () => {
  const base = { cameraDistance: 150, globeRadius: 100, fovDeg: 50 };
  const short = dotWorldRadius({ ...base, canvasHeight: 500 });
  const tall = dotWorldRadius({ ...base, canvasHeight: 1000 });
  assert.ok(Math.abs(short / tall - 2) < 1e-9, "the dot is not tied to the canvas");
});

/**
 * ⚠️ `sideways` IS TIED TO THE LEADER LINE, NOT A PREFERENCE. A label that
 * has slid sideways is only honest because a line runs back to its own dot,
 * and the country pills at world view do not draw one. Allowing it there
 * would move a country's name away from its cluster with nothing to say so.
 */
test("without a leader line a label may only stack, never slide", () => {
  const slots = labelSlots(60, 22, false);
  assert.ok(slots.every(([dx]) => dx === 0), "a label moved sideways with no leader line");
  assert.equal(slots.length, STACK_ROWS * 2 + 1);
});

test("the natural spot is always tried first", () => {
  for (const sideways of [true, false]) {
    const [first] = labelSlots(60, 22, sideways);
    assert.deepEqual(first, [0, 0], "a label moves before trying where it belongs");
  }
});

/**
 * ⚠️ NEAREST FIRST, AND SIDEWAYS BEFORE FAR-VERTICAL. This ordering is the
 * whole fix. Stacking was all the old pass could do, and Furano — which is in
 * Hokkaido — ended up beside Nagano, because the only slots on offer were
 * further and further up a single column.
 */
test("a label prefers a slot beside its dot to one stacked far above it", () => {
  const slots = labelSlots(60, 22, true);
  const at = (dx: number, dy: number) =>
    slots.findIndex(([x, y]) => Math.abs(x - dx) < 1e-9 && Math.abs(y - dy) < 1e-9);

  const oneColumnOver = at(60, 0);
  const fourRowsUp = at(0, -88);
  assert.ok(oneColumnOver >= 0 && fourRowsUp >= 0, "expected slots are missing");
  assert.ok(
    oneColumnOver < fourRowsUp,
    "a label would rather be four rows from its mountain than one column",
  );

  // And the whole list is ordered by its own cost function, so "nearest
  // first" is a property of the list rather than of the two probes above.
  const cost = ([x, y]: [number, number]) => x * x * 0.45 + y * y;
  for (let i = 1; i < slots.length; i++) {
    assert.ok(cost(slots[i]) >= cost(slots[i - 1]) - 1e-9, `slot ${i} is out of order`);
  }
});

test("there are enough slots to seat a whole country's resorts", () => {
  // Canada has 24, which is the most any country on the board carries.
  const slots = labelSlots(60, 22, true);
  assert.ok(slots.length >= 24, `only ${slots.length} slots for 24 Canadian resorts`);
  assert.equal(slots.length, (SIDEWAYS_COLUMNS * 2 + 1) * (STACK_ROWS * 2 + 1));
  // Every slot distinct — a duplicate is a wasted attempt that reads as a
  // clash against a box the same label just claimed.
  assert.equal(new Set(slots.map((s) => s.join(","))).size, slots.length);
});

test("no slot is further than a leader line can plausibly explain", () => {
  const slots = labelSlots(60, 22, true);
  const furthest = Math.max(...slots.map(([x, y]) => Math.hypot(x, y)));
  assert.ok(furthest < 220, `a label may travel ${Math.round(furthest)}px from its dot`);
  assert.ok(furthest > LEADER_MIN_PX, "no slot is far enough to need a leader line");
});

/**
 * ⚠️ THE FLAT COUNTRY MAP IS GONE ON PURPOSE. Selecting a country used to fly
 * the globe in and then, 880ms later, cover it entirely with an SVG map on an
 * opaque ground — so the thing you had just flown to was replaced by a
 * picture of itself. Tyler asked for the globe to stay and simply zoom into
 * the country. This is a decision, not a bug, so it is guarded rather than
 * left to be rediscovered: re-rendering CountryMap over the canvas would
 * undo the whole change without failing anything else.
 */
test("selecting a country does not swap the globe for a flat map", () => {
  const src = readFileSync(join(process.cwd(), "components/globe/Globe.tsx"), "utf8");
  assert.ok(
    !/CountryMap/.test(src),
    "the globe is covered by the flat country map again",
  );
});
