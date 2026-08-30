import { test } from "node:test";
import assert from "node:assert/strict";
import type { SupabaseClient } from "@supabase/supabase-js";
import { parkListingsOnClaim, restoreParkedJobs, countParkedJobs } from "./job-parking";

/**
 * These run against a fake Supabase client rather than the real database.
 * The interesting part of this module is the arithmetic — which ids end up
 * in the keep-set, how an infinite limit behaves, how much headroom a
 * restore has — and that is worth testing without creating job posts on a
 * live public job board to do it.
 *
 * The fake models only what the module actually calls: select with eq/not/
 * order filters, head-count selects, and update...in.
 */
interface Row {
  id: string;
  business_id: string;
  status: string;
  paused_reason?: string | null;
  created_at: string;
}

function fakeClient(rows: Row[]) {
  const updates: Array<{ ids: string[]; payload: Record<string, unknown> }> = [];

  const builder = (table: string) => {
    assert.equal(table, "job_posts", "module should only touch job_posts");
    let filters: Array<(r: Row) => boolean> = [];
    let headCount = false;
    let desc = false;
    let ordered = false;
    let updatePayload: Record<string, unknown> | null = null;

    const api = {
      select(_cols: string, opts?: { count?: string; head?: boolean }) {
        headCount = !!opts?.head;
        return api;
      },
      eq(col: keyof Row, val: unknown) {
        filters.push((r) => r[col] === val);
        return api;
      },
      not(col: keyof Row, op: string, val: unknown) {
        assert.equal(op, "is");
        assert.equal(val, null);
        filters.push((r) => r[col] !== null && r[col] !== undefined);
        return api;
      },
      order(col: string, opts?: { ascending?: boolean }) {
        assert.equal(col, "created_at");
        ordered = true;
        desc = opts?.ascending === false;
        return api;
      },
      update(payload: Record<string, unknown>) {
        updatePayload = payload;
        return api;
      },
      in(col: keyof Row, vals: unknown[]) {
        filters.push((r) => (vals as unknown[]).includes(r[col]));
        return api;
      },
      then(resolve: (v: unknown) => unknown) {
        let matched = rows.filter((r) => filters.every((f) => f(r)));
        if (ordered) {
          matched = [...matched].sort((a, b) =>
            desc ? b.created_at.localeCompare(a.created_at) : a.created_at.localeCompare(b.created_at)
          );
        }
        if (updatePayload) {
          const ids = matched.map((r) => r.id);
          updates.push({ ids, payload: updatePayload });
          // Mutate so a later read in the same test sees the new state.
          for (const r of matched) Object.assign(r, updatePayload);
          return resolve({ error: null });
        }
        if (headCount) return resolve({ count: matched.length, error: null });
        return resolve({ data: matched.map((r) => ({ ...r })), error: null });
      },
    };
    return api;
  };

  return {
    client: { from: builder } as unknown as SupabaseClient,
    updates,
  };
}

const jobs = (...specs: Array<[string, string, string?, (string | null)?]>): Row[] =>
  specs.map(([id, created_at, status = "active", paused_reason]) => ({
    id,
    business_id: "biz",
    status,
    paused_reason: paused_reason ?? null,
    created_at,
  }));

/* ── parkListingsOnClaim ─────────────────────────────────────── */

test("free tier keeps only the chosen listing live", async () => {
  const { client, updates } = fakeClient(
    jobs(["a", "2026-01-01"], ["b", "2026-02-01"], ["c", "2026-03-01"])
  );
  const parked = await parkListingsOnClaim(client, "biz", "a", 1);

  assert.equal(parked, 2);
  assert.deepEqual(updates[0].ids.sort(), ["b", "c"]);
  assert.equal(updates[0].payload.status, "paused");
  assert.equal(updates[0].payload.paused_reason, "claim_gated");
  assert.equal(updates[0].payload.is_active, false);
});

test("the chosen listing wins even when it is the oldest", async () => {
  const { client, updates } = fakeClient(
    jobs(["old", "2026-01-01"], ["mid", "2026-02-01"], ["new", "2026-03-01"])
  );
  await parkListingsOnClaim(client, "biz", "old", 1);
  assert.deepEqual(updates[0].ids.sort(), ["mid", "new"]);
});

test("headroom beyond the chosen listing goes to the newest", async () => {
  const { client, updates } = fakeClient(
    jobs(["a", "2026-01-01"], ["b", "2026-02-01"], ["c", "2026-03-01"], ["d", "2026-04-01"])
  );
  // Standard tier keeps 5, but test the partial case: limit 3, chosen = oldest.
  const parked = await parkListingsOnClaim(client, "biz", "a", 3);
  assert.equal(parked, 1);
  // Keeps a (chosen) + d + c (newest two). Parks b.
  assert.deepEqual(updates[0].ids, ["b"]);
});

test("an infinite limit parks nothing (courtesy-window shells)", async () => {
  const { client, updates } = fakeClient(jobs(["a", "2026-01-01"], ["b", "2026-02-01"]));
  const parked = await parkListingsOnClaim(client, "biz", "a", Infinity);
  assert.equal(parked, 0);
  assert.equal(updates.length, 0, "must not write when the tier covers everything");
});

test("no choice supplied falls back to keeping the newest", async () => {
  const { client, updates } = fakeClient(
    jobs(["a", "2026-01-01"], ["b", "2026-02-01"], ["c", "2026-03-01"])
  );
  await parkListingsOnClaim(client, "biz", null, 1);
  assert.deepEqual(updates[0].ids.sort(), ["a", "b"], "keeps c, the newest");
});

test("an id belonging to another business is ignored, not honoured", async () => {
  const { client, updates } = fakeClient(jobs(["a", "2026-01-01"], ["b", "2026-02-01"]));
  await parkListingsOnClaim(client, "biz", "someone-elses-job", 1);
  // Falls back to newest-first rather than parking everything.
  assert.deepEqual(updates[0].ids, ["a"], "keeps b; never parks the whole set");
});

test("a single listing at the free limit is left alone", async () => {
  const { client, updates } = fakeClient(jobs(["a", "2026-01-01"]));
  assert.equal(await parkListingsOnClaim(client, "biz", "a", 1), 0);
  assert.equal(updates.length, 0);
});

test("drafts are never parked", async () => {
  const { client, updates } = fakeClient(
    jobs(["live", "2026-03-01"], ["d1", "2026-02-01", "draft"], ["d2", "2026-01-01", "draft"])
  );
  assert.equal(await parkListingsOnClaim(client, "biz", "live", 1), 0);
  assert.equal(updates.length, 0, "drafts were never public; the publish gate covers them");
});

/* ── restoreParkedJobs ───────────────────────────────────────── */

test("upgrading to premium restores every parked listing", async () => {
  const { client, updates } = fakeClient(
    jobs(
      ["live", "2026-04-01"],
      ["p1", "2026-03-01", "paused", "claim_gated"],
      ["p2", "2026-02-01", "paused", "claim_gated"]
    )
  );
  const restored = await restoreParkedJobs(client, "biz", "premium");
  assert.equal(restored, 2);
  assert.deepEqual(updates[0].ids.sort(), ["p1", "p2"]);
  assert.equal(updates[0].payload.status, "active");
  assert.equal(updates[0].payload.paused_reason, null, "reason must be cleared");
});

test("a listing the owner paused is never auto-restored", async () => {
  const { client, updates } = fakeClient(
    jobs(
      ["p1", "2026-03-01", "paused", "claim_gated"],
      ["mine", "2026-02-01", "paused", null] // owner paused this one
    )
  );
  const restored = await restoreParkedJobs(client, "biz", "premium");
  assert.equal(restored, 1);
  assert.deepEqual(updates[0].ids, ["p1"]);
  assert.ok(!updates[0].ids.includes("mine"), "re-publishing a filled role is the bad outcome");
});

test("standard tier restores only up to its remaining headroom", async () => {
  // Standard = 5 active. One already live leaves room for 4 of the 6 parked.
  const { client, updates } = fakeClient(
    jobs(
      ["live", "2026-09-01"],
      ["p1", "2026-08-01", "paused", "claim_gated"],
      ["p2", "2026-07-01", "paused", "claim_gated"],
      ["p3", "2026-06-01", "paused", "claim_gated"],
      ["p4", "2026-05-01", "paused", "claim_gated"],
      ["p5", "2026-04-01", "paused", "claim_gated"],
      ["p6", "2026-03-01", "paused", "claim_gated"]
    )
  );
  const restored = await restoreParkedJobs(client, "biz", "standard");
  assert.equal(restored, 4);
  assert.deepEqual(updates[0].ids, ["p1", "p2", "p3", "p4"], "newest-first");
});

test("no headroom restores nothing", async () => {
  const { client, updates } = fakeClient(
    jobs(["live", "2026-04-01"], ["p1", "2026-03-01", "paused", "claim_gated"])
  );
  assert.equal(await restoreParkedJobs(client, "biz", "free"), 0);
  assert.equal(updates.length, 0);
});

test("park then restore round-trips to the original live set", async () => {
  const rows = jobs(["a", "2026-01-01"], ["b", "2026-02-01"], ["c", "2026-03-01"]);
  const { client } = fakeClient(rows);

  await parkListingsOnClaim(client, "biz", "a", 1);
  assert.deepEqual(
    rows.filter((r) => r.status === "active").map((r) => r.id),
    ["a"]
  );

  await restoreParkedJobs(client, "biz", "premium");
  assert.deepEqual(
    rows.filter((r) => r.status === "active").map((r) => r.id).sort(),
    ["a", "b", "c"]
  );
  assert.ok(rows.every((r) => r.paused_reason === null), "no stale reasons left behind");
});

/**
 * Regression guard for migration 00092.
 *
 * paused_reason used to mean "billing parked this", so the restore matched
 * on "reason is not null". 00092 added 'stale_cleanup' for listings retired
 * by hand, and job expiry will add another. Under the old match, the first
 * of those businesses to upgrade would have silently republished every
 * listing we deliberately took down — which is the precise failure the
 * whole paused_reason column exists to prevent.
 */
test("a listing retired by stale_cleanup is never restored by an upgrade", async () => {
  const { client, updates } = fakeClient(
    jobs(
      ["billing", "2026-03-01", "paused", "claim_gated"],
      ["stale", "2026-04-01", "paused", "stale_cleanup"]
    )
  );
  const restored = await restoreParkedJobs(client, "biz", "premium");
  assert.equal(restored, 1, "only the billing-parked listing comes back");
  assert.deepEqual(updates[0].ids, ["billing"]);
});

test("stale_cleanup listings are not counted as parked behind the paywall", async () => {
  const { client } = fakeClient(
    jobs(
      ["billing", "2026-03-01", "paused", "tier_downgrade"],
      ["stale1", "2026-04-01", "paused", "stale_cleanup"],
      ["stale2", "2026-05-01", "paused", "stale_cleanup"],
      ["owner", "2026-06-01", "paused", null]
    )
  );
  assert.equal(
    await countParkedJobs(client, "biz"),
    1,
    "the upgrade prompt must not advertise listings we retired"
  );
});
