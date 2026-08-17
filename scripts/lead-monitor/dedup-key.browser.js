/**
 * scripts/lead-monitor/dedup-key.browser.js
 *
 * Browser twin of dedup-key.ts. Paste-safe: no import, no export, no build
 * step. Drop the whole file into the devtools console on a Facebook group
 * page (or prepend it to your collector snippet) and call:
 *
 *     MCDedupKey.buildDedupKey(groupName, posterName, postText)
 *
 * ┌──────────────────────────────────────────────────────────────────────┐
 * │ THIS FILE HAS A TWIN: dedup-key.ts                                   │
 * │                                                                       │
 * │ Both must produce byte-identical output forever. dedup-key.test.ts    │
 * │ loads THIS FILE FROM DISK, evaluates it the way a browser would, and  │
 * │ asserts every fixture hashes identically in both.                     │
 * │                                                                       │
 * │ EDIT BOTH OR NEITHER.                                                 │
 * └──────────────────────────────────────────────────────────────────────┘
 *
 * Deliberately avoids node:crypto (absent in a page) and SubtleCrypto
 * (async, and unavailable on non-secure origins). FNV-1a is not
 * cryptographic; this is a dedup key, not a security boundary.
 *
 * NEVER put the Supabase service key in this file or in anything you paste
 * alongside it. It runs in Facebook's page context, where every other
 * script on the page can read it. See README.md.
 */
(function (root, factory) {
  "use strict";

  var api = factory();

  // Browser: expose a global for the pasted collector snippet to call.
  if (root) root.MCDedupKey = api;

  // Node/CommonJS: let dedup-key.test.ts require the real file rather than
  // a copy of it. Harmless in a browser, where `module` is undefined.
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  /** Post text contributes at most this many code points to the key. */
  var DEDUP_TEXT_MAX_CHARS = 120;

  // FNV-1a 64-bit parameters (http://www.isthe.com/chongo/tech/comp/fnv/).
  // BigInt("0x…") rather than 0x…n literals, to stay line-for-line identical
  // to the Node twin, which cannot use the literal syntax at this project's
  // ES2017 target.
  var FNV_OFFSET_BASIS_64 = BigInt("0xcbf29ce484222325");
  var FNV_PRIME_64 = BigInt("0x100000001b3");
  var MASK_64 = BigInt("0xffffffffffffffff");

  /** Replacement character emitted for unpaired surrogates, matching TextEncoder. */
  var REPLACEMENT_CODE_POINT = 0xfffd;

  /**
   * Collapse whitespace runs, trim, lowercase. See dedup-key.ts for why the
   * order matters and why this is toLowerCase() and not toLocaleLowerCase().
   */
  function normaliseComponent(value) {
    if (value === null || value === undefined) return "";
    return String(value).replace(/\s+/g, " ").trim().toLowerCase();
  }

  /** Truncate to `max` Unicode code points, never splitting a surrogate pair. */
  function truncateCodePoints(value, max) {
    var codePoints = Array.from(value);
    if (codePoints.length <= max) return value;
    return codePoints.slice(0, max).join("");
  }

  /** Encode a string to UTF-8 bytes. Unpaired surrogates become U+FFFD. */
  function utf8Bytes(value) {
    var bytes = [];

    for (var i = 0; i < value.length; i += 1) {
      var codePoint = value.charCodeAt(i);

      if (codePoint >= 0xd800 && codePoint <= 0xdbff) {
        // High surrogate: pair it with the following low surrogate, or treat
        // it as a lone surrogate if there isn't one.
        var next = i + 1 < value.length ? value.charCodeAt(i + 1) : 0;
        if (next >= 0xdc00 && next <= 0xdfff) {
          codePoint = (codePoint - 0xd800) * 0x400 + (next - 0xdc00) + 0x10000;
          i += 1;
        } else {
          codePoint = REPLACEMENT_CODE_POINT;
        }
      } else if (codePoint >= 0xdc00 && codePoint <= 0xdfff) {
        // Low surrogate with no high surrogate before it.
        codePoint = REPLACEMENT_CODE_POINT;
      }

      if (codePoint < 0x80) {
        bytes.push(codePoint);
      } else if (codePoint < 0x800) {
        bytes.push(0xc0 | (codePoint >> 6), 0x80 | (codePoint & 0x3f));
      } else if (codePoint < 0x10000) {
        bytes.push(
          0xe0 | (codePoint >> 12),
          0x80 | ((codePoint >> 6) & 0x3f),
          0x80 | (codePoint & 0x3f),
        );
      } else {
        bytes.push(
          0xf0 | (codePoint >> 18),
          0x80 | ((codePoint >> 12) & 0x3f),
          0x80 | ((codePoint >> 6) & 0x3f),
          0x80 | (codePoint & 0x3f),
        );
      }
    }

    return bytes;
  }

  /** FNV-1a 64-bit over a byte array, lowercase hex, zero-padded to 16 chars. */
  function fnv1a64Hex(bytes) {
    var hash = FNV_OFFSET_BASIS_64;

    for (var i = 0; i < bytes.length; i += 1) {
      hash ^= BigInt(bytes[i]);
      hash = (hash * FNV_PRIME_64) & MASK_64;
    }

    return hash.toString(16).padStart(16, "0");
  }

  /** The exact string that gets hashed. Exported for debugging. */
  function dedupKeyInput(groupName, posterName, postText) {
    var group = normaliseComponent(groupName);
    var poster = normaliseComponent(posterName);
    var text = truncateCodePoints(
      normaliseComponent(postText),
      DEDUP_TEXT_MAX_CHARS,
    );

    return group + "|" + poster + "|" + text;
  }

  /** Build the dedup key. Argument order is part of the hash — do not reorder. */
  function buildDedupKey(groupName, posterName, postText) {
    return fnv1a64Hex(utf8Bytes(dedupKeyInput(groupName, posterName, postText)));
  }

  return {
    DEDUP_TEXT_MAX_CHARS: DEDUP_TEXT_MAX_CHARS,
    normaliseComponent: normaliseComponent,
    truncateCodePoints: truncateCodePoints,
    utf8Bytes: utf8Bytes,
    fnv1a64Hex: fnv1a64Hex,
    dedupKeyInput: dedupKeyInput,
    buildDedupKey: buildDedupKey,
  };
});
