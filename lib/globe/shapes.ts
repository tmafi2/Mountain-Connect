/**
 * The formations the particle cloud takes as you read down the homepage.
 *
 * ⚠️ EVERY FORMATION HOLDS THE SAME PARTICLES IN THE SAME ORDER. Particle 400
 * is the same particle in the globe, in the mountains and in the lift — that
 * is what lets one shape melt into the next instead of one disappearing and
 * another arriving. It also means every builder here must return exactly
 * `count` positions, which the tests check, because a short array leaves the
 * tail of the cloud frozen wherever it was.
 *
 * ⚠️ THESE ARE DRAWN FLAT-ISH, FACING THE CAMERA, but z is NOT free. The
 * vertex shader fades a particle by its view depth:
 *
 *     vAlpha = 0.15 + 0.85 * smoothstep(-800.0, -490.0, mv.z)
 *
 * and with the camera at z=640 that means a particle at z=+150 is at full
 * brightness and one at z=-150 is almost out. So depth IS the brightness
 * control, and the mountain range below uses it the way a real range uses
 * haze: the far ridge sits back and dims, the near ridge comes forward and
 * reads solid. Moving the camera or the fade range re-lights all of this.
 */

/** Deterministic, so the page looks the same on every load. */
function rng(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

interface Peak {
  /** Centre in -1..1 across the range. */
  at: number;
  /** Half-width. */
  w: number;
  /** Height in 0..1. */
  h: number;
}

export interface RidgeLayer {
  /** View depth. Negative is further away, and the shader dims it. */
  z: number;
  /** Vertical offset in unit space, so near ridges sit lower on screen. */
  lift: number;
  /**
   * The height the ridge never drops below, as a fraction of 0..1.
   *
   * ⚠️ WITHOUT THIS THE RANGE IS A ROW OF CONES. Peaks built from
   * overlapping triangles fall back to zero between summits, so the eye
   * reads separate pyramids standing in a line rather than one massif with
   * high points — which is exactly how the first version of this looked. A
   * real range has shoulders.
   */
  floor: number;
  peaks: Peak[];
}

/**
 * Three ridges, not one.
 *
 * ⚠️ THIS IS THE WHOLE REASON THE RANGE READS AS A RANGE. A single silhouette
 * — which is what this was — reads as a triangle no matter how many peaks you
 * put in it, because there is nothing to tell the eye it has depth. Real
 * mountains are legible because nearer ridges overlap further ones and the
 * far ones are washed out by haze. Here the layers are separated in z, and
 * the shader's depth fade does the haze for free.
 *
 * Peaks are deliberately offset between layers: aligned summits read as one
 * lumpy ridge drawn three times.
 */
/**
 * ⚠️ THE DEPTHS ARE CHOSEN AGAINST THE SHADER AND THE FRUSTUM, not spread
 * evenly for neatness. Two things move with z and both were wrong at the
 * first attempt (-120 / 0 / +120):
 *
 *   alpha      far ridge at z=-120 renders at 0.19 — all but invisible, so
 *              the tallest, shape-defining ridge was the one you could not
 *              see. At z=-20 it is 0.52, still clearly hazier than the near
 *              ridge at 1.0, which is the effect wanted.
 *   frustum    the view is a cone, so a plane further away shows MORE world.
 *              At z=-120 the visible half-width is 357 against a 330 range,
 *              meaning the far ridge stopped inside the frame with two
 *              visible ends while the near ones ran off — it read as a prop
 *              standing in front of a backdrop. Every layer now ends outside
 *              the frame at a 1123px viewport.
 */
export const RIDGE_LAYERS: RidgeLayer[] = [
  {
    // Far: tallest and highest on screen, hazed back by depth.
    z: -20,
    lift: 0.16,
    floor: 0.44,
    peaks: [
      { at: -0.52, w: 0.78, h: 1.0 },
      { at: 0.1, w: 0.62, h: 0.86 },
      { at: 0.78, w: 0.7, h: 0.94 },
    ],
  },
  {
    // Middle.
    z: 70,
    lift: 0.03,
    floor: 0.34,
    peaks: [
      { at: -0.8, w: 0.66, h: 0.78 },
      { at: -0.08, w: 0.72, h: 0.88 },
      { at: 0.6, w: 0.6, h: 0.7 },
    ],
  },
  {
    // Near: lowest and brightest, the mass the others stand behind.
    z: 150,
    lift: -0.12,
    floor: 0.3,
    peaks: [
      { at: -0.34, w: 0.86, h: 0.56 },
      { at: 0.44, w: 0.78, h: 0.62 },
    ],
  },
];

/**
 * How wide and tall the range is drawn, in multiples of `scale` (150).
 *
 * ⚠️ SIZED AGAINST WHAT THE CAMERA CAN SEE, not picked. With the camera at
 * z=640 and a 42° vertical fov, the visible world at z=0 is 491 tall and
 * 602 wide at a 1123x917 viewport. So:
 *
 *   width  4.4 x 150 = 660  — about 110% of the visible width, so the range
 *                             runs off BOTH edges and reads as a range that
 *                             continues, rather than an object sitting in
 *                             the middle of the screen. Not wider than that:
 *                             every particle past the edge is one that was
 *                             paid for and never seen, and there are 16,636.
 *   height 1.85 x 150 = 278 per unit of ridge height.
 *
 * The predecessor was 1.45 half-width and 1.05 height — 435 x 157, which is
 * barely larger than the 300-wide globe it followed, and that is precisely
 * why it read as a small object rather than a landscape.
 */
export const RANGE_WIDTH = 4.4;
export const RANGE_HEIGHT = 1.85;
/**
 * Where the valley floor sits in unit space.
 *
 * Tuned so the far summits land just above the middle of the frame (+89 of
 * a 245 half-height) while the near ridge's base is at -261, off the bottom
 * edge. A range whose feet you can see is a hill; the floor has to leave
 * the frame.
 */
const RANGE_BASE = 0.84;

/**
 * A ridge line for one layer, as a function of x in -1..1 returning 0..1.
 *
 * Overlapping triangular peaks rather than one: a single triangle reads as a
 * pyramid, and the thing being evoked is a range you could work a season in.
 */
export function ridgeHeight(x: number, layer = 0): number {
  const l = RIDGE_LAYERS[layer] ?? RIDGE_LAYERS[0];
  // The shoulder the ridge never drops below — see RidgeLayer.floor.
  let top = l.floor;
  for (const p of l.peaks) {
    const h = p.h * (1 - Math.abs(x - p.at) / p.w);
    if (h > top) top = h;
  }
  // A little roughness so the slopes are not perfectly straight lines. Seeded
  // off the layer so the three ridges do not share the same jagged profile.
  const k = layer * 3.1;
  const jag = Math.sin(x * (21 + k)) * 0.013 + Math.sin(x * (6.7 + k)) * 0.022;
  return Math.max(0, top + jag);
}

/**
 * The highest point of ANY ridge at this x, in world units.
 *
 * This is the skyline, and it is what "nothing floats above the mountains"
 * means once there is more than one ridge — a particle legitimately above
 * the near ridge may still be well under the far one. The test uses this
 * rather than re-deriving it, so the two cannot drift apart.
 */
export function skylineY(x: number, scale: number): number {
  let best = -Infinity;
  for (let i = 0; i < RIDGE_LAYERS.length; i++) {
    const l = RIDGE_LAYERS[i];
    const y = (ridgeHeight(x, i) + l.lift - RANGE_BASE) * scale * RANGE_HEIGHT;
    if (y > best) best = y;
  }
  return best;
}

/**
 * Particles filling a layered mountain range.
 *
 * Denser near each ridge line than deep in the body of the mountain: the
 * skyline is the part that carries the shape, and spending particles on the
 * middle of a solid mass is spending them where nobody is looking.
 *
 * `resortRange` is the half-open index range of the amber resort particles.
 * When given, those land ON the skyline, biased towards high ground — so the
 * summits of the range are literally the resorts, which is the one thing on
 * this page worth saying twice.
 */
/**
 * How far below the valley floor the nearest ridge is filled, in unit space.
 * Puts the bottom edge at about -330 against a -245 frame edge, so the range
 * has no visible foot.
 */
const FILL_FLOOR = -0.35;

/** The top of the nearest ridge IN FRONT of this layer, at this x. */
function occluderTop(x: number, layer: number): number {
  let top = -Infinity;
  for (let j = layer + 1; j < RIDGE_LAYERS.length; j++) {
    const t = ridgeHeight(x, j) + RIDGE_LAYERS[j].lift;
    if (t > top) top = t;
  }
  return top;
}

/** The band of layer `layer` that is actually visible at x, in unit space. */
function visibleBand(x: number, layer: number): { top: number; bottom: number } {
  const top = ridgeHeight(x, layer) + RIDGE_LAYERS[layer].lift;
  const occ = occluderTop(x, layer);
  const bottom = occ === -Infinity ? FILL_FLOOR : Math.max(FILL_FLOOR, occ);
  return { top, bottom };
}

/**
 * Particles filling a layered mountain range, as a SOLID silhouette.
 *
 * ⚠️ THIS FILLS BY AREA, AND ONLY WHERE THE LAYER CAN BE SEEN. Both halves
 * of that matter, and the first version of this did neither.
 *
 * The globe reads as a solid object because its particles sit on COASTLINES
 * — dense one-dimensional curves, measured at 20.3 particles per 8-unit cell.
 * A mountain range is a two-dimensional mass, so the same 16,636 particles
 * spread over it came out at 6.4 per cell: a thin haze in the shape of a
 * mountain rather than a mountain. Two fixes, together worth about 3x:
 *
 *   occlusion   each layer is filled only between its own ridge and the top
 *               of the nearest ridge IN FRONT of it. The part of the far
 *               range hidden behind the near one was being drawn and then
 *               covered — particles paid for and never seen. Opaque bodies
 *               are what makes a range read as solid rather than as three
 *               transparent sheets.
 *   area        x is drawn from a cumulative distribution weighted by how
 *               TALL the visible band is there, not uniformly. Uniform x
 *               gives every column the same particles whatever its height,
 *               so valleys come out dense and summits thin — the exact
 *               opposite of what the eye needs.
 *
 * `resortRange` is the half-open index range of the amber resort particles.
 * Those land ON the skyline, biased towards high ground — so the summits of
 * the range are literally the resorts, which is the one thing on this page
 * worth saying twice.
 */
export function buildMountains(
  count: number,
  scale: number,
  resortRange?: [number, number],
): Float32Array {
  const out = new Float32Array(count * 3);
  const rand = rng(770118);

  const [rStart, rEnd] = resortRange ?? [-1, -1];
  const isResort = (i: number) => i >= rStart && i < rEnd;

  // ── Per-layer cumulative distribution over x, weighted by visible height.
  const BINS = 384;
  const cdfs: Float32Array[] = [];
  const areas: number[] = [];
  for (let l = 0; l < RIDGE_LAYERS.length; l++) {
    const cdf = new Float32Array(BINS + 1);
    let acc = 0;
    for (let b = 0; b < BINS; b++) {
      const x = -1 + (2 * (b + 0.5)) / BINS;
      const { top, bottom } = visibleBand(x, l);
      acc += Math.max(0, top - bottom);
      cdf[b + 1] = acc;
    }
    areas.push(acc);
    // Normalise. A layer entirely hidden would divide by zero.
    if (acc > 0) for (let b = 0; b <= BINS; b++) cdf[b] /= acc;
    cdfs.push(cdf);
  }

  // ⚠️ PARTICLES GO WHERE THE VISIBLE AREA IS, not by a share typed into the
  // layer table. A near ridge that hides most of the one behind it should
  // get most of the particles, and that depends on the peak shapes rather
  // than on a number anyone can keep correct by hand.
  const totalArea = areas.reduce((a, b) => a + b, 0);
  const bulk = count - Math.max(0, rEnd - rStart);
  const cuts: number[] = [];
  let acc = 0;
  for (const a of areas) {
    acc += totalArea > 0 ? (a / totalArea) * bulk : bulk / areas.length;
    cuts.push(acc);
  }

  /** Draw an x from a layer's distribution by binary search on its CDF. */
  const sampleX = (layer: number): number => {
    const cdf = cdfs[layer];
    const u = rand();
    let lo = 0;
    let hi = BINS;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (cdf[mid + 1] < u) lo = mid + 1;
      else hi = mid;
    }
    // Spread within the bin so the fill has no vertical banding.
    return -1 + (2 * (lo + rand())) / BINS;
  };

  let placed = 0;
  for (let i = 0; i < count; i++) {
    if (isResort(i)) {
      // ⚠️ ON the skyline, not under it. Rejection-sample x so a resort is
      // more likely to land on high ground: `h*h` makes a summit roughly
      // four times as likely as a slope at half height. Capped so a bad
      // draw can never spin — after 12 tries we take what we have.
      let x = 0;
      let layer = 0;
      for (let t = 0; t < 12; t++) {
        x = rand() * 2 - 1;
        layer = Math.floor(rand() * RIDGE_LAYERS.length);
        const h = ridgeHeight(x, layer);
        if (rand() < h * h) break;
      }
      const l = RIDGE_LAYERS[layer];
      const top = ridgeHeight(x, layer) + l.lift;
      out[i * 3] = x * scale * RANGE_WIDTH * 0.5;
      // A hair below the line, so a summit marker sits ON the ridge rather
      // than hovering a pixel over it.
      out[i * 3 + 1] = (top - RANGE_BASE - 0.004) * scale * RANGE_HEIGHT;
      out[i * 3 + 2] = l.z + (rand() - 0.5) * 8;
      continue;
    }

    // Which layer does this one belong to?
    let layer = RIDGE_LAYERS.length - 1;
    for (let k = 0; k < cuts.length; k++) {
      if (placed < cuts[k]) {
        layer = k;
        break;
      }
    }
    placed++;
    const l = RIDGE_LAYERS[layer];

    const x = sampleX(layer);
    const { top, bottom } = visibleBand(x, layer);
    // ⚠️ A SOLID IMAGE NEEDS A BODY AND AN EDGE, and uniform fill alone gives
    // only the body. Evenly spread particles make a mass with a ragged
    // boundary, because the topmost particle in each column lands somewhere
    // random below the ridge. A fifth of them are packed into a thin band
    // right under the skyline instead, which is the line the eye actually
    // reads the mountain by — the same reason the globe looks solid off
    // nothing but coastlines.
    const EDGE = 0.035;
    const y =
      rand() < 0.22
        ? Math.max(bottom, top - EDGE * rand())
        : bottom + (top - bottom) * rand();

    out[i * 3] = x * scale * RANGE_WIDTH * 0.5;
    out[i * 3 + 1] = (y - RANGE_BASE) * scale * RANGE_HEIGHT;
    // ⚠️ A TIGHT z-spread. At ±42 the shader's depth fade varied point size
    // and alpha within a single ridge, which softens the edge — the opposite
    // of a solid image. The layers are separated by depth; the particles
    // inside one are not.
    out[i * 3 + 2] = l.z + (rand() - 0.5) * 10;
  }
  return out;
}

/**
 * A chairlift climbing the frame: cable, towers, and chairs hanging off it.
 *
 * ⚠️ THIS REPLACED A SNOWBOARDER, AND THE REASON IS WORTH KEEPING. The rider
 * was built as a figure — board, torso, limbs, head — plus a spray of snow,
 * and at this particle count it read as a plume with some noise in it. A
 * human figure is legible only through PROPORTION: get the limb lengths
 * slightly wrong and the brain refuses it, and there are not enough points
 * here to carry proportion. A chairlift is legible through GEOMETRY — a
 * straight diagonal, verticals hanging off it at regular spacing — and
 * geometry survives being made of scattered dots. It is also the second most
 * recognisable thing on a mountain after the mountain.
 *
 * Built from solid parts rather than traced outlines, for the same reason
 * the ridges are filled: a one-particle-wide line disappears the moment the
 * cloud is in motion.
 */
/* Sized the same way as the range above. 3.6 x 150 = 540 put the cable's
   half-width at 270 against 277 visible at the lift's own depth — so the
   lower end stopped just inside the frame and the lift read as an object
   with two ends rather than a line passing through. 4.2 x 150 = 630 clears
   it at both ends; 2.6 x 150 gives a 274-tall climb in a 491-tall frame. */
export const LIFT_WIDTH = 4.2;
export const LIFT_HEIGHT = 2.6;

/** Where the towers stand, as a fraction along the cable. */
const TOWERS = [0.07, 0.41, 0.75];
/** Where the chairs hang. Kept clear of the towers. */
const CHAIRS = [0.19, 0.3, 0.53, 0.64, 0.88];

/** The cable's height at t in 0..1, including sag between towers. */
function cableY(t: number): number {
  const straight = -0.42 + t * 0.92;
  // Sag between each adjacent pair of supports (the ends count as supports).
  const supports = [0, ...TOWERS, 1];
  let sag = 0;
  for (let i = 1; i < supports.length; i++) {
    const a = supports[i - 1];
    const b = supports[i];
    if (t >= a && t <= b) {
      const f = (t - a) / (b - a);
      sag = -0.055 * Math.sin(Math.PI * f);
      break;
    }
  }
  return straight + sag;
}

/** The slope the towers stand on. */
function groundY(t: number): number {
  return -0.86 + t * 0.62;
}

export function buildChairlift(
  count: number,
  scale: number,
  resortRange?: [number, number],
): Float32Array {
  const out = new Float32Array(count * 3);
  const rand = rng(31415926);

  const X = (t: number) => -1 + t * 2;
  const put = (i: number, x: number, y: number, z: number) => {
    out[i * 3] = x * scale * LIFT_WIDTH * 0.5;
    out[i * 3 + 1] = y * scale * LIFT_HEIGHT * 0.5;
    out[i * 3 + 2] = z;
  };

  // ⚠️ The chairs get the largest share on purpose: the cable and towers say
  // "a line and some posts", and it is the regularly spaced hanging chairs
  // that make it a chairlift rather than a power line.
  const nGround = Math.floor(count * 0.17);
  const nCable = Math.floor(count * 0.14);
  const nTowers = Math.floor(count * 0.21);
  const nChairs = count - nGround - nCable - nTowers;

  let i = 0;

  // ── The resorts: evenly spaced lights running up the cable.
  //
  // ⚠️ THEY HAVE TO BE PLACED DELIBERATELY OR THEY CLUMP. The amber
  // particles are a contiguous block of indices, so without a branch for
  // them they all land in whichever part the loop happens to be filling
  // when it reaches that block — which put all 125 of them inside one chair
  // as a single gold blob that read as a rendering fault. Spread along the
  // cable they read as the lit line of the lift, which is also the truer
  // picture: the resorts are what the lift is carrying people to.
  const [rStart, rEnd] = resortRange ?? [-1, -1];
  const nResorts = Math.max(0, rEnd - rStart);
  for (let k = 0; k < nResorts; k++) {
    // Evenly along the cable with a touch of jitter, so it is a line of
    // lights rather than a dotted rule.
    const t = nResorts > 1 ? (k + 0.5) / nResorts : 0.5;
    const j = (rand() - 0.5) * (0.9 / Math.max(1, nResorts));
    const tt = Math.min(1, Math.max(0, t + j));
    put(rStart + k, X(tt), cableY(tt) + 0.012, 52);
  }

  /**
   * The next index that is NOT a resort.
   *
   * ⚠️ Every structural loop below writes through this rather than its own
   * counter. Skipping the resort block is the entire fix: a plain `i++`
   * walks straight over those indices and overwrites the lights with
   * whatever part it is drawing, which is how they ended up clumped in the
   * first place.
   */
  const next = () => {
    while (i >= rStart && i < rEnd) i++;
    return i++;
  };

  // ── The slope, fading downward off the bottom of frame.
  for (let k = 0; k < nGround && i < count; k++) {
    const t = rand();
    const depth = Math.pow(rand(), 1.7);
    put(next(), X(t), groundY(t) - depth * 0.5, -60 + (rand() - 0.5) * 60);
  }

  // ── The cable: a thin, dense band so it survives motion.
  for (let k = 0; k < nCable && i < count; k++) {
    const t = rand();
    put(next(), X(t), cableY(t) + (rand() - 0.5) * 0.016, 40 + (rand() - 0.5) * 16);
  }

  // ── Towers: a post up to the cable, with a crossarm at the top.
  for (let k = 0; k < nTowers && i < count; k++) {
    const t = TOWERS[k % TOWERS.length];
    const top = cableY(t);
    const foot = groundY(t);
    if (rand() < 0.22) {
      // Crossarm.
      const u = (rand() - 0.5) * 0.1;
      put(next(), X(t) + u, top + 0.025 + (rand() - 0.5) * 0.014, 34 + (rand() - 0.5) * 14);
    } else {
      // Post, tapering as it rises.
      const f = rand();
      const y = foot + (top - foot) * f;
      const halfWidth = 0.022 * (1 - f * 0.45);
      put(next(), X(t) + (rand() - 0.5) * halfWidth * 2, y, 34 + (rand() - 0.5) * 14);
    }
  }

  // ── Chairs: hanger, seat, backrest. The part that has to read.
  const perChair = Math.ceil(nChairs / CHAIRS.length);
  for (let c = 0; c < CHAIRS.length && i < count; c++) {
    const t = CHAIRS[c];
    const x0 = X(t);
    const y0 = cableY(t);
    for (let k = 0; k < perChair && i < count; k++) {
      const r = rand();
      const z = 55 + (rand() - 0.5) * 18;
      if (r < 0.26) {
        // Hanger arm, straight down from the cable.
        put(next(), x0 + (rand() - 0.5) * 0.015, y0 - rand() * 0.15, z);
      } else if (r < 0.74) {
        // Seat — a horizontal bar, the widest part and the one that says chair.
        put(next(), x0 + (rand() - 0.5) * 0.115, y0 - 0.152 + (rand() - 0.5) * 0.028, z);
      } else {
        // Backrest, rising from the back of the seat.
        put(next(), x0 - 0.05 + (rand() - 0.5) * 0.03, y0 - 0.15 + rand() * 0.075, z);
      }
    }
  }
  // Any remainder from the rounding goes on the cable rather than at the
  // origin, where a leftover clump would read as a bug.
  while (i < count) {
    const t = rand();
    const at = next();
    if (at >= count) break;
    put(at, X(t), cableY(t) + (rand() - 0.5) * 0.016, 40);
  }
  return out;
}

/* ═══ The signpost ═══════════════════════════════════════════════════════ */

/**
 * A trail signpost — a post with three direction arms — read against "How It
 * Works".
 *
 * ⚠️ THIS REPLACED A SWITCHBACK TRAIL, AND THE REASON GENERALISES. The trail
 * was a single ribbon zigzagging up the frame, and it was the right idea
 * drawn with the wrong budget: a one-dimensional path cannot absorb 16,636
 * particles. To reach the density that makes a formation read as solid, the
 * ribbon had to be 25 world units thick — about 70 screen pixels — which left
 * four fat stripes with gaps barely wider than themselves. It read as an
 * abstract pattern, not as a route. A shape on this page has to have AREA to
 * spend particles on; the globe gets away with lines only because it has 288
 * coastlines' worth of them.
 *
 * A signpost has the area — a post, three planks and a snow mound — and it
 * answers the section better than the trail did. Three arms for three steps,
 * and the thing it means is the question "How It Works" exists to answer.
 *
 * ⚠️ IT SITS LEFT OF CENTRE because the column beside it is on the RIGHT. The
 * arms point away from the copy rather than through it, which is why two of
 * the three point left and the right-hand one is the short one.
 */
export const SIGN_WIDTH = 4.0;
export const SIGN_HEIGHT = 3.3;
/** Where the post stands, in unit space. */
const POST_X = -0.233;
/** Depth. Forward and bright, like the lift's cable. */
const SIGN_Z = 60;

interface SignArm {
  /** Height of the arm's centreline, in unit space. */
  y: number;
  /** -1 points left, 1 points right. */
  dir: 1 | -1;
  /** Length, in unit x. */
  len: number;
}

/**
 * ⚠️ THREE ARMS, AND THE LENGTHS ARE SIZED AGAINST THE FRUSTUM AT THIS DEPTH,
 * not at z=0. The camera sees a cone, so a plane nearer to it shows LESS
 * world: at z=60 the visible half-width is 273 against 301 at the origin. The
 * long left arm reaches -270, which lands on the edge rather than past it.
 */
export const SIGN_ARMS: SignArm[] = [
  { y: 0.566, dir: -1, len: 0.667 },
  { y: 0.242, dir: 1, len: 0.567 },
  { y: -0.081, dir: -1, len: 0.6 },
];

/** Half the thickness of an arm, in unit y. */
const ARM_HALF = 0.089;
/** The fraction of an arm that is its chevron tip. */
const ARM_TIP = 0.22;

/** An arm's half-thickness at fraction f along it, 1 at the root. */
export function armTaper(f: number): number {
  return f < 1 - ARM_TIP ? 1 : Math.max(0, (1 - f) / ARM_TIP);
}

export function buildSignpost(
  count: number,
  scale: number,
  resortRange?: [number, number],
): Float32Array {
  const out = new Float32Array(count * 3);
  const rand = rng(515051);

  const Wx = scale * SIGN_WIDTH * 0.5;
  const Wy = scale * SIGN_HEIGHT * 0.5;
  const put = (idx: number, x: number, y: number) => {
    out[idx * 3] = x * Wx;
    out[idx * 3 + 1] = y * Wy;
    out[idx * 3 + 2] = SIGN_Z + (rand() - 0.5) * 12;
  };

  let i = 0;
  const [rStart, rEnd] = resortRange ?? [-1, -1];
  const nResorts = Math.max(0, rEnd - rStart);

  // ── The amber particles outline the three arms, which is what a lit sign
  //    looks like and keeps 125 oversized points off one spot. Half of each
  //    arm's share runs along its top edge and half along its bottom, so the
  //    result is an outline rather than a dotted centreline.
  for (let k = 0; k < nResorts; k++) {
    const arm = SIGN_ARMS[k % SIGN_ARMS.length];
    const per = Math.ceil(nResorts / SIGN_ARMS.length);
    const j = Math.floor(k / SIGN_ARMS.length);
    const topN = Math.max(1, Math.floor(per / 2));
    const onTop = j < topN;
    const f = onTop ? (j + 0.5) / topN : (j - topN + 0.5) / Math.max(1, per - topN);
    put(
      rStart + k,
      POST_X + arm.dir * f * arm.len,
      arm.y + (onTop ? 1 : -1) * ARM_HALF * armTaper(f) * 0.9,
    );
  }

  const next = () => {
    while (i >= rStart && i < rEnd) i++;
    return i++;
  };

  const bulk = count - nResorts;
  const nPost = Math.floor(bulk * 0.3);
  const nMound = Math.floor(bulk * 0.18);

  // ── The post. Runs off the bottom of frame so it has no visible foot.
  const POST_TOP = 0.727;
  const POST_FOOT = -0.929;
  const POST_HALF = 0.0567;
  for (let k = 0; k < nPost && i < count; k++) {
    const f = rand();
    const y = POST_FOOT + (POST_TOP - POST_FOOT) * f;
    // ⚠️ NO CAP. An overhanging top was 1.5% of the post's particles spread
    // over a wider band, which drew two sparse nubs either side of the tip
    // that read as a rendering fault rather than as a finial.
    const half = POST_HALF * (1 - f * 0.22);
    put(next(), POST_X + (rand() * 2 - 1) * half, y);
  }

  // ── A snow mound at the foot, so the post is standing in something rather
  //    than floating. Area-uniform inside a half-ellipse.
  const MOUND_RX = 0.42;
  const MOUND_RY = 0.155;
  const MOUND_Y = -0.9;
  for (let k = 0; k < nMound && i < count; k++) {
    let x = 0;
    let y = 0;
    for (let t = 0; t < 10; t++) {
      x = (rand() * 2 - 1) * MOUND_RX;
      y = (rand() * 2 - 1) * MOUND_RY;
      if ((x / MOUND_RX) ** 2 + (y / MOUND_RY) ** 2 <= 1) break;
    }
    put(next(), POST_X + x, MOUND_Y + Math.abs(y));
  }

  // ── The arms, shared out by area so the long ones are not thinner than the
  //    short ones — the same rule as the ridge layers and the village.
  const areas = SIGN_ARMS.map((a) => a.len);
  const total = areas.reduce((p, q) => p + q, 0) || 1;
  const left = count - i - nResorts > 0 ? count - i : 0;
  for (let a = 0; a < SIGN_ARMS.length; a++) {
    const arm = SIGN_ARMS[a];
    const share = Math.round((areas[a] / total) * left);
    for (let k = 0; k < share && i < count; k++) {
      const at = next();
      if (at >= count) break;
      let f = rand();
      // ⚠️ The chevron tip narrows, so sampling f uniformly leaves it thinner
      // than the body of the arm. Rejection against the taper fixes it, and
      // the tip is the part that says "this points somewhere".
      for (let t = 0; t < 8; t++) {
        if (rand() < armTaper(f)) break;
        f = rand();
      }
      const half = ARM_HALF * armTaper(f);
      // A fifth pressed to the edges: a filled plank has a soft boundary, and
      // the boundary is what makes it a sign rather than a smudge.
      const o =
        rand() < 0.22 ? (rand() < 0.5 ? -1 : 1) * half * (0.92 + rand() * 0.08) : (rand() * 2 - 1) * half;
      put(at, POST_X + arm.dir * f * arm.len, arm.y + o);
    }
  }
  // Rounding leftovers go on the post rather than at the origin.
  while (i < count) {
    const at = next();
    if (at >= count) break;
    const f = rand();
    put(at, POST_X + (rand() * 2 - 1) * POST_HALF, POST_FOOT + (POST_TOP - POST_FOOT) * f);
  }
  return out;
}

/* ═══ The snowflake ══════════════════════════════════════════════════════ */

/**
 * A six-fold stellar dendrite, read against "Platform Features".
 *
 * ⚠️ THIS IS THE ONE FORMATION THAT CLAIMS NOTHING, and that is deliberate.
 * Every other shape on this page points at something the board can be held
 * to — resorts, a lift, a village. The feature list it sits behind has
 * already been trimmed twice for overstating what the platform does (see the
 * comments in page.tsx), so the shape behind it had better not make a fourth
 * claim. A snowflake is the emblem of the whole industry and says nothing.
 *
 * ⚠️ IT IS ROUND, SO IT IS FITTED UNIFORMLY, NOT SQUEEZED. The wide
 * formations are scaled in x to run off the edges of whatever screen they are
 * on. Doing that to this one turns it into an ellipse on a phone and cuts two
 * of its six arms off; `fit: "uniform"` in FORMATION_STYLE shrinks both axes
 * together instead, so the symmetry survives a 375px viewport.
 */
export const FLAKE_RADIUS = 1.45;
const FLAKE_ARMS = 6;
/** The hexagonal core, as a fraction of the radius. */
const FLAKE_HUB = 0.15;
/** Where side branches leave each arm, as a fraction along it. */
const FLAKE_BRANCHES = [0.3, 0.52, 0.74];

/** A regular hexagon's radius at angle `ang`, for a given apothem-ish size. */
function hexRadius(ang: number, size: number): number {
  const sixth = Math.PI / 3;
  let a = ang % sixth;
  if (a < 0) a += sixth;
  return size / Math.cos(a - sixth / 2);
}

export function buildSnowflake(
  count: number,
  scale: number,
  resortRange?: [number, number],
): Float32Array {
  const out = new Float32Array(count * 3);
  const rand = rng(1220241);
  const R = scale * FLAKE_RADIUS;

  const put = (idx: number, x: number, y: number, z: number) => {
    out[idx * 3] = x;
    out[idx * 3 + 1] = y;
    out[idx * 3 + 2] = z;
  };

  let i = 0;
  const [rStart, rEnd] = resortRange ?? [-1, -1];
  const nResorts = Math.max(0, rEnd - rStart);
  const next = () => {
    while (i >= rStart && i < rEnd) i++;
    return i++;
  };

  // ── The lights: amber points marching up each arm, hub to tip.
  for (let k = 0; k < nResorts; k++) {
    const arm = k % FLAKE_ARMS;
    const per = Math.ceil(nResorts / FLAKE_ARMS);
    const step = Math.floor(k / FLAKE_ARMS);
    const r = FLAKE_HUB + (1 - FLAKE_HUB) * ((step + 0.5) / per);
    const ang = (arm * Math.PI * 2) / FLAKE_ARMS;
    put(rStart + k, R * r * Math.cos(ang), R * r * Math.sin(ang), 62);
  }

  const bulk = count - nResorts;
  const nHub = Math.floor(bulk * 0.09);
  const nSpine = Math.floor(bulk * 0.33);
  const nBranch = Math.floor(bulk * 0.44);

  // ── Hub: a solid hexagonal plate. Rejection-sampled against the hexagon,
  //    because a disc here reads as a bead rather than a crystal.
  for (let k = 0; k < nHub && i < count; k++) {
    let x = 0;
    let y = 0;
    for (let t = 0; t < 12; t++) {
      // Uniform by AREA inside the circumscribed disc, then rejected.
      const rr = Math.sqrt(rand()) * FLAKE_HUB * 1.16;
      const ang = rand() * Math.PI * 2;
      x = rr * Math.cos(ang);
      y = rr * Math.sin(ang);
      if (rr <= hexRadius(ang, FLAKE_HUB)) break;
    }
    put(next(), x * R, y * R, 62 + (rand() - 0.5) * 10);
  }

  // ── Spines: six arms out of the hub.
  const SPINE = 0.021;
  for (let k = 0; k < nSpine && i < count; k++) {
    const arm = k % FLAKE_ARMS;
    const ang = (arm * Math.PI * 2) / FLAKE_ARMS;
    const ux = Math.cos(ang);
    const uy = Math.sin(ang);
    const r = FLAKE_HUB * 0.7 + rand() * (1.0 - FLAKE_HUB * 0.7);
    // Taper: the arm is thickest where it leaves the hub.
    const half = SPINE * (1 - r * 0.35);
    const o = (rand() * 2 - 1) * half;
    put(next(), R * (r * ux - o * uy), R * (r * uy + o * ux), 62 + (rand() - 0.5) * 10);
  }

  // ── Branches: two per station per arm, at 60° — the angle real crystals
  //    branch at, and the thing that makes this read as a snowflake rather
  //    than as a six-spoked wheel.
  const BRANCH = 0.013;
  const stations = FLAKE_BRANCHES.length * 2;
  for (let k = 0; k < nBranch && i < count; k++) {
    const arm = k % FLAKE_ARMS;
    const slot = Math.floor(k / FLAKE_ARMS) % stations;
    const f = FLAKE_BRANCHES[slot >> 1];
    const side = slot & 1 ? 1 : -1;
    const ang = (arm * Math.PI * 2) / FLAKE_ARMS;
    // Branches started earlier have had longer to grow, so the inner ones
    // are the long ones. Getting this backwards reads as a starfish.
    const len = 0.34 * (1 - f) + 0.07;
    const bAng = ang + side * (Math.PI / 3);
    const l = rand() * len;
    const half = BRANCH * (1 - (l / len) * 0.5);
    const o = (rand() * 2 - 1) * half;
    const bx = f * Math.cos(ang) + l * Math.cos(bAng) - o * Math.sin(bAng);
    const by = f * Math.sin(ang) + l * Math.sin(bAng) + o * Math.cos(bAng);
    put(next(), bx * R, by * R, 62 + (rand() - 0.5) * 10);
  }

  // ── Tips: a small hexagonal plate finishing each arm, so the six points
  //    have a terminus instead of fading out.
  while (i < count) {
    const at = next();
    if (at >= count) break;
    const arm = at % FLAKE_ARMS;
    const ang = (arm * Math.PI * 2) / FLAKE_ARMS;
    const rr = Math.sqrt(rand()) * 0.042;
    const a2 = rand() * Math.PI * 2;
    const cx = 0.962 * Math.cos(ang) + rr * Math.cos(a2);
    const cy = 0.962 * Math.sin(ang) + rr * Math.sin(a2);
    put(at, cx * R, cy * R, 62 + (rand() - 0.5) * 10);
  }
  return out;
}

/* ═══ The village ════════════════════════════════════════════════════════ */

/**
 * Lit houses along the bottom of the frame, read against "Why Mountain
 * Connects — built for the mountain community".
 *
 * ⚠️ ITS MASS IS LOW IN THE FRAME ON PURPOSE, and that is a constraint from
 * the PAGE. "Why" is the one dense full-width card row left on this page, and
 * the first version of the chairlift was held there — a bright additive cable
 * straight through the middle card's body text. A `Band`'s scrim is clear at
 * the top and bottom and dark through the middle band where the reading
 * happens (see Beats.tsx), so the shape that can be held there is one whose
 * mass sits under the words rather than behind them.
 *
 * ⚠️ THE AMBER PARTICLES ARE WINDOWS. In every other formation they are
 * resorts on a map, summits, or lights on a cable; here they are lit windows,
 * cycling one building at a time so the whole village is lit rather than one
 * house. It is the only place on this page where 125 oversized amber points
 * have somewhere to go that is both evenly spread and worth looking at.
 */
export const VILLAGE_WIDTH = 4.6;
export const VILLAGE_HEIGHT = 2.6;

interface VillageRow {
  /** View depth. Negative is further away, and the shader hazes it. */
  z: number;
  /** The ground line, in unit space. */
  base: number;
  /** Building height, in unit space. */
  h: number;
  /** How far out this row reaches, in unit space. See the note below. */
  reach: number;
  count: number;
}

/**
 * Three rows, far to near — the same device as the ridge layers, and for the
 * same reason: nearer buildings sit LOWER and overlap the ones behind, which
 * is the only thing that tells the eye a flat drawing has depth.
 *
 * ⚠️ EVERY ROW IS SIZED AGAINST THE FRUSTUM AT ITS OWN DEPTH, which is why
 * each carries a `reach` rather than all three running to the same edge. The
 * camera sees a cone, so a nearer plane shows LESS world: the half-height is
 * 261 at z=-40, 223 at z=60 and 188 at z=150. The first version of this
 * ignored that and put every row's ground line at the same world y, sized
 * against the 245 of the z=0 plane — so the front row's feet were 203 units
 * down a frame that only reached 188 there, and the nearest, largest houses
 * were sliced in half by the bottom edge. The same mistake in x made the
 * front row overshoot by a third of its width while the back row barely
 * reached the edges.
 */
export const VILLAGE_ROWS: VillageRow[] = [
  { z: -40, base: -0.78, h: 0.26, reach: 0.983, count: 13 },
  { z: 60, base: -0.94, h: 0.31, reach: 0.838, count: 9 },
  { z: 150, base: -1.02, h: 0.37, reach: 0.707, count: 6 },
];

/**
 * The share of the cloud that falls as snow above the rooftops.
 *
 * ⚠️ THIS IS COMPOSITION, NOT DECORATION. The village has to keep its mass in
 * the bottom third of the frame so the Band's card row stays readable over
 * it, which leaves the other two thirds completely empty — the only formation
 * on the page that uses a third of the screen. Scattering a tenth of the
 * particles into that space fills it at a density low enough to read as
 * weather rather than as a shape, and sparse enough not to fight the words
 * it sits behind.
 */
const VILLAGE_SNOW = 0.1;

/** Where the roof starts, as a fraction of a building's height. */
const EAVES = 0.6;

/**
 * A building's half-width at height `ly`, in units of its own height.
 *
 * The roof is WIDER than the walls where it meets them: that overhang is what
 * separates a house from a box with a triangle on it.
 */
export function buildingHalf(ly: number): number {
  if (ly <= EAVES) return 0.4;
  const f = (ly - EAVES) / (1 - EAVES);
  return 0.52 * (1 - f * 0.94);
}

export function buildVillage(
  count: number,
  scale: number,
  resortRange?: [number, number],
): Float32Array {
  const out = new Float32Array(count * 3);
  const rand = rng(770999);

  const Wx = scale * VILLAGE_WIDTH * 0.5;
  const Wy = scale * VILLAGE_HEIGHT * 0.5;

  // ── Lay the village out first, so the windows and the walls agree about
  //    where each house is.
  interface House {
    cx: number;
    base: number;
    h: number;
    w: number;
    z: number;
  }
  const houses: House[] = [];
  for (const row of VILLAGE_ROWS) {
    for (let k = 0; k < row.count; k++) {
      const t = (k + 0.5) / row.count;
      houses.push({
        cx: row.reach * (-1 + t * 2) + (rand() - 0.5) * (1.4 * row.reach / row.count),
        base: row.base + (rand() - 0.5) * 0.016,
        // Variation on purpose: at a fixed height the rows read as a chart
        // of house icons rather than a village. Not more than this, though —
        // at 0.72-1.34 the houses grew into each other and the front row
        // became one jumbled mass of overlapping outlines.
        h: row.h * (0.78 + rand() * 0.48),
        // A little variety in footprint, so it is a village and not a terrace.
        w: 0.86 + rand() * 0.34,
        z: row.z + (rand() - 0.5) * 12,
      });
    }
  }

  const put = (idx: number, x: number, y: number, z: number) => {
    out[idx * 3] = x;
    out[idx * 3 + 1] = y;
    out[idx * 3 + 2] = z;
  };
  /** Local (lx, ly) on a house, in units of its height, to world space. */
  const place = (idx: number, lx: number, ly: number, ho: House) => {
    const hw = ho.h * Wy;
    put(idx, ho.cx * Wx + lx * ho.w * hw, ho.base * Wy + ly * hw, ho.z);
  };

  let i = 0;
  const [rStart, rEnd] = resortRange ?? [-1, -1];
  const nResorts = Math.max(0, rEnd - rStart);

  // ── Windows. One house at a time, round and round, so every house is lit.
  for (let k = 0; k < nResorts; k++) {
    const ho = houses[k % houses.length];
    const side = (k >> 1) % 2 === 0 ? -1 : 1;
    const upper = k % 2 === 0;
    place(
      rStart + k,
      side * (0.13 + rand() * 0.1),
      upper ? 0.38 + rand() * 0.08 : 0.17 + rand() * 0.08,
      ho,
    );
  }

  const next = () => {
    while (i >= rStart && i < rEnd) i++;
    return i++;
  };

  // ⚠️ PARTICLES BY AREA, not a share per row. A front-row house covers more
  // than three times the screen of a back-row one, so an even split per row
  // leaves the near houses as a haze and the far ones solid — which is
  // backwards, and exactly the mistake the range made before it was fixed.
  const areas = houses.map((ho) => {
    const hw = ho.h * Wy;
    return 0.688 * ho.w * hw * hw;
  });
  const total = areas.reduce((a, b) => a + b, 0) || 1;
  const bulk = count - nResorts - Math.floor((count - nResorts) * VILLAGE_SNOW);

  // ── Snow over the rooftops, filling the frame the houses deliberately
  //    leave empty. Sampled across the full width and from the rooftops up.
  const nSnow = count - nResorts - bulk;
  const reach = Math.max(...VILLAGE_ROWS.map((r) => r.reach));
  for (let k = 0; k < nSnow && i < count; k++) {
    const at = next();
    if (at >= count) break;
    put(
      at,
      (rand() * 2 - 1) * reach * Wx * 1.04,
      // Up from just above the back row's rooftops to past the top of frame.
      (-0.42 + rand() * 1.5) * Wy,
      // Spread through depth so it falls in front of and behind the village.
      -120 + rand() * 300,
    );
  }

  for (let hIdx = 0; hIdx < houses.length; hIdx++) {
    const ho = houses[hIdx];
    const share = Math.round((areas[hIdx] / total) * bulk);
    for (let k = 0; k < share && i < count; k++) {
      const at = next();
      if (at >= count) break;
      // The chimney: small, and the one detail that says someone is in.
      if (rand() < 0.03) {
        place(at, 0.24 + (rand() - 0.5) * 0.09, 0.72 + rand() * 0.26, ho);
        continue;
      }
      let lx = 0;
      let ly = 0;
      if (rand() < 0.24) {
        // The silhouette: walls, eaves and roof line. Same reason as the
        // ridges' edge band — a uniformly filled box has a soft boundary.
        ly = rand();
        lx = (rand() < 0.5 ? -1 : 1) * buildingHalf(ly) * (0.94 + rand() * 0.06);
      } else {
        // Area-uniform by rejection against the profile.
        for (let t = 0; t < 10; t++) {
          ly = rand();
          lx = (rand() * 2 - 1) * 0.52;
          if (Math.abs(lx) <= buildingHalf(ly)) break;
        }
      }
      place(at, lx, ly, ho);
    }
  }
  // Rounding leftovers go on the nearest row's walls rather than at the
  // origin, where a leftover clump would read as a bug.
  while (i < count) {
    const at = next();
    if (at >= count) break;
    const ho = houses[at % houses.length];
    const ly = rand();
    place(at, (rand() * 2 - 1) * buildingHalf(ly), ly, ho);
  }
  return out;
}

export type Formation = "globe" | "signpost" | "mountains" | "snowflake" | "lift" | "village";

/**
 * How each formation has to be fitted to the screen and lit.
 *
 * ⚠️ THIS EXISTS BECAUSE THE FORMATIONS ARE NOT THE SAME SHAPE OR THE SAME
 * SIZE, and until there were six of them one branch on "is this the globe?"
 * was enough. It is not: the range wants to run off both edges of any screen,
 * the signpost must keep its arms inside them, the snowflake has to stay
 * round, and each spreads the same 16,636 particles over a different area and
 * so needs a different point size to read as solid.
 *
 *   fit        "wide"    scaled in x to overrun the frame, y by sqrt of that
 *              "contain" scaled to sit INSIDE the frame, never enlarged
 *              "uniform" both axes together, so a round shape stays round
 *              "none"    the globe, which is as wide as it is tall
 *   halfWidth  the shape's own half-width in world units at scale 150. The
 *              fit is computed against this, so a builder whose extent drifts
 *              from the number here is fitted to the wrong frame — which is
 *              silent, and is why a test asserts the two agree.
 *   sizeBoost  derived, not picked. Coverage goes as density x size², and the
 *              range's measured 5.2 particles per 8-world cell needs 2.6 to
 *              close up. Anything that concentrates its particles onto lines
 *              — the globe's coastlines, the flake's arms — is already dense
 *              and needs almost none.
 */
export type FormationFit = "none" | "wide" | "contain" | "uniform";

export interface FormationStyle {
  fit: FormationFit;
  halfWidth: number;
  sizeBoost: number;
}

export const FORMATION_STYLE: Record<Formation, FormationStyle> = {
  globe: { fit: "none", halfWidth: 150, sizeBoost: 1 },
  signpost: { fit: "contain", halfWidth: 280, sizeBoost: 1.5 },
  mountains: { fit: "wide", halfWidth: 150 * RANGE_WIDTH * 0.5, sizeBoost: 2.6 },
  snowflake: { fit: "uniform", halfWidth: 150 * FLAKE_RADIUS, sizeBoost: 1.15 },
  lift: { fit: "wide", halfWidth: 150 * LIFT_WIDTH * 0.5, sizeBoost: 2.6 },
  village: { fit: "wide", halfWidth: 150 * VILLAGE_WIDTH * 0.5 * 0.983, sizeBoost: 1.7 },
};

/** Builds every formation except the globe, which the particle field owns. */
export const FORMATION_BUILDERS: Record<
  Exclude<Formation, "globe">,
  (count: number, scale: number, resortRange?: [number, number]) => Float32Array
> = {
  signpost: buildSignpost,
  mountains: buildMountains,
  snowflake: buildSnowflake,
  lift: buildChairlift,
  village: buildVillage,
};

/**
 * Which formation the page is showing, and how far between it and the next.
 *
 * ⚠️ THE HOLDS MATTER AS MUCH AS THE CHANGES. A cloud that is always morphing
 * never lets you see what it has become, and the shapes are the point. Each
 * formation gets a stretch of page where it simply sits, and the transitions
 * happen between them.
 *
 * ⚠️ These stops are paired with the keyframes in `dispersionAt`
 * (lib/globe/particles.ts). Both are driven by the same scroll position, so a
 * shape held where dispersion peaks is a shape nobody ever sees. A test pins
 * them together; change them together.
 *
 * ⚠️ A HOLD MUST LAND ON A NARROW COLUMN, NOT ON A FULL-WIDTH SECTION, and
 * that is a constraint from the PAGE, not from this file. A formed shape is
 * opaque, bright and additive; beside a 400px column it has two thirds of
 * the screen to itself and the column's side scrim keeps the copy readable.
 * Behind a full-width row of cards it runs straight through the words, and
 * no amount of scrim fixes that without hiding the shape it exists to show.
 *
 * ⚠️ THE POSITIONS ARE MEASURED OFF THE LIVE PAGE, never estimated. Each
 * number below is where that section is actually centred in the viewport,
 * read out of the running document. An earlier draft held the lift at 0.74 —
 * dead on the Why section, the one dense full-width card row on the page —
 * and the cable ran through the middle card's body text. Re-measure after any
 * change to a section's height; `md:min-h-[150vh]` on the columns exists
 * partly to make these gaps wide enough to travel across.
 *
 * ⚠️ THE GLOBE LETS GO AT THE FIRST STATEMENT, NOT THE LAST, and it was
 * chosen by reading the three sentences against the curve rather than by
 * tidiness. They run "advertised in Facebook groups, on noticeboards, and by
 * word of mouth" (0.120) / "scattered across a hundred mountain towns"
 * (0.164) / "we gather them into one place" (0.209). Letting go at 0.120 puts
 * the cloud 42% apart AND OPENING under the word "scattered", and just past
 * its peak and CLOSING under "we gather" — the direction of travel matches
 * both. Holding on to the second statement instead, which was the first
 * draft, read "scattered" against a world that is perfectly whole and "we
 * gather" against one still flying apart: wrong on both.
 *
 * ⚠️ THE CLOSING HOLD IS AT 0.958, NOT 1.0, because that is where the CTA
 * section is actually centred. With the stop at the foot of the document the
 * globe was only 90% re-formed and the cloud still a fifth apart where the
 * ask is read, which is the one place on the page the world wants to be
 * whole. The 1.0 stop stays so the hold continues to the bottom.
 */
export const FORMATION_STOPS: { at: number; shape: Formation }[] = [
  { at: 0.0, shape: "globe" },
  { at: 0.095, shape: "globe" }, // hold: hero, the figures, the first statement
  { at: 0.292, shape: "signpost" }, // hold: "How It Works" — three arms, three steps
  { at: 0.414, shape: "mountains" }, // hold: "Discover Resorts"
  { at: 0.535, shape: "snowflake" }, // hold: "Platform Features"
  { at: 0.657, shape: "lift" }, // hold: "For Businesses"
  { at: 0.779, shape: "village" }, // hold: "Why Mountain Connects"
  { at: 0.958, shape: "globe" }, // the world again, for the closing ask
  { at: 1.0, shape: "globe" }, // …and whole all the way to the foot
];

/**
 * Half the stretch of page each formation is held PERFECTLY STILL — same
 * shape, settled cloud — on either side of its stop.
 *
 * ⚠️ WITHOUT THIS A HOLD IS AN INSTANT, NOT A PAUSE, and that is the single
 * thing that made the formations hard to make out. A stop is one point on the
 * page: the blend reaches its shape exactly there and is already leaving it a
 * pixel later. Worse, the render loop eases dispersion towards its target
 * rather than snapping, about 0.085 of the remaining gap per frame — roughly
 * a fifth of a second of lag — so at a normal scroll speed the cloud was
 * still a fifth dispersed AT the stop and never actually arrived. You were
 * never shown the shape; you were shown it approaching and departing.
 *
 * 0.025 either side is 0.05 of the page, about 565px, two thirds of a screen
 * at a normal viewport. That is long enough for the easing to settle inside
 * the band and leave the shape genuinely motionless for a stretch.
 *
 * ⚠️ IT IS PAID FOR OUT OF THE EXPLODE. The gap between two sections is about
 * 0.122 of the page and that is fixed — making the sections taller grows the
 * document by the same proportion, so the fraction barely moves (150vh
 * columns give 0.122; 250vh gives 0.149 for a page two thirds longer). Every
 * bit of hold comes out of the travel between holds, and a shorter ramp
 * cannot carry as much dispersion without outrunning the easing. That is why
 * PEAK in particles.ts came down from 0.78 to 0.52 in the same change. Raise
 * this number and that one has to fall.
 */
export const HOLD_HALF = 0.025;

/**
 * The authored stops expanded into hold BANDS — the list both curves read.
 *
 * Each stop becomes up to three points: the start of its band, the stop
 * itself, and the end. A side whose neighbour holds the SAME shape is left
 * alone, because the cloud is already being held across that gap and opening
 * the band there would only add a redundant point.
 */
export const FORMATION_BANDS: { at: number; shape: Formation }[] = (() => {
  const out: { at: number; shape: Formation }[] = [];
  for (let i = 0; i < FORMATION_STOPS.length; i++) {
    const s = FORMATION_STOPS[i];
    const prev = FORMATION_STOPS[i - 1];
    const next = FORMATION_STOPS[i + 1];
    const lo = prev && prev.shape === s.shape ? s.at : Math.max(0, s.at - HOLD_HALF);
    const hi = next && next.shape === s.shape ? s.at : Math.min(1, s.at + HOLD_HALF);
    if (lo < s.at) out.push({ at: lo, shape: s.shape });
    out.push({ at: s.at, shape: s.shape });
    if (hi > s.at) out.push({ at: hi, shape: s.shape });
  }
  return out;
})();

export function formationAt(progress: number): {
  from: Formation;
  to: Formation;
  blend: number;
} {
  const p = Math.min(1, Math.max(0, progress));
  const stops = FORMATION_BANDS;

  for (let i = 1; i < stops.length; i++) {
    if (p <= stops[i].at) {
      const a = stops[i - 1];
      const b = stops[i];
      const raw = (p - a.at) / (b.at - a.at);
      // Ease so a shape settles rather than snapping into place.
      const blend = raw * raw * (3 - 2 * raw);
      return { from: a.shape, to: b.shape, blend };
    }
  }
  return { from: "globe", to: "globe", blend: 0 };
}
