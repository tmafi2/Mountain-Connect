import { test } from "node:test";
import assert from "node:assert/strict";
import { htmlToText } from "./html-to-text";

test("a link keeps its destination, because a text part without URLs is useless", () => {
  const out = htmlToText('<p>Hello</p><a href="https://example.com/signup?a=1&amp;b=2">Create your profile</a>');
  assert.equal(out, "Hello\nCreate your profile (https://example.com/signup?a=1&b=2)");
});

test("a link whose label is already the url is not printed twice", () => {
  assert.equal(htmlToText('<a href="https://example.com">https://example.com</a>'), "https://example.com");
});

test("CSS never leaks into the text part", () => {
  const out = htmlToText('<style>.x{color:red;background:#fff}</style><p>Real words</p>');
  assert.equal(out, "Real words");
  assert.ok(!out.includes("color"), out);
});

test("images are dropped rather than rendered as alt text", () => {
  const out = htmlToText('<img src="logo.png" alt="Mountain Connects" width="52" /><p>Body</p>');
  assert.equal(out, "Body");
});

test("blocks and list items become readable lines", () => {
  const out = htmlToText("<h1>Title</h1><ul><li>One</li><li>Two</li></ul><p>After</p>");
  assert.equal(out, "Title\n\n- One\n- Two\n\nAfter");
});

test("entities are decoded, including the ones our copy actually uses", () => {
  assert.equal(
    htmlToText("<p>Tyler&rsquo;s &mdash; caf&#233; &amp; bar &nbsp;here</p>"),
    "Tyler’s — café & bar here"
  );
});

test("a table-based email does not collapse into one line", () => {
  const out = htmlToText("<table><tr><td>Left</td><td>Right</td></tr><tr><td>Second row</td></tr></table>");
  assert.equal(out, "Left\nRight\n\nSecond row");
});

test("whitespace is tidied without eating the structure", () => {
  const out = htmlToText("<p>   spaced    out   </p>\n\n\n<p>next</p>");
  assert.equal(out, "spaced out\n\nnext");
});

test("empty and tag-only input yield nothing rather than throwing", () => {
  assert.equal(htmlToText(""), "");
  assert.equal(htmlToText("<div><span></span></div>"), "");
});
