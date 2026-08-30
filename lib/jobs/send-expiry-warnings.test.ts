import { test } from "node:test";
import assert from "node:assert/strict";
import type { SupabaseClient } from "@supabase/supabase-js";

import { sendExpiryWarnings, formatExpiryDate } from "./send-expiry-warnings";
import type { BusinessGroup } from "./expiry-sweep";

// Read lazily by signRenewToken, so setting it after the imports is in time.
process.env.SUPABASE_SERVICE_ROLE_KEY ??= "test-secret-for-renew-tokens";

const NOW = new Date("2026-09-01T09:00:00Z");

/** Records the id sets passed to update(...).in("id", …). */
function fakeClient(failUpdate = false) {
  const stamped: string[][] = [];
  const client = {
    from() {
      let payload: Record<string, unknown> | null = null;
      const api = {
        update(p: Record<string, unknown>) {
          payload = p;
          return api;
        },
        in(_col: string, ids: string[]) {
          if (payload) stamped.push(ids);
          return api;
        },
        then(resolve: (v: unknown) => unknown) {
          return resolve({ error: failUpdate ? { message: "db down" } : null });
        },
      };
      return api;
    },
  } as unknown as SupabaseClient;
  return { client, stamped };
}

function group(over: Partial<BusinessGroup> = {}): BusinessGroup {
  return {
    businessId: "b1",
    businessName: "Alpine Pub",
    email: "pub@example.com",
    effectiveTier: "free",
    jobs: [{ id: "j1", title: "Bartender", expiresAt: "2026-10-25T00:00:00Z" }],
    ...over,
  };
}

test("one business with several roles gets exactly one email", async () => {
  const calls: Array<{ to: string; jobTitles: string[] }> = [];
  const { client, stamped } = fakeClient();
  const r = await sendExpiryWarnings(
    client,
    [
      group({
        jobs: [
          { id: "j1", title: "Bartender", expiresAt: "2026-10-25T00:00:00Z" },
          { id: "j2", title: "Chef", expiresAt: "2026-10-26T00:00:00Z" },
          { id: "j3", title: "Liftie", expiresAt: "2026-10-27T00:00:00Z" },
        ],
      }),
    ],
    "https://example.com",
    async (p) => { calls.push({ to: p.to, jobTitles: p.jobTitles }); },
    NOW
  );
  assert.equal(r.sent, 1);
  assert.equal(calls.length, 1, "three roles, one email");
  assert.deepEqual(calls[0].jobTitles, ["Bartender", "Chef", "Liftie"]);
  assert.deepEqual(stamped[0], ["j1", "j2", "j3"], "every named post is gated");
});

test("the date quoted is the soonest in the batch, never the latest", async () => {
  let quoted = "";
  const { client } = fakeClient();
  await sendExpiryWarnings(
    client,
    [
      group({
        jobs: [
          { id: "j1", title: "Chef", expiresAt: "2026-11-30T00:00:00Z" },
          { id: "j2", title: "Bartender", expiresAt: "2026-10-25T00:00:00Z" },
        ],
      }),
    ],
    "https://example.com",
    async (p) => { quoted = p.expiryDate; },
    NOW
  );
  assert.equal(quoted, "25 October 2026", "quoting the later date would promise time they do not have");
});

/**
 * The gate must never be stamped for a send that did not happen, or the one
 * warning a business gets is silently consumed by an outage.
 */
test("a failed send stamps nothing, so tomorrow retries", async () => {
  const { client, stamped } = fakeClient();
  const r = await sendExpiryWarnings(
    client,
    [group()],
    "https://example.com",
    async () => { throw new Error("resend exploded"); },
    NOW
  );
  assert.equal(r.sent, 0);
  assert.equal(r.failed, 1);
  assert.equal(stamped.length, 0, "nothing gated");
  assert.match(r.errors[0], /resend exploded/);
});

test("one business failing does not stop the rest", async () => {
  const { client } = fakeClient();
  const r = await sendExpiryWarnings(
    client,
    [
      group({ businessId: "b1", email: "a@example.com" }),
      group({ businessId: "b2", email: "b@example.com" }),
      group({ businessId: "b3", email: "c@example.com" }),
    ],
    "https://example.com",
    async (p) => { if (p.to === "b@example.com") throw new Error("bounced"); },
    NOW
  );
  assert.equal(r.sent, 2);
  assert.equal(r.failed, 1);
});

test("a business with no address is skipped and left ungated", async () => {
  const { client, stamped } = fakeClient();
  const r = await sendExpiryWarnings(
    client,
    [group({ email: null })],
    "https://example.com",
    async () => { throw new Error("should not be called"); },
    NOW
  );
  assert.equal(r.skippedNoEmail, 1);
  assert.equal(r.sent, 0);
  assert.equal(stamped.length, 0, "adding an address later must still earn a warning");
});

test("the renew link is signed and points at the confirmation page", async () => {
  let url = "";
  const { client } = fakeClient();
  await sendExpiryWarnings(
    client, [group()], "https://example.com",
    async (p) => { url = p.renewUrl; }, NOW
  );
  assert.match(url, /^https:\/\/example\.com\/jobs\/renew\/[A-Za-z0-9_-]+\.[a-f0-9]{64}$/);
});

test("a send that succeeds but fails to stamp is reported, not counted as failed", async () => {
  const { client } = fakeClient(true);
  const r = await sendExpiryWarnings(
    client, [group()], "https://example.com", async () => {}, NOW
  );
  assert.equal(r.sent, 1, "the email really did go out");
  assert.equal(r.failed, 0);
  assert.match(r.errors[0], /gate not stamped/);
});

test("an empty group list sends nothing", async () => {
  const { client } = fakeClient();
  const r = await sendExpiryWarnings(client, [], "https://example.com", async () => {
    throw new Error("should not be called");
  }, NOW);
  assert.deepEqual(r, { sent: 0, skippedNoEmail: 0, failed: 0, errors: [] });
});

test("dates render unambiguously for a mixed AU/CA/JP/US audience", () => {
  assert.equal(formatExpiryDate("2026-10-25T00:00:00Z"), "25 October 2026");
  assert.equal(formatExpiryDate("2026-01-05T00:00:00Z"), "5 January 2026");
});
