import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { homedir } from "node:os";
import * as path from "node:path";

/**
 * scripts/fb-monitor/ledger.ts
 *
 * Remember which posts have already been extracted, so the same advert is
 * never paid for twice.
 *
 * WHY. The collector reads the most recent posts of each group on every run,
 * and a post stays near the top of a group's feed for days. Measured across
 * four consecutive collect files, 32% of posts had been seen before. Every
 * one of those was re-extracted at full price to produce a listing already in
 * the database — 758 hiring detections over a fortnight yielded 79 net-new
 * listings, so most of the extraction bill was re-reading old news.
 *
 * KEYED ON TEXT, NOT JUST ID, which is what makes this lossless rather than a
 * tradeoff. The entry records a hash of the post text alongside its id: an
 * unchanged post is skipped, and a post an employer has edited — "position
 * filled", a changed rate — hashes differently and is extracted again. There
 * is nothing to learn from re-reading text we have already read, and anything
 * that changed is re-read automatically.
 *
 * ONLY SUCCESSFUL EXTRACTIONS ARE RECORDED. A post that failed — a 400 for an
 * empty balance, a timeout, a truncated response — is deliberately left out,
 * so the next run tries it again. Recording failures would turn a bad night
 * into permanently missing listings, which is exactly the failure this whole
 * pipeline keeps guarding against.
 *
 * Lives beside the logs in ~/.mountain-connect rather than in the repo: it is
 * one machine's memory of what it has done, not source.
 */

/**
 * Resolved per call, not once at import. The path is only ever read inside
 * the functions below, which keeps the module free of load-order surprises
 * and lets a test point it at a scratch file.
 */
function ledgerPath(): string {
  return (
    process.env.FB_LEDGER_PATH ||
    path.join(homedir(), ".mountain-connect", "extracted-ledger.json")
  );
}

/** How long an entry is trusted. Bounds the file and re-reads stale adverts. */
const TTL_DAYS = 30;
const DAY_MS = 86_400_000;

interface Entry {
  /** FNV-1a of the post text — changes when the post is edited. */
  h: string;
  /** When we last extracted it, epoch ms. */
  t: number;
}

export type Ledger = Map<string, Entry>;

/** FNV-1a, 32-bit. Same hash the lead monitor uses for its dedup keys. */
export function hashText(text: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16);
}

export function loadLedger(now: number = Date.now()): Ledger {
  let raw: string;
  try {
    raw = readFileSync(ledgerPath(), "utf8");
  } catch {
    return new Map(); // no ledger yet, or unreadable — extract everything
  }

  try {
    const parsed = JSON.parse(raw) as Record<string, Entry>;
    const out: Ledger = new Map();
    for (const [id, e] of Object.entries(parsed)) {
      // Prune on load, so the file cannot grow without bound and a long-dead
      // advert is eventually re-read.
      if (e && typeof e.t === "number" && now - e.t < TTL_DAYS * DAY_MS) out.set(id, e);
    }
    return out;
  } catch {
    // A corrupt ledger must not stop the run. Losing the memory costs money;
    // refusing to extract costs listings.
    return new Map();
  }
}

/** True when this exact post, with this exact text, has already been extracted. */
export function alreadyExtracted(ledger: Ledger, id: string, text: string): boolean {
  const e = ledger.get(id);
  return !!e && e.h === hashText(text ?? "");
}

export function record(ledger: Ledger, id: string, text: string, now: number = Date.now()): void {
  ledger.set(id, { h: hashText(text ?? ""), t: now });
}

export function saveLedger(ledger: Ledger): void {
  try {
    mkdirSync(path.dirname(ledgerPath()), { recursive: true });
    const obj: Record<string, Entry> = {};
    for (const [id, e] of ledger) obj[id] = e;
    writeFileSync(ledgerPath(), JSON.stringify(obj), "utf8");
  } catch (err) {
    // A ledger that cannot be written means the next run pays again. Worth a
    // warning, never worth failing a run that has already done its work.
    process.stderr.write(
      `  warn: could not write ledger (${err instanceof Error ? err.message : "unknown"})\n`
    );
  }
}

export { ledgerPath, TTL_DAYS };
