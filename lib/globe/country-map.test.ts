import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { countryMapShapes, fitProjection, mainlandBounds, type Insets } from "./country-map";

/** No panel in the test box; insets are exercised by their own case below. */
const PAD: Insets = { top: 28, right: 28, bottom: 28, left: 28 };
const ZERO: Insets = { top: 0, right: 0, bottom: 0, left: 0 };
import { resorts } from "../data/resorts";

const features = JSON.parse(
  readFileSync(join(process.cwd(), "public", "globe", "countries.geojson"), "utf8"),
).features as object[];

const nameOf = (f: object) => {
  const n = (f as { properties?: { name?: string } }).properties?.name ?? "";
  return n === "United States of America" ? "USA" : n;
};

const W = 900;
const H = 560;

test("every country with geometry can be drawn flat", () => {
  const countries = [...new Set(resorts.map((r) => r.country))].filter(
    (c) => c !== "Andorra", // absent from the 110m dataset, see Globe.tsx
  );
  for (const c of countries) {
    const shapes = countryMapShapes(features, c, nameOf, W, H, PAD);
    assert.ok(shapes, `${c} produced no shapes`);
    assert.ok(shapes.country.startsWith("M"), `${c} produced no country path`);
    assert.ok(shapes.country.length > 50, `${c} path is suspiciously short`);
  }
});

/** The whole point: the country should fill the box, not sit in a corner. */
test("the country fills most of the box", () => {
  for (const c of ["Italy", "Japan", "Switzerland", "Canada", "New Zealand"]) {
    const { projection } = countryMapShapes(features, c, nameOf, W, H, PAD)!;
    const own = features.filter((f) => nameOf(f) === c);
    const bounds = mainlandBounds(
      own.flatMap((f) => {
        const g = (f as { geometry: { type: string; coordinates: number[][][] | number[][][][] } })
          .geometry;
        const polys = (g.type === "Polygon" ? [g.coordinates] : g.coordinates) as number[][][][];
        return polys.map((p) => p[0]);
      }),
    )!;

    const a = projection.project(bounds.maxLat, bounds.minLng);
    const b = projection.project(bounds.minLat, bounds.maxLng);
    const w = Math.abs(b.x - a.x);
    const h = Math.abs(b.y - a.y);
    // One axis must be close to filling its side; the other is whatever the
    // country's own shape allows.
    assert.ok(
      w > W * 0.7 || h > H * 0.7,
      `${c} only reaches ${Math.round(w)}x${Math.round(h)} in a ${W}x${H} box`,
    );
    assert.ok(w <= W + 1 && h <= H + 1, `${c} overflows the box at ${Math.round(w)}x${Math.round(h)}`);
  }
});

/**
 * Without the cos(latitude) correction a northern country is stretched
 * sideways into something unrecognisable. Sweden is the clearest case on
 * this board.
 */
test("longitude is squeezed by latitude", () => {
  const equator = fitProjection({ minLat: -5, maxLat: 5, minLng: -5, maxLng: 5 }, 1000, 1000, ZERO);
  const north = fitProjection({ minLat: 55, maxLat: 65, minLng: -5, maxLng: 5 }, 1000, 1000, ZERO);

  const eW = equator.project(0, 5).x - equator.project(0, -5).x;
  const nW = north.project(60, 5).x - north.project(60, -5).x;
  assert.ok(
    nW < eW * 0.8,
    `the same 10 degrees of longitude should draw narrower at 60N (got ${nW.toFixed(0)} vs ${eW.toFixed(0)})`,
  );
});

/** Alaska must not get a vote on how the USA is framed. */
test("distant territory does not drag the fit", () => {
  const usa = countryMapShapes(features, "USA", nameOf, W, H, PAD)!;
  // Denver is in the contiguous 48 and should land inside the box.
  const denver = usa.projection.project(39.7, -104.99);
  assert.ok(
    denver.x > 0 && denver.x < W && denver.y > 0 && denver.y < H,
    `Denver fell outside the frame at ${Math.round(denver.x)},${Math.round(denver.y)}`,
  );
});

test("resorts land inside the frame of their own country", () => {
  for (const country of ["Italy", "Japan", "France", "New Zealand"]) {
    const { projection } = countryMapShapes(features, country, nameOf, W, H, PAD)!;
    for (const r of resorts.filter((x) => x.country === country)) {
      const p = projection.project(r.latitude, r.longitude);
      assert.ok(
        p.x >= -40 && p.x <= W + 40 && p.y >= -40 && p.y <= H + 40,
        `${r.name} projected to ${Math.round(p.x)},${Math.round(p.y)} outside a ${W}x${H} box`,
      );
    }
  }
});

test("a country with no geometry returns null rather than an empty drawing", () => {
  assert.equal(countryMapShapes(features, "Andorra", nameOf, W, H, PAD), null);
  assert.equal(countryMapShapes(features, "Narnia", nameOf, W, H, PAD), null);
});

/**
 * The country panel covers the left of the box. A country fitted to the full
 * width sits half underneath it, which is exactly what happened the first
 * time: two Italian resort labels were drawn behind the panel.
 */
test("a left inset moves the country clear of the panel", () => {
  const PANEL = 360;
  const withPanel = countryMapShapes(features, "Italy", nameOf, W, H, {
    top: 34,
    right: 46,
    bottom: 34,
    left: PANEL + 34,
  })!;
  for (const r of resorts.filter((x) => x.country === "Italy")) {
    const p = withPanel.projection.project(r.latitude, r.longitude);
    assert.ok(p.x > PANEL, `${r.name} projected to x=${Math.round(p.x)}, behind the panel`);
  }
});
