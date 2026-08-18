/**
 * scripts/fb-monitor/extract.ts
 *
 * Sends one community-group post to Claude and gets back the structured shape
 * defined in schema.ts.
 *
 * Uses the official @anthropic-ai/sdk rather than raw fetch. That differs from
 * scripts/lead-monitor, which is deliberately dependency-free — but that CLI is
 * two plain HTTP calls against PostgREST, whereas this is a real model
 * integration where the SDK carries retries, typed errors, structured-output
 * plumbing and beta handling we would otherwise hand-roll.
 *
 * Four things worth knowing about the request shape:
 *
 *  1. STRUCTURED OUTPUTS, not tool-use. `output_config.format` with a
 *     json_schema constrains the response directly, so there is no tool-call
 *     round trip and no hand-written JSON parsing to get wrong.
 *
 *  2. PROMPT CACHING. The system prompt carries the whole schema contract and
 *     never varies; only the post changes. A cache breakpoint on the last
 *     system block means post 2 onward reads it at ~0.1x input price. Posts are
 *     processed SEQUENTIALLY for this reason: a cache entry is only readable
 *     once the first response has started streaming, so parallel requests would
 *     all miss it and each pay the write premium.
 *
 *  3. LOW EFFORT, THINKING LEFT ON. Thinking is on by default on Claude Opus 5,
 *     and disabling it has documented failure modes. Extraction is exactly the
 *     kind of bounded task where `effort: "low"` holds quality while cutting
 *     tokens, so that is the cost lever rather than turning thinking off.
 *
 *  4. VISION, BUT ONLY WHEN IT EARNS ITS KEEP. Real hiring posts routinely put
 *     everything that matters — the roles, the pay, the email — inside a
 *     graphic, leaving post text like "We are looking for seasonal staff for
 *     this upcoming winter season…". Text-only extraction correctly reports low
 *     confidence on those, and correctly gets nothing useful.
 *
 *     Images are not cheap: on Claude Opus 5 a full-resolution image can cost
 *     up to ~4,800 input tokens, several times a whole text-only extraction. So
 *     the default mode is ESCALATION — extract from text first, and re-run with
 *     images only when the text result looks like an ad whose substance is
 *     missing (see needsVision). Job-seeker posts and chatter, which are the
 *     bulk of any group, never pay for vision at all.
 */
import { readFileSync } from "node:fs";
import * as path from "node:path";

import Anthropic from "@anthropic-ai/sdk";

import { loadEnvFile } from "../lead-monitor/common";
import {
  auditExtraction,
  countUnionParams,
  EXTRACTION_SCHEMA,
  normaliseExtraction,
  UNION_PARAM_LIMIT,
  type ExtractedPost,
} from "./schema";

/** Claude Opus 5 — $5/M input, $25/M output, and cache reads at ~0.1x input. */
const MODEL = "claude-opus-5";

/** Generous: thinking and the response share this budget on Claude Opus 5. */
const MAX_TOKENS = 8000;

/**
 * Cap on images sent per post. Group ads overwhelmingly put the whole offer in
 * ONE graphic; the rest of the attachments are staff photos and powder shots
 * that cost ~4,800 tokens each to tell us nothing.
 */
const MAX_IMAGES_PER_POST = 2;

/** Anthropic's per-image ceiling. Larger files are skipped with a warning. */
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

const MEDIA_TYPES: Readonly<Record<string, "image/jpeg" | "image/png" | "image/gif" | "image/webp">> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".gif": "image/gif",
  ".webp": "image/webp",
};

/**
 * Server-side refusal fallback. Recommended by default on Claude Opus 5 — its
 * safety classifiers can decline a request outright, and a fallback recovers it
 * server-side instead of handing us an empty response. Job-ad extraction should
 * never trip a classifier, so if the beta is unavailable we downgrade silently
 * rather than fail the run (see callModel below).
 */
const USE_REFUSAL_FALLBACK = true;
const FALLBACK_BETA = "server-side-fallback-2026-07-01";

/** How aggressively to use images. */
export type VisionMode = "auto" | "always" | "never";

export type RawPost = {
  /** Stable id so results can be matched back to their source. */
  id: string;
  group: string;
  author: string | null;
  text: string;
  permalink: string | null;
  postedAt: string | null;
  /** Local file paths or http(s) URLs of images attached to the post. */
  images?: string[];
};

export type ExtractionResult =
  | {
      ok: true;
      post: RawPost;
      extracted: ExtractedPost;
      problems: string[];
      usage: Usage;
      /** True when the returned extraction was produced with images attached. */
      visionUsed: boolean;
      /** 1 for text-only, 2 when the text pass escalated to vision. */
      passes: number;
    }
  /**
   * `fatal` means the whole run is doomed, not just this post — a bad key,
   * missing credits, a bad schema. Retrying the remaining posts would produce
   * N copies of the same error and a results file full of nothing, so the
   * caller stops instead.
   */
  | { ok: false; post: RawPost; error: string; fatal: boolean };

export type Usage = {
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  cacheWriteTokens: number;
};

const SYSTEM_PROMPT = `You read posts from ski-region community groups and extract structured hiring data.

CLASSIFY FIRST
- "hiring": a business or an individual wants to take someone on.
- "seeking_work": someone is looking for a job for themselves.
- "other": everything else — gear for sale, accommodation wanted, group admin announcements, lift-line chat, lost dogs.
Most posts in these groups are NOT hiring ads. Two traps worth naming: a post listing the author's own past roles ("I've worked as a head chef and sous chef") is seeking_work, not a chef vacancy; and a group announcement telling employers to post jobs is "other", not hiring.

ONE ENTRY PER DISTINCT ROLE
"Need 2 lift operators and a chef" is TWO role entries: lift operator with positionsAvailable 2, chef with positionsAvailable 1. A single role advertised for multiple people is ONE entry with a count, not repeated entries.

IMAGES CARRY THE REAL AD
When an image is attached, read it carefully — group hiring posts routinely put the whole offer in a graphic while the post text says only "we're hiring for this season". Roles, pay, contact email and the business name are frequently image-only. Treat text in an image as fully authoritative, exactly as if it had been typed into the post. Ignore decorative photos of staff, snow and scenery.

NEVER INVENT A DATE
Only produce startDate or endDate when the post states a specific date you could put in a calendar. "Starting December", "ASAP", "for the winter season", "Winter 2026/27" and "from next month" are all null. A null date is correct and useful; a guessed date silently corrupts the listing. This rule outranks any temptation to be helpful.

NULL MEANS THE POST DID NOT SAY
Do not infer pay from what the role usually pays, accommodation from what resorts usually offer, or a business name from the poster's own name. If it is not in the text or an image, it is not stated. The one exception is payCurrency, which you may infer from an unambiguous country — a dollar figure in a Whistler post is CAD.

CONFIDENCE, HONESTLY
Everything you return is reviewed by a human before it goes live, so "low" costs nothing and mislabelled "high" costs trust. Use "low" when the post is vague, machine-translated, or you are unsure whether it is really a job ad. Put the specific doubt in the reasoning field.

LANGUAGE
Japanese, French and mixed-language posts are normal. Extract into the same English field structure and set postLanguage to the dominant language. Keep businessName in the script the post used — that is how the business writes its own name. But give jobTitle, resortName and townName in ENGLISH: those are matched against English tables and read by English-speaking workers, so "Niseko" not "ニセコ", "Front Desk Staff" not "フロントスタッフ".

Use only the enum values given in the schema. Prefer "Other" over inventing a category.`;

let client: Anthropic | null = null;
let fallbackAvailable = USE_REFUSAL_FALLBACK;

/** Lazily construct the client so --help and fixtures work without a key. */
function getClient(): Anthropic {
  if (client) return client;

  loadEnvFile(".env.local");

  if (!process.env.ANTHROPIC_API_KEY?.trim()) {
    throw new Error(
      "ANTHROPIC_API_KEY is not set.\n\n" +
        "Add it to .env.local (already gitignored):\n" +
        "  ANTHROPIC_API_KEY=sk-ant-...\n\n" +
        "Get one from https://console.anthropic.com/settings/keys",
    );
  }

  client = new Anthropic();
  return client;
}

/**
 * Run-level preflight: credentials, and the schema's union-parameter budget.
 *
 * Both fail identically on every post, so discovering them inside the per-post
 * catch turns one setup problem into N copies of it plus a useless results file.
 * The union check exists because breaching the cap is a 400 whose message points
 * at the schema, not at the line you just edited. Throws; callers render it.
 */
export function assertCredentials(): void {
  const unions = countUnionParams();
  if (unions > UNION_PARAM_LIMIT) {
    throw new Error(
      `The extraction schema has ${unions} union-typed (nullable) parameters, ` +
        `over the structured-outputs limit of ${UNION_PARAM_LIMIT}.\n\n` +
        `  Make a field non-nullable in schema.ts: use "" for strings, a\n` +
        `  NOT_STATED enum member for closed sets, or the TRI_STATE enum for\n` +
        `  yes/no/unmentioned booleans — then map it back in normaliseExtraction.`,
    );
  }
  getClient();
}

type ImageBlock = {
  type: "image";
  source:
    | { type: "url"; url: string }
    | { type: "base64"; media_type: "image/jpeg" | "image/png" | "image/gif" | "image/webp"; data: string };
};

/**
 * Turn image references into content blocks.
 *
 * http(s) references are handed to the API to fetch. Anything else is read from
 * disk and inlined as base64 — which is what a collector should do, because
 * Facebook's CDN URLs are signed and expire, so a URL that works during the
 * crawl may 403 by the time it is re-processed.
 *
 * Unreadable or oversized images are skipped with a warning rather than failing
 * the post: a missing decorative photo should never cost us the whole ad.
 */
function buildImageBlocks(images: readonly string[], postId: string): ImageBlock[] {
  const blocks: ImageBlock[] = [];

  for (const reference of images.slice(0, MAX_IMAGES_PER_POST)) {
    if (/^https?:\/\//i.test(reference)) {
      blocks.push({ type: "image", source: { type: "url", url: reference } });
      continue;
    }

    const mediaType = MEDIA_TYPES[path.extname(reference).toLowerCase()];
    if (!mediaType) {
      process.stderr.write(`  warn [${postId}]: unsupported image type, skipped: ${reference}\n`);
      continue;
    }

    try {
      const bytes = readFileSync(reference);
      if (bytes.byteLength > MAX_IMAGE_BYTES) {
        process.stderr.write(
          `  warn [${postId}]: image over ${Math.round(MAX_IMAGE_BYTES / 1024 / 1024)}MB, skipped: ${reference}\n`,
        );
        continue;
      }
      blocks.push({
        type: "image",
        source: { type: "base64", media_type: mediaType, data: bytes.toString("base64") },
      });
    } catch (error) {
      process.stderr.write(
        `  warn [${postId}]: could not read image ${reference} (${
          error instanceof Error ? error.message : String(error)
        })\n`,
      );
    }
  }

  if (images.length > MAX_IMAGES_PER_POST) {
    process.stderr.write(
      `  note [${postId}]: ${images.length} images attached, sending the first ${MAX_IMAGES_PER_POST}\n`,
    );
  }

  return blocks;
}

/** Build the user turn. Stable content lives in the system prompt, above the cache breakpoint. */
function userContent(post: RawPost, withImages: boolean): Array<ImageBlock | { type: "text"; text: string }> {
  const header = [
    `Group: ${post.group}`,
    `Author: ${post.author ?? "(unknown)"}`,
    post.postedAt ? `Posted: ${post.postedAt}` : null,
    ``,
    `Post text:`,
    post.text,
  ]
    .filter((line) => line !== null)
    .join("\n");

  const blocks: Array<ImageBlock | { type: "text"; text: string }> = [];

  // Images before the text: the model reads the attachment, then the framing.
  if (withImages && post.images?.length) {
    blocks.push(...buildImageBlocks(post.images, post.id));
  }
  blocks.push({ type: "text", text: header });

  return blocks;
}

/**
 * One model call, with a one-time downgrade if the refusal-fallback beta is not
 * available on this account. Everything else is left to the SDK's own retry.
 */
async function callModel(post: RawPost, withImages: boolean): Promise<Anthropic.Message> {
  const anthropic = getClient();

  const request = {
    model: MODEL,
    max_tokens: MAX_TOKENS,
    // Cache breakpoint on the system prompt: it is identical for every post,
    // so each subsequent call in a run reads it instead of re-paying for it.
    system: [
      {
        type: "text" as const,
        text: SYSTEM_PROMPT,
        cache_control: { type: "ephemeral" as const },
      },
    ],
    output_config: {
      effort: "low" as const,
      format: { type: "json_schema" as const, schema: EXTRACTION_SCHEMA },
    },
    messages: [{ role: "user" as const, content: userContent(post, withImages) }],
  } as unknown as Anthropic.MessageCreateParamsNonStreaming;

  if (!fallbackAvailable) {
    return anthropic.messages.create(request);
  }

  try {
    return (await anthropic.beta.messages.create({
      ...request,
      betas: [FALLBACK_BETA],
      fallbacks: "default",
    } as Parameters<typeof anthropic.beta.messages.create>[0])) as Anthropic.Message;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const isBetaProblem = error instanceof Anthropic.BadRequestError && /fallback|beta/i.test(message);

    if (!isBetaProblem) throw error;

    // Not fatal: the fallback is insurance against refusals we do not expect
    // for this workload anyway. Note it once and carry on without it.
    process.stderr.write(
      `note: refusal-fallback beta unavailable, continuing without it (${message.slice(0, 120)})\n`,
    );
    fallbackAvailable = false;
    return anthropic.messages.create(request);
  }
}

/**
 * Distinguish "this post failed" from "the run cannot work".
 *
 * A truncated key, exhausted credits or a malformed schema will fail identically
 * on every post, so there is no point discovering it eight times.
 */
function isFatalForRun(error: unknown): { fatal: boolean; hint?: string } {
  if (error instanceof Anthropic.AuthenticationError) {
    return {
      fatal: true,
      hint:
        "The ANTHROPIC_API_KEY in .env.local was rejected. Keys are ~100+ characters —\n" +
        "  if yours is much shorter the copy was truncated. Re-copy it from\n" +
        "  https://console.anthropic.com/settings/keys",
    };
  }
  // 403 covers both permission_error and billing_error, so this one branch is
  // also the out-of-credits case — by far the likelier of the two here.
  if (error instanceof Anthropic.PermissionDeniedError) {
    return {
      fatal: true,
      hint:
        "The key is valid but the request was refused (403). Usually this means the\n" +
        "  API account has no credits — separate from a Claude subscription:\n" +
        "  https://console.anthropic.com/settings/billing",
    };
  }
  if (error instanceof Anthropic.NotFoundError) {
    return { fatal: true, hint: `Model "${MODEL}" was not found for this account.` };
  }
  // A rejected request shape (bad schema, bad parameter) is not post-specific —
  // it will fail the same way on all of them. Beta-availability 400s are caught
  // earlier in callModel and downgraded, so they never reach here.
  if (error instanceof Anthropic.BadRequestError) {
    return {
      fatal: true,
      hint: "The request itself was rejected, so every post would fail the same way.",
    };
  }
  return { fatal: false };
}

/** Parse one response into a normalised extraction, or an error string. */
function readResponse(response: Anthropic.Message): { extracted: ExtractedPost } | { error: string } {
  // Check stop_reason BEFORE touching content. On a refusal the content array
  // is empty (pre-output) or partial (mid-stream), so indexing it blindly is
  // how this would crash in production.
  if (response.stop_reason === "refusal") {
    const category = response.stop_details?.category ?? "unspecified";
    return { error: `model declined to answer (category: ${category})` };
  }
  if (response.stop_reason === "max_tokens") {
    return { error: `hit max_tokens (${MAX_TOKENS}) — response truncated, raise MAX_TOKENS` };
  }

  const text = response.content
    .filter((block): block is Anthropic.TextBlock => block.type === "text")
    .map((block) => block.text)
    .join("");

  if (!text.trim()) return { error: `empty response (stop_reason: ${response.stop_reason})` };

  try {
    // Sentinels ("" / NOT_STATED / tri-state) become null here, once.
    return { extracted: normaliseExtraction(JSON.parse(text)) };
  } catch (error) {
    return {
      error: `response was not valid JSON despite structured outputs: ${
        error instanceof Error ? error.message : String(error)
      }`,
    };
  }
}

/**
 * Should the text-only result be re-run with images attached?
 *
 * Only hiring posts qualify: a job-seeker's holiday snaps and a group admin's
 * welcome graphic have nothing to add, and vision on those is pure cost. Within
 * hiring posts, escalate when the substance an actual listing needs is missing —
 * which is precisely the signature of an ad whose content lives in the graphic.
 */
function needsVision(extracted: ExtractedPost, post: RawPost): boolean {
  if (!post.images?.length) return false;
  if (extracted.classification !== "hiring") return false;

  return (
    extracted.confidence !== "high" ||
    extracted.roles.length === 0 ||
    extracted.businessName === null ||
    extracted.contactMethod === "none_stated"
  );
}

function toUsage(response: Anthropic.Message): Usage {
  return {
    inputTokens: response.usage.input_tokens,
    outputTokens: response.usage.output_tokens,
    cacheReadTokens: response.usage.cache_read_input_tokens ?? 0,
    cacheWriteTokens: response.usage.cache_creation_input_tokens ?? 0,
  };
}

function addUsage(a: Usage, b: Usage): Usage {
  return {
    inputTokens: a.inputTokens + b.inputTokens,
    outputTokens: a.outputTokens + b.outputTokens,
    cacheReadTokens: a.cacheReadTokens + b.cacheReadTokens,
    cacheWriteTokens: a.cacheWriteTokens + b.cacheWriteTokens,
  };
}

/**
 * Extract one post. Per-post problems return ok:false; run-level ones set fatal.
 *
 * In "auto" mode this may make two calls: text first, then a re-run with images
 * when the text result looks like an ad missing its substance. Both calls are
 * billed, and `usage` is their sum.
 */
export async function extractPost(
  post: RawPost,
  mode: VisionMode = "auto",
): Promise<ExtractionResult> {
  const hasImages = Boolean(post.images?.length);
  const firstPassWithImages = mode === "always" && hasImages;

  let response: Anthropic.Message;
  try {
    response = await callModel(post, firstPassWithImages);
  } catch (error) {
    const { fatal, hint } = isFatalForRun(error);
    const base = error instanceof Error ? error.message : String(error);
    return { ok: false, post, error: hint ? `${base}\n\n  ${hint}` : base, fatal };
  }

  const first = readResponse(response);
  if ("error" in first) return { ok: false, post, error: first.error, fatal: false };

  let extracted = first.extracted;
  let usage = toUsage(response);
  let visionUsed = firstPassWithImages;
  let passes = 1;

  if (mode === "auto" && needsVision(extracted, post)) {
    try {
      const second = await callModel(post, true);
      const parsed = readResponse(second);
      usage = addUsage(usage, toUsage(second));
      passes = 2;
      // Keep the text-only result if the vision pass fails — a degraded row
      // beats no row, and the audit will still flag what is missing.
      if (!("error" in parsed)) {
        extracted = parsed.extracted;
        visionUsed = true;
      }
    } catch {
      // Same reasoning: a failed escalation must not lose the first result.
    }
  }

  return {
    ok: true,
    post,
    extracted,
    problems: auditExtraction(extracted),
    usage,
    visionUsed,
    passes,
  };
}

/** Per-million-token list prices for MODEL, used for the run cost estimate. */
const PRICE_PER_MTOK = { input: 5, output: 25, cacheRead: 0.5, cacheWrite: 6.25 };

export function estimateCost(usages: readonly Usage[]): number {
  return usages.reduce(
    (total, u) =>
      total +
      (u.inputTokens * PRICE_PER_MTOK.input +
        u.outputTokens * PRICE_PER_MTOK.output +
        u.cacheReadTokens * PRICE_PER_MTOK.cacheRead +
        u.cacheWriteTokens * PRICE_PER_MTOK.cacheWrite) /
        1_000_000,
    0,
  );
}
