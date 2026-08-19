import { test } from "node:test";
import assert from "node:assert/strict";
import type { SupabaseClient } from "@supabase/supabase-js";
import { publishJobs } from "./publish-jobs";

/**
 * The rule under test: outreach is ONE email per business, never one per
 * job, and never a second one to a business already contacted.
 *
 * That rule is the whole reason bulk approve is safe to expose. With the
 * queue as it stands — 76 pending jobs across 21 businesses, one of them
 * holding 13 — getting it wrong means a burst of thirteen near-identical
 * "claim your listing" emails to a business we are trying to recruit.
 * Worth pinning down properly rather than trusting a read-through.
 */
interface Job {
  id: string;
  title: string;
  status: string;
  business_id: string;
  source: string | null;
}
interface Business {
  id: string;
  business_name: string;
  email: string | null;
  is_claimed: boolean;
  claim_token: string | null;
  import_outreach_sent_at: string | null;
}

function fakeDb(jobs: Job[], businesses: Business[]) {
  const stamped: string[] = [];

  const from = (table: string) => {
    let rows: Array<Record<string, unknown>> =
      table === "job_posts" ? (jobs as unknown as Array<Record<string, unknown>>)
      : (businesses as unknown as Array<Record<string, unknown>>);
    const filters: Array<(r: Record<string, unknown>) => boolean> = [];
    let payload: Record<string, unknown> | null = null;

    const api = {
      select: () => api,
      eq(col: string, val: unknown) {
        filters.push((r) => r[col] === val);
        return api;
      },
      in(col: string, vals: unknown[]) {
        filters.push((r) => vals.includes(r[col]));
        return api;
      },
      update(p: Record<string, unknown>) {
        payload = p;
        return api;
      },
      then(resolve: (v: unknown) => unknown) {
        const matched = rows.filter((r) => filters.every((f) => f(r)));
        if (payload) {
          for (const r of matched) {
            Object.assign(r, payload);
            if (table === "business_profiles" && "import_outreach_sent_at" in payload) {
              stamped.push(String(r.id));
            }
          }
          return resolve({ error: null });
        }
        return resolve({ data: matched.map((r) => ({ ...r })), error: null });
      },
    };
    return api;
  };

  return { db: { from } as unknown as SupabaseClient, stamped };
}

const job = (id: string, business_id: string, title = `Role ${id}`, status = "draft"): Job => ({
  id,
  title,
  status,
  business_id,
  source: "Facebook",
});
const biz = (id: string, over: Partial<Business> = {}): Business => ({
  id,
  business_name: `Biz ${id}`,
  email: `${id}@example.com`,
  is_claimed: false,
  claim_token: `tok-${id}`,
  import_outreach_sent_at: null,
  ...over,
});

/** Records what would have been sent. Returns a truthy "sent" result. */
function recorder() {
  const calls: Array<{ to: string; jobTitle: string; otherListings: number }> = [];
  const send = async (p: {
    to: string;
    jobTitle: string;
    otherListings?: number;
  }) => {
    calls.push({ to: p.to, jobTitle: p.jobTitle, otherListings: p.otherListings ?? 0 });
    return { id: "msg" } as never;
  };
  return { calls, send: send as never };
}

test("thirteen listings for one business send exactly one email", async () => {
  const jobs = Array.from({ length: 13 }, (_, i) => job(`j${i}`, "b1"));
  const { db } = fakeDb(jobs, [biz("b1")]);
  const mail = recorder();

  const res = await publishJobs(db, "admin", jobs.map((j) => j.id), "https://x.test", mail.send);

  assert.equal(res.published.length, 13, "all thirteen go live");
  assert.equal(mail.calls.length, 1, "but only one email");
  assert.equal(mail.calls[0].otherListings, 12, "and it says so");
  assert.equal(res.emailsSent[0].listings, 13);
});

test("several businesses get one email each, not one per job", async () => {
  const jobs = [
    job("a1", "b1"), job("a2", "b1"), job("a3", "b1"),
    job("c1", "b2"), job("c2", "b2"),
    job("d1", "b3"),
  ];
  const { db } = fakeDb(jobs, [biz("b1"), biz("b2"), biz("b3")]);
  const mail = recorder();

  const res = await publishJobs(db, "admin", jobs.map((j) => j.id), "https://x.test", mail.send);

  assert.equal(res.published.length, 6);
  assert.equal(mail.calls.length, 3, "six jobs, three businesses, three emails");
  assert.deepEqual(
    mail.calls.map((c) => c.to).sort(),
    ["b1@example.com", "b2@example.com", "b3@example.com"]
  );
  assert.deepEqual(mail.calls.map((c) => c.otherListings).sort(), [0, 1, 2]);
});

test("a business already contacted is never emailed again", async () => {
  const jobs = [job("j1", "b1"), job("j2", "b2")];
  const { db } = fakeDb(jobs, [
    biz("b1", { import_outreach_sent_at: "2026-08-01T00:00:00Z" }),
    biz("b2"),
  ]);
  const mail = recorder();

  const res = await publishJobs(db, "admin", ["j1", "j2"], "https://x.test", mail.send);

  assert.equal(res.published.length, 2, "both still publish");
  assert.equal(mail.calls.length, 1);
  assert.equal(mail.calls[0].to, "b2@example.com");
  assert.deepEqual(res.emailsSkipped, [{ businessName: "Biz b1", reason: "already contacted" }]);
});

test("a claimed business is published but not cold-emailed", async () => {
  const jobs = [job("j1", "b1")];
  const { db } = fakeDb(jobs, [biz("b1", { is_claimed: true })]);
  const mail = recorder();

  const res = await publishJobs(db, "admin", ["j1"], "https://x.test", mail.send);
  assert.equal(res.published.length, 1);
  assert.equal(mail.calls.length, 0);
  assert.equal(res.emailsSkipped[0].reason, "already claimed");
});

test("the sent stamp is written only after a successful send", async () => {
  const jobs = [job("j1", "b1")];
  const { db, stamped } = fakeDb(jobs, [biz("b1")]);
  const failing = (async () => {
    throw new Error("Resend is down");
  }) as never;

  const res = await publishJobs(db, "admin", ["j1"], "https://x.test", failing);

  assert.equal(res.published.length, 1, "the publish still stands");
  assert.equal(res.emailErrors.length, 1);
  assert.deepEqual(stamped, [], "not stamped — a transient failure must not silence them forever");
});

test("a successful send does stamp, so the next publish stays quiet", async () => {
  const jobs = [job("j1", "b1"), job("j2", "b1", "Role 2")];
  const { db, stamped } = fakeDb(jobs, [biz("b1")]);
  const mail = recorder();

  await publishJobs(db, "admin", ["j1"], "https://x.test", mail.send);
  assert.deepEqual(stamped, ["b1"]);

  // Second publish for the same business, e.g. approving the rest later.
  const second = await publishJobs(db, "admin", ["j2"], "https://x.test", mail.send);
  assert.equal(mail.calls.length, 1, "still just the one email, ever");
  assert.equal(second.emailsSkipped[0].reason, "already contacted");
});

test("already-active jobs are reported, not republished or re-emailed", async () => {
  const jobs = [job("j1", "b1", "Live one", "active"), job("j2", "b1")];
  const { db } = fakeDb(jobs, [biz("b1")]);
  const mail = recorder();

  const res = await publishJobs(db, "admin", ["j1", "j2"], "https://x.test", mail.send);
  assert.deepEqual(res.alreadyActive, ["j1"]);
  assert.deepEqual(res.published, ["j2"]);
  assert.equal(mail.calls[0].otherListings, 0, "only the newly published one counts");
});

test("unknown ids are reported rather than silently dropped", async () => {
  const jobs = [job("j1", "b1")];
  const { db } = fakeDb(jobs, [biz("b1")]);
  const mail = recorder();

  const res = await publishJobs(db, "admin", ["j1", "ghost"], "https://x.test", mail.send);
  assert.deepEqual(res.notFound, ["ghost"]);
  assert.deepEqual(res.published, ["j1"]);
});

test("a business with no email on file is published and flagged", async () => {
  const jobs = [job("j1", "b1")];
  const { db } = fakeDb(jobs, [biz("b1", { email: null })]);
  const mail = recorder();

  const res = await publishJobs(db, "admin", ["j1"], "https://x.test", mail.send);
  assert.equal(res.published.length, 1);
  assert.equal(mail.calls.length, 0);
  assert.equal(res.emailsSkipped[0].reason, "no email on file");
});

test("an empty selection does nothing at all", async () => {
  const { db } = fakeDb([], []);
  const mail = recorder();
  const res = await publishJobs(db, "admin", [], "https://x.test", mail.send);
  assert.deepEqual(res.published, []);
  assert.equal(mail.calls.length, 0);
});
