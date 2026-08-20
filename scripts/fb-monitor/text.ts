/**
 * Text cleanup for scraped post bodies.
 *
 * Separate from collect.ts because that file runs its own main() on import,
 * so nothing there can be unit tested or reused. This is both.
 */

/**
 * Strip Facebook's expand/collapse control out of captured post text.
 *
 * expandPosts() clicks every "See more" before scraping, so the text we get
 * is the full post — but Facebook swaps the control to "See less" in place,
 * and innerText picks that up as a trailing word. 62 of 103 imported
 * listings had "See less" welded onto the end of their description, which
 * then rendered as body copy on a public job page.
 *
 * Only trims at the very start or end. A post whose body genuinely contains
 * the phrase mid-sentence keeps it — "come and see less crowded slopes" is
 * real content and not ours to edit. A leading or trailing "…" is Facebook's
 * truncation ellipsis and goes with it.
 */
export function stripSeeMoreControl(text: string): string {
  return text
    // Consume whitespace, "…", and RUNS of dots (Facebook's truncation
    // marker) — but never a lone full stop, which is the author's sentence
    // ending: "Chef wanted. See less" must keep its period.
    .replace(/[\s…]*(?:\.{2,}[\s…]*)?\bsee (more|less)\b[\s.]*$/i, "")
    .replace(/^[\s…]*\bsee (more|less)\b\s*/i, "")
    .trim();
}
