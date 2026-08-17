/**
 * scripts/lead-monitor/dedup-key.test.ts
 *
 *   npm run test:lead-monitor
 *   npx tsx --test scripts/lead-monitor/dedup-key.test.ts
 *
 * Guards the one invariant that matters: dedup-key.ts and
 * dedup-key.browser.js produce byte-identical keys, forever.
 *
 * The browser twin is loaded FROM DISK and evaluated the way a browser
 * would evaluate a pasted script — not imported as a module, not
 * transpiled. So this tests the literal bytes that get pasted into the
 * Facebook page context, which is the thing that can actually drift.
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import * as path from "node:path";

import {
  buildDedupKey,
  dedupKeyInput,
  fnv1a64Hex,
  normaliseComponent,
  truncateCodePoints,
  utf8Bytes,
  DEDUP_TEXT_MAX_CHARS,
} from "./dedup-key";
import {
  COLLAPSE_GROUPS,
  DISTINCT_FIXTURES,
  FIXTURES,
  FNV_VECTORS,
  PINNED_KEYS,
  type Fixture,
} from "./fixtures";

// --- load the browser twin -------------------------------------------------

/** The shape dedup-key.browser.js exposes. Mirrors dedup-key.ts's exports. */
type BrowserDedupApi = {
  DEDUP_TEXT_MAX_CHARS: number;
  normaliseComponent(value: unknown): string;
  truncateCodePoints(value: string, max: number): string;
  utf8Bytes(value: string): number[];
  fnv1a64Hex(bytes: readonly number[]): string;
  dedupKeyInput(group: unknown, poster: unknown, text: unknown): string;
  buildDedupKey(group: unknown, poster: unknown, text: unknown): string;
};

const MODULE_DIR =
  typeof __dirname !== "undefined"
    ? __dirname
    : path.join(process.cwd(), "scripts", "lead-monitor");

const BROWSER_FILE = path.join(MODULE_DIR, "dedup-key.browser.js");
const BROWSER_SOURCE = readFileSync(BROWSER_FILE, "utf8");

/**
 * Evaluate the paste-safe file with `globalThis` and `module` shadowed as
 * function parameters. That keeps it from touching Node's real global object
 * and exercises both of its attachment paths in one go.
 */
function loadBrowserTwin(): { viaGlobal: unknown; viaModule: unknown } {
  const fakeGlobal: Record<string, unknown> = {};
  const fakeModule: { exports: Record<string, unknown> } = { exports: {} };

  const evaluate = new Function(
    "globalThis",
    "module",
    `${BROWSER_SOURCE}\n;return { viaGlobal: globalThis.MCDedupKey, viaModule: module.exports };`,
  ) as (
    globalThis_: Record<string, unknown>,
    module_: { exports: Record<string, unknown> },
  ) => { viaGlobal: unknown; viaModule: unknown };

  return evaluate(fakeGlobal, fakeModule);
}

const loaded = loadBrowserTwin();
const browser = loaded.viaGlobal as BrowserDedupApi;

/** Render a fixture compactly for assertion messages. */
function describeFixture(f: Fixture): string {
  const clip = (s: unknown) => {
    const str = String(s ?? "");
    return str.length > 48 ? `${str.slice(0, 48)}…` : str;
  };
  return `${f.name} — group=${JSON.stringify(clip(f.group))} poster=${JSON.stringify(
    clip(f.poster),
  )} text=${JSON.stringify(clip(f.text))}`;
}

// --- the paste-safe file stays paste-safe ----------------------------------

/** Crude comment stripper, so source scans don't trip over prose. */
function stripComments(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:])\/\/.*$/gm, "$1");
}

describe("dedup-key.browser.js is safe to paste into a page", () => {
  const code = stripComments(BROWSER_SOURCE);

  it("loads, and both attachment paths give the same object", () => {
    assert.ok(loaded.viaGlobal, "did not attach MCDedupKey to the global");
    assert.ok(loaded.viaModule, "did not set module.exports");
    assert.equal(
      loaded.viaGlobal,
      loaded.viaModule,
      "the global and module.exports are different objects — the twin's UMD tail is broken",
    );
  });

  it("has no module syntax (it is pasted, not imported)", () => {
    assert.doesNotMatch(
      code,
      /^\s*import\s/m,
      "an import statement would throw in a pasted console snippet",
    );
    assert.doesNotMatch(
      code,
      /^\s*export\s/m,
      "an export statement would throw in a pasted console snippet",
    );
    assert.doesNotMatch(
      code,
      /\brequire\s*\(/,
      "require() does not exist in a page context",
    );
  });

  it("contains no credentials", () => {
    // This file lives in Facebook's page context, where every other script
    // on the page can read it. A key pasted in here is a leaked key.
    const forbidden: readonly [RegExp, string][] = [
      [/eyJ[A-Za-z0-9_-]{10,}/, "a JWT (Supabase keys are JWTs)"],
      [/service[_-]?role/i, "a service_role reference"],
      [/sb_secret/i, "a Supabase secret key"],
      [/SUPABASE_[A-Z_]*KEY/, "a Supabase key env var"],
    ];

    for (const [pattern, what] of forbidden) {
      assert.doesNotMatch(
        code,
        pattern,
        `dedup-key.browser.js appears to contain ${what} — it must never hold credentials`,
      );
    }
  });

  it("cannot make network calls (it is a pure hash)", () => {
    for (const pattern of [
      /\bfetch\s*\(/,
      /XMLHttpRequest/,
      /sendBeacon/,
      /\bWebSocket\b/,
    ]) {
      assert.doesNotMatch(
        code,
        pattern,
        "the dedup helper must be pure — nothing in it should be able to phone home",
      );
    }
  });

  it("exposes the same surface as the Node twin", () => {
    for (const name of [
      "normaliseComponent",
      "truncateCodePoints",
      "utf8Bytes",
      "fnv1a64Hex",
      "dedupKeyInput",
      "buildDedupKey",
    ] as const) {
      assert.equal(
        typeof browser[name],
        "function",
        `browser twin is missing ${name}()`,
      );
    }
    assert.equal(
      browser.DEDUP_TEXT_MAX_CHARS,
      DEDUP_TEXT_MAX_CHARS,
      "the twins disagree on the truncation limit",
    );
    assert.equal(DEDUP_TEXT_MAX_CHARS, 120, "the spec says 120 code points");
  });
});

// --- the hash primitive is genuinely FNV-1a 64 -----------------------------

describe("FNV-1a 64-bit primitive", () => {
  it("matches the canonical reference vectors", () => {
    // Without these, a subtly wrong hash (FNV-1 instead of 1a, a bad prime,
    // a missing 64-bit mask) would still pass every other test in this file,
    // because both twins would be wrong in exactly the same way.
    for (const { input, hex } of FNV_VECTORS) {
      assert.equal(
        fnv1a64Hex(utf8Bytes(input)),
        hex,
        `node twin fails the reference vector for ${JSON.stringify(input)}`,
      );
      assert.equal(
        browser.fnv1a64Hex(browser.utf8Bytes(input)),
        hex,
        `browser twin fails the reference vector for ${JSON.stringify(input)}`,
      );
    }
  });

  it("is deterministic across repeated calls", () => {
    const f = FIXTURES[0];
    const first = buildDedupKey(f.group, f.poster, f.text);
    for (let i = 0; i < 5; i += 1) {
      assert.equal(buildDedupKey(f.group, f.poster, f.text), first);
      assert.equal(browser.buildDedupKey(f.group, f.poster, f.text), first);
    }
  });
});

// --- the hand-rolled UTF-8 encoder agrees with the platform's -------------

describe("UTF-8 encoding", () => {
  const encoder = new TextEncoder();

  it("matches TextEncoder for every fixture component", () => {
    for (const f of FIXTURES) {
      for (const [label, value] of [
        ["group", f.group],
        ["poster", f.poster],
        ["text", f.text],
      ] as const) {
        const expected = Array.from(encoder.encode(String(value ?? "")));
        assert.deepEqual(
          utf8Bytes(String(value ?? "")),
          expected,
          `node twin's encoder disagrees with TextEncoder on ${f.name} / ${label}`,
        );
        assert.deepEqual(
          browser.utf8Bytes(String(value ?? "")),
          expected,
          `browser twin's encoder disagrees with TextEncoder on ${f.name} / ${label}`,
        );
      }
    }
  });

  it("replaces unpaired surrogates with U+FFFD, like TextEncoder", () => {
    const replacement = [0xef, 0xbf, 0xbd];
    assert.deepEqual(utf8Bytes("\ud83c"), replacement);
    assert.deepEqual(utf8Bytes("\udfbf"), replacement);
    assert.deepEqual(browser.utf8Bytes("\ud83c"), replacement);
    assert.deepEqual(browser.utf8Bytes("\udfbf"), replacement);
    // A well-formed pair must NOT be replaced.
    assert.deepEqual(utf8Bytes("\u{1f3bf}"), [0xf0, 0x9f, 0x8e, 0xbf]);
  });
});

// --- the twins agree, fixture by fixture ----------------------------------

describe("node and browser twins agree", () => {
  it("produces identical pre-hash input for every fixture", () => {
    for (const f of FIXTURES) {
      assert.equal(
        browser.dedupKeyInput(f.group, f.poster, f.text),
        dedupKeyInput(f.group, f.poster, f.text),
        `pre-hash input diverged: ${describeFixture(f)}`,
      );
    }
  });

  it("produces identical keys for every fixture", () => {
    for (const f of FIXTURES) {
      const node = buildDedupKey(f.group, f.poster, f.text);
      const page = browser.buildDedupKey(f.group, f.poster, f.text);
      assert.equal(
        page,
        node,
        `KEYS DIVERGED — a post hashed in the page would not match the same post hashed in the CLI.\n` +
          `  fixture: ${describeFixture(f)}\n` +
          `  node:    ${node}\n` +
          `  browser: ${page}\n` +
          `  node input:    ${JSON.stringify(dedupKeyInput(f.group, f.poster, f.text))}\n` +
          `  browser input: ${JSON.stringify(browser.dedupKeyInput(f.group, f.poster, f.text))}`,
      );
    }
  });

  it("agrees on normalisation and truncation in isolation", () => {
    for (const f of FIXTURES) {
      assert.equal(
        browser.normaliseComponent(f.text),
        normaliseComponent(f.text),
        `normaliseComponent diverged on ${f.name}`,
      );
      assert.equal(
        browser.truncateCodePoints(normaliseComponent(f.text), 120),
        truncateCodePoints(normaliseComponent(f.text), 120),
        `truncateCodePoints diverged on ${f.name}`,
      );
    }
  });

  it("emits 16 lowercase hex characters for every fixture", () => {
    for (const f of FIXTURES) {
      for (const [impl, key] of [
        ["node", buildDedupKey(f.group, f.poster, f.text)],
        ["browser", browser.buildDedupKey(f.group, f.poster, f.text)],
      ] as const) {
        assert.match(
          key,
          /^[0-9a-f]{16}$/,
          `${impl} twin produced a malformed key ${JSON.stringify(key)} for ${f.name}`,
        );
      }
    }
  });
});

// --- normalisation contract ------------------------------------------------

describe("normalisation collapses noise", () => {
  for (const group of COLLAPSE_GROUPS) {
    it(`${group.name} — all variants share one key`, () => {
      const [first, ...rest] = group.variants;
      const expected = buildDedupKey(first.group, first.poster, first.text);

      for (const variant of rest) {
        assert.equal(
          buildDedupKey(variant.group, variant.poster, variant.text),
          expected,
          `"${variant.name}" did not collapse onto "${first.name}" (${group.why}).\n` +
            `  ${first.name}: ${JSON.stringify(dedupKeyInput(first.group, first.poster, first.text))}\n` +
            `  ${variant.name}: ${JSON.stringify(dedupKeyInput(variant.group, variant.poster, variant.text))}`,
        );
        assert.equal(
          browser.buildDedupKey(variant.group, variant.poster, variant.text),
          expected,
          `"${variant.name}" collapsed in the CLI but not in the page context`,
        );
      }
    });
  }

  it("truncation actually happens (a 121st code point changes nothing)", () => {
    const base = "a".repeat(120);
    const withTail = `${base}this tail is completely ignored`;
    assert.equal(
      buildDedupKey("g", "p", base),
      buildDedupKey("g", "p", withTail),
      "post text past code point 120 is leaking into the key",
    );
  });

  it("truncation is not over-eager (the 120th code point still counts)", () => {
    const a = `${"a".repeat(119)}X`;
    const b = `${"a".repeat(119)}Y`;
    assert.notEqual(
      buildDedupKey("g", "p", a),
      buildDedupKey("g", "p", b),
      "the 120th code point is being dropped — truncation is off by one",
    );
  });
});

describe("distinct inputs stay distinct", () => {
  it("every DISTINCT_FIXTURES case has a unique key in both twins", () => {
    const seen = new Map<string, Fixture>();

    for (const f of DISTINCT_FIXTURES) {
      const node = buildDedupKey(f.group, f.poster, f.text);
      const page = browser.buildDedupKey(f.group, f.poster, f.text);
      assert.equal(page, node, `twins diverged on ${f.name}`);

      const clash = seen.get(node);
      assert.equal(
        clash,
        undefined,
        `"${f.name}" collides with "${clash?.name}" (both ${node}).\n` +
          `  Either normalisation became too aggressive, or an editor flattened\n` +
          `  the unicode escapes in fixtures.ts. Check the \\u escapes first.`,
      );
      seen.set(node, f);
    }
  });
});

// --- the tripwire ----------------------------------------------------------

describe("PINNED KEYS — algorithm stability tripwire", () => {
  for (const pinned of PINNED_KEYS) {
    it(`${pinned.name} still hashes to ${pinned.key}`, () => {
      const f = pinned.fixture;
      const failure =
        `\n` +
        `  ┌──────────────────────────────────────────────────────────────┐\n` +
        `  │ THE DEDUP ALGORITHM CHANGED. DO NOT "FIX" THIS TEST.         │\n` +
        `  └──────────────────────────────────────────────────────────────┘\n` +
        `  Every existing lead_posts.dedup_key was computed with the old\n` +
        `  algorithm. Ship this and nothing will ever match again: every\n` +
        `  historical post re-inserts as a fresh lead.\n\n` +
        `  If the change is intentional, it is a data migration — recompute\n` +
        `  dedup_key for every existing row in the same deploy.\n\n` +
        `  fixture: ${describeFixture(f)}\n` +
        `  hashed:  ${JSON.stringify(dedupKeyInput(f.group, f.poster, f.text))}\n`;

      assert.equal(
        buildDedupKey(f.group, f.poster, f.text),
        pinned.key,
        `node twin drifted.${failure}`,
      );
      assert.equal(
        browser.buildDedupKey(f.group, f.poster, f.text),
        pinned.key,
        `browser twin drifted.${failure}`,
      );
    });
  }
});
