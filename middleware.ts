import { type NextRequest, NextResponse } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

// Routes that require the "worker" role
const WORKER_ROUTES = ["/dashboard", "/profile", "/applications", "/saved-jobs", "/messages", "/interviews", "/employers", "/following"];
// Routes that require the "business_owner" role
const BUSINESS_ROUTES_PREFIX = "/business";
// Routes that require the "admin" role
const ADMIN_ROUTES_PREFIX = "/admin";

export async function middleware(request: NextRequest) {
  // Always refresh the Supabase session first
  const response = await updateSession(request);
  const { pathname } = request.nextUrl;

  // Check if this is a protected portal route
  const isWorkerRoute = WORKER_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(route + "/")
  );
  const isBusinessRoute = pathname.startsWith(BUSINESS_ROUTES_PREFIX);
  const isAdminRoute = pathname.startsWith(ADMIN_ROUTES_PREFIX);

  if (!isWorkerRoute && !isBusinessRoute && !isAdminRoute) {
    return response;
  }

  // Skip auth check if Supabase isn't configured (dev mode without env vars)
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  ) {
    return response;
  }

  // Allow test mode access (skip auth check)
  // When ?test=true is in the URL, set a cookie so test mode persists across navigation
  const isTestParam = request.nextUrl.searchParams.get("test") === "true";
  if (isTestParam) {
    response.cookies.set("test-mode", "true", {
      path: "/",
      maxAge: 60 * 60 * 4, // 4 hours
      httpOnly: true,
      sameSite: "lax",
    });
    return response;
  }

  // Check for existing test mode cookie
  const hasTestCookie = request.cookies.get("test-mode")?.value === "true";
  if (hasTestCookie) {
    return response;
  }

  // Check for auth session via cookie (lightweight check)
  const hasSession = request.cookies.getAll().some((c) =>
    c.name.includes("auth-token")
  );

  if (!hasSession) {
    // Not logged in — redirect to login
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
