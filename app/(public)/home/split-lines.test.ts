import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * Guards on the homepage scrollmation that TypeScript cannot see.
 *
 * This file reads source rather than running it, for the same reason
 * lib/jobs/dormancy-takedown.test.ts does: both bugs below are perfectly
 * valid TypeScript, invisible on screen, and were found only by reading a
 * value back out of the DOM. There is no DOM test library in this project
 * and adding one to guard two lines is the wrong trade.
 *
 * ⚠️ If SplitLines is ever rewritten against a real DOM harness, delete this
 * file and assert the same two things properly. It is a stand-in, not a
 * standard.
 */

const SRC = readFileSync(
  join(process.cwd(), "app", "(public)", "home", "SplitLines.tsx"),
  "utf8",
);

/**
 * The line boxes are block-level, so nothing on screen depends on the space
 * between them — but `textContent` is plain concatenation. Without it the
 * element reads "…into oneplace — with what eachadvert…": the whole
 * sentence with a word fused at every line break, which is what a screen
 * reader, a copy-paste and anything reading the rendered DOM would get.
 *
 * It looked perfect in the browser. It was caught by printing textContent.
 */
test("a separator is appended between line masks", () => {
  assert.match(
    SRC,
    /host\.appendChild\(document\.createTextNode\(" "\)\)/,
    "SplitLines must append a space text node between line masks, or the " +
      "accessible text fuses a word at every line break",
  );
});

/**
 * The reason this component is safe to put on the busiest page on the site:
 * the server sends the complete sentence in an ordinary element, and the
 * split only rearranges what is already there. A crawler that does not run
 * JavaScript, or a visitor whose WebGL/JS fails, still gets the words.
 *
 * So the RENDER must never start hidden. Hiding happens on the client, in a
 * layout effect. An `opacity: 0` or a transform in the returned JSX would
 * undo that invisibly — nothing would break, no test would fail, the page
 * would just quietly stop saying anything to anyone who cannot run it.
 */
test("the server render is plain, visible text — never hidden", () => {
  // Bound this to SplitLines' OWN return. An unbounded slice runs on into
  // RiseIn, whose client-side `el.style.opacity = "0"` is correct and would
  // fail this assertion — a test that reads source has to be told where the
  // thing it is reading ends.
  const start = SRC.indexOf("return (\n    <Tag");
  assert.ok(start > 0, "could not find the component's return");
  const returned = SRC.slice(start, SRC.indexOf("\n}", start));
  assert.doesNotMatch(returned, /opacity/i, "the server render must not set opacity");
  assert.doesNotMatch(returned, /translate/i, "the server render must not set a transform");
  assert.match(returned, /\{initial\}/, "the server render must emit the full text");
});

/**
 * Hiding has to happen in the same frame as the first paint. In a plain
 * useEffect the browser paints the finished text first, then drops it to
 * 120% and replays — a visible flash of the thing the animation is meant to
 * reveal.
 */
test("the split runs in a layout effect, not a passive one", () => {
  assert.match(SRC, /useLayoutEffect\(/, "the split must run before paint");
});

/**
 * These four numbers ARE the recording — measured off the live Dala page,
 * not chosen. The comment block above them in the source holds the sample
 * table they came from. Changing one is a design decision; changing one by
 * accident while editing nearby is not, and this is the tripwire.
 */
test("the measured animation constants are intact", () => {
  assert.match(SRC, /const START_Y = 120;/);
  assert.match(SRC, /const START_ROTATE = 7;/);
  assert.match(SRC, /const DURATION_MS = 800;/);
  assert.match(SRC, /cubic-bezier\(0\.165, 0\.84, 0\.44, 1\)/);
});

/**
 * Re-splitting after the reveal has run would throw away the finished state
 * and replay the whole animation because the reader turned their phone.
 */
test("a resize cannot replay an animation that already ran", () => {
  const onResize = SRC.slice(SRC.indexOf("const onResize"));
  assert.match(
    onResize.slice(0, 200),
    /if \(revealed\) return;/,
    "the resize handler must bail out once the text has been revealed",
  );
});
