import { test } from "node:test";
import assert from "node:assert/strict";
import { businessSignupCta } from "./cta";
import { contextFromParams } from "../campaigns/attribution";

test("the link still does its original job", () => {
  const url = new URL(businessSignupCta("winter-outreach"));
  assert.equal(url.origin + url.pathname, "https://www.mountainconnects.com/signup");
  assert.equal(url.searchParams.get("role"), "business");
});

test("every touch is distinguishable by campaign", () => {
  const first = new URL(businessSignupCta("winter-outreach"));
  const second = new URL(businessSignupCta("winter-followup-1"));
  assert.equal(first.searchParams.get("utm_campaign"), "winter-outreach");
  assert.equal(second.searchParams.get("utm_campaign"), "winter-followup-1");
  for (const u of [first, second]) {
    assert.equal(u.searchParams.get("utm_source"), "outreach");
    assert.equal(u.searchParams.get("utm_medium"), "email");
  }
});

/**
 * The half that is easy to break from the other side of the codebase: /signup
 * reads these params through attribution.ts, and SOURCE_PATTERN there silently
 * drops a `src` it does not like — which would leave the signup recorded
 * against the page rather than against outreach.
 */
test("/signup's own parser accepts what we put in the link", () => {
  const url = new URL(businessSignupCta("winter-outreach"));
  const ctx = contextFromParams(url.searchParams, "signup");
  assert.ok(ctx, "attribution should recognise the link");
  assert.equal(ctx.source, "outreach", "not the /signup fallback");
  assert.deepEqual(ctx.utm, {
    utm_source: "outreach",
    utm_medium: "email",
    utm_campaign: "winter-outreach",
  });
});

test("a preview or test send can point at another host", () => {
  const url = new URL(businessSignupCta("sales-dropin", "https://staging.example.com"));
  assert.equal(url.origin, "https://staging.example.com");
  assert.equal(url.searchParams.get("utm_campaign"), "sales-dropin");
});

test("a missing template still yields a usable link", () => {
  const url = new URL(businessSignupCta("  "));
  assert.equal(url.searchParams.get("utm_campaign"), null);
  assert.equal(url.searchParams.get("utm_source"), "outreach");
  assert.equal(url.searchParams.get("role"), "business");
});
