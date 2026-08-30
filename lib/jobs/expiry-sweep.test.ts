import { test } from "node:test";
import assert from "node:assert/strict";
import type { SupabaseClient } from "@supabase/supabase-js";
import { planExpirySweep } from "./expiry-sweep";

/**
 * A fake Supabase client, in the style of lib/billing/job-parking.test.ts.
 *
 * What is worth testing here is the selection: which posts land in which
 * pass, who is excluded, and how the passes interact. Doing that against
 * the live board would mean pausing real listings to assert on them.
 *
 * The fake models only the calls this module makes — select with
 * eq/not/lte/in filters and order.
 */
const NOW = new Date("2026-09-01T09:00:00Z");
const inDays = (n: number) => new Date(NOW.getTime() + n * 86_400_000).toISOString();

interface JobRow {
  id: string;
  title: string;
  business_id: string;
  status: string;
  expires_at: string | null;
  auto_renew: boolean;
  expiry_warning_sent_at: string | null;
}
interface BizRow {
  id: string;
  business_name: string | null;
  email: string | null;
  tier: string | null;
  selected_tier: string | null;
  subscription_status: string | null;
  grace_period_ends_at: string | null;
  user_id: string | null;
}

function fakeClient(jobs: JobRow[], businesses: BizRow[]) {
  const builder = (table: string) => {
    const rows: Array<Record<string, unknown>> =
      table === "job_posts" ? (jobs as unknown as Array<Record<string, unknown>>)
      : table === "business_profiles" ? (businesses as unknown as Array<Record<string, unknown>>)
      : (() => { throw new Error(`unexpected table ${table}`); })();

    const filters: Array<(r: Record<string, unknown>) => boolean> = [];
    const api = {
      select() { return api; },
      eq(col: string, val: unknown) { filters.push((r) => r[col] === val); return api; },
      not(col: string, op: string, val: unknown) {
        assert.equal(op, "is");
        assert.equal(val, null);
        filters.push((r) => r[col] !== null && r[col] !== undefined);
        return api;
      },
      lte(col: string, val: string) {
        filters.push((r) => typeof r[col] === "string" && (r[col] as string) <= val);
        return api;
      },
      in(col: string, vals: unknown[]) { filters.push((r) => vals.includes(r[col])); return api; },
      order() { return api; },
      then(resolve: (v: unknown) => unknown) {
        return resolve({ data: rows.filter((r) => filters.every((f) => f(r))), error: null });
      },
    };
    return api;
  };
  return { from: (t: string) => builder(t) } as unknown as SupabaseClient;
}

function biz(over: Partial<BizRow> = {}): BizRow {
  return {
    id: "b1", business_name: "Alpine Pub", email: "pub@example.com",
    tier: "free", selected_tier: null, subscription_status: null,
    grace_period_ends_at: null, user_id: "u1", ...over,
  };
}
function job(over: Partial<JobRow> = {}): JobRow {
  return {
    id: "j1", title: "Bartender", business_id: "b1", status: "active",
    expires_at: inDays(3), auto_renew: false, expiry_warning_sent_at: null, ...over,
  };
}

test("a post inside the warning window is warned, not expired", async () => {
  const r = await planExpirySweep(fakeClient([job({ expires_at: inDays(3) })], [biz()]), NOW, "log_only");
  assert.equal(r.counts.warn, 1);
  assert.equal(r.counts.expire, 0);
  assert.equal(r.warn[0].jobs[0].title, "Bartender");
});

test("a post already past its window expires once its notice has run out", async () => {
  const r = await planExpirySweep(
    fakeClient([job({ expires_at: inDays(-1), expiry_warning_sent_at: inDays(-9) })], [biz()]),
    NOW, "log_only"
  );
  assert.equal(r.counts.expire, 1);
  assert.equal(r.counts.warn, 0);
});

/**
 * The promise the warning email makes. Nothing lapses without having had a
 * full notice period, however late that notice was.
 */
test("a post past its window is NOT expired if it was never warned", async () => {
  const r = await planExpirySweep(
    fakeClient([job({ expires_at: inDays(-1), expiry_warning_sent_at: null })], [biz()]),
    NOW, "log_only"
  );
  assert.equal(r.counts.expire, 0, "silently pausing an unwarned post breaks the promise");
  assert.equal(r.counts.warn, 1, "it gets warned instead, late but properly");
});

test("a post warned only yesterday still has six days of notice left", async () => {
  const r = await planExpirySweep(
    fakeClient([job({ expires_at: inDays(-1), expiry_warning_sent_at: inDays(-1) })], [biz()]),
    NOW, "log_only"
  );
  assert.equal(r.counts.expire, 0);
  assert.equal(r.counts.holding, 1, "waiting out its notice, and visible while it waits");
});

/**
 * The deadlock the rule would otherwise create: unwarnable because it is
 * late, unexpirable because it was never warned.
 */
test("a post that slipped past its date unwarned is warned, not stranded", async () => {
  const r = await planExpirySweep(
    fakeClient([job({ expires_at: inDays(-40), expiry_warning_sent_at: null })], [biz()]),
    NOW, "log_only"
  );
  assert.equal(r.counts.warn, 1, "40 days late and still gets its notice");
  assert.equal(r.counts.expire, 0);
});

test("a post outside the warning window is left alone entirely", async () => {
  const r = await planExpirySweep(fakeClient([job({ expires_at: inDays(30) })], [biz()]), NOW, "log_only");
  assert.deepEqual(r.counts, { warn: 0, renew: 0, expire: 0, holding: 0, businesses: 0 });
});

test("a business already warned is not warned again", async () => {
  const r = await planExpirySweep(
    fakeClient([job({ expires_at: inDays(2), expiry_warning_sent_at: inDays(-1) })], [biz()]),
    NOW, "log_only"
  );
  assert.equal(r.counts.warn, 0, "sent-at gate must hold");
});

/**
 * The scope rule. Unclaimed shells belong to the dormancy sweep, which
 * takes their posts down at day 21 — sooner than this would. Both acting
 * on the same rows means two contradictory emails.
 */
test("unclaimed import shells are ignored — the dormancy sweep owns them", async () => {
  const r = await planExpirySweep(
    fakeClient([job({ expires_at: inDays(-1) })], [biz({ user_id: null })]),
    NOW, "log_only"
  );
  assert.deepEqual(r.counts, { warn: 0, renew: 0, expire: 0, holding: 0, businesses: 0 });
});

test("an expired post auto-renews when the business is genuinely paid", async () => {
  const r = await planExpirySweep(
    fakeClient(
      [job({ expires_at: inDays(-1), auto_renew: true })],
      [biz({ selected_tier: "standard", subscription_status: "active" })]
    ),
    NOW, "log_only"
  );
  assert.equal(r.counts.renew, 1);
  assert.equal(r.counts.expire, 0, "a renewed post must not also be expired");
});

/**
 * auto_renew is a stored flag and entitlement is not; a business can switch
 * it on while paying and later cancel. Trusting the flag alone would renew
 * listings free forever.
 */
test("auto_renew does not save a post once the subscription has lapsed", async () => {
  const r = await planExpirySweep(
    fakeClient(
      [job({ expires_at: inDays(-1), auto_renew: true, expiry_warning_sent_at: inDays(-9) })],
      [biz({ selected_tier: "standard", subscription_status: "canceled" })]
    ),
    NOW, "log_only"
  );
  assert.equal(r.counts.renew, 0);
  assert.equal(r.counts.expire, 1);
});

test("a business inside its courtesy window counts as paid", async () => {
  const r = await planExpirySweep(
    fakeClient(
      [job({ expires_at: inDays(-1), auto_renew: true })],
      [biz({ grace_period_ends_at: inDays(30) })]
    ),
    NOW, "log_only"
  );
  assert.equal(r.counts.renew, 1);
});

/**
 * The 00088 lesson: one email per business, not one per post.
 */
test("several lapsing posts collapse into a single business group", async () => {
  const r = await planExpirySweep(
    fakeClient(
      [
        job({ id: "j1", title: "Bartender", expires_at: inDays(-1), expiry_warning_sent_at: inDays(-9) }),
        job({ id: "j2", title: "Chef", expires_at: inDays(-2), expiry_warning_sent_at: inDays(-9) }),
        job({ id: "j3", title: "Liftie", expires_at: inDays(-3), expiry_warning_sent_at: inDays(-9) }),
      ],
      [biz()]
    ),
    NOW, "log_only"
  );
  assert.equal(r.counts.expire, 3);
  assert.equal(r.expire.length, 1, "three posts, one business, one email");
  assert.equal(r.expire[0].jobs.length, 3);
});

test("posts from different businesses stay in separate groups", async () => {
  const r = await planExpirySweep(
    fakeClient(
      [job({ id: "j1", business_id: "b1", expires_at: inDays(-1), expiry_warning_sent_at: inDays(-9) }),
       job({ id: "j2", business_id: "b2", expires_at: inDays(-1), expiry_warning_sent_at: inDays(-9) })],
      [biz({ id: "b1" }), biz({ id: "b2", business_name: "Snow Lodge", user_id: "u2" })]
    ),
    NOW, "log_only"
  );
  assert.equal(r.expire.length, 2);
  assert.equal(r.counts.businesses, 2);
});

test("only active posts are considered", async () => {
  const r = await planExpirySweep(
    fakeClient([job({ status: "paused", expires_at: inDays(-1), expiry_warning_sent_at: inDays(-9) })], [biz()]),
    NOW, "log_only"
  );
  assert.equal(r.counts.expire, 0);
});

test("a post with no expires_at is never selected", async () => {
  const r = await planExpirySweep(
    fakeClient([job({ expires_at: null })], [biz()]),
    NOW, "log_only"
  );
  assert.equal(r.counts.warn + r.counts.expire, 0);
});

test("log_only reports that it would neither email nor write", async () => {
  const r = await planExpirySweep(fakeClient([job()], [biz()]), NOW, "log_only");
  assert.equal(r.wouldSendEmail, false);
  assert.equal(r.wouldWrite, false);
});

test("live mode reports that it would both email and write", async () => {
  const r = await planExpirySweep(fakeClient([job()], [biz()]), NOW, "live");
  assert.equal(r.wouldSendEmail, true);
  assert.equal(r.wouldWrite, true);
});

test("emails_only would email but not write", async () => {
  const r = await planExpirySweep(fakeClient([job()], [biz()]), NOW, "emails_only");
  assert.equal(r.wouldSendEmail, true);
  assert.equal(r.wouldWrite, false);
});

test("a business with no email is still reported, flagged for the caller", async () => {
  const r = await planExpirySweep(
    fakeClient([job({ expires_at: inDays(-1), expiry_warning_sent_at: inDays(-9) })], [biz({ email: null })]),
    NOW, "log_only"
  );
  assert.equal(r.counts.expire, 1);
  assert.equal(r.expire[0].email, null, "the pause still applies; only the email cannot be sent");
});
