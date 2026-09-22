import { test } from "node:test";
import assert from "node:assert/strict";
import { NextRequest, type NextFetchEvent } from "next/server";
import { middleware } from "./middleware";

/**
 * Test mode lets a logged-out browser into the portal shells, where the pages
 * fall back to demo data. It is a development tool and has to stay one.
 *
 * Until 2026-09-19 the middleware honoured the `test-mode` cookie in every
 * environment. The cookie is an unsigned "true", so anyone could set it by
 * hand; /api/test-portal also handed it out in production, for a code that
 * fell back to a literal in this public repo because TEST_PORTAL_CODE was
 * never set in Vercel. Anyone could open /business/*, the worker portal and
 * the /admin shells without an account, and be shown invented applicants as
 * though they were a business's real inbox.
 */

// Auth is only enforced when Supabase is configured, and CI runs with an empty
// environment. With no session cookie, auth.getUser() answers from the empty
// cookie jar and never dials this address.
process.env.NEXT_PUBLIC_SUPABASE_URL ??= "http://127.0.0.1:9";
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??= "test-anon-key";
// The route reads this when it is imported, which is why it is imported lazily.
process.env.TEST_PORTAL_CODE = "test-portal-code";

const env = process.env as Record<string, string | undefined>;

async function inEnv<T>(nodeEnv: "development" | "production", fn: () => Promise<T>): Promise<T> {
  const previous = env.NODE_ENV;
  env.NODE_ENV = nodeEnv;
  try {
    return await fn();
  } finally {
    env.NODE_ENV = previous;
  }
}

/**
 * Middleware takes Next's fetch event as its second argument — it is what the
 * campaign visit counter hands its insert to, so it never delays a response.
 * The stub drops the promise, which keeps these tests free of network calls.
 */
const noopEvent = { waitUntil: () => {} } as unknown as NextFetchEvent;

function visit(path: string, cookie?: string) {
  return middleware(
    new NextRequest(`https://www.mountainconnects.com${path}`, {
      headers: cookie ? { cookie } : {},
    }),
    noopEvent,
  );
}

async function claimTestMode(code: string) {
  const { POST } = await import("./app/api/test-portal/route");
  return POST(
    new NextRequest("https://www.mountainconnects.com/api/test-portal", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ code }),
    }),
  );
}

// One of each kind of protected route: business portal, worker portal, admin.
const PORTAL_PATHS = ["/business/manage-listings", "/business/interviews", "/dashboard", "/admin/dashboard"];

test("in production a test-mode cookie does not get a logged-out visitor into any portal", async () => {
  await inEnv("production", async () => {
    for (const path of PORTAL_PATHS) {
      const res = await visit(path, "test-mode=true");
      assert.equal(res.status, 307, `${path} let a logged-out visitor through`);
      const location = new URL(res.headers.get("location") ?? "");
      assert.equal(location.pathname, "/login", path);
      assert.equal(location.searchParams.get("redirect"), path);
    }
  });
});

test("in production ?test=true neither lets the visitor in nor hands out the cookie", async () => {
  await inEnv("production", async () => {
    const res = await visit("/business/dashboard?test=true");
    assert.equal(res.status, 307);
    assert.equal(res.cookies.get("test-mode"), undefined);
  });
});

test("in production /api/test-portal issues nothing, even for the right code", async () => {
  await inEnv("production", async () => {
    const res = await claimTestMode("test-portal-code");
    assert.equal(res.status, 404);
    assert.equal(res.cookies.get("test-mode"), undefined);
  });
});

test("in development test mode still works: the cookie, ?test=true and the code", async () => {
  await inEnv("development", async () => {
    const withCookie = await visit("/business/manage-listings", "test-mode=true");
    assert.equal(withCookie.headers.get("x-middleware-next"), "1");

    const withParam = await visit("/business/dashboard?test=true");
    assert.equal(withParam.headers.get("x-middleware-next"), "1");
    assert.equal(withParam.cookies.get("test-mode")?.value, "true");

    const right = await claimTestMode("test-portal-code");
    assert.equal(right.status, 200);
    assert.equal(right.cookies.get("test-mode")?.value, "true");

    const wrong = await claimTestMode("not-the-code");
    assert.equal(wrong.status, 401);
  });
});

// Keeps the development test honest: passing through there must be because of
// test mode, not because the middleware lets every logged-out request in.
test("in development a logged-out visitor without test mode is still sent to login", async () => {
  await inEnv("development", async () => {
    const res = await visit("/business/manage-listings");
    assert.equal(res.status, 307);
    assert.equal(new URL(res.headers.get("location") ?? "").pathname, "/login");
  });
});
