import { type NextRequest, NextResponse } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

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

  // ── Site-wide access gate ────────────────────────────────
  const isAccessPage = pathname === "/access";
  const isComingSoon = pathname === "/coming-soon";
  const isTestPortals = pathname === "/test-portals";
  const isAuthRoute = pathname === "/forgot-password" || pathname === "/reset-password" || pathname === "/login" || pathname === "/signup" || pathname === "/signup-confirmation" || pathname === "/onboarding" || pathname.startsWith("/auth/");
  const hasAccessCookie = request.cookies.get("site-access")?.value === "granted";

  // Access gate pages don't need session at all
  if (isAccessPage || isComingSoon) {
    return NextResponse.next();
  }

  // Let crawlers access sitemap and robots without the access cookie
  const isCrawlerFile = pathname === "/sitemap.xml" || pathname === "/robots.txt";

  // Redirect to access page if no cookie (skip session refresh for speed)
  if (!isTestPortals && !isAuthRoute && !isCrawlerFile && !hasAccessCookie) {
    return NextResponse.redirect(new URL("/access", request.url));
  }

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

  // Role-based enforcement (single DB query — only for protected routes)
  if (supabase) {
    const { data: userData } = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single();

    const role = userData?.role;

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

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
