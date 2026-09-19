import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import * as path from "node:path";
import { META_PIXEL_ID, metaPixelAllowedOn, metaPixelBootstrap } from "./meta-pixel";

test("the pixel loads on the production domain only", () => {
  assert.equal(metaPixelAllowedOn("www.mountainconnects.com"), true);
  assert.equal(metaPixelAllowedOn("mountainconnects.com"), true);
  // Test traffic would otherwise count as ad results.
  assert.equal(metaPixelAllowedOn("localhost"), false);
  assert.equal(metaPixelAllowedOn("mountain-connect-git-main-tmafi2s-projects.vercel.app"), false);
  assert.equal(metaPixelAllowedOn("mountainconnects.com.evil.example"), false);
  assert.equal(metaPixelAllowedOn(undefined), false);
});

test("the base code disables automatic configuration before init, and has no consent-less fallback", () => {
  const code = metaPixelBootstrap(META_PIXEL_ID);
  const autoConfig = code.indexOf(`fbq('set','autoConfig',false,'${META_PIXEL_ID}')`);
  const init = code.indexOf(`fbq('init','${META_PIXEL_ID}')`);
  assert.ok(autoConfig >= 0, "autoConfig must be switched off");
  assert.ok(init > autoConfig, "autoConfig has to be set before init to take effect");
  assert.ok(code.includes("fbq('track','PageView')"));
  assert.ok(code.includes("https://connect.facebook.net/en_US/fbevents.js"));
  assert.ok(!/noscript|<img/i.test(code), "a <noscript> pixel would fire without consent");
  assert.throws(() => metaPixelBootstrap("1234'); alert(1); //"), /Not a Meta Pixel ID/);
});

/** A CSP that forgets either domain blocks the pixel silently in production. */
test("the Content-Security-Policy lets the pixel load and report", () => {
  const config = readFileSync(path.join(process.cwd(), "next.config.ts"), "utf8");
  const directive = (name: string) => config.match(new RegExp(`"${name} [^"]*"`, "g"))?.join(" ") ?? "";
  const scriptSrc = config.slice(config.indexOf('"script-src'), config.indexOf('].join(" ")'));
  assert.ok(scriptSrc.includes("https://connect.facebook.net"), "script-src needs connect.facebook.net");
  assert.ok(directive("img-src").includes("https://www.facebook.com"), "img-src needs www.facebook.com");
  assert.ok(directive("connect-src").includes("https://www.facebook.com"), "connect-src needs www.facebook.com");
});

/** The privacy policy lists every processor; a pixel it does not mention is a policy it breaks. */
test("the privacy policy discloses the pixel", () => {
  const policy = readFileSync(path.join(process.cwd(), "app", "(public)", "privacy", "page.tsx"), "utf8");
  assert.match(policy, /Meta Platforms/);
  assert.match(policy, /Advertising cookies/);
  assert.match(policy, /Meta Pixel/);
});
