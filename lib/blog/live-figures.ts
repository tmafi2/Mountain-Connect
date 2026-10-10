/**
 * Live numbers a guide can quote, and the rule for what happens when they
 * are unavailable.
 *
 * ⚠️ WHY GUIDES DO NOT CONTAIN NUMBERS. A figure typed into prose is a figure
 * that goes stale silently — "69 Ski Resorts" sat on /about for five months
 * while the real number was 111, because nobody re-reads their own copy. Our
 * own board is the only original data this site has, so guides quote it
 * through tokens substituted at render time.
 *
 * ⚠️ AND WHAT A MISSING FIGURE MUST NOT DO. It must not render "0", or a dash
 * mid-sentence, or leave `{{openJobs}}` sitting on the page. So tokens are
 * only legal inside a FIGURE LINE — one beginning `::figures` — which the
 * renderer drops whole when the numbers cannot be read. Prose never carries
 * one, which means a guide still reads correctly with the database down.
 */

export type LiveFigures = Record<string, string>;

/** Marks a line that is dropped entirely when the figures are unavailable. */
export const FIGURES_PREFIX = "::figures";

/** `{{token}}` — restrictive on purpose, so stray braces in prose are safe. */
const TOKEN = /\{\{([a-zA-Z][a-zA-Z0-9_]*)\}\}/g;

/** Every token a guide may use. An unknown one is an authoring mistake. */
export const KNOWN_TOKENS = [
  "openJobs",
  "canadaJobs",
  "japanJobs",
  "pricedJobs",
  "withHousing",
  "housingSilent",
  "withPass",
  "passSilent",
  "withMeals",
  "housingCostStated",
  "resorts",
  "countries",
  "towns",
  "updated",
] as const;

/** Every token used anywhere in a piece of content. */
export function tokensIn(content: string): string[] {
  return [...new Set([...content.matchAll(TOKEN)].map((m) => m[1]))];
}

/** Tokens a guide uses that nothing can supply. */
export function unknownTokens(content: string): string[] {
  const known = new Set<string>(KNOWN_TOKENS);
  return tokensIn(content).filter((t) => !known.has(t));
}

/**
 * Tokens used OUTSIDE a figures line — where a missing value would be
 * visible to a reader, which is the thing this design exists to prevent.
 */
export function tokensInProse(content: string): string[] {
  const loose = content
    .split("\n")
    .filter((line) => !line.trimStart().startsWith(FIGURES_PREFIX))
    .join("\n");
  return tokensIn(loose);
}

/**
 * Substitute the figures and unwrap the lines.
 *
 * With no figures available, every figures line is removed and the guide
 * still reads — which is the whole reason numbers live on their own lines.
 */
export function render(content: string, figures: LiveFigures | null): string {
  const out: string[] = [];
  for (const line of content.split("\n")) {
    const trimmed = line.trimStart();
    if (!trimmed.startsWith(FIGURES_PREFIX)) {
      out.push(line);
      continue;
    }
    if (!figures) continue;
    const body = trimmed.slice(FIGURES_PREFIX.length).trimStart();
    const filled = body.replace(TOKEN, (whole, name: string) => figures[name] ?? whole);
    // A line whose figures did not all resolve is dropped rather than
    // published half-filled with a raw token showing.
    if (tokensIn(filled).length > 0) continue;
    out.push(filled);
  }
  return out.join("\n");
}
