import { test } from "node:test";
import assert from "node:assert/strict";
import { oneClickUrlFrom, unsubscribeHeaders, UNSUBSCRIBE_MAILTO } from "./unsubscribe";

const PAGE = "https://www.mountainconnects.com/unsubscribe/7f3a9c2b4d6e8a01";

test("the POST endpoint is derived from the footer link", () => {
  assert.equal(
    oneClickUrlFrom(PAGE),
    "https://www.mountainconnects.com/api/unsubscribe/7f3a9c2b4d6e8a01"
  );
});

test("both headers are set, https first", () => {
  const headers = unsubscribeHeaders(PAGE);
  assert.equal(
    headers["List-Unsubscribe"],
    `<https://www.mountainconnects.com/api/unsubscribe/7f3a9c2b4d6e8a01>, <${UNSUBSCRIBE_MAILTO}>`
  );
  // Without this header the https address is not a one-click address, and
  // Gmail treats the sender as having offered nothing.
  assert.equal(headers["List-Unsubscribe-Post"], "List-Unsubscribe=One-Click");
});

test("a link we don't recognise falls back to the mailto alone", () => {
  for (const url of [
    "https://www.mountainconnects.com/jobs",
    "https://example.com/unsub/abc12345",
    "",
  ]) {
    const headers = unsubscribeHeaders(url);
    assert.equal(oneClickUrlFrom(url), null, url);
    assert.equal(headers["List-Unsubscribe"], `<${UNSUBSCRIBE_MAILTO}>`, url);
    assert.equal(headers["List-Unsubscribe-Post"], undefined, url);
  }
});

test("a token that cannot be one of ours is refused", () => {
  // Too short, spaces, a path of its own, or query junk: anything that would
  // put a malformed address in front of a mail provider.
  for (const token of ["short", "has space", "abc/../admin", "token?x=1", "a".repeat(129)]) {
    assert.equal(
      oneClickUrlFrom(`https://www.mountainconnects.com/unsubscribe/${token}`),
      null,
      token
    );
  }
});

test("other hosts are honoured, so previews and local runs stay consistent", () => {
  assert.equal(
    oneClickUrlFrom("http://localhost:3000/unsubscribe/preview-token"),
    "http://localhost:3000/api/unsubscribe/preview-token"
  );
});
