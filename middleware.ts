import { type NextRequest, NextResponse } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

// Routes that require the "worker" role
const WORKER_ROUTES = ["/dashboard", "/profile", "/applications", "/saved-jobs", "/messages", "/interviews", "/following", "/job-alerts"];
// Routes that require the "business_owner" role
// Business portal routes (not including /business/[id] which is the public profile page)
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
  // Always refresh the Supabase session first
  const { response, supabase, user } = await updateSession(request);
  const { pathname } = request.nextUrl;

  // ── Site-wide access gate ────────────────────────────────
  const isAccessPage = pathname === "/access";
  const isAccessApi = pathname === "/api/access";
  const isComingSoon = pathname === "/coming-soon";
  const isTestPortals = pathname === "/test-portals";
  const isTestPortalApi = pathname === "/api/test-portal";
  const isAuthRoute = pathname === "/forgot-password" || pathname === "/reset-password" || pathname === "/login" || pathname === "/signup" || pathname === "/signup-confirmation" || pathname === "/onboarding" || pathname.startsWith("/auth/");
  const isPublicApi = pathname === "/api/search-resorts";
  const hasAccessCookie = request.cookies.get("site-access")?.value === "granted";

  if (!isAccessPage && !isAccessApi && !isComingSoon && !isTestPortals && !isTestPortalApi && !isAuthRoute && !isPublicApi && !hasAccessCookie) {
    return NextResponse.redirect(new URL("/access", request.url));
  }

  // Redirect logged-in users away from auth pages
  if (user && (pathname === "/login" || pathname === "/signup")) {
    // Determine dashboard based on role
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
    // Fallback if no supabase client
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  // Check if this is a protected portal route
  const isWorkerRoute = WORKER_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(route + "/")
  );
  const isBusinessRoute = BUSINESS_PORTAL_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(route + "/")
  );
  const isAdminRoute = pathname.startsWith(ADMIN_ROUTES_PREFIX);

  if (!isWorkerRoute && !isBusinessRoute && !isAdminRoute) {
    return response;
  }

  // Skip auth check if Supabase isn't configured
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  ) {
    return response;
  }

  // Allow test mode access
  const hasTestCookie = request.cookies.get("test-mode")?.value === "true";
  if (hasTestCookie) {
    return response;
  }

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

  // Check for auth session
  if (!user) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // ── Role-based enforcement ─────────────────────────────────
  // Query the user's role from the database
  if (supabase && (isWorkerRoute || isBusinessRoute || isAdminRoute)) {
    const { data: userData } = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single();

    const role = userData?.role;

    // Business user trying to access worker routes → redirect to business dashboard
    if (isWorkerRoute && role === "business_owner") {
      return NextResponse.redirect(new URL("/business/dashboard", request.url));
    }

    // Worker trying to access business routes → redirect to worker dashboard
    if (isBusinessRoute && role === "worker") {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }

    // Admin can access everything — no redirect needed
    // Non-admin trying to access admin routes → redirect based on role
    if (isAdminRoute && role !== "admin") {
      if (role === "business_owner") {
        return NextResponse.redirect(new URL("/business/dashboard", request.url));
      } else {
        return NextResponse.redirect(new URL("/dashboard", request.url));
      }
    }
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
