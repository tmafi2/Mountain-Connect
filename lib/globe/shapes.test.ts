import { test } from "node:test";
import assert from "node:assert/strict";
import {
  FORMATION_BUILDERS,
  FORMATION_STOPS,
  FORMATION_STYLE,
  RIDGE_LAYERS,
  SIGN_ARMS,
  armTaper,
  VILLAGE_ROWS,
  buildChairlift,
  buildMountains,
  buildSnowflake,
  buildSignpost,
  buildVillage,
  buildingHalf,
  formationAt,
  ridgeHeight,
  skylineY,
  type Formation,
} from "./shapes";

const COUNT = 5000;
const SCALE = 150;
/** The resort block, as it sits in the real field: a run in the middle. */
const RESORTS: [number, number] = [4000, 4125];

const BUILDERS = Object.entries(FORMATION_BUILDERS) as [
  Exclude<Formation, "globe">,
  (c: number, s: number, r?: [number, number]) => Float32Array,
][];

/**
 * Every formation must hold the same particles in the same order, so one
 * melts into the next. A short array leaves the tail of the cloud frozen
 * wherever the previous shape left it.
 *
 * ⚠️ DRIVEN OFF `FORMATION_BUILDERS`, not a hand-written list of builders.
 * The point of that record is that a new formation cannot be added to the
 * page without a builder; the point of iterating it here is that a new
 * formation cannot be added without being checked.
 */
test("every formation returns exactly the particle count", () => {
  for (const [name, build] of BUILDERS) {
    for (const range of [undefined, RESORTS] as (undefined | [number, number])[]) {
      const a = build(COUNT, SCALE, range);
      assert.equal(a.length, COUNT * 3, `${name} returned ${a.length / 3} particles`);
      for (let i = 0; i < a.length; i++)
        assert.ok(Number.isFinite(a[i]), `${name}[${i}] not finite`);
      // Nothing may be left at the origin: an index a builder forgot to write
      // is a particle sitting dead centre, which reads as a bright speck in
      // the middle of the screen and is otherwise completely silent.
      let atOrigin = 0;
      for (let i = 0; i < COUNT; i++) {
        if (a[i * 3] === 0 && a[i * 3 + 1] === 0 && a[i * 3 + 2] === 0) atOrigin++;
      }
      assert.ok(atOrigin < 3, `${name} left ${atOrigin} particles at the origin`);
    }
  }
});

test("formations are deterministic", () => {
  for (const [name, build] of BUILDERS) {
    assert.deepEqual(
      Array.from(build(400, SCALE, [300, 350]).slice(0, 200)),
      Array.from(build(400, SCALE, [300, 350]).slice(0, 200)),
      `${name} is not deterministic`,
    );
  }
});

/**
 * ⚠️ THE RESORT PARTICLES ARE A CONTIGUOUS BLOCK OF INDICES, and EVERY
 * builder has to place them deliberately. A loop that just walks `i++` writes
 * its structure straight over that block, so all 125 amber, oversized points
 * land wherever the cursor happened to be — which is how they once ended up
 * inside a single chairlift seat as one gold blob that looked like a
 * rendering fault. Nothing failed; it just looked broken.
 *
 * Per-shape tests below check they land somewhere MEANINGFUL (on the skyline,
 * on the cable, in a window). This one only checks they are spread, which is
 * the bug that recurs, and it checks it for every formation at once so the
 * next builder inherits the guard.
 */
test("every formation spreads its resort particles, none clumped", () => {
  const n = RESORTS[1] - RESORTS[0];
  for (const [name, build] of BUILDERS) {
    const a = build(COUNT, SCALE, RESORTS);
    const half = FORMATION_STYLE[name].halfWidth;
    const xs: number[] = [];
    for (let i = RESORTS[0]; i < RESORTS[1]; i++) xs.push(a[i * 3] / half);
    xs.sort((p, q) => p - q);
    assert.ok(
      xs[xs.length - 1] - xs[0] > 0.9,
      `${name}'s resort points only span ${(xs[xs.length - 1] - xs[0]).toFixed(2)} of its width`,
    );
    const bins = new Map<number, number>();
    for (const x of xs) {
      const b = Math.max(0, Math.min(9, Math.floor(((x + 1) / 2) * 10)));
      bins.set(b, (bins.get(b) ?? 0) + 1);
    }
    const worst = Math.max(...bins.values());
    assert.ok(worst < n * 0.3, `${worst} of ${n} of ${name}'s resort points sit in one tenth of it`);
  }
});

test("every ridge has peaks and falls away at the edges", () => {
  for (let l = 0; l < RIDGE_LAYERS.length; l++) {
    let highest = 0;
    for (let x = -1; x <= 1; x += 0.01) {
      const h = ridgeHeight(x, l);
      assert.ok(h >= 0, `layer ${l} went negative at ${x}`);
      if (h > highest) highest = h;
    }
    assert.ok(highest > 0.4, `layer ${l} never rises (max ${highest.toFixed(2)})`);
  }
  // The back ridge is the tall one; it is what the others stand in front of.
  assert.ok(ridgeHeight(-0.46, 0) > 0.9, "the main summit should be near full height");
});

/**
 * ⚠️ THE LAYERS ARE THE WHOLE POINT, and they are only layers if they are
 * separated in DEPTH. The shader fades a particle by view z, so a range
 * flattened to one plane loses its haze and goes back to being the single
 * silhouette this replaced — with no error and no visual bug, just a worse
 * picture. Test the separation, not the look.
 */
test("the ridges are genuinely at different depths, far to near", () => {
  assert.ok(RIDGE_LAYERS.length >= 3, "a range needs at least three ridges to read");
  for (let i = 1; i < RIDGE_LAYERS.length; i++) {
    assert.ok(
      RIDGE_LAYERS[i].z > RIDGE_LAYERS[i - 1].z + 50,
      `layer ${i} is not meaningfully in front of layer ${i - 1}`,
    );
  }
  // Nearer ridges must sit LOWER on screen, or they do not overlap the ones
  // behind and the range reads as three separate drawings.
  for (let i = 1; i < RIDGE_LAYERS.length; i++) {
    assert.ok(
      RIDGE_LAYERS[i].lift < RIDGE_LAYERS[i - 1].lift,
      `layer ${i} does not sit below layer ${i - 1}`,
    );
  }
  // No `share` field to check: particles are allocated by how much of each
  // layer is actually VISIBLE once the ones in front occlude it, which is a
  // function of the peak shapes rather than a number kept correct by hand.
});

/** Nothing should float above the skyline — that reads as a bug, not snow. */
test("mountain particles stay under the skyline", () => {
  const m = buildMountains(COUNT, SCALE, [4000, 4125]);
  const halfWidth = SCALE * 4.4 * 0.5;
  for (let i = 0; i < COUNT; i++) {
    const x = m[i * 3] / halfWidth;
    const y = m[i * 3 + 1];
    assert.ok(y <= skylineY(x, SCALE) + 0.5, `particle ${i} floats above the skyline`);
  }
});

/**
 * The range has to be bigger than the globe it follows, or the page reads as
 * one object shrinking rather than becoming a landscape. This is the check
 * the previous version would have failed: at 1.45 half-width it was 435
 * across against a 300-wide globe.
 */
test("the range is wider than the frame, so it runs off both edges", () => {
  const m = buildMountains(COUNT, SCALE);
  let minX = Infinity;
  let maxX = -Infinity;
  for (let i = 0; i < COUNT; i++) {
    const x = m[i * 3];
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
  }
  // Visible width at a 1123x917 viewport, camera z=640, fov 42.
  const visibleWidth = 2 * 640 * Math.tan((42 * Math.PI) / 180 / 2) * (1123 / 917);
  assert.ok(
    maxX - minX > visibleWidth,
    `the range is ${Math.round(maxX - minX)} wide against ${Math.round(visibleWidth)} visible — it stops inside the frame`,
  );
  assert.ok(maxX - minX > 300 * 1.8, "the range should be substantially larger than the globe");
});

/**
 * The amber resort particles are the one thing on this page that means
 * something specific. In the range they belong ON the skyline — buried in a
 * hillside they are indistinguishable from coastline, and the point of
 * carrying their index range through is lost silently.
 */
test("resorts land on the skyline, not inside the mountain", () => {
  const range: [number, number] = [4000, 4125];
  const m = buildMountains(COUNT, SCALE, range);
  const halfWidth = SCALE * 4.4 * 0.5;
  let onLine = 0;
  for (let i = range[0]; i < range[1]; i++) {
    const x = m[i * 3] / halfWidth;
    const y = m[i * 3 + 1];
    // Within a whisker of the highest ridge at its own x.
    if (Math.abs(y - skylineY(x, SCALE)) < SCALE * 0.6) onLine++;
  }
  const n = range[1] - range[0];
  assert.ok(onLine / n > 0.5, `only ${onLine} of ${n} resorts are near the skyline`);

  // And they should favour high ground over the valleys.
  let high = 0;
  for (let i = range[0]; i < range[1]; i++) {
    if (m[i * 3 + 1] > -SCALE * 0.9) high++;
  }
  assert.ok(high / n > 0.5, `only ${high} of ${n} resorts are up in the range`);
});

/**
 * ⚠️ WHAT MAKES IT A CHAIRLIFT RATHER THAN A POWER LINE is regularly spaced
 * chairs hanging below a cable. A build that lost the chairs would still
 * draw a convincing diagonal line with posts, and nothing else here would
 * notice.
 */
test("the lift hangs distinct, regularly spaced chairs below its cable", () => {
  const c = buildChairlift(COUNT, SCALE);
  const halfWidth = SCALE * 4.2 * 0.5;
  // Chairs are the dense clusters sitting below the cable line.
  const buckets = new Map<number, number>();
  for (let i = 0; i < COUNT; i++) {
    const x = c[i * 3] / halfWidth;
    const t = (x + 1) / 2;
    const b = Math.round(t * 40);
    buckets.set(b, (buckets.get(b) ?? 0) + 1);
  }
  const counts = [...buckets.values()];
  const mean = counts.reduce((a, b) => a + b, 0) / counts.length;
  const clusters = [...buckets.entries()].filter(([, n]) => n > mean * 1.8);
  assert.ok(
    clusters.length >= 5,
    `only ${clusters.length} dense clusters along the cable — the chairs are not reading`,
  );
  // Spread out, not bunched at one end.
  const ts = clusters.map(([b]) => b / 40).sort((a, b) => a - b);
  assert.ok(ts[ts.length - 1] - ts[0] > 0.5, "the chairs are bunched into one stretch of cable");
});

/**
 * ⚠️ THE RESORT PARTICLES ARE A CONTIGUOUS BLOCK OF INDICES, and every
 * builder has to place them on purpose. A loop that just walks `i++` writes
 * the structure straight over that block, so all 125 amber, oversized points
 * end up wherever the cursor happened to be — which put them inside a single
 * chair as one gold blob that looked like a rendering fault. Nothing failed;
 * it just looked broken. This is the only thing that would catch it.
 */
test("the lift spreads its resort lights along the cable, never clumped", () => {
  const range: [number, number] = [4000, 4125];
  const c = buildChairlift(COUNT, SCALE, range);
  const halfWidth = SCALE * 4.2 * 0.5;
  const xs: number[] = [];
  for (let i = range[0]; i < range[1]; i++) xs.push(c[i * 3] / halfWidth);
  xs.sort((a, b) => a - b);
  assert.ok(
    xs[xs.length - 1] - xs[0] > 1.4,
    `the lights only span ${(xs[xs.length - 1] - xs[0]).toFixed(2)} of the cable`,
  );
  // No tenth of the cable may hold more than a quarter of them.
  const bins = new Map<number, number>();
  for (const x of xs) {
    const b = Math.floor(((x + 1) / 2) * 10);
    bins.set(b, (bins.get(b) ?? 0) + 1);
  }
  const worst = Math.max(...bins.values());
  assert.ok(worst < xs.length * 0.25, `${worst} of ${xs.length} lights sit in one tenth of the cable`);
  // And they belong ON the cable, not scattered through the structure.
  let onCable = 0;
  for (let i = range[0]; i < range[1]; i++) {
    const x = c[i * 3] / halfWidth;
    const t = (x + 1) / 2;
    const expected = (-0.42 + t * 0.92) * SCALE * 2.6 * 0.5;
    if (Math.abs(c[i * 3 + 1] - expected) < SCALE * 0.22) onCable++;
  }
  assert.ok(onCable > (range[1] - range[0]) * 0.85, `only ${onCable} lights are on the cable line`);
});

test("the lift spans the frame rather than floating in the middle", () => {
  const c = buildChairlift(COUNT, SCALE);
  let minX = Infinity;
  let maxX = -Infinity;
  for (let i = 0; i < COUNT; i++) {
    const x = c[i * 3];
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
  }
  assert.ok(maxX - minX > 600, `the lift is only ${Math.round(maxX - minX)} across`);
});

test("the lift climbs — it is not a horizontal line", () => {
  const c = buildChairlift(COUNT, SCALE);
  // Mean height of the left third vs the right third.
  let lSum = 0,
    lN = 0,
    rSum = 0,
    rN = 0;
  const halfWidth = SCALE * 4.2 * 0.5;
  for (let i = 0; i < COUNT; i++) {
    const x = c[i * 3] / halfWidth;
    if (x < -0.4) {
      lSum += c[i * 3 + 1];
      lN++;
    } else if (x > 0.4) {
      rSum += c[i * 3 + 1];
      rN++;
    }
  }
  assert.ok(rSum / rN - lSum / lN > SCALE * 0.25, "the lift does not gain height across the frame");
});

test("the page opens and closes on the globe, with both shapes in between", () => {
  // What the cloud actually IS at a given point: `to` once the blend has
  // completed, `from` before it starts.
  const effective = (p: number) => {
    const f = formationAt(p);
    return f.blend > 0.5 ? f.to : f.from;
  };
  assert.equal(effective(0), "globe", "the page must open on the globe");
  assert.equal(effective(1), "globe", "and close on it");
  // Read the holds out of the source of truth rather than retyping them, so
  // moving a stop cannot leave this test agreeing with the old position.
  for (const stop of FORMATION_STOPS) {
    assert.equal(effective(stop.at), stop.shape, `${stop.shape} is not what is shown at ${stop.at}`);
  }
  // ⚠️ EVERY FORMATION THAT EXISTS MUST BE HELD SOMEWHERE. A builder with no
  // stop is dead code that still costs its build time on every page load, and
  // a shape nobody ever sees is indistinguishable from one that was never
  // written. Read off the style record, so adding a formation and forgetting
  // to put it on the page fails here rather than going unnoticed.
  for (const shape of Object.keys(FORMATION_STYLE) as Formation[]) {
    assert.ok(
      FORMATION_STOPS.some((s) => s.shape === shape),
      `${shape} is never held anywhere on the page`,
    );
  }
  const seen = new Set<string>();
  for (let p = 0; p <= 1; p += 0.01) {
    const f = formationAt(p);
    seen.add(f.from);
    seen.add(f.to);
    assert.ok(f.blend >= 0 && f.blend <= 1, `blend ${f.blend} out of range at ${p}`);
  }
  for (const shape of Object.keys(FORMATION_STYLE)) {
    assert.ok(seen.has(shape), `${shape} never appears`);
  }
  // The holds have to be in order, or formationAt walks past one and the
  // shape it names is skipped.
  for (let i = 1; i < FORMATION_STOPS.length; i++) {
    assert.ok(
      FORMATION_STOPS[i].at > FORMATION_STOPS[i - 1].at,
      `stop ${i} is not after the one before it`,
    );
  }
});

/**
 * ⚠️ THE FIT IS COMPUTED AGAINST `FORMATION_STYLE.halfWidth`, SO IT HAS TO BE
 * THE SHAPE'S REAL HALF-WIDTH. ParticleGlobe scales each formation by
 * (what the camera can see) / (this number), so a builder whose extent drifts
 * away from it is fitted to the wrong frame — and the failure is silent and
 * screen-size dependent: correct on the desktop it was tuned on, clipped or
 * shrunken on a phone. Nothing in the types connects the two.
 */
test("every formation's declared half-width matches what it actually draws", () => {
  for (const [name, build] of BUILDERS) {
    const a = build(COUNT, SCALE, RESORTS);
    let maxAbsX = 0;
    for (let i = 0; i < COUNT; i++) maxAbsX = Math.max(maxAbsX, Math.abs(a[i * 3]));
    const declared = FORMATION_STYLE[name].halfWidth;
    const ratio = maxAbsX / declared;
    assert.ok(
      ratio > 0.9 && ratio < 1.1,
      `${name} draws to ${Math.round(maxAbsX)} but declares ${Math.round(declared)}`,
    );
  }
  // The globe has no builder here — it is the particle field's own home
  // positions — so its number is checked against the radius it is built at.
  assert.equal(FORMATION_STYLE.globe.halfWidth, 150);
  assert.equal(FORMATION_STYLE.globe.fit, "none");
});

/**
 * ⚠️ THE ROUND SHAPES MUST NOT BE FITTED LIKE THE WIDE ONES. A `wide` fit
 * squeezes x to overrun the frame and takes the square root of that in y;
 * applied to the snowflake on a phone (fit 0.49) it becomes an ellipse and
 * loses two of its six arms off the sides. The globe is as wide as it is tall
 * and needs no fit at all.
 */
test("round formations are fitted round, landscape formations are fitted wide", () => {
  assert.equal(FORMATION_STYLE.snowflake.fit, "uniform");
  assert.equal(FORMATION_STYLE.signpost.fit, "contain");
  for (const wide of ["mountains", "lift", "village"] as Formation[]) {
    assert.equal(FORMATION_STYLE[wide].fit, "wide", `${wide} should overrun the frame`);
  }
  // ⚠️ And the point size has to RISE as the shape spreads out. The globe
  // packs its particles onto coastlines at 20 per 8-world cell; the range
  // spreads the same cloud over a two-dimensional mass at 5, and only a
  // bigger point closes that surface up. A formation that spans the frame can
  // never want the globe's point size.
  for (const wide of ["mountains", "lift", "village"] as Formation[]) {
    assert.ok(
      FORMATION_STYLE[wide].sizeBoost > FORMATION_STYLE.globe.sizeBoost,
      `${wide} is spread wider than the globe but drawn with the same point size`,
    );
  }
});

/* ═══ The signpost ═══════════════════════════════════════════════════════ */

/**
 * ⚠️ THREE ARMS, POINTING IN DIFFERENT DIRECTIONS. The section behind it is
 * three numbered steps, and a signpost whose arms all pointed the same way
 * would still draw a convincing object — it would just be a ladder.
 */
test("the signpost has three arms, not all pointing the same way", () => {
  assert.equal(SIGN_ARMS.length, 3, "three steps, three arms");
  const dirs = new Set(SIGN_ARMS.map((a) => a.dir));
  assert.equal(dirs.size, 2, "every arm points the same way");
  // At different heights, or they overlap into one plank.
  const ys = SIGN_ARMS.map((a) => a.y).sort((p, q) => p - q);
  for (let i = 1; i < ys.length; i++) {
    assert.ok(ys[i] - ys[i - 1] > 0.15, "two arms are at the same height");
  }
  // ⚠️ MOSTLY LEFT, because the copy column beside this one is on the RIGHT.
  // An arm reaching into the column puts a bright additive plank behind body
  // text, which is the mistake the chairlift made at the Why section.
  const right = SIGN_ARMS.filter((a) => a.dir === 1);
  assert.ok(right.length === 1, "more than one arm reaches toward the copy");
  assert.ok(right[0].len <= Math.max(...SIGN_ARMS.map((a) => a.len)), "the right arm is the long one");
});

test("the signpost stands on the ground and runs off the bottom of frame", () => {
  const a = buildSignpost(COUNT, SCALE, RESORTS);
  let minY = Infinity;
  let maxY = -Infinity;
  for (let i = 0; i < COUNT; i++) {
    minY = Math.min(minY, a[i * 3 + 1]);
    maxY = Math.max(maxY, a[i * 3 + 1]);
  }
  // Visible half-height AT THE SIGNPOST'S OWN DEPTH, not at the origin: the
  // camera sees a cone, so the frame is smaller at z=60 than at z=0.
  const halfY = (640 - 60) * Math.tan((42 * Math.PI) / 180 / 2);
  assert.ok(minY < -halfY, `the post stops at ${Math.round(minY)} — its foot is visible`);
  assert.ok(maxY < halfY, `the post reaches ${Math.round(maxY)} of ${Math.round(halfY)} — off the top`);
  assert.ok(maxY > halfY * 0.6, `the post only reaches ${Math.round(maxY)} — too short to read`);
});

/**
 * ⚠️ THE ARMS MUST STAY INSIDE THE FRAME at this depth, which is 273 and not
 * the 301 of the z=0 plane. The whole point of a direction sign is that you
 * can see where the arms point; one running off the side is just a plank.
 */
test("the signpost's arms land on the edge of the frame, not past it", () => {
  const a = buildSignpost(COUNT, SCALE);
  let minX = Infinity;
  let maxX = -Infinity;
  for (let i = 0; i < COUNT; i++) {
    minX = Math.min(minX, a[i * 3]);
    maxX = Math.max(maxX, a[i * 3]);
  }
  const halfX = (640 - 60) * Math.tan((42 * Math.PI) / 180 / 2) * (1123 / 917);
  assert.ok(minX > -halfX, `the long arm reaches ${Math.round(minX)} against ${Math.round(halfX)} visible`);
  assert.ok(minX < -halfX * 0.9, `the long arm only reaches ${Math.round(minX)} — it looks stunted`);
  assert.ok(maxX < halfX * 0.55, `an arm reaches ${Math.round(maxX)}, into the copy column`);
});

/**
 * ⚠️ THE CHEVRON TIP IS WHAT MAKES IT POINT, and the fill has to be uniform
 * by AREA to keep it. Sampling evenly along an arm's LENGTH hands the tip the
 * same particles per unit length as the body while the taper is narrowing the
 * plank underneath them, so the one part of the shape that carries the
 * meaning comes out the faintest.
 *
 * ⚠️ THE EXPECTED RATIO IS INTEGRATED FROM `armTaper`, not typed in. A
 * hand-picked threshold here was wrong twice over: it did not survive a
 * change to the taper, and at 5,000 particles the tip window holds about 60
 * of them, so the sampling noise alone is ±13%. This runs at 20,000 and
 * compares against the shape's own geometry.
 *
 * ⚠️ IT STARTS AT f=0.12, PAST THE POST. The post is half as wide as the
 * first tenth of an arm is long and spans the whole height, so a window
 * starting at the root counts 70% more particles than the arm put there —
 * which is what made the first version of this test fail on correct code.
 */
test("the signpost's arms do not thin out towards their tips", () => {
  const BIG = 20000;
  const a = buildSignpost(BIG, SCALE);
  const arm = SIGN_ARMS[0];
  const Wx = SCALE * 4.0 * 0.5;
  const Wy = SCALE * 3.3 * 0.5;
  const postX = -0.233;

  const BODY: [number, number] = [0.12, 0.32];
  const TIP: [number, number] = [0.82, 1.0];
  const count = (lo: number, hi: number) => {
    let n = 0;
    for (let i = 0; i < BIG; i++) {
      const ux = a[i * 3] / Wx - postX;
      const uy = a[i * 3 + 1] / Wy;
      if (Math.abs(uy - arm.y) > 0.1) continue;
      const f = (ux * arm.dir) / arm.len;
      if (f > lo && f <= hi) n++;
    }
    return n;
  };
  /** The area of a window of the arm, by integrating its own taper. */
  const area = (lo: number, hi: number) => {
    let s = 0;
    for (let k = 0; k < 400; k++) s += armTaper(lo + ((k + 0.5) / 400) * (hi - lo));
    return (s / 400) * (hi - lo);
  };

  const body = count(...BODY);
  const tip = count(...TIP);
  assert.ok(body > 600, `only ${body} particles in the body of an arm`);
  const expected = area(...TIP) / area(...BODY);
  const got = tip / body;
  assert.ok(
    got > expected * 0.8 && got < expected * 1.25,
    `the tip holds ${tip} against ${body} in the body — a ratio of ${got.toFixed(2)} where its area says ${expected.toFixed(2)}`,
  );
  // And the taper must actually taper, or the check above compares nothing.
  assert.ok(expected < 0.6, "the arm does not narrow towards its tip at all");
});

/* ═══ The snowflake ══════════════════════════════════════════════════════ */

/**
 * ⚠️ SIX-FOLD SYMMETRY IS THE WHOLE THING. A snowflake that is heavier on one
 * side is not a snowflake, it is a splash — and an off-by-one in the arm index
 * produces exactly that while still drawing something radial and plausible.
 */
test("the snowflake is six-fold symmetric", () => {
  const a = buildSnowflake(COUNT, SCALE, RESORTS);
  const sectors = new Array(6).fill(0);
  const radii = new Array(6).fill(0);
  for (let i = 0; i < COUNT; i++) {
    const x = a[i * 3];
    const y = a[i * 3 + 1];
    const r = Math.hypot(x, y);
    // Ignore the hub: it is shared between all six and carries no direction.
    if (r < SCALE * 0.3) continue;
    let ang = Math.atan2(y, x) + Math.PI / 6;
    if (ang < 0) ang += Math.PI * 2;
    const s = Math.floor((ang / (Math.PI * 2)) * 6) % 6;
    sectors[s]++;
    radii[s] += r;
  }
  const lo = Math.min(...sectors);
  const hi = Math.max(...sectors);
  assert.ok(hi / lo < 1.2, `sector counts run ${lo}..${hi} — the flake is lopsided`);
  const means = radii.map((sum, s) => sum / sectors[s]);
  assert.ok(
    Math.max(...means) / Math.min(...means) < 1.1,
    `arm lengths differ by more than a tenth: ${means.map((m) => Math.round(m)).join(", ")}`,
  );
});

/**
 * ⚠️ ARMS, NOT A DISC. The thing that separates a crystal from a blob is that
 * the particles sit along six axes with empty sky between them. A build that
 * spread them evenly over angle would pass the symmetry test above perfectly.
 */
test("the snowflake has arms with gaps between them", () => {
  const a = buildSnowflake(COUNT, SCALE);
  let onAxis = 0;
  let between = 0;
  for (let i = 0; i < COUNT; i++) {
    const x = a[i * 3];
    const y = a[i * 3 + 1];
    const r = Math.hypot(x, y);
    if (r < SCALE * 0.9) continue; // the outer half of the arms only
    let ang = Math.atan2(y, x);
    if (ang < 0) ang += Math.PI * 2;
    // How far from the nearest arm axis, in degrees.
    const off = ((ang * 180) / Math.PI) % 60;
    const d = Math.min(off, 60 - off);
    if (d < 7) onAxis++;
    else if (d > 22) between++;
  }
  assert.ok(onAxis > 200, `only ${onAxis} particles out along the arms`);
  assert.ok(
    onAxis > between * 3,
    `${between} particles between the arms against ${onAxis} on them — this is a disc, not a flake`,
  );
});

test("the snowflake fits the frame's height and stays centred", () => {
  const a = buildSnowflake(COUNT, SCALE);
  let maxR = 0;
  let sx = 0;
  let sy = 0;
  for (let i = 0; i < COUNT; i++) {
    maxR = Math.max(maxR, Math.hypot(a[i * 3], a[i * 3 + 1]));
    sx += a[i * 3];
    sy += a[i * 3 + 1];
  }
  // Visible half-height is fixed by the vertical fov: 640 * tan(21°).
  const visibleHalfY = 640 * Math.tan((42 * Math.PI) / 180 / 2);
  assert.ok(maxR < visibleHalfY, `the flake reaches ${Math.round(maxR)} of ${Math.round(visibleHalfY)}`);
  assert.ok(maxR > visibleHalfY * 0.8, `the flake only reaches ${Math.round(maxR)} — too small`);
  assert.ok(Math.abs(sx / COUNT) < SCALE * 0.06, "the flake is off-centre horizontally");
  assert.ok(Math.abs(sy / COUNT) < SCALE * 0.06, "the flake is off-centre vertically");
});

/* ═══ The village ════════════════════════════════════════════════════════ */

/**
 * ⚠️ ITS MASS HAS TO STAY LOW IN THE FRAME, and that is a constraint from the
 * page rather than from taste. The village is held against "Why Mountain
 * Connects", the one dense full-width card row left on this page — the same
 * section where the first draft of the chairlift ran a bright additive cable
 * through the middle card's body text. A `Band`'s scrim is clear top and
 * bottom and dark through the middle, so a formation held there must sit
 * UNDER the words.
 */
test("the village sits low in the frame, under where the words go", () => {
  const a = buildVillage(COUNT, SCALE, RESORTS);
  const ys: number[] = [];
  for (let i = 0; i < COUNT; i++) ys.push(a[i * 3 + 1]);
  ys.sort((p, q) => p - q);
  // The back row is the high one, so this is measured against the frame at
  // ITS depth rather than at the origin.
  const halfY = (640 - VILLAGE_ROWS[0].z) * Math.tan((42 * Math.PI) / 180 / 2);

  // ⚠️ THE CLAIM IS ABOUT THE MASS, NOT THE HIGHEST PARTICLE, and the first
  // version of this test did not distinguish them. A tenth of the cloud is
  // deliberately scattered above the rooftops as snow, so the single highest
  // point is near the top of the frame by design; what has to stay low is
  // the solid part, the part that would sit behind the card row.
  const rooftops = ys[Math.floor(COUNT * 0.85)];
  assert.ok(
    rooftops < -halfY * 0.2,
    `the village's mass reaches y=${Math.round(rooftops)} — into the band where the cards are read`,
  );
  assert.ok(rooftops > -halfY * 0.75, `the village tops out at ${Math.round(rooftops)} — too low to see`);

  // And the snow above it is there, and is SPARSE: at this density it reads
  // as weather, and anything heavier would be a second shape fighting the
  // first one for the same frame.
  const above = ys.filter((y) => y > -halfY * 0.2).length;
  assert.ok(above > COUNT * 0.04, `only ${above} particles above the rooftops — no snow`);
  assert.ok(above < COUNT * 0.16, `${above} particles above the rooftops — that is a second shape`);
});

/**
 * ⚠️ EVERY ROW IS SIZED AGAINST ITS OWN DEPTH. The camera sees a cone, so the
 * frame is 261 half-tall at z=-40 and only 188 at z=150. The first version
 * put all three rows' ground lines at the same world y, sized against the
 * z=0 plane, and the nearest and largest houses were sliced in half by the
 * bottom edge while the back row barely reached the sides.
 */
test("every village row fits the frame at its own depth", () => {
  const a = buildVillage(COUNT, SCALE);
  const tan = Math.tan((42 * Math.PI) / 180 / 2);
  for (const row of VILLAGE_ROWS) {
    const halfY = (640 - row.z) * tan;
    const halfX = halfY * (1123 / 917);
    const base = row.base * SCALE * 2.6 * 0.5;
    assert.ok(
      base > -halfY * 1.12,
      `the row at z=${row.z} stands at ${Math.round(base)}, well under a frame that reaches ${Math.round(halfY)}`,
    );
    const reach = row.reach * SCALE * 4.6 * 0.5;
    assert.ok(reach > halfX * 0.98, `the row at z=${row.z} stops ${Math.round(halfX - reach)} inside the frame`);
    assert.ok(reach < halfX * 1.25, `the row at z=${row.z} overshoots the frame by ${Math.round(reach - halfX)}`);
  }
  let maxX = 0;
  for (let i = 0; i < COUNT; i++) maxX = Math.max(maxX, Math.abs(a[i * 3]));
  assert.ok(maxX > 640 * tan * (1123 / 917), "the village does not reach the edges of the frame");
});

/**
 * ⚠️ THE ROOF OVERHANGS THE WALLS, and that one discontinuity is what makes a
 * house rather than a box with a triangle balanced on it. It is the sort of
 * thing a later tidy-up removes for looking like a bug.
 */
test("a building has walls, an overhanging roof, and a ridge", () => {
  assert.equal(buildingHalf(0.2), buildingHalf(0.5), "the walls should be parallel");
  assert.ok(buildingHalf(0.62) > buildingHalf(0.58), "the roof does not overhang the walls");
  assert.ok(buildingHalf(1) < buildingHalf(0.62) * 0.2, "the roof does not come to a ridge");
  for (let ly = 0; ly <= 1; ly += 0.01) {
    assert.ok(buildingHalf(ly) > 0, `the profile vanishes at ${ly.toFixed(2)}`);
  }
});

/**
 * The same device as the ridge layers, and only layers if they are separated
 * in DEPTH: the shader fades a particle by view z, so a village flattened to
 * one plane loses its haze and reads as a single row of cut-outs.
 */
test("the village has three rows, far to near, nearer ones lower", () => {
  assert.ok(VILLAGE_ROWS.length >= 3, "a village needs rows to read as a village");
  for (let i = 1; i < VILLAGE_ROWS.length; i++) {
    assert.ok(VILLAGE_ROWS[i].z > VILLAGE_ROWS[i - 1].z + 50, `row ${i} is not in front of row ${i - 1}`);
    assert.ok(VILLAGE_ROWS[i].base < VILLAGE_ROWS[i - 1].base, `row ${i} does not sit below row ${i - 1}`);
    assert.ok(VILLAGE_ROWS[i].h > VILLAGE_ROWS[i - 1].h, `row ${i} is not larger than row ${i - 1}`);
  }
});

/**
 * ⚠️ EVERY HOUSE IS LIT, not one of them brightly. The windows are the 125
 * amber particles, and the obvious way to place them — fill one house, then
 * the next — leaves two houses glowing and twenty-nine dark. They cycle
 * instead.
 */
test("the village lights windows across the whole village", () => {
  const a = buildVillage(COUNT, SCALE, RESORTS);
  const houses = VILLAGE_ROWS.reduce((n, r) => n + r.count, 0);
  const seen = new Set<number>();
  for (let i = RESORTS[0]; i < RESORTS[1]; i++) {
    // Round the x position to identify which house a window belongs to.
    seen.add(Math.round(a[i * 3] / 10));
  }
  assert.ok(
    seen.size > houses * 0.6,
    `windows land on about ${seen.size} spots across ${houses} houses`,
  );
  // Windows belong in the walls, never up above the rooftops.
  const halfY = (640 - VILLAGE_ROWS[0].z) * Math.tan((42 * Math.PI) / 180 / 2);
  for (let i = RESORTS[0]; i < RESORTS[1]; i++) {
    assert.ok(
      a[i * 3 + 1] < -halfY * 0.2,
      `a window at y=${Math.round(a[i * 3 + 1])} is above the village`,
    );
  }
});

test("the blend never jumps", () => {
  let prev = formationAt(0);
  for (let p = 0.004; p <= 1; p += 0.004) {
    const f = formationAt(p);
    // ⚠️ A SEGMENT BETWEEN TWO STOPS HOLDING THE SAME SHAPE IS EXEMPT, and
    // that is not a loophole. The blend interpolates between two arrays, and
    // on such a segment they are the SAME array — `from[i] + (to[i] -
    // from[i]) * blend` is `from[i]` for any blend, and everything else the
    // blend feeds (point size, fit, globeness) also reads the same value from
    // both ends. Nothing moves however fast it runs. The page has two of
    // these: the globe held across the hero and the figures, and held again
    // from the CTA to the foot of the document, where the gap is only 0.042
    // and the blend therefore crosses it quickly.
    //
    // ⚠️ 0.15, RAISED FROM 0.08 WHEN THE HOLDS BECAME BANDS. The morph used
    // to be spread across the whole 0.122 between two stops; it now happens
    // only in the 0.072 of travel between two hold BANDS, so the same
    // complete blend takes 60% of the page distance and moves 60% faster.
    // That is the point of the change rather than a side effect — the shape
    // is still for the rest of the gap. Over 0.072 of this page the morph
    // takes about 814px, near enough a full screen of scrolling, and it
    // happens under 0.52 dispersion where there is no silhouette to see it
    // in. A real discontinuity is still a jump of the full 1.0.
    const sameShape = f.from === f.to;
    if (f.from === prev.from && f.to === prev.to && !sameShape) {
      assert.ok(Math.abs(f.blend - prev.blend) < 0.15, `blend jumped at ${p.toFixed(3)}`);
    }
    prev = f;
  }
});
