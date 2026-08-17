/**
 * scripts/fb-monitor/run-extraction.ts
 *
 *   npm run fb:extract                          # the bundled sample posts
 *   npm run fb:extract -- --file posts.json     # your own
 *   npm run fb:extract -- --limit 3
 *
 * Reads collected posts, runs each through Claude, writes the structured
 * results to a JSON file and prints a readable summary.
 *
 * This writes NOTHING to Supabase and creates no listings. It exists to answer
 * one question before we build any of the import plumbing: is extraction
 * quality on real posts good enough to be worth wiring up?
 *
 * Input is a JSON array of:
 *   { id, group, author, text, permalink, postedAt }
 *
 * stdout is the results file path. The summary goes to stderr.
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import * as path from "node:path";

import {
  assertCredentials,
  estimateCost,
  extractPost,
  type ExtractionResult,
  type RawPost,
  type Usage,
} from "./extract";

const USAGE = `
Usage: npm run fb:extract -- [--file <path>] [--limit 10] [--out <path>]

  --file   JSON array of posts (default: the bundled sample fixtures)
  --limit  process at most this many posts (default 10)
  --out    where to write results (default scripts/fb-monitor/out/)

Requires ANTHROPIC_API_KEY in .env.local. Writes nothing to Supabase.
`.trimStart();

const HERE =
  typeof __dirname !== "undefined" ? __dirname : path.join(process.cwd(), "scripts", "fb-monitor");

const DEFAULT_INPUT = path.join(HERE, "fixtures", "sample-posts.json");
const DEFAULT_OUT_DIR = path.join(HERE, "out");

function fail(message: string): never {
  process.stderr.write(`\nfb-monitor: ${message}\n\n`);
  process.exit(1);
}

function note(message: string): void {
  process.stderr.write(`${message}\n`);
}

function parseArgs(argv: readonly string[]): Map<string, string | true> {
  const flags = new Map<string, string | true>();
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (!arg.startsWith("--")) continue;
    const body = arg.slice(2);
    const eq = body.indexOf("=");
    if (eq !== -1) {
      flags.set(body.slice(0, eq), body.slice(eq + 1));
      continue;
    }
    const next = argv[i + 1];
    if (next !== undefined && !next.startsWith("--")) {
      flags.set(body, next);
      i += 1;
    } else {
      flags.set(body, true);
    }
  }
  return flags;
}

function readPosts(filePath: string): RawPost[] {
  let raw: string;
  try {
    raw = readFileSync(filePath, "utf8");
  } catch (error) {
    fail(`could not read ${filePath}: ${error instanceof Error ? error.message : String(error)}`);
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    fail(`${filePath} is not valid JSON: ${error instanceof Error ? error.message : String(error)}`);
  }

  if (!Array.isArray(parsed)) fail(`${filePath} must contain a JSON array of posts.`);

  return parsed.map((entry: unknown, index: number) => {
    if (!entry || typeof entry !== "object") fail(`posts[${index}] must be an object.`);
    const post = entry as Partial<RawPost>;
    if (typeof post.text !== "string" || post.text.trim() === "") {
      fail(`posts[${index}] needs a non-empty "text".`);
    }
    if (typeof post.group !== "string" || post.group.trim() === "") {
      fail(`posts[${index}] needs a "group" — it is part of how we identify the post.`);
    }
    return {
      id: typeof post.id === "string" && post.id ? post.id : `post-${index + 1}`,
      group: post.group,
      author: typeof post.author === "string" ? post.author : null,
      text: post.text,
      permalink: typeof post.permalink === "string" ? post.permalink : null,
      postedAt: typeof post.postedAt === "string" ? post.postedAt : null,
    };
  });
}

/** Compact one-line rendering of a role for the terminal summary. */
function describeRole(role: {
  jobTitle: string;
  roleCategory: string;
  positionsAvailable: number | null;
  payAmount: number | null;
  payCurrency: string | null;
  payPeriod: string | null;
  startDate: string | null;
}): string {
  const bits = [
    role.positionsAvailable !== null && role.positionsAvailable > 1
      ? `${role.positionsAvailable}x ${role.jobTitle}`
      : role.jobTitle,
    `[${role.roleCategory}]`,
    role.payAmount !== null
      ? `${role.payCurrency ?? "?"} ${role.payAmount}/${role.payPeriod ?? "?"}`
      : "pay not stated",
    role.startDate !== null ? `from ${role.startDate}` : "start not stated",
  ];
  return bits.join("  ");
}

async function main(): Promise<void> {
  const flags = parseArgs(process.argv.slice(2));

  if (flags.has("help")) {
    process.stderr.write(USAGE);
    return;
  }

  const inputPath = typeof flags.get("file") === "string" ? (flags.get("file") as string) : DEFAULT_INPUT;
  const rawLimit = flags.get("limit");
  const limit = typeof rawLimit === "string" ? Number(rawLimit) : 10;
  if (!Number.isInteger(limit) || limit < 1) fail(`--limit must be a positive whole number.`);

  const allPosts = readPosts(inputPath);
  const posts = allPosts.slice(0, limit);

  // Before any model call: a missing key is one setup problem, not N per-post
  // failures followed by an empty results file.
  try {
    assertCredentials();
  } catch (error) {
    fail(error instanceof Error ? error.message : String(error));
  }

  note(``);
  note(`input   ${inputPath}`);
  note(`posts   ${posts.length}${allPosts.length > posts.length ? ` of ${allPosts.length} (--limit ${limit})` : ""}`);
  note(`model   claude-opus-5 @ effort=low`);
  note(``);

  const results: ExtractionResult[] = [];
  const usages: Usage[] = [];

  // Sequential, not parallel: the first call writes the system-prompt cache and
  // every later call reads it. Firing them concurrently would make them all
  // miss and each pay the write premium.
  for (const [index, post] of posts.entries()) {
    const label = `[${index + 1}/${posts.length}] ${post.id}`;
    const result = await extractPost(post);
    results.push(result);

    if (!result.ok) {
      // A run-level failure (bad key, no credits, wrong model) fails identically
      // on every remaining post. Stop rather than write a file full of one error.
      if (result.fatal) fail(`${result.error}`);
      note(`${label}  ERROR  ${result.error}`);
      continue;
    }

    usages.push(result.usage);
    const { extracted, problems } = result;

    note(
      `${label}  ${extracted.classification.padEnd(12)} ${extracted.confidence.padEnd(6)} ` +
        `${extracted.postLanguage}  ${extracted.businessName ?? "(no business named)"}`,
    );
    note(`         why: ${extracted.reasoning}`);
    if (extracted.contactMethod !== "none_stated") {
      note(`         contact: ${extracted.contactMethod}${extracted.contactValue ? ` — ${extracted.contactValue}` : ""}`);
    }
    if (extracted.resortName || extracted.townName) {
      note(`         where: ${[extracted.resortName, extracted.townName].filter(Boolean).join(" / ")}`);
    }
    for (const role of extracted.roles) {
      note(`         role: ${describeRole(role)}`);
    }
    for (const problem of problems) {
      note(`         ⚠ audit: ${problem}`);
    }
    note(``);
  }

  // --- summary ---

  const ok = results.filter((r) => r.ok);
  const errored = results.filter((r) => !r.ok);
  const hiring = ok.filter((r) => r.ok && r.extracted.classification === "hiring");
  const seeking = ok.filter((r) => r.ok && r.extracted.classification === "seeking_work");
  const other = ok.filter((r) => r.ok && r.extracted.classification === "other");
  const roleCount = hiring.reduce((n, r) => n + (r.ok ? r.extracted.roles.length : 0), 0);
  const flagged = ok.filter((r) => r.ok && r.problems.length > 0);
  const lowConfidence = ok.filter((r) => r.ok && r.extracted.confidence === "low");

  note(`─────────────────────────────────────────────`);
  note(`extracted        ${ok.length}/${posts.length}`);
  if (errored.length > 0) note(`errors           ${errored.length}`);
  note(`hiring           ${hiring.length}  →  ${roleCount} listing(s) would be created`);
  note(`seeking work     ${seeking.length}  →  would go to lead_posts`);
  note(`other            ${other.length}  →  discarded`);
  if (lowConfidence.length > 0) note(`low confidence   ${lowConfidence.length}`);
  if (flagged.length > 0) note(`audit warnings   ${flagged.length}`);

  const totalIn = usages.reduce((n, u) => n + u.inputTokens, 0);
  const totalOut = usages.reduce((n, u) => n + u.outputTokens, 0);
  const cacheRead = usages.reduce((n, u) => n + u.cacheReadTokens, 0);
  const cacheWrite = usages.reduce((n, u) => n + u.cacheWriteTokens, 0);
  const cost = estimateCost(usages);

  note(``);
  note(`tokens           ${totalIn} in / ${totalOut} out`);
  note(`cache            ${cacheRead} read / ${cacheWrite} written`);
  if (usages.length > 0) {
    note(`cost             $${cost.toFixed(4)} total, ~$${(cost / usages.length).toFixed(4)}/post`);
  }
  if (cacheRead === 0 && usages.length > 1) {
    note(`                 (no cache reads — the system prompt may be under the 512-token minimum)`);
  }

  const outDir = typeof flags.get("out") === "string" ? (flags.get("out") as string) : DEFAULT_OUT_DIR;
  mkdirSync(outDir, { recursive: true });
  const outPath = path.join(outDir, `extraction-${Date.now()}.json`);
  writeFileSync(outPath, `${JSON.stringify(results, null, 2)}\n`, "utf8");

  note(``);
  note(`nothing was written to Supabase and no listings were created.`);
  process.stdout.write(`${outPath}\n`);
}

main().catch((error: unknown) => {
  fail(error instanceof Error ? error.message : String(error));
});
