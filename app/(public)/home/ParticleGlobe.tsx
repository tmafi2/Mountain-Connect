"use client";

import { useEffect, useRef, useState } from "react";
import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  PerspectiveCamera,
  Points,
  Scene,
  ShaderMaterial,
  WebGLRenderer,
} from "three";
import { resorts } from "@/lib/data/resorts";
import { buildParticleField, dispersionAt, type ParticleField } from "@/lib/globe/particles";
import {
  FORMATION_BUILDERS,
  FORMATION_STYLE,
  formationAt,
  type Formation,
  type FormationStyle,
} from "@/lib/globe/shapes";

/**
 * The homepage's one continuous visual: a globe of particles that comes
 * apart and puts itself back together as you read down the page.
 *
 * ⚠️ FIXED, FULL-VIEWPORT, BEHIND EVERYTHING. It is not a hero element that
 * scrolls away — the whole point is that one object carries the entire page,
 * so it sits still and the content moves over it. That is what separates
 * this from a section with an animation in it.
 *
 * ⚠️ IT OWNS NO TEXT AND NO LINKS. Everything readable stays in ordinary
 * markup above it, so the page still works for a crawler, a screen reader,
 * and anyone whose device cannot give us a WebGL context. If this component
 * renders nothing at all, the homepage is merely less pretty.
 */

const LAND: [number, number, number] = [0.45, 0.76, 0.98];
const RESORT: [number, number, number] = [1.0, 0.72, 0.25];
const DRIFT: [number, number, number] = [0.42, 0.6, 0.78];

/** Round sprites with a soft edge, cheaper and sharper than a texture. */
const VERTEX = `
  attribute float size;
  attribute vec3 particleColor;
  varying vec3 vColor;
  varying float vAlpha;
  uniform float uScale;
  uniform float uSizeBoost;
  void main() {
    vColor = particleColor;
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    // ⚠️ THESE RANGES ARE TIED TO THE CAMERA AND THE RADIUS. With the camera
    // at z=420 and a radius-150 globe, mv.z runs roughly -270 (near face) to
    // -570 (far face). An earlier version faded over (-180, 40), which is
    // entirely outside that range, so smoothstep returned 0 for every
    // particle and the whole cloud rendered perfectly transparently — no
    // error, no warning, just nothing on screen. If the camera or radius
    // move, these move with them.
    vAlpha = 0.15 + 0.85 * smoothstep(-800.0, -490.0, mv.z);
    // Likewise: 300/|z| came out around one device pixel, which is invisible
    // on a retina canvas even at full opacity.
    //
    // ⚠️ uSizeBoost exists because the formations are not the same SIZE. The
    // globe packs every particle onto a 300-wide sphere; the mountain range
    // is 660 across and the lift 540, so the identical cloud covers roughly
    // four times the area and reads as a thin scatter rather than a solid
    // form. Nothing is added — the points are simply drawn larger where they
    // are spread thinner, which is the only lever that does not cost a
    // particle.
    gl_PointSize = size * uScale * uSizeBoost * (2400.0 / -mv.z);
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

export default function ParticleGlobe() {
  const hostRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    // No WebGL, or the user asked for less motion: render nothing and let the
    // page be a page.
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    let renderer: WebGLRenderer;
    try {
      renderer = new WebGLRenderer({ alpha: true, antialias: false, powerPreference: "low-power" });
    } catch {
      return;
    }

    let disposed = false;
    let field: ParticleField | null = null;
    let frame = 0;

    const scene = new Scene();
    const camera = new PerspectiveCamera(42, 1, 1, 4000);
    camera.position.set(0, 0, 640);

    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
    renderer.setClearColor(0x000000, 0);
    host.appendChild(renderer.domElement);
    renderer.domElement.style.cssText = "width:100%;height:100%;display:block;";

    const material = new ShaderMaterial({
      uniforms: { uScale: { value: 1 }, uSizeBoost: { value: 1 } },
      vertexShader: VERTEX,
      fragmentShader: FRAGMENT,
      transparent: true,
      depthWrite: false,
      blending: AdditiveBlending,
    });

    let points: Points | null = null;
    let positions: Float32Array | null = null;
    let shapes: Record<Formation, Float32Array> | null = null;
    /** Which formation the cloud is between, and how far. */
    let cur: { from: Formation; to: Formation; blend: number } = {
      from: "globe",
      to: "globe",
      blend: 0,
    };
    /** How far right the cloud sits to clear the hero headline. */
    let wideOffset = 0;
    /** Per-formation [x, y] scale for this viewport. See `resize`. */
    let fits: Record<Formation, [number, number]> = {
      globe: [1, 1],
      signpost: [1, 1],
      mountains: [1, 1],
      snowflake: [1, 1],
      lift: [1, 1],
      village: [1, 1],
    };

    /**
     * ⚠️ EVERY FORMATION IS A DIFFERENT SIZE AND A DIFFERENT SHAPE, so each
     * is fitted to the viewport on its own terms. The vertical field of view
     * is fixed, so the camera always sees 491 world units of height — but the
     * visible WIDTH follows the aspect ratio, from 602 on a 1123px desktop
     * down to 227 on a 375px phone. Left alone, a phone shows the middle
     * third of the 660-wide mountain range: a field of dots with no skyline
     * in it, which is not a mountain.
     *
     *   wide     the range, the lift, the village — landscape that should
     *            overrun both edges, so it is scaled to 1.15x what is
     *            visible. Height takes the SQUARE ROOT of that squeeze: x
     *            alone left a phone's peaks two and a half times steeper
     *            than drawn, and none of it shrank the range to a model of
     *            itself on a tall screen.
     *   contain  the signpost, whose long arm has to land ON the edge of the
     *            frame rather than past it. Never enlarged past 1.
     *   uniform  the snowflake. Both axes together or it is an ellipse, and a
     *            squeezed six-fold crystal loses two of its arms off-screen.
     *   none     the globe, as wide as it is tall, which fits anything.
     */
    const fitFor = (style: FormationStyle, visibleHalf: number): [number, number] => {
      if (style.fit === "none") return [1, 1];
      if (style.fit === "uniform") {
        const f = Math.min(1, (visibleHalf * 0.94) / style.halfWidth);
        return [f, f];
      }
      const over = style.fit === "wide" ? 1.15 : 0.94;
      const f = Math.min(style.fit === "wide" ? 1.8 : 1, (visibleHalf * over) / style.halfWidth);
      return [f, Math.sqrt(f)];
    };

    const resize = () => {
      const w = host.clientWidth;
      const h = host.clientHeight;
      if (!w || !h) return;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      // ⚠️ Off-centre on wide screens, centred on narrow ones. The headline
      // sits on the left, and a globe centred in the viewport puts its
      // densest, brightest part directly behind the words — which is why the
      // first version needed a scrim heavy enough to hide half the globe to
      // stay readable. Moving the object is better than hiding it.
      wideOffset = w > 900 ? 95 : 0;
      // Keep the globe a sensible share of the viewport on any screen.
      material.uniforms.uScale.value = Math.min(1.6, Math.max(0.7, w / 1400));

      const visibleHalf = 640 * Math.tan((42 * Math.PI) / 180 / 2) * (w / h);
      fits = Object.fromEntries(
        (Object.keys(FORMATION_STYLE) as Formation[]).map((k) => [
          k,
          fitFor(FORMATION_STYLE[k], visibleHalf),
        ]),
      ) as Record<Formation, [number, number]>;
    };

    /** 0 at the top of the document, 1 at the bottom. */
    let targetDispersion = 0;
    let dispersion = 0;
    let targetTiltX = 0;
    let targetTiltY = 0;
    let tiltX = 0;
    let tiltY = 0;
    let spin = 0;

    const onScroll = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const p = max > 0 ? window.scrollY / max : 0;
      targetDispersion = dispersionAt(p);
      cur = formationAt(p);
    };
    const onPointer = (e: PointerEvent) => {
      targetTiltY = (e.clientX / window.innerWidth - 0.5) * 0.5;
      targetTiltX = (e.clientY / window.innerHeight - 0.5) * 0.35;
    };

    let running = true;
    const observer = new IntersectionObserver(([entry]) => {
      running = entry.isIntersecting;
    });
    observer.observe(host);

    const tick = () => {
      frame = requestAnimationFrame(tick);
      if (!running || !points || !positions || !field) return;

      // Ease towards the targets rather than snapping, so a flick of the
      // wheel reads as momentum instead of a jump cut.
      // ⚠️ 0.11, RAISED FROM 0.085. This is a low-pass on the scroll: it is
      // what makes a flick of the wheel read as momentum rather than a jump
      // cut, and it is also what stops the cloud ever ARRIVING. At 0.085 the
      // time constant is about twelve frames, a fifth of a second, and at a
      // normal scroll speed that left the cloud still a fifth dispersed at
      // the moment it was supposed to be holding a shape. The hold bands in
      // shapes.ts give it room to settle; this gives it the speed to use
      // that room. Much higher and the momentum goes.
      dispersion += (targetDispersion - dispersion) * 0.11;
      tiltX += (targetTiltX - tiltX) * 0.05;
      tiltY += (targetTiltY - tiltY) * 0.05;
      // ⚠️ The tumble grows with dispersion. A scattered cloud rotating at
      // exactly the same rate as the formed globe looks frozen, because there
      // is no longer a silhouette whose edge gives the motion away.
      spin += 0.0007 + dispersion * 0.0016;

      // ⚠️ SHAPE FIRST, THEN DISPERSION. The cloud blends between two
      // formations, and only then flies apart from wherever that put it.
      // Doing it the other way round — dispersing the globe and then morphing
      // — means the scattered cloud snaps as the target shape changes
      // underneath it, because the thing it is scattering FROM moved.
      const { scattered, count } = field;
      const blend = cur.blend;
      const from = shapes ? shapes[cur.from] : field.home;
      const to = shapes ? shapes[cur.to] : field.home;
      for (let i = 0; i < count * 3; i++) {
        const shaped = from[i] + (to[i] - from[i]) * blend;
        positions[i] = shaped + (scattered[i] - shaped) * dispersion;
      }
      (points.geometry.getAttribute("position") as BufferAttribute).needsUpdate = true;

      // ⚠️ ONLY THE GLOBE IS OFFSET. The shift exists to keep the sphere out
      // from behind the hero headline; applied to the mountains it pushes the
      // range off the right of the screen.
      const globeness = (cur.from === "globe" ? 1 - blend : 0) + (cur.to === "globe" ? blend : 0);
      points.position.x = wideOffset * globeness;

      // ⚠️ EVERY VISUAL PROPERTY IS INTERPOLATED BETWEEN THE TWO FORMATIONS,
      // not switched at the halfway mark. The cloud is a blend of two shapes
      // for most of the page, so its point size and its fit have to be the
      // same blend — snapping either at blend 0.5 is a visible flinch in the
      // middle of every transition, on a page that is mostly transitions.
      const sa = FORMATION_STYLE[cur.from];
      const sb = FORMATION_STYLE[cur.to];
      material.uniforms.uSizeBoost.value =
        sa.sizeBoost + (sb.sizeBoost - sa.sizeBoost) * blend;
      const fa = fits[cur.from];
      const fb = fits[cur.to];
      points.scale.x = fa[0] + (fb[0] - fa[0]) * blend;
      points.scale.y = fa[1] + (fb[1] - fa[1]) * blend;

      // ⚠️ THE SPIN IS MULTIPLIED BY globeness, NOT DAMPED BY IT, and that
      // distinction was a real bug for as long as this file has existed.
      // `spin` ACCUMULATES — it is an angle that grows for as long as the tab
      // is open, by about 0.066 radians a second. The previous line scaled it
      // by `0.15 + 0.85 * globeness`, which reads as "flat formations barely
      // rotate" and is not what it does: 15% of an unbounded number is still
      // unbounded. A flat silhouette was turning 17° after half a minute, 68°
      // after two, and facing away by five — so the mountains, the lift and
      // the signpost were progressively foreshortened into illegibility the
      // longer somebody stayed on the page, and were perfectly fine on a
      // reload. Nothing errors and nothing in a short test shows it; the
      // browser pane throttles this loop to 1Hz when it is hidden, which hid
      // it completely here.
      //
      // A spinning globe is the point; a spinning silhouette is a shape being
      // turned edge-on. So the accumulated angle belongs to the globe alone,
      // and a flat formation answers only the pointer, which is bounded.
      points.rotation.y = spin * globeness + tiltY * (0.15 + 0.85 * globeness);
      points.rotation.x = tiltX + dispersion * 0.22 * globeness;
      renderer.render(scene, camera);
    };

    fetch("/globe/countries.geojson")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        const features = (data as { features?: object[] } | null)?.features;
        if (disposed || !Array.isArray(features)) return;

        field = buildParticleField(features, resorts, {
          radius: 150,
          stepDeg: 0.45,
          driftCount: 700,
          landColor: LAND,
          resortColor: RESORT,
          driftColor: DRIFT,
        });

        // The other formations, in the same particle order as the globe so
        // one melts into the next. See lib/globe/shapes.ts.
        //
        // ⚠️ BUILT FROM THE BUILDERS RECORD, not called one by one. Adding a
        // formation means adding a stop in FORMATION_STOPS, a style in
        // FORMATION_STYLE and a builder — and the one that is easy to forget
        // is this call site, where a missing entry is `undefined` in a
        // Float32Array lookup and the whole cloud collapses to the origin.
        // Keying off the record makes that a type error instead.
        //
        // The resort index range is handed to every builder so the amber
        // points land somewhere deliberate — on the skyline, along a cable,
        // in a window — rather than clumping wherever the cursor was.
        shapes = { globe: field.home } as Record<Formation, Float32Array>;
        for (const [name, build] of Object.entries(FORMATION_BUILDERS)) {
          shapes[name as Formation] = build(field.count, 150, field.resortRange);
        }
        positions = new Float32Array(field.home);
        const geometry = new BufferGeometry();
        geometry.setAttribute("position", new BufferAttribute(positions, 3));
        geometry.setAttribute("particleColor", new BufferAttribute(field.colors, 3));
        geometry.setAttribute("size", new BufferAttribute(field.sizes, 1));
        points = new Points(geometry, material);
        scene.add(points);

        resize();
        onScroll();
        setVisible(true);
      })
      .catch(() => {});

    resize();
    window.addEventListener("resize", resize);
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("pointermove", onPointer, { passive: true });
    frame = requestAnimationFrame(tick);

    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener("resize", resize);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("pointermove", onPointer);
      points?.geometry.dispose();
      material.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, []);

  return (
    <div
      ref={hostRef}
      aria-hidden
      /* bg-primary is load-bearing: the page's own background is light, and a
         transparent canvas in front of it shows nothing. This paints the dark
         ground the particles live on. */
      className={`pointer-events-none fixed inset-0 -z-10 bg-primary transition-opacity duration-[1600ms] ${
        visible ? "opacity-100" : "opacity-0"
      }`}
    />
  );
}
