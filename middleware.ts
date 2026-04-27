import { type NextRequest, NextResponse } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";
import { withTimeout } from "@/lib/utils/with-timeout";

// Short-lived cookie that caches the user's role so we do not hit Supabase
// on every protected-route request. Format is "<userId>:<role>" so a stale
// cookie from a previous user is detected and ignored. The 5-minute TTL is
// long enough to cover most browsing sessions and short enough that a role
// change (e.g. promoting a worker to admin in the DB) propagates quickly.
const ROLE_COOKIE = "mc-role";
const ROLE_COOKIE_TTL_SECONDS = 60 * 5;
const ROLE_QUERY_TIMEOUT_MS = 2500;

// Routes that require the "worker" role
const WORKER_ROUTES = ["/dashboard", "/profile", "/applications", "/saved-jobs", "/messages", "/interviews", "/following", "/job-alerts"];
// Routes that require the "business_owner" role
const BUSINESS_PORTAL_ROUTES = [
  "/business/dashboard",
  "/business/manage-listings",
  "/business/post-job",
  "/business/applicants",
  "/business/company-profile",
  "/business/interviews",
  "/business/messages",
  "/business/availability",
  "/business/analytics",
  "/business/settings",
  "/business/workers",
];
// Routes that require the "admin" role
const ADMIN_ROUTES_PREFIX = "/admin";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // ── Fast path: skip everything for API routes (they handle their own auth) ──
  if (pathname.startsWith("/api/")) {
    // Only the access gate API needs special handling
    if (pathname === "/api/access" || pathname === "/api/test-portal" || pathname === "/api/search-resorts") {
      return NextResponse.next();
    }
    // All other API routes: refresh session but skip role checks
    const { response } = await updateSession(request);
    return response;
  }

  const isAuthRoute = pathname === "/forgot-password" || pathname === "/reset-password" || pathname === "/login" || pathname === "/signup" || pathname === "/signup-confirmation" || pathname === "/onboarding" || pathname.startsWith("/auth/");

  // ── Check if this is a protected route that needs auth ──
  const isWorkerRoute = WORKER_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(route + "/")
  );
  const isBusinessRoute = BUSINESS_PORTAL_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(route + "/")
  );
  const isAdminRoute = pathname.startsWith(ADMIN_ROUTES_PREFIX);
  const isProtectedRoute = isWorkerRoute || isBusinessRoute || isAdminRoute;

  // ── Public pages: refresh session (fast) but skip DB queries ──
  if (!isProtectedRoute && !isAuthRoute) {
    const { response } = await updateSession(request);
    return response;
  }

  // ── Auth + protected routes: need full session + role check ──
  const { response, supabase, user } = await updateSession(request);

  // Redirect logged-in users away from auth pages
  if (user && (pathname === "/login" || pathname === "/signup")) {
    if (supabase) {
      const { data: userData } = await supabase
        .from("users")
        .select("role")
        .eq("id", user.id)
        .single();

      const role = userData?.role;
      const dest =
        role === "business_owner"
          ? "/business/dashboard"
          : role === "admin"
          ? "/admin/dashboard"
          : "/dashboard";
      return NextResponse.redirect(new URL(dest, request.url));
    }
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  // Auth routes that aren't login/signup: just return
  if (isAuthRoute) return response;

  // ── Protected route auth enforcement ──
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return response;
  }

  // Allow test mode access
  const hasTestCookie = request.cookies.get("test-mode")?.value === "true";
  if (hasTestCookie) return response;

  if (process.env.NODE_ENV === "development") {
    const isTestParam = request.nextUrl.searchParams.get("test") === "true";
    if (isTestParam) {
      response.cookies.set("test-mode", "true", {
        path: "/",
        maxAge: 60 * 60 * 4,
        httpOnly: true,
        sameSite: "lax",
      });
      return response;
    }
  }

  // Require auth for protected routes
  if (!user) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Role-based enforcement. Try the role cookie first to avoid a Supabase
  // round-trip on every protected request; fall back to a DB lookup with
  // a hard timeout so a slow/unavailable database does not 504 the page.
  if (supabase) {
    let role: string | null | undefined = readCachedRole(request, user.id);

    if (role === null) {
      const [queryResult, timedOut] = await withTimeout(
        supabase.from("users").select("role").eq("id", user.id).single(),
        ROLE_QUERY_TIMEOUT_MS,
      );
      if (timedOut) {
        // Fail open — let the request through so the user does not see a 504.
        // Downstream RLS still gates anything sensitive, so this is safe.
        console.warn("Role lookup timed out — letting request through unrestricted");
        return response;
      }
      role = queryResult?.data?.role;
      if (role) {
        writeCachedRole(response, user.id, role);
      }
    }

    if (isWorkerRoute && role === "business_owner") {
      return NextResponse.redirect(new URL("/business/dashboard", request.url));
    }
    if (isBusinessRoute && role === "worker") {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
    if (isAdminRoute && role !== "admin") {
      if (role === "business_owner") {
        return NextResponse.redirect(new URL("/business/dashboard", request.url));
      }
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
  }

  return response;
}

/**
 * Returns the cached role for the given user from the mc-role cookie if
 * the cookie is present and tied to the same user. Returns `null` to mean
 * "no cache, do a fresh lookup" — distinct from a DB result of "no role
 * found" (rare; the row should always exist for an authed user).
 */
function readCachedRole(request: NextRequest, userId: string): string | null {
  const raw = request.cookies.get(ROLE_COOKIE)?.value;
  if (!raw) return null;
  const idx = raw.indexOf(":");
  if (idx <= 0) return null;
  const cachedUserId = raw.slice(0, idx);
  const cachedRole = raw.slice(idx + 1);
  if (cachedUserId !== userId || !cachedRole) return null;
  return cachedRole;
}

function writeCachedRole(response: NextResponse, userId: string, role: string) {
  response.cookies.set(ROLE_COOKIE, `${userId}:${role}`, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: ROLE_COOKIE_TTL_SECONDS,
  });
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
