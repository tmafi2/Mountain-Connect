import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * Source-reading tests for the particle field's render loop.
 *
 * ⚠️ THESE READ THE FILE AS TEXT, which is a last resort and is the right one
 * here. The loop runs inside a `useEffect` against a live WebGL context and
 * three.js objects; standing that up in node to assert one multiplication is
 * far more machinery than the thing being protected. And the bug below is
 * invisible to TypeScript — every value involved is a number, every
 * expression typechecks, and the wrong one renders happily. Precedent:
 * lib/jobs/dormancy-takedown.test.ts, which reads a route's source because
 * `"inactive"` is a perfectly good string.
 */
const SRC = readFileSync(join(process.cwd(), "app/(public)/home/ParticleGlobe.tsx"), "utf8");

/**
 * ⚠️ `spin` IS AN ACCUMULATOR, AND ONLY THE GLOBE MAY HAVE IT. It grows for
 * as long as the tab is open, at roughly 0.066 radians a second. The original
 * line was
 *
 *     points.rotation.y = spin + tiltY;
 *     points.rotation.y *= 0.15 + 0.85 * globeness;
 *
 * which reads as "flat formations barely rotate" and does not do that: 15% of
 * an unbounded angle is still unbounded. The mountains, the lift and the
 * signpost were turning 17° after thirty seconds, 68° after two minutes and
 * were edge-on by five — so a flat silhouette became progressively
 * unreadable the longer somebody stayed on the page, and looked perfect
 * again after a reload.
 *
 * Nothing errors, nothing drifts in a unit test, and a short look never shows
 * it. The browser pane throttles this loop to 1Hz when it is hidden, which is
 * exactly where it was being looked at, so it took a complaint to find.
 */
test("only the globe carries the accumulating spin", () => {
  const line = SRC.split("\n").find((l) => l.includes("points.rotation.y ="));
  assert.ok(line, "the rotation is no longer assigned in one place");
  assert.ok(
    /spin\s*\*\s*globeness|globeness\s*\*\s*spin/.test(line),
    `spin must be multiplied by globeness, not damped by it — found: ${line.trim()}`,
  );
  // And it must not be scaled afterwards by a factor that leaves it non-zero
  // for a flat formation, which is the shape of the original bug.
  const after = SRC.slice(SRC.indexOf(line) + line.length, SRC.indexOf(line) + line.length + 400);
  assert.ok(
    !/points\.rotation\.y\s*\*=/.test(after),
    "rotation.y is scaled again after it is set — that is how the damping bug worked",
  );
});

/**
 * ⚠️ THE EASING IS WHAT DECIDES WHETHER THE CLOUD EVER ARRIVES. It is a
 * low-pass on the scroll — the thing that makes a flick of the wheel read as
 * momentum — and at 0.085 its time constant was about twelve frames, which
 * left the cloud a fifth dispersed at the moment it was meant to be holding
 * a shape. `HOLD_HALF` in shapes.ts gives it room to settle; this gives it
 * the speed to use that room, and the two were raised together.
 */
test("the dispersion easing is fast enough to settle inside a hold", () => {
  const m = SRC.match(/dispersion\s*\+=\s*\(targetDispersion\s*-\s*dispersion\)\s*\*\s*([\d.]+)/);
  assert.ok(m, "the dispersion easing is no longer a single lerp");
  const k = Number(m[1]);
  // A hold band is 0.05 of the page, around 565px, about 37 frames of scroll
  // at a normal speed. Settling to within a twentieth of the target inside
  // that needs a time constant under about twelve frames.
  assert.ok(k >= 0.1, `easing of ${k} is too slow to settle inside a hold band`);
  // …and not so fast that the momentum goes and a wheel notch snaps.
  assert.ok(k <= 0.2, `easing of ${k} is a jump cut, not momentum`);
});
