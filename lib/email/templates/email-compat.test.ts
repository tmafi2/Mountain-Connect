import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import * as path from "node:path";

/**
 * Every email must read the same in Outlook for Windows as it does on a Mac.
 *
 * WHY THIS EXISTS. Classic Outlook for Windows renders email with Microsoft
 * Word's engine, not a browser, and Word silently drops CSS it does not know.
 * On 18 September a Lenovo showed every email header and button blank — the
 * words only appeared when highlighted. Each one sat on a
 * `background:linear-gradient(...)` with white text; Word discarded the
 * gradient, the cell went white, and the text went with it. It was not one
 * email: 77 cells across 44 of the 45 templates.
 *
 * WHY IT SCANS THE DIRECTORY rather than a list of templates: a new template
 * is covered the moment it is saved, with nobody having to remember to
 * register it. That is the whole point — the next email written, by anyone,
 * gets checked. A list would protect exactly the emails that already work.
 *
 * WHAT IT BANS is only what can HIDE or BREAK content in Outlook. Cosmetic
 * losses are allowed: Word ignores border-radius and box-shadow too, but a
 * card without a shadow or a button with square corners still reads.
 */

const DIR = path.join(process.cwd(), "lib", "email", "templates");

const templates = readdirSync(DIR)
  .filter((f) => f.endsWith(".ts") && !f.endsWith(".test.ts"))
  .map((f) => ({ name: f, src: readFileSync(path.join(DIR, f), "utf8") }));

/** WCAG relative luminance, so "darkest stop" means what the eye sees. */
function luminance(hex: string): number {
  const h = hex.replace("#", "");
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255);
  const f = (c: number) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}

/** Every <td ...> opening tag in a template, with its line number. */
function tdTags(src: string) {
  const out: Array<{ tag: string; line: number }> = [];
  const re = /<td\b[^>]*>/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(src))) {
    out.push({ tag: m[0], line: src.slice(0, m.index).split("\n").length });
  }
  return out;
}

test("the templates directory is actually being scanned", () => {
  // Guards the guard: a wrong path would make every rule below pass vacuously.
  assert.ok(templates.length >= 40, `expected the email templates, found ${templates.length}`);
});

/**
 * The exact failure that blanked the Lenovo. The shorthand is what Word drops
 * wholesale; the longhand pair lets it keep the colour while ignoring the
 * gradient.
 */
test("no gradient is written as the background shorthand", () => {
  const bad = templates.flatMap(({ name, src }) =>
    src.includes("background:linear-gradient") ? [name] : [],
  );
  assert.deepEqual(
    bad,
    [],
    "Write `background-color:#hex;background-image:linear-gradient(...)` instead — " +
      "Outlook for Windows drops the shorthand entirely and leaves the cell white.",
  );
});

test("every gradient cell carries a solid fallback Outlook can read", () => {
  const problems: string[] = [];
  for (const { name, src } of templates) {
    for (const { tag, line } of tdTags(src)) {
      if (!tag.includes("linear-gradient")) continue;
      const bgcolor = tag.match(/\bbgcolor="(#[0-9a-fA-F]{6})"/)?.[1]?.toLowerCase();
      const bgColor = tag.match(/background-color:(#[0-9a-fA-F]{6})/)?.[1]?.toLowerCase();
      if (!bgcolor) problems.push(`${name}:${line} — no bgcolor="…" attribute (the one Word reliably reads)`);
      if (!bgColor) problems.push(`${name}:${line} — no background-color fallback`);
      if (bgcolor && bgColor && bgcolor !== bgColor) {
        problems.push(`${name}:${line} — bgcolor ${bgcolor} disagrees with background-color ${bgColor}`);
      }
    }
  }
  assert.deepEqual(problems, []);
});

/**
 * A fallback that exists but is the gradient's LIGHT end reproduces the bug
 * exactly: white text on a pale solid is as unreadable as white on white.
 * Every gradient in these emails carries light text, so the fallback must be
 * the stop that text was designed against — the darkest one.
 *
 * If a future design genuinely puts DARK text on a light gradient, this will
 * fail, and should: choose the fallback by the text it sits under, then adjust
 * this rule to say so. A silent pass is how the Lenovo happened.
 */
test("each gradient's fallback is its darkest stop, the one light text was made for", () => {
  const problems: string[] = [];
  for (const { name, src } of templates) {
    for (const { tag, line } of tdTags(src)) {
      const grad = tag.match(/linear-gradient\(([^)]*)\)/)?.[1];
      const fallback = tag.match(/background-color:(#[0-9a-fA-F]{6})/)?.[1]?.toLowerCase();
      if (!grad || !fallback) continue;
      const stops = (grad.match(/#[0-9a-fA-F]{6}/g) ?? []).map((c) => c.toLowerCase());
      const darkest = stops.reduce((a, b) => (luminance(a) <= luminance(b) ? a : b));
      if (fallback !== darkest) {
        problems.push(`${name}:${line} — fallback ${fallback}, but the darkest stop is ${darkest}`);
      }
    }
  }
  assert.deepEqual(problems, []);
});

/**
 * Word does not support rgba(). Inside box-shadow that costs nothing — the
 * shadow is already ignored. As a background or text colour it would be
 * dropped, and whatever sat on it could vanish the same way the headers did.
 */
test("rgba() appears only inside box-shadow", () => {
  const problems: string[] = [];
  for (const { name, src } of templates) {
    for (const m of src.matchAll(/([a-z-]+):[^;"]*rgba\(/g)) {
      if (m[1] !== "box-shadow") problems.push(`${name} — rgba() in ${m[1]}`);
    }
  }
  assert.deepEqual(problems, [], "Use a solid #hex colour; Outlook for Windows drops rgba().");
});

test("no layout depends on flexbox or grid", () => {
  const bad = templates.filter(({ src }) => /display:\s*(flex|grid|inline-flex)/.test(src)).map((t) => t.name);
  assert.deepEqual(bad, [], "Outlook ignores flex and grid; lay out with tables.");
});

test("no background image, which Outlook drops without VML", () => {
  const bad = templates.filter(({ src }) => /background-image:\s*url\(/.test(src)).map((t) => t.name);
  assert.deepEqual(bad, []);
});

/** Gmail strips parts of <style> blocks; inline styles are the only safe kind. */
test("styles are inline, never in a <style> block", () => {
  const bad = templates.filter(({ src }) => /<style[\s>]/i.test(src)).map((t) => t.name);
  assert.deepEqual(bad, []);
});
