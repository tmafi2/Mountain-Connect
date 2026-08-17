/**
 * scripts/lead-monitor/dedup-key.ts
 *
 * Canonical (Node/TypeScript) implementation of the lead_posts dedup key.
 *
 * ┌──────────────────────────────────────────────────────────────────────┐
 * │ THIS FILE HAS A TWIN: dedup-key.browser.js                           │
 * │                                                                       │
 * │ The browser twin is pasted into a Facebook page context, where        │
 * │ node:crypto does not exist and SubtleCrypto is both async and         │
 * │ unavailable on non-secure origins. The two files must produce         │
 * │ byte-identical output forever. dedup-key.test.ts runs shared          │
 * │ fixtures through both and fails if they ever diverge.                 │
 * │                                                                       │
 * │ EDIT BOTH OR NEITHER.                                                 │
 * └──────────────────────────────────────────────────────────────────────┘
 *
 * The key is FNV-1a 64-bit over the UTF-8 bytes of:
 *
 *     normalise(groupName) + "|" + normalise(posterName) + "|" +
 *     truncate(normalise(postText), 120)
 *
 * where normalise = collapse whitespace runs to a single space, trim,
 * lowercase; and truncate counts CODE POINTS (never splits an emoji or a
 * CJK character), applied AFTER normalising.
 *
 * FNV-1a is a non-cryptographic hash. That is deliberate and fine: this is
 * a dedup key, not a security boundary. Nobody is attacking it — we are
 * only trying to notice that the same person posted the same thing in two
 * groups.
 *
 * STABILITY WARNING: the output of this function is stored in
 * lead_posts.dedup_key and is the ONLY thing preventing re-inserts. Change
 * any step — the separator, the normalisation order, the truncation unit,
 * the hash — and every existing row is orphaned: it will never match again
 * and every historical post re-inserts as a fresh lead. The pinned hashes
 * in fixtures.ts exist to make that failure loud.
 */

/** Post text contributes at most this many code points to the key. */
export const DEDUP_TEXT_MAX_CHARS = 120;

// FNV-1a 64-bit parameters (http://www.isthe.com/chongo/tech/comp/fnv/).
//
// Written as BigInt("0x…") rather than as 0x…n literals because this project
// targets ES2017, where the literal syntax is a compile error (TS2737). The
// browser twin uses the same form so the two stay line-for-line comparable.
const FNV_OFFSET_BASIS_64 = BigInt("0xcbf29ce484222325");
const FNV_PRIME_64 = BigInt("0x100000001b3");
const MASK_64 = BigInt("0xffffffffffffffff");

/** Replacement character emitted for unpaired surrogates, matching TextEncoder. */
const REPLACEMENT_CODE_POINT = 0xfffd;

/**
 * Collapse whitespace runs, trim, lowercase.
 *
 * Order matters: collapsing first turns leading/trailing whitespace into
 * single spaces that trim then removes.
 *
 * `\s` in a JS regex is Unicode-aware in exactly the same way in Node and
 * in every browser (ECMA-262): it covers NBSP (U+00A0), the ideographic
 * space (U+3000), the U+2000-200A range and the BOM, which is what makes
 * this safe to run in two runtimes. Note it does NOT cover the zero-width
 * space (U+200B) — also identical in both, so keys still agree.
 *
 * toLowerCase(), never toLocaleLowerCase(): the locale-aware variant maps
 * "I" differently under a Turkish locale, which would make the key depend
 * on the machine's locale.
 */
export function normaliseComponent(value: unknown): string {
  if (value === null || value === undefined) return "";
  return String(value).replace(/\s+/g, " ").trim().toLowerCase();
}

/**
 * Truncate to `max` Unicode code points.
 *
 * Array.from() walks the string iterator, which yields whole code points,
 * so a surrogate pair (emoji, or anything outside the BMP) is either kept
 * intact or dropped intact — we never leave half of one behind.
 */
export function truncateCodePoints(value: string, max: number): string {
  const codePoints = Array.from(value);
  if (codePoints.length <= max) return value;
  return codePoints.slice(0, max).join("");
}

/**
 * Encode a string to UTF-8 bytes.
 *
 * Hand-rolled rather than TextEncoder so that the Node and browser twins
 * run the identical algorithm rather than two vendor implementations that
 * merely ought to agree. Unpaired surrogates become U+FFFD, which is what
 * TextEncoder does too — the test asserts that equivalence wherever
 * TextEncoder is available.
 */
export function utf8Bytes(value: string): number[] {
  const bytes: number[] = [];

  for (let i = 0; i < value.length; i += 1) {
    let codePoint = value.charCodeAt(i);

    if (codePoint >= 0xd800 && codePoint <= 0xdbff) {
      // High surrogate: pair it with the following low surrogate, or treat
      // it as a lone surrogate if there isn't one.
      const next = i + 1 < value.length ? value.charCodeAt(i + 1) : 0;
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

/**
 * FNV-1a 64-bit over a byte array, lowercase hex, zero-padded to 16 chars.
 *
 * BigInt keeps the 64-bit arithmetic honest without hand-rolling a 32-bit
 * pair; it is available in Node and in every browser that can render
 * Facebook. XOR-then-multiply is what makes this 1a rather than 1.
 */
export function fnv1a64Hex(bytes: readonly number[]): string {
  let hash = FNV_OFFSET_BASIS_64;

  for (const byte of bytes) {
    hash ^= BigInt(byte);
    hash = (hash * FNV_PRIME_64) & MASK_64;
  }

  return hash.toString(16).padStart(16, "0");
}

/**
 * The exact string that gets hashed. Exported for debugging and for the
 * cross-implementation test, which compares this too — when the twins
 * disagree, seeing the pre-hash strings side by side is what tells you why.
 */
export function dedupKeyInput(
  groupName: unknown,
  posterName: unknown,
  postText: unknown,
): string {
  const group = normaliseComponent(groupName);
  const poster = normaliseComponent(posterName);
  const text = truncateCodePoints(
    normaliseComponent(postText),
    DEDUP_TEXT_MAX_CHARS,
  );

  return `${group}|${poster}|${text}`;
}

/**
 * Build the dedup key. Argument order is part of the hash — do not reorder.
 */
export function buildDedupKey(
  groupName: unknown,
  posterName: unknown,
  postText: unknown,
): string {
  return fnv1a64Hex(utf8Bytes(dedupKeyInput(groupName, posterName, postText)));
}
