/**
 * scripts/lead-monitor/ingest.ts
 *
 *   npx tsx scripts/lead-monitor/ingest.ts --file leads.json
 *   npx tsx scripts/lead-monitor/ingest.ts --file leads.json --dry-run
 *
 * Reads a collector payload and upserts it into lead_posts, ignoring
 * anything whose dedup_key is already stored.
 *
 * stdout is ONLY the number of rows actually inserted. The readable summary
 * goes to stderr, so `COUNT=$(… ingest.ts --file x.json)` works.
 *
 * Input shape:
 *   {
 *     "region": "Canada",
 *     "groups": [
 *       { "name": "Whistler Ski Season Jobs 2026",
 *         "posts": [ { "a": "...", "t": "...", "u": "...", "d": "...",
 *                      "ty": "...", "rc": "...", "av": "...", "lang": "..." } ] }
 *     ]
 *   }
 *
 * The dedup key is always RECOMPUTED here from (group name, a, t). A key
 * supplied in the payload is ignored: the browser collector is the least
 * trustworthy link in the chain, and a key computed by a stale snippet would
 * insert a duplicate that the database cannot catch.
 */
import { readFileSync } from "node:fs";

import { buildDedupKey, normaliseComponent, truncateCodePoints } from "./dedup-key";
import {
  fail,
  normaliseRegion,
  note,
  parseArgs,
  REGIONS,
  restUpsertIgnoreDuplicates,
  resolveTarget,
  stringFlag,
  type Region,
} from "./common";

const USAGE = `
Usage: npx tsx scripts/lead-monitor/ingest.ts --file <path> [--dry-run]

  --file      collector payload, JSON (required)
  --dry-run   parse, dedup and report — write nothing, and do not need credentials

stdout: the number of rows inserted, nothing else.
stderr: the summary.
`.trimStart();

const KNOWN_FLAGS = new Set(["file", "dry-run", "help"]);

/** Post text stored in the row (the KEY only ever sees the first 120). */
const POST_CONTENT_MAX_CHARS = 500;

/** Rows per insert request. */
const INSERT_CHUNK_SIZE = 500;

const POST_TYPES = ["Seeking Work", "Hiring", "Unknown"] as const;
type PostType = (typeof POST_TYPES)[number];

const POST_TYPE_ALIASES: Readonly<Record<string, PostType>> = {
  "seeking work": "Seeking Work",
  seeking: "Seeking Work",
  seeking_work: "Seeking Work",
  seekingwork: "Seeking Work",
  "looking for work": "Seeking Work",
  "looking for a job": "Seeking Work",
  hiring: "Hiring",
  hire: "Hiring",
  "now hiring": "Hiring",
  unknown: "Unknown",
};

/** The exact column set sent for every row — see buildRow(). */
type LeadRow = {
  dedup_key: string;
  region: Region;
  source_group: string;
  post_type: PostType;
  role_category: string | null;
  poster_name: string | null;
  post_content: string | null;
  post_url: string | null;
  availability: string | null;
  language: string;
  date_posted: string | null;
};

type RawPost = {
  a?: unknown;
  t?: unknown;
  u?: unknown;
  d?: unknown;
  ty?: unknown;
  rc?: unknown;
  av?: unknown;
  lang?: unknown;
};

// --- field normalisation ---------------------------------------------------

/** Trim; empty becomes null so we never store "" as if it were a value. */
function textOrNull(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  const trimmed = String(value).trim();
  return trimmed === "" ? null : trimmed;
}

function normalisePostType(raw: unknown): { postType: PostType; reason: string | null } {
  const trimmed = textOrNull(raw);
  // Absent is the overwhelmingly common case and the table's own default:
  // this monitor exists to find people seeking work.
  if (trimmed === null) return { postType: "Seeking Work", reason: null };

  const alias = POST_TYPE_ALIASES[trimmed.toLowerCase().replace(/\s+/g, " ")];
  if (alias) return { postType: alias, reason: null };

  return {
    postType: "Unknown",
    reason: `unrecognised post type ${JSON.stringify(trimmed)} — stored as "Unknown"`,
  };
}

function normaliseLanguage(raw: unknown): { language: string; reason: string | null } {
  const trimmed = textOrNull(raw);
  if (trimmed === null) return { language: "en", reason: null };

  const lower = trimmed.toLowerCase();
  if (/^[a-z]{2,3}(-[a-z0-9]{2,8})?$/.test(lower)) return { language: lower, reason: null };

  return {
    language: "en",
    reason: `unrecognised language tag ${JSON.stringify(trimmed)} — stored as "en"`,
  };
}

/**
 * Accepts epoch seconds/milliseconds and ISO-8601-shaped strings. Everything
 * else becomes null.
 *
 * Deliberately does NOT hand arbitrary strings to Date.parse. V8 will happily
 * turn "August 15" into 2001-08-15 — inventing a year we were never told. A
 * null date_posted is honest; a guessed one silently corrupts the record.
 */
const ISO_SHAPE =
  /^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2})(?::(\d{2}))?(?:\.\d+)?\s*(Z|z|[+-]\d{2}:?\d{2})?)?$/;

/** Anything outside this window is a parsing artefact, not a real post date. */
const EARLIEST_PLAUSIBLE_MS = Date.UTC(2000, 0, 1);

function parseDatePosted(raw: unknown): { date: string | null; reason: string | null } {
  const trimmed = textOrNull(raw);
  if (trimmed === null) return { date: null, reason: null };

  let ms: number | null = null;

  if (/^\d{9,13}$/.test(trimmed)) {
    // Epoch. Below ~1e11 it cannot plausibly be milliseconds (that would be
    // 1973), so treat it as seconds.
    const numeric = Number(trimmed);
    ms = numeric < 1e11 ? numeric * 1000 : numeric;
  } else {
    const match = ISO_SHAPE.exec(trimmed);
    if (!match) {
      return {
        date: null,
        reason: `unparseable timestamp ${JSON.stringify(trimmed)} — stored as null`,
      };
    }

    const [, y, mo, d, hh, mm, ss, zone] = match;

    if (!zone || zone.toUpperCase() === "Z") {
      // No offset given: read as UTC rather than the runner's local zone, so
      // the same payload ingests identically on any machine.
      ms = Date.UTC(
        Number(y),
        Number(mo) - 1,
        Number(d),
        Number(hh ?? 0),
        Number(mm ?? 0),
        Number(ss ?? 0),
      );

      // Date.UTC rolls over silently — 2026-02-31 becomes 2026-03-03. Reject
      // rather than record a date the author could not have posted on.
      const check = new Date(ms);
      if (
        check.getUTCFullYear() !== Number(y) ||
        check.getUTCMonth() !== Number(mo) - 1 ||
        check.getUTCDate() !== Number(d)
      ) {
        return {
          date: null,
          reason: `impossible calendar date ${JSON.stringify(trimmed)} — stored as null`,
        };
      }
    } else {
      const parsed = Date.parse(trimmed.replace(" ", "T"));
      ms = Number.isNaN(parsed) ? null : parsed;
    }
  }

  if (ms === null || Number.isNaN(ms)) {
    return {
      date: null,
      reason: `unparseable timestamp ${JSON.stringify(trimmed)} — stored as null`,
    };
  }

  if (ms < EARLIEST_PLAUSIBLE_MS || ms > Date.now() + 24 * 60 * 60 * 1000) {
    return {
      date: null,
      reason: `timestamp ${JSON.stringify(trimmed)} is outside a plausible range — stored as null`,
    };
  }

  return { date: new Date(ms).toISOString().slice(0, 10), reason: null };
}

// --- payload validation ---------------------------------------------------

function readPayload(filePath: string): { region: Region; groups: { name: string; posts: RawPost[] }[] } {
  let raw: string;
  try {
    raw = readFileSync(filePath, "utf8");
  } catch (error) {
    fail(`Could not read ${filePath}: ${error instanceof Error ? error.message : String(error)}`);
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    fail(`${filePath} is not valid JSON: ${error instanceof Error ? error.message : String(error)}`);
  }

  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    fail(`${filePath} must contain a JSON object with "region" and "groups".`);
  }

  const payload = parsed as { region?: unknown; groups?: unknown };

  const region = normaliseRegion(payload.region);
  if (!region) {
    fail(
      `Payload "region" is ${JSON.stringify(payload.region)}. Expected one of: ${REGIONS.join(", ")}.`,
    );
  }

  if (!Array.isArray(payload.groups)) {
    fail(`Payload "groups" must be an array.`);
  }

  const groups: { name: string; posts: RawPost[] }[] = [];

  payload.groups.forEach((entry: unknown, index: number) => {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
      fail(`groups[${index}] must be an object with "name" and "posts".`);
    }

    const group = entry as { name?: unknown; posts?: unknown };
    const name = textOrNull(group.name);
    if (name === null) {
      fail(`groups[${index}] has no "name" — the group name is part of the dedup key.`);
    }

    if (group.posts !== undefined && !Array.isArray(group.posts)) {
      fail(`groups[${index}].posts must be an array.`);
    }

    const posts = (group.posts ?? []) as unknown[];
    posts.forEach((post, postIndex) => {
      if (!post || typeof post !== "object" || Array.isArray(post)) {
        fail(`groups[${index}].posts[${postIndex}] must be an object.`);
      }
    });

    groups.push({ name, posts: posts as RawPost[] });
  });

  return { region, groups };
}

// --- row building ---------------------------------------------------------

/**
 * Every row is built from this one literal, so all rows carry an IDENTICAL
 * key set. That is a PostgREST requirement, not a style choice: for a bulk
 * insert it derives the column list from the first object in the array, and
 * rows with extra or missing keys either error or silently drop values.
 */
function buildRow(
  region: Region,
  groupName: string,
  post: RawPost,
  warn: (message: string) => void,
): LeadRow | null {
  const text = post.t === null || post.t === undefined ? "" : String(post.t);

  // A post with no text carries no lead, and every empty one would hash to
  // the same key for a given group+author — so they would collide into a
  // single meaningless row.
  if (normaliseComponent(text) === "") return null;

  const { postType, reason: typeReason } = normalisePostType(post.ty);
  if (typeReason) warn(typeReason);

  const { language, reason: langReason } = normaliseLanguage(post.lang);
  if (langReason) warn(langReason);

  const { date, reason: dateReason } = parseDatePosted(post.d);
  if (dateReason) warn(dateReason);

  return {
    dedup_key: buildDedupKey(groupName, post.a, text),
    region,
    source_group: groupName,
    post_type: postType,
    role_category: textOrNull(post.rc),
    poster_name: textOrNull(post.a),
    post_content: truncateCodePoints(text.trim(), POST_CONTENT_MAX_CHARS),
    post_url: textOrNull(post.u),
    availability: textOrNull(post.av),
    language,
    date_posted: date,
  };
}

// --- main ----------------------------------------------------------------

async function main(): Promise<void> {
  const { flags } = parseArgs(process.argv.slice(2));

  if (flags.has("help")) {
    process.stderr.write(USAGE);
    return;
  }

  for (const name of flags.keys()) {
    if (!KNOWN_FLAGS.has(name)) fail(`Unknown flag --${name}.\n\n${USAGE}`);
  }

  const filePath = stringFlag(flags, "file");
  if (!filePath) fail(`--file is required.\n\n${USAGE}`);

  const dryRun = flags.get("dry-run") === true || flags.get("dry-run") === "true";

  const { region, groups } = readPayload(filePath);

  let seenPosts = 0;
  let skippedEmpty = 0;
  let warnings = 0;

  const byKey = new Map<string, LeadRow>();
  let localDuplicates = 0;

  // Same author + same text seen under more than one group name. These are
  // NOT duplicates by dedup_key, because the group name is part of the key.
  const grouplessSightings = new Map<string, Set<string>>();

  for (const group of groups) {
    for (const post of group.posts) {
      seenPosts += 1;

      const row = buildRow(region, group.name, post, (message) => {
        warnings += 1;
        note(`  warn [${group.name}]: ${message}`);
      });

      if (!row) {
        skippedEmpty += 1;
        continue;
      }

      const grouplessKey = buildDedupKey("", post.a, post.t);
      const groupsForPost = grouplessSightings.get(grouplessKey) ?? new Set<string>();
      groupsForPost.add(group.name);
      grouplessSightings.set(grouplessKey, groupsForPost);

      if (byKey.has(row.dedup_key)) {
        localDuplicates += 1;
        continue;
      }
      byKey.set(row.dedup_key, row);
    }
  }

  const rows = [...byKey.values()];
  const crossGroup = [...grouplessSightings.values()].filter((set) => set.size > 1).length;

  note(``);
  note(`region            ${region}`);
  note(`groups            ${groups.length}`);
  note(`posts in payload  ${seenPosts}`);
  note(`skipped (no text) ${skippedEmpty}`);
  note(`collapsed locally ${localDuplicates}`);
  note(`unique rows       ${rows.length}`);
  if (warnings > 0) note(`field warnings    ${warnings}`);

  if (crossGroup > 0) {
    note(``);
    note(
      `note: ${crossGroup} ${crossGroup === 1 ? "post appears" : "posts appear"} to be the same author and\n` +
        `      text posted in more than one group. They are stored as SEPARATE\n` +
        `      rows, because the group name is part of the dedup key by design.`,
    );
  }

  if (rows.length === 0) {
    note(``);
    note(`nothing to insert`);
    process.stdout.write(`0\n`);
    return;
  }

  if (dryRun) {
    note(``);
    note(`dry run — nothing written. ${rows.length} row(s) would be offered to Supabase,`);
    note(`which will ignore any whose dedup_key is already stored.`);
    note(``);
    for (const row of rows.slice(0, 5)) {
      note(
        `  ${row.dedup_key}  ${row.date_posted ?? "----------"}  ${(row.poster_name ?? "(no name)").padEnd(20).slice(0, 20)}  ${JSON.stringify((row.post_content ?? "").slice(0, 60))}`,
      );
    }
    if (rows.length > 5) note(`  … and ${rows.length - 5} more`);
    process.stdout.write(`${rows.length}\n`);
    return;
  }

  const target = resolveTarget();
  let inserted = 0;

  for (let offset = 0; offset < rows.length; offset += INSERT_CHUNK_SIZE) {
    const chunk = rows.slice(offset, offset + INSERT_CHUNK_SIZE);
    const returned = await restUpsertIgnoreDuplicates<LeadRow, { id: string }>(
      target,
      "lead_posts",
      "dedup_key",
      chunk,
    );
    inserted += returned.length;

    if (rows.length > INSERT_CHUNK_SIZE) {
      note(`  chunk ${offset / INSERT_CHUNK_SIZE + 1}: ${returned.length}/${chunk.length} inserted`);
    }
  }

  note(``);
  note(`inserted          ${inserted}`);
  note(`already stored    ${rows.length - inserted}`);

  process.stdout.write(`${inserted}\n`);
}

main().catch((error: unknown) => {
  fail(error instanceof Error ? error.message : String(error));
});
