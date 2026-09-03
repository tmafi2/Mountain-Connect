/**
 * scripts/fb-monitor/extract-ollama.ts
 *
 * A free extraction backend: the same job as extract.ts, done by a model
 * running on this Mac instead of the Anthropic API.
 *
 * WHY THIS EXISTS. Extraction is the only part of the scrape that costs
 * money, and on 2026-08-31 the balance ran out — collection kept working and
 * every extraction returned 400, so the pipeline silently produced nothing
 * for a day. A local backend means the board keeps filling whether or not
 * there is credit on the account.
 *
 * It reuses EXTRACTION_SCHEMA and the SYSTEM_PROMPT verbatim. That is the
 * point: same contract, same instructions, so results are directly
 * comparable to the paid backend and `normaliseExtraction` / `auditExtraction`
 * work unchanged. Ollama enforces the schema server-side through its
 * `format` parameter, which is what makes a 7B model usable here at all.
 *
 * WHAT IT CANNOT DO. It is text-only. Between 7 and 45 images are downloaded
 * per run today, and a fair number of ski ads are a single poster graphic
 * with no caption — those extract to nothing here. Local vision models exist
 * and would fit in 16GB, but they are weak at reading text out of a graphic,
 * which is the entire task. So `visionUsed` is always false and the caller
 * is told, rather than quietly losing those posts.
 *
 * Its other weakness is nuance. A 7B model is markedly worse at the
 * borderline calls — "is someone asking about an instructor course, or
 * offering one?" — which is most of what the paid model spends its judgement
 * on. Every listing is reviewed by hand before publishing, so a false
 * positive costs a click; that is the error to prefer here.
 */
import {
  EXTRACTION_SCHEMA,
  normaliseExtraction,
  auditExtraction,
  type ExtractedPost,
} from "./schema";
import type { ExtractionResult, RawPost, Usage } from "./extract";
import { SYSTEM_PROMPT_TEXT } from "./extract";

const HOST = process.env.OLLAMA_HOST || "http://localhost:11434";
export const OLLAMA_MODEL = process.env.OLLAMA_MODEL || "qwen2.5:7b";

/** Local inference is free, so cost reporting is a row of zeroes. */
const NO_COST: Usage = { inputTokens: 0, outputTokens: 0, cacheReadTokens: 0, cacheWriteTokens: 0 };

/** Is a local model actually reachable and pulled? */
export async function ollamaAvailable(): Promise<{ ok: boolean; detail: string }> {
  try {
    const res = await fetch(`${HOST}/api/tags`, { signal: AbortSignal.timeout(4000) });
    if (!res.ok) return { ok: false, detail: `ollama responded ${res.status}` };
    const body = (await res.json()) as { models?: Array<{ name: string }> };
    const names = (body.models ?? []).map((m) => m.name);
    if (!names.some((n) => n === OLLAMA_MODEL || n.startsWith(OLLAMA_MODEL.split(":")[0]))) {
      return { ok: false, detail: `model ${OLLAMA_MODEL} not pulled — run: ollama pull ${OLLAMA_MODEL}` };
    }
    return { ok: true, detail: `${OLLAMA_MODEL} via ${HOST}` };
  } catch (err) {
    return {
      ok: false,
      detail: `no ollama at ${HOST} — start it with: brew services start ollama`,
    };
  }
}

function userContent(post: RawPost): string {
  return [
    `Group: ${post.group}`,
    `Author: ${post.author ?? "(unknown)"}`,
    post.postedAt ? `Posted: ${post.postedAt}` : null,
    ``,
    `Post text:`,
    post.text,
  ]
    .filter((l) => l !== null)
    .join("\n");
}

export async function extractPostLocal(post: RawPost): Promise<ExtractionResult> {
  let res: Response;
  try {
    res = await fetch(`${HOST}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: OLLAMA_MODEL,
        stream: false,
        // Schema-constrained decoding. Without this a 7B model returns prose
        // around its JSON often enough to be unusable.
        format: EXTRACTION_SCHEMA,
        options: {
          // Deterministic: the same post should not classify differently on a
          // re-run, which is what makes a paid-vs-local comparison meaningful.
          temperature: 0,
          num_ctx: 8192,
        },
        messages: [
          { role: "system", content: SYSTEM_PROMPT_TEXT },
          { role: "user", content: userContent(post) },
        ],
      }),
      // A 7B model on an M4 answers a short post in seconds; a minute means
      // something is wrong, not slow.
      signal: AbortSignal.timeout(120_000),
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    // Unreachable Ollama dooms every remaining post, exactly like a bad key.
    return { ok: false, post, error: `ollama unreachable: ${msg}`, fatal: true };
  }

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    const fatal = res.status === 404; // model not pulled — every post fails the same way
    return { ok: false, post, error: `ollama ${res.status}: ${body.slice(0, 200)}`, fatal };
  }

  let content: string;
  try {
    const body = (await res.json()) as { message?: { content?: string } };
    content = body.message?.content ?? "";
  } catch (err) {
    return { ok: false, post, error: "ollama returned unparseable JSON envelope", fatal: false };
  }

  let extracted: ExtractedPost;
  try {
    extracted = normaliseExtraction(JSON.parse(content));
  } catch (err) {
    // Schema-constrained decoding makes this rare, not impossible — a small
    // model can still stop mid-object when it runs out of context.
    return {
      ok: false,
      post,
      error: `could not parse extraction: ${err instanceof Error ? err.message : String(err)}`,
      fatal: false,
    };
  }

  return {
    ok: true,
    post,
    extracted,
    problems: auditExtraction(extracted),
    usage: NO_COST,
    visionUsed: false,
    passes: 1,
  };
}
