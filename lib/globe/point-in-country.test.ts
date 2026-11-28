import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { countryAt, featureContains } from "./point-in-country";
import { resorts } from "../data/resorts";

const features = (
  JSON.parse(
    readFileSync(join(process.cwd(), "public", "globe", "countries.geojson"), "utf8"),
  ) as { features: object[] }
).features;

/** The same accessor Globe.tsx uses, including its aliases. */
const ALIASES: Record<string, string> = {
  "United States of America": "USA",
  "United States": "USA",
};
const nameOf = (f: object) => {
  const n = (f as { properties?: { name?: string } }).properties?.name ?? "";
  return ALIASES[n] ?? n;
};

/**
 * ⚠️ GEOJSON IS [LONGITUDE, LATITUDE] AND THE REST OF THIS CODEBASE IS
 * lat, lng. Swapping them gives a function that still returns countries —
 * just the wrong ones, and only obviously wrong away from the diagonal where
 * latitude and longitude happen to be interchangeable. Nelson, NZ at
 * (-41, 173) and a swap to (173, -41) land in different hemispheres; Niseko
 * at (42.8, 140.7) swapped is open ocean. These probes are chosen so a swap
 * cannot pass.
 */
test("a point lands in the country it is actually in", () => {
  // ⚠️ EVERY PROBE IS WELL INSIDE ITS COUNTRY. An earlier version used
  // Cervinia and Chamonix, which are each within a kilometre or two of a
  // border the 110m dataset draws only approximately — so the test was
  // measuring Natural Earth's generalisation rather than this function. The
  // border cases are pinned separately below, where they belong.
  const probes: [number, number, string][] = [
    [50.1163, -122.9574, "Canada"], // Whistler
    [51.18, -115.57, "Canada"], // Banff
    [42.8, 140.7, "Japan"], // Niseko
    [43.07, 141.35, "Japan"], // Sapporo
    [46.23, 10.83, "Italy"], // Madonna di Campiglio
    [41.9, 12.5, "Italy"], // Rome
    [46.8, 8.2, "Switzerland"], // central Switzerland
    [47.26, 11.39, "Austria"], // Innsbruck
    [-44.9, 168.66, "New Zealand"], // Queenstown
    [-36.9, 147.3, "Australia"], // Hotham
    [39.6, -106.5, "USA"], // Vail
  ];
  for (const [lat, lng, expected] of probes) {
    assert.equal(countryAt(features, lat, lng, nameOf), expected, `${lat},${lng}`);
  }
});

test("open sea belongs to nobody", () => {
  for (const [lat, lng] of [
    [0, -140], // mid Pacific
    [-40, -20], // south Atlantic
    [20, 65], // Arabian Sea
  ]) {
    assert.equal(countryAt(features, lat, lng, nameOf), null, `${lat},${lng}`);
  }
});

/**
 * ⚠️ THE 110m OUTLINES ARE GENERALISED, AND SEVEN ALPINE RESORTS SIT ON THE
 * WRONG SIDE OF A BORDER BECAUSE OF IT. Every coordinate below was checked
 * and is correct — Chamonix really is at 45.9237, 6.8694 — but that is about
 * 700m from the drawn French/Italian border, and Natural Earth's 110m
 * geometry is smoothed to a few kilometres. Cervinia sits under the
 * Matterhorn on the Swiss line, Livigno is a valley all but surrounded by
 * Switzerland, Portillo is at the Cristo Redentor pass. The resort data is
 * not wrong; the outline is coarse.
 *
 * It does not break the click target, because the hit test uses THE SAME
 * GEOMETRY THAT IS DRAWN — so what the pointer selects always matches the
 * shape on screen, even where that shape is a few kilometres off the real
 * border. Clicking the middle of a country, which is what anyone actually
 * does, is never in doubt.
 *
 * The list is pinned so an EIGHTH one fails. A new mismatch would not be the
 * dataset settling down; it would be a resort coordinate that is wrong, and
 * that is worth hearing about — it moves the marker, the label and the
 * camera flight too.
 */
const BORDER_CASES: Record<string, string> = {
  "Chamonix Mont-Blanc": "Italy",
  "Morzine / Avoriaz": "Switzerland",
  Livigno: "Switzerland",
  Cervinia: "Switzerland",
  Portillo: "Argentina",
  Bardonecchia: "France",
  "Monterosa Ski": "Switzerland",
};

test("every resort sits inside an outline, and only the known seven stray", () => {
  const surprises: string[] = [];
  for (const r of resorts) {
    const got = countryAt(features, r.latitude, r.longitude, nameOf);
    if (got === r.country) continue;
    // Andorra is absent from the 110m dataset entirely, which framing.ts
    // already documents; it has no outline to click and keeps its dot.
    if (r.country === "Andorra") continue;
    if (BORDER_CASES[r.name] === got) continue;
    surprises.push(`${r.name} (${r.country}) resolves to ${got ?? "open sea"}`);
  }
  assert.deepEqual(surprises, [], `unexpected:\n${surprises.join("\n")}`);
});

/**
 * ⚠️ A RESORT IN THE SEA IS ALWAYS A BUG, never coarse geometry. A border
 * resort landing in the neighbouring country is a few kilometres out; a
 * resort landing in open water means its latitude and longitude are swapped,
 * negated or simply wrong — which would also put its marker, its label and
 * the camera flight somewhere nobody skis.
 */
test("no resort is in the ocean", () => {
  const drowned = resorts
    .filter((r) => r.country !== "Andorra")
    .filter((r) => countryAt(features, r.latitude, r.longitude, nameOf) === null)
    .map((r) => `${r.name} at ${r.latitude}, ${r.longitude}`);
  assert.deepEqual(drowned, [], `resorts in open water:\n${drowned.join("\n")}`);
});

test("a hole in a country is not part of it", () => {
  // Lesotho is a whole country inside South Africa's outline, which is the
  // clearest test of hole handling the dataset offers.
  const za = features.find((f) => nameOf(f) === "South Africa");
  assert.ok(za, "South Africa is missing from the dataset");
  assert.equal(featureContains(za, -29.6, 28.2), false, "a click in Lesotho hit South Africa");
  assert.equal(featureContains(za, -33.9, 18.6), true, "Cape Town is not in South Africa");
});

test("a feature with no geometry is simply not under the pointer", () => {
  assert.equal(featureContains({}, 0, 0), false);
  assert.equal(featureContains({ geometry: { type: "Point", coordinates: [0, 0] } }, 0, 0), false);
  assert.equal(countryAt([{}], 0, 0, nameOf), null);
});
