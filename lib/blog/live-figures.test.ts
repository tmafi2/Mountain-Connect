import { test } from "node:test";
import assert from "node:assert/strict";
import {
  FIGURES_PREFIX, KNOWN_TOKENS, render, tokensIn, tokensInProse, unknownTokens,
} from "./live-figures";
import { extractFaq, faqJsonLd } from "./faq";

const FIGURES = { openJobs: "355", withHousing: "139", updated: "10 October 2026" };

test("a figures line is filled and unwrapped", () => {
  const md = `Intro.\n${FIGURES_PREFIX} **{{openJobs}} open listings**, {{withHousing}} with housing.\nOutro.`;
  assert.equal(render(md, FIGURES), "Intro.\n**355 open listings**, 139 with housing.\nOutro.");
});

/**
 * ⚠️ THE RULE THE WHOLE DESIGN EXISTS FOR. A guide must never publish "0
 * open listings", a dash mid-sentence, or a raw {{token}} — so with no
 * figures the line is removed and the prose around it still reads.
 */
test("with no figures the line disappears and the guide still reads", () => {
  // Written the way a guide actually is, with blank lines around the figure
  // so the paragraphs stay separate once it is gone.
  const md = [
    "Ski seasons are short.",
    "",
    `${FIGURES_PREFIX} {{openJobs}} jobs are open right now.`,
    "",
    "Apply early.",
  ].join("\n");
  const out = render(md, null);
  assert.equal(out, "Ski seasons are short.\n\n\nApply early.");
  assert.ok(!out.includes("{{"), out);
  assert.ok(!/\b0\b/.test(out), out);
  // Both paragraphs survive as paragraphs, which is why the blank lines matter.
  assert.ok(out.includes("Ski seasons are short.\n\n"), out);
});

test("a half-resolved line is dropped rather than published", () => {
  // A token nothing can supply must not leave "{{mystery}}" on the page.
  const md = `${FIGURES_PREFIX} {{openJobs}} jobs and {{mystery}} others.`;
  assert.equal(render(md, FIGURES), "");
});

test("a token in prose is findable, because prose can never carry one", () => {
  const md = `We have {{openJobs}} jobs.\n${FIGURES_PREFIX} {{withHousing}} include housing.`;
  assert.deepEqual(tokensInProse(md), ["openJobs"]);
  // The figures line's token is not flagged — that is where they belong.
  assert.ok(!tokensInProse(md).includes("withHousing"));
});

test("an unknown token is an authoring bug, and findable", () => {
  assert.deepEqual(unknownTokens("{{openJobs}} and {{averageTan}}"), ["averageTan"]);
  assert.deepEqual(unknownTokens(KNOWN_TOKENS.map((t) => `{{${t}}}`).join(" ")), []);
});

test("stray braces in ordinary prose are left alone", () => {
  const md = "Use { and } freely, and {not a token} too.";
  assert.deepEqual(tokensIn(md), []);
  assert.equal(render(md, FIGURES), md);
});

/* ── FAQ extraction ──────────────────────────────────────────────────── */

const WITH_FAQ = `# Guide

Some prose.

## FAQ

### Do I need a visa?

Usually yes, if you are not a citizen.
It depends on the country.

### Is accommodation included?

Sometimes. **Ask** before you accept.

## Next steps

Not a question.`;

test("questions and answers come out as plain text", () => {
  const faq = extractFaq(WITH_FAQ);
  assert.equal(faq.length, 2);
  assert.equal(faq[0].question, "Do I need a visa?");
  assert.equal(faq[0].answer, "Usually yes, if you are not a citizen. It depends on the country.");
  // Emphasis is stripped: an answer engine reads this aloud.
  assert.equal(faq[1].answer, "Sometimes. Ask before you accept.");
});

test("the FAQ stops at the next section", () => {
  assert.ok(!extractFaq(WITH_FAQ).some((e) => e.question.includes("Next steps")));
});

test("a guide with no FAQ emits no node at all, never an empty one", () => {
  assert.deepEqual(extractFaq("# Guide\n\nJust prose."), []);
  assert.equal(faqJsonLd("# Guide\n\nJust prose."), null);
});

test("the node is shaped the way an answer engine expects", () => {
  const node = faqJsonLd(WITH_FAQ) as Record<string, unknown>;
  assert.equal(node["@type"], "FAQPage");
  const entities = node.mainEntity as Array<Record<string, unknown>>;
  assert.equal(entities.length, 2);
  assert.equal(entities[0]["@type"], "Question");
  assert.equal((entities[0].acceptedAnswer as Record<string, string>)["@type"], "Answer");
});

// ⚠️ This shipped broken: the scams guide's answer carried
// `[reported as fraudulent](mailto:contact@…)` straight into the FAQPage
// block, where an answer engine would read the URL out as words. The rendered
// page looked perfect — only the JSON-LD showed it.
test("a link in an answer keeps its words and loses its url", () => {
  const md = [
    "## FAQ",
    "",
    "### Are the listings verified?",
    "",
    "Report anything [that looks fraudulent](mailto:contact@example.com?subject=Hi) to us,",
    "or see the [pay by town page](/ski-season-pay) for what is normal.",
  ].join("\n");
  const [entry] = extractFaq(md);
  assert.equal(
    entry.answer,
    "Report anything that looks fraudulent to us, or see the pay by town page for what is normal."
  );
  assert.ok(!entry.answer.includes("mailto:"));
  assert.ok(!entry.answer.includes("]("));
});

test("an image in an answer leaves its alt text, not its path", () => {
  const md = "## FAQ\n\n### Q?\n\nHere ![a lift queue](/img/queue.png) is the scene.";
  assert.equal(extractFaq(md)[0].answer, "Here a lift queue is the scene.");
});
