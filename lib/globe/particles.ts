/**
 * The point cloud behind the homepage: a globe made of particles that can
 * come apart and put itself back together.
 *
 * ⚠️ THIS FILE IS THE GEOMETRY, AND IT IS NOW SHARED WITH THE EXPLORE GLOBE.
 * Since 2026-11-28 the explore globe's land is this same point cloud, drawn
 * as a layer inside three-globe — see lib/globe/particle-surface.ts and
 * GLOBE_SURFACE in lib/config/features.ts. What is shared is WHERE THE WORLD
 * IS and nothing else, so the two can never disagree about a coastline.
 *
 * ⚠️ THE TWO RENDERS STAY SEPARATE, and that is the line to hold. This file's
 * caller on the homepage is a backdrop: it has a fixed camera, it fades by
 * raw view depth against hardcoded ranges, and its job is to carry an
 * argument down a page — scattered points mean scattered seasons, the formed
 * globe means we have them. The explore globe is a tool you fly around and
 * click, with a camera between 128 and 600 units out, and neither of those
 * two things survives a moving camera. A change meant for the scrollmation
 * must not quietly restyle a tool, so it belongs in that caller's shader, not
 * here. Nothing in this file may learn about picking, labels or camera
 * flights.
 *
 * ⚠️ COASTLINES, NOT A FILLED SPHERE. Filling the continents means testing
 * tens of thousands of grid points against 288 polygon rings at load, on the
 * main thread, on the homepage. Walking the outlines and dropping a particle
 * every fraction of a degree costs one pass over coordinates we already have,
 * and a wireframe Earth is the better-looking answer anyway.
 */

import { FORMATION_BANDS } from "./shapes";

export interface ParticleField {
  /** Where every particle sits when the globe is whole. xyz triples. */
  home: Float32Array;
  /** Where it drifts to when the globe comes apart. */
  scattered: Float32Array;
  /** Per-particle rgb. */
  colors: Float32Array;
  /** Per-particle size multiplier. */
  sizes: Float32Array;
  count: number;
  /**
   * Half-open [start, end) index range of each input feature's own land
   * particles, in the order the features were given.
   *
   * ⚠️ THE RANGES ARE CONTIGUOUS BECAUSE THE BUILD IS, and that is what makes
   * lighting one country up cheap. The explore globe recolours a country's
   * coastline on hover; without this it would have to re-derive which of
   * eighteen thousand points belong to Canada every time the pointer moved,
   * or carry a per-particle country id costing four bytes each to answer a
   * question asked a few times a second.
   */
  landRanges: { start: number; end: number }[];
  /**
   * Half-open [start, end) index range of the resort particles — the amber,
   * oversized ones.
   *
   * Exposed because the OTHER formations need it. A resort is the one
   * particle on this page that means something specific, and in the globe it
   * sits on its own coordinates; in the mountain range it should sit on the
   * skyline rather than being buried in the body of a hill like any other
   * point. Without the range, `buildMountains` cannot tell a resort from a
   * metre of Norwegian coastline.
   */
  resortRange: [number, number];
}

type Ring = number[][];

function ringsOf(feature: object): Ring[] {
  const geom = (feature as { geometry?: { type?: string; coordinates?: unknown } }).geometry;
  if (!geom?.coordinates) return [];
  const polys = (geom.type === "Polygon" ? [geom.coordinates] : geom.coordinates) as Ring[][];
  return polys.map((p) => p[0]).filter((r): r is Ring => Array.isArray(r) && r.length >= 4);
}

/** Lat/lng to a point on a sphere of the given radius. */
export function toSphere(lat: number, lng: number, radius: number): [number, number, number] {
  const phi = ((90 - lat) * Math.PI) / 180;
  const theta = ((lng + 180) * Math.PI) / 180;
  return [
    -radius * Math.sin(phi) * Math.cos(theta),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.sin(theta),
  ];
}

/**
 * Walk a ring and emit a point every `stepDeg` of arc, so a long coastline
 * gets proportionally more particles than a short one. Without the
 * interpolation the density follows wherever Natural Earth happened to put
 * its vertices, which clumps badly around fjords and leaves deserts bare.
 */
function densify(ring: Ring, stepDeg: number, out: [number, number][]): void {
  for (let i = 1; i < ring.length; i++) {
    const [lng1, lat1] = ring[i - 1];
    const [lng2, lat2] = ring[i];
    const dLat = lat2 - lat1;
    const dLng = (lng2 - lng1) * Math.cos((((lat1 + lat2) / 2) * Math.PI) / 180);
    const dist = Math.hypot(dLat, dLng);
    const steps = Math.max(1, Math.round(dist / stepDeg));
    for (let s = 0; s < steps; s++) {
      const t = s / steps;
      out.push([lat1 + (lat2 - lat1) * t, lng1 + (lng2 - lng1) * t]);
    }
  }
}

export interface BuildOptions {
  radius: number;
  /** Degrees of arc between coastline particles. Lower = denser = slower. */
  stepDeg?: number;
  /** Extra particles floating around the globe, like weather. */
  driftCount?: number;
  landColor: [number, number, number];
  resortColor: [number, number, number];
  driftColor: [number, number, number];
}

/**
 * Build both formations in one pass.
 *
 * ⚠️ THE SCATTERED POSITION IS DERIVED FROM THE HOME POSITION, not random.
 * Each particle flies outward along its own radius with a little noise, so
 * the cloud keeps the globe's silhouette as it comes apart and the eye can
 * follow a point out and back. Seeding it from pure randomness looked like a
 * screensaver: the shape dissolved into a cube of noise and the reform read
 * as a different object arriving rather than the same one returning.
 */
export function buildParticleField(
  features: object[],
  resorts: { latitude: number; longitude: number }[],
  opts: BuildOptions,
): ParticleField {
  const { radius, stepDeg = 0.55, driftCount = 900 } = opts;

  const landPts: [number, number][] = [];
  const landRanges: { start: number; end: number }[] = [];
  for (const f of features) {
    const start = landPts.length;
    for (const ring of ringsOf(f)) densify(ring, stepDeg, landPts);
    landRanges.push({ start, end: landPts.length });
  }

  const count = landPts.length + resorts.length + driftCount;
  const home = new Float32Array(count * 3);
  const scattered = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const sizes = new Float32Array(count);

  // Deterministic pseudo-random, so the layout is identical on every load and
  // between server and client — a different cloud each refresh reads as a bug.
  let seed = 20260101;
  const rand = () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return seed / 4294967296;
  };

  const write = (
    i: number,
    lat: number,
    lng: number,
    r: number,
    color: [number, number, number],
    size: number,
    spread: number,
  ) => {
    const [x, y, z] = toSphere(lat, lng, r);
    home[i * 3] = x;
    home[i * 3 + 1] = y;
    home[i * 3 + 2] = z;

    // Outward along its own radius, plus a nudge, so the silhouette survives.
    // ⚠️ The nudge is scaled by `spread` as well. With a fixed nudge the
    // particles that travel least — the resorts — could be knocked further
    // than they were pushed and end up INSIDE the globe, which is both wrong
    // and invisible. Caught by the test, not by looking at it.
    const push = 1 + spread * (0.5 + rand());
    const jitter = radius * 0.5 * spread;
    scattered[i * 3] = x * push + (rand() - 0.5) * jitter;
    scattered[i * 3 + 1] = y * push + (rand() - 0.5) * jitter;
    scattered[i * 3 + 2] = z * push + (rand() - 0.5) * jitter;

    colors[i * 3] = color[0];
    colors[i * 3 + 1] = color[1];
    colors[i * 3 + 2] = color[2];
    sizes[i] = size;
  };

  let i = 0;
  for (const [lat, lng] of landPts) write(i++, lat, lng, radius, opts.landColor, 1, 0.38);
  // The resorts sit slightly proud of the land and travel less when it comes
  // apart, so they stay legible as the thing the whole page is about.
  const resortStart = i;
  for (const r of resorts) {
    write(i++, r.latitude, r.longitude, radius * 1.012, opts.resortColor, 2.6, 0.2);
  }
  const resortEnd = i;
  for (let d = 0; d < driftCount; d++) {
    write(
      i++,
      (rand() - 0.5) * 180,
      (rand() - 0.5) * 360,
      radius * (1.15 + rand() * 0.85),
      opts.driftColor,
      0.7,
      0.6,
    );
  }

  return { home, scattered, colors, sizes, count, landRanges, resortRange: [resortStart, resortEnd] };
}

/** How far apart the cloud is while it is holding a shape. Not quite zero. */
const HOLD = 0.045;
/**
 * How far apart it gets on the way between two shapes.
 *
 * ⚠️ BELOW FULL TRAVEL ON PURPOSE. The first version ran to 1.0 and held it
 * across a sixth of the page: the cloud blew past the edges of the screen,
 * stopped reading as something that had come apart, and just looked like
 * dust.
 *
 * ⚠️ 0.52, DOWN FROM 0.78 WHEN THE HOLDS BECAME BANDS, and it is not a free
 * choice. The gap between two sections is about 0.122 of the page and is
 * effectively fixed — taller sections grow the document by the same
 * proportion — so every bit of `HOLD_HALF` comes out of the ramp between
 * holds. A 0.05 band leaves 0.072 to travel in, and a ramp that short cannot
 * carry more dispersion than this without moving faster than the render
 * loop's easing can follow, at which point the extra is lost to lag anyway:
 * the curve asks for 0.78, the screen shows 0.55, and the only thing gained
 * is a snap at both ends. The two constants move together or not at all.
 *
 * At 0.52 a land particle still travels about a fifth of the globe's radius
 * outward with a 39-unit random smear on top, against a particle spacing of
 * 8 to 25 units in the formations — so the shape is thoroughly dissolved on
 * the way, which is all the explode has to do.
 */
const PEAK = 0.52;

/**
 * The keyframes, DERIVED from the formation stops rather than typed out
 * beside them.
 *
 * ⚠️ THIS USED TO BE A HAND-WRITTEN LIST and it cannot be one any more. With
 * three formations there were three ramps to keep lined up with
 * `FORMATION_STOPS`; there are now seven holds and six ramps, and a hold
 * whose dispersion key is off by a few thousandths is a shape nobody ever
 * sees — it renders perfectly happily as a cloud of dust, with no error. Two
 * lists that must agree are two lists that will not: the same shape of bug as
 * the four hand-written copies of JOB_CATEGORIES in migration 00125.
 *
 * The rule: settle at every stop, and peak halfway between any two stops that
 * hold DIFFERENT shapes. Two consecutive stops holding the same shape get no
 * peak between them, which is what keeps the globe whole from the hero
 * through the figures instead of blowing it apart for no reason.
 */
function dispersionKeys(): [number, number][] {
  const keys: [number, number][] = [];
  for (let i = 0; i < FORMATION_BANDS.length; i++) {
    const { at, shape } = FORMATION_BANDS[i];
    // The two ends of the page sit at a dead stop; everything else idles.
    keys.push([at, at <= 0 || at >= 1 ? 0 : HOLD]);
    const next = FORMATION_BANDS[i + 1];
    if (next && next.shape !== shape) keys.push([(at + next.at) / 2, PEAK]);
  }
  return keys;
}

const KEYS = dispersionKeys();

/**
 * How far apart the cloud is at a given point down the page, 0 whole and 1
 * fully dispersed.
 *
 * ⚠️ THE PEAKS SIT ON THE TRANSITIONS, NOT IN THE MIDDLE OF THE PAGE, and
 * getting that wrong is what made the first version unreadable. Dispersion
 * and the formation curve in shapes.ts are driven by the same scroll
 * position, so if the cloud is at its most scattered exactly where a shape is
 * supposed to be held, the shape never appears — the mountains were fully
 * formed and fully blown apart at the same moment. Now the cloud comes apart
 * to travel BETWEEN shapes and settles whenever it has arrived at one, which
 * is also the honest reading of the thing: it falls apart on the way, and
 * every time it lands it has become something.
 *
 * ⚠️ THE RAMPS GOT FASTER WHEN THE PAGE GAINED FORMATIONS, and that is
 * arithmetic rather than a choice. A shape per section means the gaps between
 * holds are roughly one over the number of sections — about 0.13 of the page
 * each, where the three-shape version had 0.19 — so the same travel happens
 * in two thirds of the scroll. `lib/globe/particles.test.ts` had to raise its
 * per-step limit from 0.06 to 0.10 to allow it. That test exists to catch a
 * keyframe typo, which still shows up as a jump of half the range or more, so
 * it keeps its teeth; and the render loop eases dispersion towards its target
 * at 0.085 a frame, an 11-frame low-pass that smooths the curve again on the
 * way to the screen.
 */
export function dispersionAt(progress: number): number {
  const p = Math.min(1, Math.max(0, progress));
  const keys = KEYS;

  for (let i = 1; i < keys.length; i++) {
    const [p0, v0] = keys[i - 1];
    const [p1, v1] = keys[i];
    if (p <= p1) {
      const t = (p - p0) / (p1 - p0);
      // Smoothstep, so there is no visible corner where keys meet.
      return v0 + (v1 - v0) * (t * t * (3 - 2 * t));
    }
  }
  return keys[keys.length - 1][1];
}
