/**
 * A plain-text alternative for every email we send.
 *
 * WHY. All 45 templates were HTML-only, and a message with no text/plain part
 * is a bulk-sender signature: ordinary mail from a person or a well-built
 * application is multipart/alternative. Several filters weigh it, and it is
 * the cheapest deliverability fix available to us — no DNS change, no new
 * domain, nothing for a recipient to notice except that the mail now renders
 * in clients that prefer text.
 *
 * WHY IT LIVES IN THE SEND PATH rather than in each template: 45 hand-written
 * text versions would drift from their HTML the first time someone edited one,
 * and a new template would ship without one. Deriving it means the text part
 * cannot be forgotten. A caller that wants a better one passes `text`
 * explicitly and this never runs.
 *
 * It is deliberately blunt. The goal is a readable, honest rendering of what
 * the HTML says — not a typographic reproduction. Links keep their URLs,
 * because a text part that drops them leaves the reader with nothing to act on.
 */

// `li` is absent on purpose — it is handled above, and letting </li> break
// here too would put a blank line between every bullet.
const BLOCK_TAGS = "address|article|aside|blockquote|div|footer|h[1-6]|header|hr|main|nav|ol|p|section|table|tbody|tfoot|thead|tr|ul";

const ENTITIES: Record<string, string> = {
  amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ",
  mdash: "—", ndash: "–", hellip: "…", rsquo: "’", lsquo: "‘",
  rdquo: "”", ldquo: "“", middot: "·", bull: "•", copy: "©", reg: "®", trade: "™",
};

function decodeEntities(s: string): string {
  return s
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&([a-z]+);/gi, (m, name) => ENTITIES[String(name).toLowerCase()] ?? m);
}

export function htmlToText(html: string): string {
  if (!html) return "";

  let s = html;

  // Anything that is not content at all. <style> first: its CSS would
  // otherwise survive tag-stripping as a wall of text.
  s = s.replace(/<!--[\s\S]*?-->/g, "");
  s = s.replace(/<(style|script|head|title)\b[^>]*>[\s\S]*?<\/\1>/gi, "");

  // Images carry no text meaning here — every one of ours is a logo or a
  // spacer, and "[Mountain Connects]" in a text part is noise, not content.
  s = s.replace(/<img\b[^>]*>/gi, "");

  // Links become "label (url)", so the reader can act on them. A label that
  // already IS the url is left alone rather than printed twice.
  s = s.replace(
    /<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi,
    (_m, href: string, label: string) => {
      const text = decodeEntities(label.replace(/<[^>]+>/g, "")).replace(/\s+/g, " ").trim();
      const url = decodeEntities(href).trim();
      if (!text) return url;
      if (text === url || url.startsWith("mailto:" + text)) return text;
      return `${text} (${url})`;
    }
  );

  s = s.replace(/<br\s*\/?>/gi, "\n");
  s = s.replace(/<li\b[^>]*>/gi, "\n- ");
  // Cells close with ONE newline and open with none: our templates use tables
  // for layout, so two cells in a row are usually a label and its value, not
  // two paragraphs. Rows still break with a blank line via the block rule.
  s = s.replace(/<\/(?:td|th)>/gi, "\n");
  s = s.replace(/<(?:td|th)\b[^>]*>/gi, "");
  s = s.replace(new RegExp(`</?(?:${BLOCK_TAGS})\\b[^>]*>`, "gi"), "\n");
  s = s.replace(/<[^>]+>/g, "");
  s = decodeEntities(s);

  // Whitespace last, once no tags remain to confuse it.
  s = s.replace(/\r\n?/g, "\n");
  s = s.split("\n").map((line) => line.replace(/[^\S\n]+/g, " ").trim()).join("\n");
  s = s.replace(/\n{3,}/g, "\n\n");
  return s.trim();
}
