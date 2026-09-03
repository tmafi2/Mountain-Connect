/**
 * scripts/fb-monitor/triage-local.ts
 *
 * A free local model decides which posts are worth paying to extract.
 *
 * WHY TRIAGE AND NOT EXTRACTION. Both were measured against posts the paid
 * model had already judged, same model (qwen2.5:7b), same machine:
 *
 *              full 17-field extraction     one yes/no question
 *   jobs lost           11 of 30                    1 of 40
 *   speed              13.5s / post               1.2s / post
 *
 * Losing a third of the listings is not a trade worth making at any price,
 * and the difference is not the model's judgement — it is the schema. Asked
 * to fill seventeen fields under constrained decoding, a 7B model spends its
 * capacity on the shape and gets the substance wrong. Asked one question, it
 * is close to the paid model. So it is given exactly one question.
 *
 * THE ASYMMETRY IS DELIBERATE. A false alarm sends a post to the paid model
 * that turns out not to be a job — it costs about a penny, which is the
 * outcome we already have today. A miss means a real job is never seen by
 * anyone. The prompt is written to be generous, and the measured split was
 * 6 false alarms to 1 miss, which is the right shape.
 *
 * Anything the local model cannot answer — timeout, unreachable, malformed —
 * is SENT. A broken triage must degrade into today's behaviour, never into
 * a silently emptier board.
 */

const HOST = process.env.OLLAMA_HOST || "http://localhost:11434";
export const TRIAGE_MODEL = process.env.OLLAMA_TRIAGE_MODEL || "qwen2.5:7b";

/**
 * Deliberately broader than the platform's own definition of a job. Casual
 * shifts and one-off cash work are most of what these groups carry, and the
 * measured misses were all of that kind before the prompt named them.
 */
const TRIAGE_PROMPT = `You decide whether a Facebook post is someone OFFERING work to others.

Answer yes if the post offers any paid or unpaid work, however informal:
casual shifts, one-off tasks, cash jobs, seasonal roles, help exchanges,
work-for-accommodation, apprenticeships or training that leads to work,
"looking for a cleaner", "need someone to...", "$25/hr for someone to...".

Answer no only when nobody is offering work: gear for sale, someone asking
FOR a job or advertising themselves, accommodation wanted or offered,
questions, recommendations, events, chat.

When you are unsure, answer yes.`;

export interface TriageVerdict {
  send: boolean;
  /** Set when the local model could not be consulted — the post is sent anyway. */
  degraded?: string;
}

export async function triageAvailable(): Promise<{ ok: boolean; detail: string }> {
  try {
    const res = await fetch(`${HOST}/api/tags`, { signal: AbortSignal.timeout(4000) });
    if (!res.ok) return { ok: false, detail: `ollama responded ${res.status}` };
    const body = (await res.json()) as { models?: Array<{ name: string }> };
    const names = (body.models ?? []).map((m) => m.name);
    const base = TRIAGE_MODEL.split(":")[0];
    if (!names.some((n) => n === TRIAGE_MODEL || n.startsWith(base))) {
      return { ok: false, detail: `${TRIAGE_MODEL} not pulled — run: ollama pull ${TRIAGE_MODEL}` };
    }
    return { ok: true, detail: `${TRIAGE_MODEL} via ${HOST}` };
  } catch {
    return { ok: false, detail: `no ollama at ${HOST} — start with: brew services start ollama` };
  }
}

export async function triageLocal(text: string, hasImages = false): Promise<TriageVerdict> {
  // An image-only post cannot be judged from its text, and reading the image
  // is the paid model's job. Always send.
  if (hasImages && (text ?? "").trim().length < 120) return { send: true };

  try {
    const res = await fetch(`${HOST}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: TRIAGE_MODEL,
        stream: false,
        format: {
          type: "object",
          properties: { offers_work: { type: "boolean" } },
          required: ["offers_work"],
        },
        options: { temperature: 0, num_ctx: 4096 },
        messages: [
          { role: "system", content: TRIAGE_PROMPT },
          // Truncated: the decision is always made in the opening lines, and
          // a long post is the slow case on a laptop.
          { role: "user", content: (text ?? "").slice(0, 3000) },
        ],
      }),
      signal: AbortSignal.timeout(30_000),
    });

    if (!res.ok) return { send: true, degraded: `ollama ${res.status}` };
    const body = (await res.json()) as { message?: { content?: string } };
    const parsed = JSON.parse(body.message?.content ?? "{}");
    if (typeof parsed.offers_work !== "boolean") {
      return { send: true, degraded: "no boolean in reply" };
    }
    return { send: parsed.offers_work };
  } catch (err) {
    return { send: true, degraded: err instanceof Error ? err.message.slice(0, 60) : "triage failed" };
  }
}
