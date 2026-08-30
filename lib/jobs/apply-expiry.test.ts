import { test } from "node:test";
import assert from "node:assert/strict";
import type { SupabaseClient } from "@supabase/supabase-js";
import { applyExpirySweep } from "./apply-expiry";
import type { BusinessGroup } from "./expiry-sweep";

// Read lazily by signRenewToken, so setting it after the imports is in time.
process.env.SUPABASE_SERVICE_ROLE_KEY ??= "test-secret-for-renew-tokens";

const NOW = new Date("2026-09-01T09:00:00Z");

/** Records every update payload and the ids it was applied to. */
function fakeClient(opts: { failOn?: (payload: Record<string, unknown>) => boolean } = {}) {
  const writes: Array<{ payload: Record<string, unknown>; ids: string[] }> = [];
  const client = {
    from() {
      let payload: Record<string, unknown> | null = null;
      let ids: string[] = [];
      const api = {
        update(p: Record<string, unknown>) { payload = p; return api; },
        in(_c: string, v: string[]) { ids = v; return api; },
        then(resolve: (v: unknown) => unknown) {
          if (payload && opts.failOn?.(payload)) {
            return resolve({ error: { message: "db refused" } });
          }
          if (payload) writes.push({ payload, ids });
          return resolve({ error: null });
        },
      };
      return api;
    },
  } as unknown as SupabaseClient;
  return { client, writes };
}

function group(over: Partial<BusinessGroup> = {}): BusinessGroup {
  return {
    businessId: "b1",
    businessName: "Alpine Pub",
    email: "pub@example.com",
    effectiveTier: "free",
    jobs: [{ id: "j1", title: "Bartender", expiresAt: "2026-08-25T00:00:00Z" }],
    ...over,
  };
}
const noMail = { paused: async () => {}, renewed: async () => {} };

test("expiring pauses with reason 'expired', never deletes", async () => {
  const { client, writes } = fakeClient();
  const r = await applyExpirySweep(client, [], [group()], "https://x.test", noMail, NOW);
  assert.equal(r.pausedJobs, 1);
  assert.deepEqual(writes[0].payload, {
    status: "paused",
    is_active: false,
    paused_reason: "expired",
  });
});

/**
 * 'expired' must stay outside BILLING_PAUSE_REASONS, or a plan upgrade
 * would silently republish roles the business let go. The marker written
 * here is what that allowlist keys on.
 */
test("the pause marker is 'expired', not a billing reason", async () => {
  const { client, writes } = fakeClient();
  await applyExpirySweep(client, [], [group()], "https://x.test", noMail, NOW);
  assert.notEqual(writes[0].payload.paused_reason, "tier_downgrade");
  assert.notEqual(writes[0].payload.paused_reason, "claim_gated");
});

test("auto-renew extends the window and clears the warning gate", async () => {
  const { client, writes } = fakeClient();
  const r = await applyExpirySweep(client, [group()], [], "https://x.test", noMail, NOW);
  assert.equal(r.renewedJobs, 1);
  assert.equal(writes[0].payload.expiry_warning_sent_at, null, "or it is warned once, ever");
  assert.match(String(writes[0].payload.expires_at), /^2026-10-27/, "56 days on from the run");
});

test("a business with several lapsing roles gets one pause email", async () => {
  const calls: string[][] = [];
  const { client } = fakeClient();
  await applyExpirySweep(
    client, [],
    [group({ jobs: [
      { id: "j1", title: "Bartender", expiresAt: "2026-08-25T00:00:00Z" },
      { id: "j2", title: "Chef", expiresAt: "2026-08-25T00:00:00Z" },
    ] })],
    "https://x.test",
    { paused: async (p) => { calls.push(p.jobTitles); }, renewed: async () => {} },
    NOW
  );
  assert.equal(calls.length, 1);
  assert.deepEqual(calls[0], ["Bartender", "Chef"]);
});

/**
 * The state change is what must be durable here. These emails report
 * something that already happened, so a send failure must not undo or
 * re-attempt the pause — only the notice is retried.
 */
test("a failed pause notice leaves the pause standing and the gate unstamped", async () => {
  const { client, writes } = fakeClient();
  const r = await applyExpirySweep(
    client, [], [group()], "https://x.test",
    { paused: async () => { throw new Error("resend down"); }, renewed: async () => {} },
    NOW
  );
  assert.equal(r.pausedJobs, 1, "the pause is real regardless");
  assert.equal(r.pausedNoticesSent, 0);
  assert.equal(writes.length, 1, "no expired_notice_sent_at stamp");
  assert.match(r.errors[0], /pause notice failed/);
});

test("a failed pause write sends no email about it", async () => {
  let sent = 0;
  const { client } = fakeClient({ failOn: (p) => p.status === "paused" });
  const r = await applyExpirySweep(
    client, [], [group()], "https://x.test",
    { paused: async () => { sent += 1; }, renewed: async () => {} },
    NOW
  );
  assert.equal(r.pausedJobs, 0);
  assert.equal(sent, 0, "never tell a business about a pause that did not happen");
  assert.match(r.errors[0], /pause failed/);
});

test("one business failing does not stop the others", async () => {
  const { client } = fakeClient();
  const r = await applyExpirySweep(
    client, [],
    [group({ businessId: "b1", email: "a@x.test" }),
     group({ businessId: "b2", email: "b@x.test" }),
     group({ businessId: "b3", email: "c@x.test" })],
    "https://x.test",
    { paused: async (p) => { if (p.to === "b@x.test") throw new Error("bounced"); }, renewed: async () => {} },
    NOW
  );
  assert.equal(r.pausedJobs, 3, "all three still paused");
  assert.equal(r.pausedNoticesSent, 2);
});

test("a business with no address is still paused, just not emailed", async () => {
  const { client } = fakeClient();
  const r = await applyExpirySweep(
    client, [], [group({ email: null })], "https://x.test",
    { paused: async () => { throw new Error("should not be called"); }, renewed: async () => {} },
    NOW
  );
  assert.equal(r.pausedJobs, 1);
  assert.equal(r.skippedNoEmail, 1);
});

test("the relist link is a signed token for that business", async () => {
  let url = "";
  const { client } = fakeClient();
  await applyExpirySweep(
    client, [], [group()], "https://x.test",
    { paused: async (p) => { url = p.relistUrl; }, renewed: async () => {} }, NOW
  );
  assert.match(url, /^https:\/\/x\.test\/jobs\/renew\/[A-Za-z0-9_-]+\.[a-f0-9]{64}$/);
});

/**
 * Auto-renew that renews in silence rebuilds the staleness this feature
 * exists to remove — a filled role renewing itself forever.
 */
test("auto-renew always sends its receipt", async () => {
  let sent = 0;
  const { client } = fakeClient();
  await applyExpirySweep(
    client, [group()], [], "https://x.test",
    { paused: async () => {}, renewed: async () => { sent += 1; } }, NOW
  );
  assert.equal(sent, 1);
});

test("nothing to do writes nothing and sends nothing", async () => {
  const { client, writes } = fakeClient();
  const r = await applyExpirySweep(client, [], [], "https://x.test", {
    paused: async () => { throw new Error("no"); },
    renewed: async () => { throw new Error("no"); },
  }, NOW);
  assert.equal(writes.length, 0);
  assert.deepEqual(r, {
    renewedJobs: 0, pausedJobs: 0, renewNoticesSent: 0,
    pausedNoticesSent: 0, skippedNoEmail: 0, errors: [],
  });
});
