/**
 * Pull an FAQ out of a guide's markdown so it can be emitted as FAQPage
 * structured data.
 *
 * AEO.md's guide template asks every guide for 4-6 questions with FAQPage
 * schema, and not one post on the blog had any. The schema block is the part
 * an answer engine quotes, so writing the questions without it does half the
 * job and gets none of the benefit.
 *
 * The format is what an author would write anyway: a `## FAQ` heading, then
 * `### question` followed by its answer. Nothing extra to remember, and a
 * post without an FAQ simply emits no node.
 */

export type FaqEntry = { question: string; answer: string };

/**
 * Markdown reduced to the words a schema can carry.
 *
 * ⚠️ A LINK MUST LOSE ITS URL AND KEEP ITS TEXT. Stripping only emphasis let
 * `[reported as fraudulent](mailto:contact@...)` through verbatim into the
 * `FAQPage` block — the one part of the page an answer engine reads out. It
 * was invisible in the rendered copy, where the link looked perfect, and was
 * caught only by reading the JSON-LD.
 */
function plainText(line: string): string {
  return line
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, "$1") // images: keep the alt text
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1") // links: keep the label
    .replace(/[*_`]/g, "");
}

const FAQ_HEADING = /^##\s+(FAQ|Common questions|Frequently asked questions)\s*$/i;

export function extractFaq(markdown: string): FaqEntry[] {
  const lines = markdown.split("\n");
  const start = lines.findIndex((l) => FAQ_HEADING.test(l.trim()));
  if (start === -1) return [];

  const entries: FaqEntry[] = [];
  let question: string | null = null;
  let answer: string[] = [];

  const flush = () => {
    if (question && answer.join(" ").trim()) {
      entries.push({ question, answer: answer.join(" ").replace(/\s+/g, " ").trim() });
    }
    question = null;
    answer = [];
  };

  for (const raw of lines.slice(start + 1)) {
    const line = raw.trim();
    // Any other `##` heading ends the FAQ section; `###` is a question.
    if (/^##\s+/.test(line) && !/^###/.test(line)) break;
    const q = line.match(/^###\s+(.*\S)\s*$/);
    if (q) {
      flush();
      question = q[1];
      continue;
    }
    if (question && line) answer.push(plainText(line));
  }
  flush();
  return entries;
}

/** FAQPage JSON-LD, or null when a guide has no FAQ — never an empty node. */
export function faqJsonLd(markdown: string): object | null {
  const entries = extractFaq(markdown);
  if (entries.length === 0) return null;
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: entries.map((e) => ({
      "@type": "Question",
      name: e.question,
      acceptedAnswer: { "@type": "Answer", text: e.answer },
    })),
  };
}
