import { test } from "node:test";
import assert from "node:assert/strict";
import { pickCanonicalBusiness, findBusinessByEmail, type BusinessMatch } from "./business-by-email";

const biz = (over: Partial<BusinessMatch> & { id: string }): BusinessMatch => ({
  is_claimed: false,
  claim_token: "tok-" + over.id,
  nearby_town_id: null,
  created_at: "2026-08-18T00:00:00Z",
  ...over,
});

test("an email nobody uses yet matches nothing", () => {
  assert.equal(pickCanonicalBusiness([]), null);
});

test("one row is that row", () => {
  const only = biz({ id: "a" });
  assert.equal(pickCanonicalBusiness([only])?.id, "a");
});

/**
 * The Odin case. Before the fix these rows made `maybeSingle()` return
 * PGRST116 with null data, which the callers read as "no such business" and
 * answered by inserting yet another row.
 */
test("several rows sharing an email resolve to the oldest, not to nothing", () => {
  const rows = [
    biz({ id: "newest", created_at: "2026-09-07T12:00:00Z" }),
    biz({ id: "original", created_at: "2026-08-18T09:00:00Z" }),
    biz({ id: "middle", created_at: "2026-09-04T15:00:00Z" }),
  ];
  assert.equal(pickCanonicalBusiness(rows)?.id, "original");
});

test("the pick does not depend on the order rows arrive in", () => {
  const rows = [
    biz({ id: "original", created_at: "2026-08-18T09:00:00Z" }),
    biz({ id: "newer", created_at: "2026-09-04T15:00:00Z" }),
  ];
  assert.equal(pickCanonicalBusiness(rows)?.id, "original");
  assert.equal(pickCanonicalBusiness([...rows].reverse())?.id, "original");
});

test("the input array is not mutated by sorting", () => {
  const rows = [
    biz({ id: "newer", created_at: "2026-09-04T15:00:00Z" }),
    biz({ id: "original", created_at: "2026-08-18T09:00:00Z" }),
  ];
  pickCanonicalBusiness(rows);
  assert.equal(rows[0].id, "newer", "caller's array must be left alone");
});

/**
 * A real account beats an older shell. Attaching the listing to the shell
 * would hide it from the one person who can actually answer an applicant.
 */
test("a claimed row wins even when a shell is older", () => {
  const rows = [
    biz({ id: "shell", created_at: "2026-08-18T00:00:00Z" }),
    biz({ id: "real", created_at: "2026-09-01T00:00:00Z", is_claimed: true }),
  ];
  assert.equal(pickCanonicalBusiness(rows)?.id, "real");
});

test("the oldest claimed row wins when more than one is claimed", () => {
  const rows = [
    biz({ id: "claimed-late", created_at: "2026-09-05T00:00:00Z", is_claimed: true }),
    biz({ id: "claimed-first", created_at: "2026-08-20T00:00:00Z", is_claimed: true }),
    biz({ id: "shell", created_at: "2026-08-01T00:00:00Z" }),
  ];
  assert.equal(pickCanonicalBusiness(rows)?.id, "claimed-first");
});

/** A stub shaped like the one PostgREST call this module makes. */
function stubAdmin(result: { data?: unknown; error?: { message: string } }) {
  return {
    from: () => ({
      select: () => ({
        eq: async () => ({ data: result.data ?? null, error: result.error ?? null }),
      }),
    }),
  } as never;
}

test("a lookup that fails reports an error rather than an absence", async () => {
  const out = await findBusinessByEmail(stubAdmin({ error: { message: "connection reset" } }), "x@y.com");
  assert.equal(out.error, "connection reset");
  assert.equal(out.match, null, "match is meaningless when error is set");
});

/**
 * The distinction the old code could not make, and the whole point of the
 * module: "no rows" and "the query broke" must not look alike, because one
 * means insert and the other means abort.
 */
test("no rows is not an error", async () => {
  const out = await findBusinessByEmail(stubAdmin({ data: [] }), "brand-new@example.com");
  assert.equal(out.error, null);
  assert.equal(out.match, null);
  assert.equal(out.count, 0);
});

test("duplicate rows are surfaced by count so the mess is visible", async () => {
  const out = await findBusinessByEmail(
    stubAdmin({
      data: [
        biz({ id: "a", created_at: "2026-08-18T00:00:00Z" }),
        biz({ id: "b", created_at: "2026-09-04T00:00:00Z" }),
      ],
    }),
    "recruitment@odin-living.com",
  );
  assert.equal(out.error, null);
  assert.equal(out.count, 2);
  assert.equal(out.match?.id, "a");
});
