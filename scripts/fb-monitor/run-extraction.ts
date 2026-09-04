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
import { prefilter } from "./prefilter";
import { loadLedger, saveLedger, record, alreadyExtracted } from "./ledger";
import { triageAvailable, triageLocal } from "./triage-local";

import {
  assertCredentials,
  estimateCost,
  extractPost,
  type ExtractionResult,
  type RawPost,
  type Usage,
  type VisionMode,
} from "./extract";

const USAGE = `
Usage: npm run fb:extract -- [--file <path>] [--limit 10] [--vision auto]

  --file    JSON array of posts (default: the bundled sample fixtures)
  --limit   process at most this many posts (default 10)
  --out     where to write results (default scripts/fb-monitor/out/)
  --vision  auto (default) | always | never
              auto   text first, re-run with images only when a hiring post
                     looks like its substance is in the graphic
              always send images on the first pass (costlier, no second call)
              never  text only

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
    if (post.images !== undefined && !Array.isArray(post.images)) {
      fail(`posts[${index}].images must be an array of file paths or URLs.`);
    }
    return {
      id: typeof post.id === "string" && post.id ? post.id : `post-${index + 1}`,
      group: post.group,
      author: typeof post.author === "string" ? post.author : null,
      text: post.text,
      permalink: typeof post.permalink === "string" ? post.permalink : null,
      postedAt: typeof post.postedAt === "string" ? post.postedAt : null,
      images: Array.isArray(post.images)
        ? post.images.filter((i): i is string => typeof i === "string" && i.trim() !== "")
        : undefined,
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

  const rawVision = flags.get("vision");
  const vision: VisionMode =
    rawVision === undefined || rawVision === true ? "auto" : (rawVision as VisionMode);
  if (!["auto", "always", "never"].includes(vision)) {
    fail(`--vision must be auto, always or never (got ${JSON.stringify(rawVision)}).`);
  }

  const allPosts = readPosts(inputPath);
  const limited = allPosts.slice(0, limit);

  // Before any model call: a missing key is one setup problem, not N per-post
  // failures followed by an empty results file.
  try {
    assertCredentials();
  } catch (error) {
    fail(error instanceof Error ? error.message : String(error));
  }

  note(``);
  note(`input   ${inputPath}`);
  note(`posts   ${limited.length}${allPosts.length > limited.length ? ` of ${allPosts.length} (--limit ${limit})` : ""}`);
  note(`model   claude-opus-5 @ effort=low, vision=${vision}`);
  const withImages = allPosts.filter((p) => p.images?.length).length;
  if (withImages > 0) note(`images  ${withImages} of ${allPosts.length} posts have attachments`);
  note(``);

  // Gate 1 — posts already extracted, unchanged. Exact rather than heuristic,
  // so it runs before the keyword filter. A post stays near the top of a
  // group's feed for days and is re-collected every night; 32% of a recent
  // sample had been seen before, and every one was being paid for again to
  // produce a listing already in the database.
  const ledger = loadLedger();
  const seenBefore: string[] = [];
  const unseen = limited.filter((p) => {
    if (alreadyExtracted(ledger, p.id, p.text ?? "")) { seenBefore.push(p.id); return false; }
    return true;
  });
  if (seenBefore.length > 0) {
    note(`ledger  ${seenBefore.length} of ${limited.length} already extracted, unchanged since`);
    note(``);
  }

  // Drop what obviously is not a job before it costs anything. Replayed over
  // 688 real posts this removes 16% of the extraction bill — 62 people
  // advertising themselves and 46 sales, questions and chat — without losing
  // a single listing the model called hiring. It is built to be wrong in the
  // cheap direction: an unrecognised post is always sent.
  const skipped: Array<{ id: string; reason: string }> = [];
  const posts = unseen.filter((p) => {
    const v = prefilter(p.text, (p.images?.length ?? 0) > 0);
    if (!v.send) skipped.push({ id: p.id, reason: v.reason ?? "not a job ad" });
    return v.send;
  });
  if (skipped.length > 0) {
    note(`prefilter ${skipped.length} of ${unseen.length} skipped before extraction (not job ads)`);
    for (const s of skipped.slice(0, 8)) note(`         · ${s.id} — ${s.reason}`);
    if (skipped.length > 8) note(`         … and ${skipped.length - 8} more`);
    note(``);
  }

  // Second gate, optional and free: a local model answers one question —
  // "does this post offer work?" — about whatever the keyword filter let
  // through. Measured at 1 miss in 40 against the paid model's own verdicts,
  // versus 11 in 30 when the same local model was asked to do the whole
  // extraction. Off unless FB_LOCAL_TRIAGE=1, and anything it cannot answer
  // is sent, so a broken Ollama degrades to today's behaviour.
  let triaged = posts;
  if (process.env.FB_LOCAL_TRIAGE === "1") {
    const avail = await triageAvailable();
    if (!avail.ok) {
      note(`triage  SKIPPED — ${avail.detail}`);
      note(``);
    } else {
      note(`triage  ${avail.detail}`);
      const keep: typeof posts = [];
      let rejected = 0, degraded = 0;
      for (const p of posts) {
        const v = await triageLocal(p.text, (p.images?.length ?? 0) > 0);
        if (v.degraded) degraded++;
        if (v.send) keep.push(p); else rejected++;
      }
      note(`triage  ${rejected} of ${posts.length} judged not to offer work${degraded ? ` (${degraded} sent after a local failure)` : ""}`);
      note(``);
      triaged = keep;
    }
  }

  const results: ExtractionResult[] = [];
  const usages: Usage[] = [];

  // Sequential, not parallel: the first call writes the system-prompt cache and
  // every later call reads it. Firing them concurrently would make them all
  // miss and each pay the write premium.
  for (const [index, post] of triaged.entries()) {
    const label = `[${index + 1}/${triaged.length}] ${post.id}`;
    const result = await extractPost(post, vision);
    results.push(result);
    // Recorded only on success: a post that failed — an empty balance, a
    // timeout — must be tried again tomorrow, not remembered as done.
    if (result.ok) record(ledger, post.id, post.text ?? "");

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
        `${extracted.postLanguage}  ${extracted.businessName ?? "(no business named)"}` +
        `${result.visionUsed ? "  [vision]" : ""}`,
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
  const escalated = ok.filter((r) => r.ok && r.passes > 1).length;
  const visioned = ok.filter((r) => r.ok && r.visionUsed).length;
  if (visioned > 0) {
    note(`vision used      ${visioned}${escalated > 0 ? ` (${escalated} via escalation, 2 calls each)` : ""}`);
  }
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
  // Persisted once, after the results are safely on disk. Written even when
  // some posts failed — the successes still deserve to be remembered, and the
  // failures were never recorded in the first place.
  saveLedger(ledger);

  writeFileSync(outPath, `${JSON.stringify(results, null, 2)}\n`, "utf8");

  note(``);
  note(`nothing was written to Supabase and no listings were created.`);
  process.stdout.write(`${outPath}\n`);
}

main().catch((error: unknown) => {
  fail(error instanceof Error ? error.message : String(error));
});
