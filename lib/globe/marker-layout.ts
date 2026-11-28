/**
 * How the explore globe lays out a country's resorts: how big a dot is, how
 * far off the sphere it floats, and where its label is allowed to sit.
 *
 * ⚠️ THIS IS HERE SO IT CAN BE TESTED. All of it used to be literals inside
 * components/globe/Globe.tsx, where it sat next to a live WebGL context and a
 * three.js scene — so the only way to check any of it was to look at the
 * screen, and two of the three things in this file were wrong for exactly
 * that reason. The numbers are small; the couplings between them are what
 * matters, and a coupling nobody can assert is one that quietly comes apart.
 */

/**
 * Where the selected country's filled outline and its neighbours' borders
 * sit, in globe radii. Globe.tsx's `polygonAltitude` reads these.
 */
export const COUNTRY_FILL_ALTITUDE = 0.012;
export const COUNTRY_OUTLINE_ALTITUDE = 0.009;

/**
 * How far off the sphere a resort dot floats.
 *
 * ⚠️ IT HAS TO CLEAR THE COUNTRY'S OWN FILL. The 3D pins this replaces were
 * three units tall, so they poked through whatever was under them and nobody
 * had to think about it; a disc lying flat at the pins' old 0.01 is BENEATH
 * the selected country's polygon and vanishes completely the moment you
 * select the country it belongs to — which is the only time it is ever drawn.
 * Pinned against COUNTRY_FILL_ALTITUDE by a test rather than derived from it,
 * so raising the fill fails loudly instead of silently dragging this along.
 */
export const DOT_ALTITUDE = 0.02;

/**
 * How big a resort dot is, in CSS pixels of radius, whatever the zoom.
 *
 * 5px is the flat country map's own dot — r=4.5 plus its 1.2px stroke —
 * because that map's presentation is the one being reproduced here.
 */
export const DOT_RADIUS_PX = 5;

/** The dark rim around a dot, as a multiple of its radius. */
export const DOT_RIM = 1.34;

/**
 * How far a label has to have moved before its leader line is worth drawing.
 *
 * A pill is about 19px tall and 70px wide and the line runs to its centre, so
 * anything shorter than this is entirely underneath the pill — drawing it
 * would only put a stub out of one end.
 */
export const LEADER_MIN_PX = 14;

export interface DotSizeInput {
  /** Distance from the camera to the globe's centre, in world units. */
  cameraDistance: number;
  /** The globe's own radius, from getGlobeRadius(). */
  globeRadius: number;
  /** The camera's vertical field of view, in degrees. */
  fovDeg: number;
  /** The canvas height in CSS pixels. */
  canvasHeight: number;
  /** How many CSS pixels of radius the dot should read as. */
  radiusPx?: number;
}

/**
 * The world radius a resort dot needs in order to read as `radiusPx` pixels.
 *
 * ⚠️ A MARKER IS SIZED IN PIXELS, NOT IN GLOBE RADII, AND THAT IS THE WHOLE
 * POINT. The pins this replaces were a fraction of the globe's radius scaled
 * by a camera-distance ratio that only ever halved them — so framed on a
 * whole country, nineteen Japanese pins merged into a single amber mass the
 * length of Honshu and hid the country underneath. A thing you point at wants
 * to be the same size on screen at every altitude, which means its world size
 * has to GROW with distance rather than resist it.
 *
 * At a vertical field of view f and a canvas h pixels tall, one CSS pixel
 * spans 2*d*tan(f/2)/h world units at depth d. Depth is taken at the near
 * surface of the globe, which is where a country being looked at sits; the
 * floor keeps the result finite if the camera is ever driven inside the
 * sphere.
 */
export function dotWorldRadius(o: DotSizeInput): number {
  const halfFov = (o.fovDeg * Math.PI) / 360;
  const depth = Math.max(o.cameraDistance - o.globeRadius, o.globeRadius * 0.1);
  const unitsPerPx = (2 * depth * Math.tan(halfFov)) / o.canvasHeight;
  return (o.radiusPx ?? DOT_RADIUS_PX) * unitsPerPx;
}

/**
 * The offsets a label may try, nearest first, when its natural spot is taken.
 *
 * ⚠️ TWO DIMENSIONS, BECAUSE ONE WAS NOT ENOUGH, AND THIS IS MEASURED RATHER
 * THAN GUESSED. Stacking vertically was all the old pass could do, and with
 * nineteen Japanese resorts selected it produced a single column of pills
 * down the middle of the country — with Hokkaido's names and Honshu's
 * interleaved at the same height, and four resorts that found no slot at all
 * and were hidden outright. Letting a label try either side as well seats
 * every one of the nineteen; Italy goes 16 of 17 to 17, and Canada 15 of 24
 * to 23.
 *
 * ⚠️ SORTED BY DISTANCE, WITH SIDEWAYS DISCOUNTED. The weight on dx is below
 * 1 on purpose, so a label prefers a slot beside its dot to one stacked
 * several deep above it. A pill one column east is still pointing at its own
 * mountain; a pill four rows up is pointing at somebody else's.
 *
 * ⚠️ `sideways` IS NOT A TUNING KNOB — IT IS TIED TO THE LEADER LINE. The
 * resort pills draw one; the country pills at world view do not, and a
 * country name that has quietly slid 90px east is a worse lie than one
 * stacked directly above its own dot. So the world view keeps exactly the
 * column-of-pills behaviour it has always had.
 */
export const SIDEWAYS_COLUMNS = 2;
export const STACK_ROWS = 5;
/** How much less a sideways step counts than a vertical one, when sorting. */
const SIDEWAYS_WEIGHT = 0.45;

export function labelSlots(
  stepX: number,
  stepY: number,
  sideways: boolean,
): [number, number][] {
  const cols: number[] = [0];
  if (sideways) {
    for (let k = 1; k <= SIDEWAYS_COLUMNS; k++) cols.push(k, -k);
  }
  const slots: [number, number][] = [];
  for (const kx of cols) {
    for (let ky = -STACK_ROWS; ky <= STACK_ROWS; ky++) {
      slots.push([kx * stepX, ky * stepY]);
    }
  }
  return slots.sort(
    (a, b) =>
      a[0] * a[0] * SIDEWAYS_WEIGHT +
      a[1] * a[1] -
      (b[0] * b[0] * SIDEWAYS_WEIGHT + b[1] * b[1]),
  );
}
