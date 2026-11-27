import { test } from "node:test";
import assert from "node:assert/strict";
import { viewForCountry, countryViews, MIN_ALTITUDE, MAX_ALTITUDE } from "./framing";
import { resorts } from "../data/resorts";

const points = resorts.map((r) => ({
  country: r.country,
  latitude: r.latitude,
  longitude: r.longitude,
}));

test("a wide country is framed further out than a compact one", () => {
  const canada = viewForCountry("Canada", points);
  const italy = viewForCountry("Italy", points);
  assert.ok(canada && italy);
  // Canada's resorts span ~35 degrees, Italy's under 4. If these ever come
  // out equal the span maths has stopped doing anything.
  assert.ok(
    canada.altitude > italy.altitude + 0.3,
    `Canada ${canada.altitude.toFixed(2)} should sit well above Italy ${italy.altitude.toFixed(2)}`,
  );
});

test("a single-resort country gets the floor, not a zero-span zoom", () => {
  for (const solo of ["Andorra", "Sweden", "Georgia", "Argentina"]) {
    const view = viewForCountry(solo, points);
    assert.ok(view, `${solo} should have a view`);
    assert.equal(view.altitude, MIN_ALTITUDE, `${solo} should rest on the floor`);
  }
});

/**
 * The floor is also the contract with controls.minDistance in Globe.tsx.
 * If this drops below what the camera will accept, the flight silently stops
 * short and every small country arrives at the wrong distance.
 */
test("every country is within the altitude limits", () => {
  const views = countryViews(points);
  assert.equal(Object.keys(views).length, new Set(points.map((p) => p.country)).size);
  for (const [country, v] of Object.entries(views)) {
    assert.ok(v.altitude >= MIN_ALTITUDE, `${country} below the floor`);
    assert.ok(v.altitude <= MAX_ALTITUDE, `${country} above the ceiling`);
    assert.ok(Number.isFinite(v.lat) && Number.isFinite(v.lng), `${country} has a bad centre`);
  }
});

test("the centre sits inside the country's own spread of resorts", () => {
  for (const country of ["Japan", "Italy", "New Zealand", "Canada"]) {
    const mine = points.filter((p) => p.country === country);
    const v = viewForCountry(country, points)!;
    assert.ok(v.lat >= Math.min(...mine.map((p) => p.latitude)));
    assert.ok(v.lat <= Math.max(...mine.map((p) => p.latitude)));
    assert.ok(v.lng >= Math.min(...mine.map((p) => p.longitude)));
    assert.ok(v.lng <= Math.max(...mine.map((p) => p.longitude)));
  }
});

/**
 * Longitude degrees narrow towards the poles. Two countries with the same
 * raw longitude span should not be framed the same if one is much further
 * north — that was the bug this correction exists to prevent.
 */
test("longitude span is corrected for latitude", () => {
  const equatorial = viewForCountry("X", [
    { country: "X", latitude: 0, longitude: -10 },
    { country: "X", latitude: 0, longitude: 10 },
  ])!;
  const polar = viewForCountry("Y", [
    { country: "Y", latitude: 65, longitude: -10 },
    { country: "Y", latitude: 65, longitude: 10 },
  ])!;
  assert.ok(
    equatorial.altitude > polar.altitude,
    "the same longitude span covers less ground up north and should frame closer",
  );
});

test("a country with no resorts returns null rather than a guess", () => {
  assert.equal(viewForCountry("Narnia", points), null);
});
