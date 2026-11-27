"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { countryMapShapes } from "@/lib/globe/country-map";

interface ResortPoint {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
}

interface CountryMapProps {
  country: string;
  features: object[];
  nameOf: (feature: object) => string;
  resorts: ResortPoint[];
  width: number;
  height: number;
  /** Space the country panel occupies on the left. */
  insetLeft: number;
}

interface PlacedLabel {
  id: string;
  name: string;
  /** The resort's own point. */
  px: number;
  py: number;
  /** Where the label box sits. */
  lx: number;
  ly: number;
  anchor: "start" | "end";
}

const CHAR_W = 6.1;
const LABEL_H = 17;
const GAP = 9;

/**
 * Place a label beside every resort without any two overlapping.
 *
 * ⚠️ ON A FLAT MAP THERE IS ROOM TO DO THIS PROPERLY. On the globe the only
 * freedom was to stack labels vertically, so in a tight range they drifted
 * away from their own mountain or were hidden outright. Here each label can
 * try either side of its point and a few heights, which is usually enough to
 * seat every resort in the country next to where it actually is — and a
 * leader line keeps the association explicit when it has to shift.
 */
function placeLabels(
  points: { id: string; name: string; x: number; y: number }[],
  width: number,
  height: number,
  minX: number,
): PlacedLabel[] {
  // North to south, so the layout is stable and reads in a sensible order.
  const ordered = [...points].sort((a, b) => a.y - b.y);
  const taken: { l: number; r: number; t: number; b: number }[] = [];
  const placed: PlacedLabel[] = [];

  for (const p of ordered) {
    const w = p.name.length * CHAR_W + 16;
    let best: PlacedLabel | null = null;

    outer: for (const dy of [0, -LABEL_H - 3, LABEL_H + 3, -(LABEL_H + 3) * 2, (LABEL_H + 3) * 2, -(LABEL_H + 3) * 3, (LABEL_H + 3) * 3]) {
      for (const side of ["start", "end"] as const) {
        const lx = side === "start" ? p.x + GAP : p.x - GAP - w;
        const ly = p.y + dy - LABEL_H / 2;
        if (lx < minX + 4 || lx + w > width - 2 || ly < 2 || ly + LABEL_H > height - 2) continue;
        const box = { l: lx - 2, r: lx + w + 2, t: ly - 2, b: ly + LABEL_H + 2 };
        if (taken.some((q) => box.l < q.r && box.r > q.l && box.t < q.b && box.b > q.t)) continue;
        taken.push(box);
        best = { id: p.id, name: p.name, px: p.x, py: p.y, lx, ly, anchor: side };
        break outer;
      }
    }
    // Nothing fits: the dot still renders and the panel list still reaches it.
    if (best) placed.push(best);
  }
  return placed;
}

/**
 * A single country, flat, filling its box.
 *
 * This replaces the globe once a country is chosen — see country-map.ts for
 * why a sphere can never fill a rectangle, and why this is drawn from the
 * same geometry the globe already loads rather than from images.
 */
export default function CountryMap({
  country,
  features,
  nameOf,
  resorts,
  width,
  height,
  insetLeft,
}: CountryMapProps) {
  const router = useRouter();

  const shapes = useMemo(
    () =>
      countryMapShapes(features, country, nameOf, width, height, {
        top: 34,
        right: 46,
        bottom: 34,
        left: insetLeft + 34,
      }),
    [features, country, nameOf, width, height, insetLeft],
  );

  const labels = useMemo(() => {
    if (!shapes) return [];
    const pts = resorts.map((r) => {
      const p = shapes.projection.project(r.latitude, r.longitude);
      return { id: r.id, name: r.name, x: p.x, y: p.y };
    });
    return placeLabels(pts, width, height, insetLeft);
  }, [shapes, resorts, width, height, insetLeft]);

  // ⚠️ A zero-sized box makes every projected point NaN, and SVG rejects a
  // NaN attribute loudly ("<rect> attribute y: Expected length") for each one.
  // The container is measured after mount, so the first render can legitimately
  // arrive at 0x0 — there is nothing to draw then, and trying produced a wall
  // of console errors on every selection.
  if (!shapes || width <= 0 || height <= 0) return null;

  const dots = resorts.map((r) => ({ ...r, ...shapes.projection.project(r.latitude, r.longitude) }));

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className="absolute inset-0"
      role="img"
      aria-label={`Map of ${country} showing ${resorts.length} ski resorts`}
    >
      <defs>
        <radialGradient id="cm-glow" cx="50%" cy="45%" r="60%">
          <stop offset="0%" stopColor="#2577ad" stopOpacity="0.22" />
          <stop offset="100%" stopColor="#0a1e33" stopOpacity="0" />
        </radialGradient>
      </defs>

      <rect width={width} height={height} fill="url(#cm-glow)" />

      {/* Context first, so the country sits on top of it. */}
      <path d={shapes.neighbours} fill="#16304b" stroke="#22405f" strokeWidth={1} />
      <path
        d={shapes.country}
        fill="#2b6794"
        stroke="#7fd4f5"
        strokeWidth={1.6}
        strokeLinejoin="round"
      />

      {dots.map((d) => (
        <circle key={`dot-${d.id}`} cx={d.x} cy={d.y} r={4.5} fill="#f59e0b" stroke="#0a1e33" strokeWidth={1.2} />
      ))}

      {labels.map((l) => {
        const w = l.name.length * CHAR_W + 16;
        const anchorX = l.anchor === "start" ? l.lx : l.lx + w;
        return (
          <g
            key={l.id}
            className="cursor-pointer"
            onClick={() => router.push(`/resorts/${l.id}`)}
            role="link"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") router.push(`/resorts/${l.id}`);
            }}
          >
            {/* Leader line — the label may have shifted to find room, and
                without this the association with its dot is guesswork. */}
            <line
              x1={l.px}
              y1={l.py}
              x2={anchorX}
              y2={l.ly + LABEL_H / 2}
              stroke="#f59e0b"
              strokeWidth={1}
              strokeOpacity={0.5}
            />
            <rect
              x={l.lx}
              y={l.ly}
              width={w}
              height={LABEL_H}
              rx={LABEL_H / 2}
              fill="rgba(245,158,11,0.95)"
              stroke="rgba(255,255,255,0.35)"
            />
            <text
              x={l.lx + w / 2}
              y={l.ly + LABEL_H / 2 + 3.6}
              textAnchor="middle"
              fontSize={10.5}
              fontWeight={600}
              fill="#0d1f33"
            >
              {l.name}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
