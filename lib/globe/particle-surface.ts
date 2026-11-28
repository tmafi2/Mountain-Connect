/**
 * The particle Earth, drawn as a layer inside the EXPLORE globe.
 *
 * ⚠️ THIS IS THE RENDER, NOT THE GEOMETRY. Where the world is comes from
 * `buildParticleField` in ./particles.ts, which the homepage backdrop also
 * uses — so the two can never disagree about the shape of a coastline. What
 * lives here is only how those points are drawn inside a tool you fly around,
 * and that is genuinely different from how they are drawn behind a page you
 * scroll:
 *
 *   the backdrop   has a fixed camera, so it fades particles by raw view
 *                  depth against hardcoded ranges and boosts their size to
 *                  keep a spread-out formation solid.
 *   this           has a camera that orbits and zooms between 128 and 600
 *                  units out, so neither of those survives. It fades by
 *                  WHICH SIDE OF THE GLOBE a particle is on, which is
 *                  scale-free, and clamps point size so flying in close does
 *                  not turn the coastlines into saucers.
 *
 * Keeping them apart is the point. A change to the scrollmation's look must
 * not quietly restyle a tool, and vice versa.
 */
import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  Points,
  ShaderMaterial,
} from "three";
import { resorts } from "../data/resorts";
import { buildParticleField } from "./particles";

/**
 * ⚠️ THE TWO LIBRARIES PUT LONGITUDE IN DIFFERENT PLACES, and nothing would
 * tell you. `toSphere` in ./particles.ts uses theta = lng + 180; three-globe's
 * `polar2Cartesian` uses theta = 90 - lng. Worked through, the difference is
 * exactly a quarter turn about Y with the SAME handedness — so without this
 * rotation the continents are not mirrored or distorted, they are simply
 * turned 90°, and every resort marker sits in the wrong ocean while the globe
 * still looks like a perfectly good Earth.
 *
 * Pinned by a test that evaluates both formulae and compares them, so a
 * change to either convention fails rather than silently relocating Japan.
 */
export const THREE_GLOBE_Y_ROTATION = -Math.PI / 2;

/**
 * How far proud of the sphere the particles sit, as a multiple of the radius.
 *
 * The globe keeps its solid sphere underneath — that is what hides the far
 * side, since an additive point cloud has no back face of its own. Particles
 * sitting exactly ON the sphere z-fight with it and flicker as the camera
 * moves; a few thousandths out is enough and is invisible at any zoom.
 */
const PROUD = 1.004;

export interface ParticleSurfaceOptions {
  /** The globe's radius, from `getGlobeRadius()`. Never assume 100. */
  radius: number;
  /**
   * Degrees of arc between coastline particles.
   *
   * ⚠️ 0.41 IS NOT A GUESS, IT IS THE HOMEPAGE'S SPACING RESCALED. What makes
   * that globe read as particles rather than as a drawn wireframe is one
   * ratio: its dots are 2.25 CSS pixels across and sit 2.87 apart, so
   * dot/gap is 0.78 — the dots are SMALLER than the space between them and
   * the eye resolves each one. The first version of this surface had that
   * ratio at 4.00: dots four times the spacing, overlapping four deep, which
   * is exactly why the coastlines came out as solid lines.
   *
   * ⚠️ AND THE RATIO IS CONSTANT AT EVERY ZOOM, which is the part worth
   * knowing. Point size goes as 1/(distance - radius) because the projection
   * is perspective, and so does the on-screen spacing between two fixed
   * points — so once dot/gap is right at one camera distance it is right at
   * all of them, with no level-of-detail machinery. That only holds while
   * the size clamps stay out of the way, which is why uMaxSize below is set
   * where it cannot normally bite rather than at something tidy.
   */
  stepDeg?: number;
  land?: [number, number, number];
  /** Device pixel ratio, so point sizes end up in CSS pixels. */
  pixelRatio?: number;
}

const VERTEX = `
  attribute float size;
  attribute vec3 particleColor;
  varying vec3 vColor;
  varying float vAlpha;
  uniform float uScale;
  uniform float uSpread;
  uniform float uMinSize;
  uniform float uMaxSize;
  void main() {
    vColor = particleColor;
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    // ⚠️ FADED BY WHICH SIDE OF THE GLOBE IT IS ON, not by view depth. The
    // backdrop's shader hardcodes a depth range against a camera that never
    // moves; this camera travels between 128 and 600 units out, so any fixed
    // range would black the world out at one end of the zoom and flatten it
    // at the other. The globe is centred on the origin and the camera orbits
    // it, so the dot of a particle's own outward normal with the camera
    // direction is the honest test, and it is scale-free. The same quantity
    // the mountain pins already use to decide whether they are facing you.
    vec3 wp = (modelMatrix * vec4(position, 1.0)).xyz;
    float side = dot(normalize(wp), normalize(cameraPosition));
    // The far side keeps a little light rather than none: the solid sphere
    // behind these already hides it, and a hard zero reads as a hole if the
    // sphere is ever turned off.
    vAlpha = 0.08 + 0.92 * smoothstep(-0.05, 0.45, side);
    // Perspective-correct, then clamped at both ends: a point has to stay
    // visible when the whole world is 300px across and must not become a
    // saucer when the camera is 28 units off the surface.
    gl_PointSize = clamp(size * uScale * (uSpread / -mv.z), uMinSize, uMaxSize);
    gl_Position = projectionMatrix * mv;
  }
`;

const FRAGMENT = `
  varying vec3 vColor;
  varying float vAlpha;
  void main() {
    vec2 d = gl_PointCoord - vec2(0.5);
    float r = dot(d, d);
    if (r > 0.25) discard;
    float edge = smoothstep(0.25, 0.04, r);
    gl_FragColor = vec4(vColor, edge * vAlpha);
  }
`;

export interface ParticleSurface {
  points: Points;
  count: number;
  /**
   * Light one country's coastline, by its index in the features array, or
   * pass null to put it out.
   *
   * ⚠️ IT RECOLOURS THE DOTS THAT ARE ALREADY THERE rather than drawing
   * anything new. The coastline is the thing that says where a country is —
   * turning its own points amber answers "which one is Canada?" with the
   * marks the globe is already made of, so nothing moves, nothing is added
   * to the scene, and there is no second outline to keep registered with the
   * first. Drawing a polygon stroke instead would mean a shape with a
   * different generalisation sitting a hair above the dots, visibly not
   * following them.
   */
  highlight(featureIndex: number | null): void;
  dispose(): void;
}

/**
 * The colour a hovered country's coastline turns.
 *
 * ⚠️ NOT THE RESORT DOTS' AMBER, AND DELIBERATELY DIMMER THAN IT. The resort
 * points are [1.0, 0.72, 0.25] and are the one thing on this globe that
 * means something specific; a coastline at the same value swallows them, so
 * a hovered Canada would light up and lose its own resorts in the glow.
 */
const HIGHLIGHT_COLOR: [number, number, number] = [0.98, 0.62, 0.16];

/**
 * Build the point cloud to drop into three-globe's scene.
 *
 * The caller adds `points` to `globe.scene()` and removes it on unmount. It
 * needs no per-frame update: the fade reads three.js's own `cameraPosition`
 * uniform, which the renderer keeps current, and the size is perspective.
 */
export function createParticleSurface(
  features: object[],
  opts: ParticleSurfaceOptions,
): ParticleSurface {
  const { radius, stepDeg = 0.41, pixelRatio = 1 } = opts;

  // ⚠️ THE SAME MIX AS THE HOMEPAGE, including the amber resort points and
  // the drifting specks around the globe — "the little dots and what not" is
  // the whole brief, and leaving either out is what made the first version
  // read as a wireframe rather than as that globe. 700 drift against ~16,500
  // land is the homepage's own 4.4%, so the halo is as thick here as there.
  //
  // ⚠️ THE AMBER POINTS ARE NOT CLICKABLE, AND THE REAL MARKERS ARE. This
  // layer is out of the raycaster entirely; what you click is the cone or
  // the cluster label three-globe draws at the same coordinates. They line
  // up because both come from `resorts`, so an amber point sits under its
  // own marker rather than beside it — but if they ever read as something
  // you ought to be able to click, pass [] here and they are gone.
  const field = buildParticleField(features, resorts, {
    radius: radius * PROUD,
    stepDeg,
    driftCount: 700,
    // Matched to ParticleGlobe.tsx exactly. Two globes that are meant to be
    // the same object must not be two different blues.
    landColor: opts.land ?? [0.45, 0.76, 0.98],
    resortColor: [1.0, 0.72, 0.25],
    driftColor: [0.42, 0.6, 0.78],
  });

  const geometry = new BufferGeometry();
  // `home` is the whole-globe formation; the scattered copy is never used
  // here, so it is left to be garbage collected rather than uploaded.
  geometry.setAttribute("position", new BufferAttribute(field.home, 3));
  geometry.setAttribute("particleColor", new BufferAttribute(field.colors, 3));
  geometry.setAttribute("size", new BufferAttribute(field.sizes, 1));

  const material = new ShaderMaterial({
    uniforms: {
      uScale: { value: pixelRatio },
      // ⚠️ 3.8, DOWN FROM 7.2, AND IT IS MEASURED AGAINST THE HOMEPAGE. A dot
      // there covers 0.39% of the globe's diameter on screen; at 7.2 these
      // covered 0.74%, nearly twice as much, which on its own turns a field
      // of specks into a chain of blobs. 3.8 puts a dot at 1.90 CSS pixels
      // at the opening altitude, against the homepage's 2.25 on a globe that
      // is correspondingly larger.
      uSpread: { value: radius * 3.8 },
      uMinSize: { value: 0.8 * pixelRatio },
      // ⚠️ DELIBERATELY OUT OF REACH. A clamp here breaks the constant
      // dot/gap ratio the moment it bites: the spacing keeps growing as you
      // fly in while the dot stops, and the coastline falls apart into
      // beads. The only job left for this is to stop a degenerate camera
      // position asking for a 400-pixel sprite.
      uMaxSize: { value: 16.0 * pixelRatio },
    },
    vertexShader: VERTEX,
    fragmentShader: FRAGMENT,
    transparent: true,
    // ⚠️ depthWrite off, depthTest ON. The sphere underneath is opaque and
    // renders first, so the depth test is what hides the far side of the
    // world. Turning the test off — which an additive cloud often wants —
    // would show every coastline through the planet.
    depthWrite: false,
    blending: AdditiveBlending,
  });

  const colorAttr = geometry.getAttribute("particleColor") as BufferAttribute;
  const baseLand = opts.land ?? [0.45, 0.76, 0.98];
  let lit: number | null = null;

  const paint = (index: number, color: [number, number, number]) => {
    const range = field.landRanges[index];
    if (!range) return;
    for (let i = range.start; i < range.end; i++) {
      colorAttr.array[i * 3] = color[0];
      colorAttr.array[i * 3 + 1] = color[1];
      colorAttr.array[i * 3 + 2] = color[2];
    }
  };

  const points = new Points(geometry, material);
  points.rotation.y = THREE_GLOBE_Y_ROTATION;
  // The markers and labels three-globe draws are not in this layer, and this
  // layer is never picked, so keep it out of the raycaster entirely.
  points.raycast = () => {};
  points.renderOrder = -1;

  return {
    points,
    count: field.count,
    highlight(featureIndex: number | null) {
      if (featureIndex === lit) return;
      // Put the last one out before lighting the next, so a fast drag across
      // several countries cannot leave a trail of lit coastlines behind it.
      if (lit !== null) paint(lit, baseLand);
      if (featureIndex !== null) paint(featureIndex, HIGHLIGHT_COLOR);
      lit = featureIndex;
      // ⚠️ One upload of the whole colour buffer, which is about 215KB and
      // happens only when the country under the pointer CHANGES — a few
      // times a second at worst, not per frame. Tracking sub-ranges would
      // save an upload nobody can perceive and cost a correctness problem
      // when two ranges overlap a frame apart.
      colorAttr.needsUpdate = true;
    },
    dispose() {
      geometry.dispose();
      material.dispose();
    },
  };
}
