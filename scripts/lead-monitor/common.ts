/**
 * scripts/lead-monitor/common.ts
 *
 * Shared plumbing for the lead-monitor CLI: env loading, credential
 * resolution, region normalisation, and a thin PostgREST client.
 *
 * No dependencies on purpose. This is two HTTP calls against PostgREST, so
 * it does not need supabase-js — and it deliberately does not use dotenv
 * either, which every other script in scripts/ imports without it being a
 * declared dependency in package.json (it resolves transitively today, which
 * is luck rather than design).
 */
import { readFileSync } from "node:fs";

// --- regions ---------------------------------------------------------------

export const REGIONS = ["Canada", "USA", "Japan", "Australia"] as const;
export type Region = (typeof REGIONS)[number];

/**
 * Aliases accepted on input. "USA" ≡ "United States" matches how
 * lib/work-eligibility.ts already normalises country names.
 */
const REGION_ALIASES: Readonly<Record<string, Region>> = {
  canada: "Canada",
  ca: "Canada",
  can: "Canada",
  usa: "USA",
  us: "USA",
  "u.s.": "USA",
  "u.s.a.": "USA",
  "united states": "USA",
  "united states of america": "USA",
  america: "USA",
  japan: "Japan",
  jp: "Japan",
  jpn: "Japan",
  australia: "Australia",
  au: "Australia",
  aus: "Australia",
};

/** Canonicalise a region string, or null if it is not one of the four. */
export function normaliseRegion(raw: unknown): Region | null {
  if (raw === null || raw === undefined) return null;
  const key = String(raw).trim().toLowerCase().replace(/\s+/g, " ");
  return REGION_ALIASES[key] ?? null;
}

// --- env -------------------------------------------------------------------

/**
 * Minimal .env parser: KEY=VALUE, optional `export ` prefix, optional
 * matching quotes, `#` comments. Existing process.env wins, so a shell
 * export overrides the file — same precedence as dotenv.
 *
 * A missing file is not an error: credentials may come from the real
 * environment (CI, a shell export) instead.
 */
export function loadEnvFile(filePath = ".env.local"): void {
  let raw: string;
  try {
    raw = readFileSync(filePath, "utf8");
  } catch {
    return;
  }

  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const body = trimmed.startsWith("export ")
      ? trimmed.slice("export ".length).trim()
      : trimmed;

    const eq = body.indexOf("=");
    if (eq === -1) continue;

    const key = body.slice(0, eq).trim();
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) continue;

    let value = body.slice(eq + 1).trim();

    const quoted =
      value.length >= 2 &&
      ((value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'")));

    if (quoted) {
      const quote = value[0];
      value = value.slice(1, -1);
      // Only double quotes carry escapes, matching dotenv.
      if (quote === '"') value = value.replace(/\\n/g, "\n").replace(/\\r/g, "\r");
    } else {
      // Strip an unquoted trailing comment, but only when whitespace
      // precedes the # — so a value that legitimately contains one survives.
      value = value.replace(/\s+#.*$/, "");
    }

    if (!(key in process.env)) process.env[key] = value;
  }
}

// --- credentials -----------------------------------------------------------

export type SupabaseTarget = {
  readonly url: string;
  readonly serviceKey: string;
};

/**
 * Accepted spellings, in precedence order. SUPABASE_URL /
 * SUPABASE_SERVICE_KEY are the documented names; the NEXT_PUBLIC_ / _ROLE_
 * variants are what .env.local already holds and what the other eight
 * scripts in scripts/ use.
 */
const URL_VARS = ["SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_URL"] as const;
const KEY_VARS = ["SUPABASE_SERVICE_KEY", "SUPABASE_SERVICE_ROLE_KEY"] as const;

function firstSet(names: readonly string[]): { name: string; value: string } | null {
  for (const name of names) {
    const value = process.env[name];
    if (value && value.trim()) return { name, value: value.trim() };
  }
  return null;
}

/** Decode a Supabase JWT's role claim, if the key is a JWT at all. */
function jwtRole(key: string): string | null {
  const parts = key.split(".");
  if (parts.length !== 3) return null;
  try {
    const payload = Buffer.from(
      parts[1].replace(/-/g, "+").replace(/_/g, "/"),
      "base64",
    ).toString("utf8");
    const parsed: unknown = JSON.parse(payload);
    if (parsed && typeof parsed === "object" && "role" in parsed) {
      const role = (parsed as { role?: unknown }).role;
      return typeof role === "string" ? role : null;
    }
  } catch {
    return null;
  }
  return null;
}

/**
 * Resolve credentials or exit with a message naming every accepted variable.
 *
 * Also refuses a positively-identified anon/publishable key. That matters
 * here: lead_posts has RLS enabled with no policies, so an anon key does not
 * error — it quietly returns zero rows, which would look like "no leads yet"
 * rather than "wrong key".
 */
export function resolveTarget(): SupabaseTarget {
  loadEnvFile(".env.local");

  const url = firstSet(URL_VARS);
  const key = firstSet(KEY_VARS);

  if (!url || !key) {
    const missing: string[] = [];
    if (!url) missing.push(`  URL — set one of: ${URL_VARS.join(" or ")}`);
    if (!key) missing.push(`  KEY — set one of: ${KEY_VARS.join(" or ")}`);

    fail(
      `Missing Supabase credentials in .env.local (or the environment).\n\n` +
        `${missing.join("\n")}\n\n` +
        `The key must be the SERVICE ROLE key: lead_posts has RLS enabled with\n` +
        `no policies, so nothing else can read or write it.`,
    );
  }

  // Only reject a key we can POSITIVELY identify as public. An unrecognised
  // key format is left alone — better to let Supabase reject it than to
  // block a valid key we simply do not recognise.
  const looksPublic =
    jwtRole(key.value) === "anon" || key.value.startsWith("sb_publishable_");

  if (looksPublic) {
    fail(
      `${key.name} looks like an ANON / publishable key, not the service role key.\n\n` +
        `lead_posts has RLS enabled with no policies, so an anon key will not\n` +
        `error — it will silently return zero rows and silently write nothing.\n` +
        `Use the service_role key from Supabase → Settings → API.`,
    );
  }

  return { url: url.value.replace(/\/+$/, ""), serviceKey: key.value };
}

// --- PostgREST -------------------------------------------------------------

/** Print to stderr and exit non-zero. Never prints credentials. */
export function fail(message: string): never {
  process.stderr.write(`\nlead-monitor: ${message}\n\n`);
  process.exit(1);
}

/** Diagnostics go to stderr so stdout stays machine-readable. */
export function note(message: string): void {
  process.stderr.write(`${message}\n`);
}

function restHeaders(
  target: SupabaseTarget,
  extra: Readonly<Record<string, string>> = {},
): Record<string, string> {
  return {
    apikey: target.serviceKey,
    Authorization: `Bearer ${target.serviceKey}`,
    "Content-Type": "application/json",
    ...extra,
  };
}

/** How many rows to request per page. */
const SELECT_PAGE_SIZE = 1000;

/** Runaway guard: far above any plausible lead volume. */
const SELECT_MAX_ROWS = 1_000_000;

/**
 * Select every matching row, paging until an empty page comes back.
 *
 * The paging is not optional: Supabase caps PostgREST responses (1000 rows by
 * default) and truncates SILENTLY. An unpaged request would quietly return
 * the first 1000 dedup keys, and the collector would then treat every older
 * lead as unseen and re-offer it.
 *
 * Two subtleties, both about not trusting the page size we asked for:
 *
 *  - offset advances by the number of rows ACTUALLY returned, never by
 *    SELECT_PAGE_SIZE. If the server's cap is lower than our page size,
 *    advancing by the requested size would step straight over the rows it
 *    withheld — silently skipping them, which is worse than truncating.
 *  - we stop on an empty page rather than on a short one, because a short
 *    page is ambiguous: it means either "that's the end" or "that's my cap".
 *    Costs one extra round trip; buys correctness against any cap.
 */
export async function restSelectAll<T>(
  target: SupabaseTarget,
  table: string,
  query: string,
): Promise<T[]> {
  const rows: T[] = [];
  let offset = 0;

  for (;;) {
    const url =
      `${target.url}/rest/v1/${table}?${query}` +
      `&limit=${SELECT_PAGE_SIZE}&offset=${offset}`;

    const response = await fetch(url, { headers: restHeaders(target) });

    if (!response.ok) {
      fail(
        `Supabase returned ${response.status} ${response.statusText} selecting from ${table}.\n` +
          `${await safeBody(response)}`,
      );
    }

    const page = (await response.json()) as T[];
    if (page.length === 0) return rows;

    rows.push(...page);
    offset += page.length;

    if (rows.length >= SELECT_MAX_ROWS) {
      fail(
        `Refusing to page past ${SELECT_MAX_ROWS} rows from ${table} — that is not a\n` +
          `plausible result set, so something is wrong with the query or the server.`,
      );
    }

    if (rows.length > SELECT_PAGE_SIZE) note(`  …fetched ${rows.length} rows, continuing`);
  }
}

/**
 * Insert rows, ignoring anything that collides on dedup_key, and return the
 * rows actually inserted.
 *
 * `resolution=ignore-duplicates` + `return=representation` is the whole
 * trick: PostgREST returns only genuinely-inserted rows, so the length of
 * the response IS the insert count.
 */
export async function restUpsertIgnoreDuplicates<TRow, TReturned>(
  target: SupabaseTarget,
  table: string,
  onConflict: string,
  rows: readonly TRow[],
): Promise<TReturned[]> {
  const url = `${target.url}/rest/v1/${table}?on_conflict=${encodeURIComponent(onConflict)}`;

  const response = await fetch(url, {
    method: "POST",
    headers: restHeaders(target, {
      Prefer: "resolution=ignore-duplicates,return=representation",
    }),
    body: JSON.stringify(rows),
  });

  if (!response.ok) {
    fail(
      `Supabase returned ${response.status} ${response.statusText} inserting into ${table}.\n` +
        `${await safeBody(response)}`,
    );
  }

  return (await response.json()) as TReturned[];
}

async function safeBody(response: Response): Promise<string> {
  try {
    const text = await response.text();
    return text.slice(0, 1000);
  } catch {
    return "(no response body)";
  }
}

// --- argv ------------------------------------------------------------------

/**
 * Parse `--flag value` and `--flag=value`. Unknown flags are returned so the
 * caller can reject them rather than silently ignoring a typo.
 */
export function parseArgs(argv: readonly string[]): {
  flags: Map<string, string | true>;
  positional: string[];
} {
  const flags = new Map<string, string | true>();
  const positional: string[] = [];

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];

    if (!arg.startsWith("--")) {
      positional.push(arg);
      continue;
    }

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

  return { flags, positional };
}

/** Read a flag that requires a value. */
export function stringFlag(
  flags: Map<string, string | true>,
  name: string,
): string | null {
  const value = flags.get(name);
  if (value === undefined) return null;
  if (value === true) fail(`--${name} needs a value.`);
  return value;
}

/** Read a positive-integer flag, or fall back to a default. */
export function intFlag(
  flags: Map<string, string | true>,
  name: string,
  fallback: number,
): number {
  const raw = stringFlag(flags, name);
  if (raw === null) return fallback;

  if (!/^\d+$/.test(raw)) fail(`--${name} must be a whole number, got ${JSON.stringify(raw)}.`);

  const parsed = Number(raw);
  if (parsed < 1) fail(`--${name} must be at least 1.`);
  return parsed;
}
