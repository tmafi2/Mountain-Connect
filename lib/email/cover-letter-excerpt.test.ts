import test from "node:test";
import assert from "node:assert/strict";
import { coverLetterExcerpt, escapeForEmail, EXCERPT_MAX } from "./cover-letter-excerpt";

// A real cover letter from the board, with the identifying parts it did not
// happen to contain. 285 of 308 applications look roughly like this.
const REAL = `I would be a good housekeeper because I am hardworking, reliable, and take pride in keeping things clean, organised, and presentable. Through my experience working in a busy café and as a supermarket team leader, I have developed strong attention to detail, time management, and the ability to maintain high standards while working under pressure.`;

test("a clean letter is quoted, trimmed to the limit", () => {
  const out = coverLetterExcerpt({ message: REAL, consent: null });
  assert.ok(out);
  assert.ok(out.length <= EXCERPT_MAX + 1, `got ${out.length}`);
  assert.ok(out.startsWith("I would be a good housekeeper"));
  // Never cut mid-word.
  assert.ok(!/\s\S{1,2}$/.test(out.replace(/[.…]$/, "")));
});

test("a letter shorter than the limit is returned whole and unchanged", () => {
  const short = "I have three seasons of kitchen experience and I am available from December through April.";
  assert.equal(coverLetterExcerpt({ message: short, consent: null }), short);
});

// The whole point: refuse rather than redact. Measured over the 285 real
// letters, about one in five carries one of these.
test("anything carrying an identifier is refused, not redacted", () => {
  for (const [msg, why] of [
    [`${REAL} You can reach me at austin.n@example.com any time.`, "email address"],
    [`${REAL} Please call me on 022 569 0770.`, "phone number"],
    [`My name is Austin and ${REAL}`, "names themselves"],
    [`Mi chiamo Giulia e ${REAL}`, "names themselves, in Italian"],
    [`${REAL} Portfolio: https://example.com/austin`, "a link"],
  ] as const) {
    assert.equal(coverLetterExcerpt({ message: msg, consent: null }), null, why);
  }
});

test("declining is absolute — sanitising does not get past it", () => {
  assert.equal(coverLetterExcerpt({ message: REAL, consent: false }), null);
});

test("consent lets a clean letter through, and does not override the filters", () => {
  assert.ok(coverLetterExcerpt({ message: REAL, consent: true }));
  assert.equal(
    coverLetterExcerpt({ message: `${REAL} Call me on 022 569 0770.`, consent: true }),
    null,
    "consent to share is not consent to publish a phone number in an email",
  );
});

test("nothing worth quoting is refused", () => {
  for (const msg of [null, undefined, "", "   ", "Interested!", "hi"]) {
    assert.equal(coverLetterExcerpt({ message: msg, consent: true }), null, JSON.stringify(msg));
  }
});

test("a long letter is cut at a sentence end where one fits", () => {
  const out = coverLetterExcerpt({ message: REAL, consent: null });
  assert.ok(out);
  assert.ok(out.endsWith(".") || out.endsWith("…"));
});

test("a quote is escaped before it reaches an email body", () => {
  assert.equal(
    escapeForEmail(`I run "Bar & Grill" <the best>`),
    "I run &quot;Bar &amp; Grill&quot; &lt;the best&gt;",
  );
});
