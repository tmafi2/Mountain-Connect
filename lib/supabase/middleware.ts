import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { withTimeout } from "@/lib/utils/with-timeout";

// Hard cap on how long we will wait for Supabase to return the auth user
// before failing open. Vercel's middleware deadline is short, so it's much
// better to render the page as logged-out (downstream code re-validates
// where it matters) than to 504 the entire request.
const AUTH_TIMEOUT_MS = 2500;

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  // Skip Supabase session refresh if env vars aren't configured
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  ) {
    return { response: supabaseResponse, supabase: null, user: null };
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const [authResult, timedOut] = await withTimeout(
    supabase.auth.getUser(),
    AUTH_TIMEOUT_MS,
  );

  if (timedOut) {
    console.warn("Supabase auth.getUser timed out in middleware — failing open");
    return { response: supabaseResponse, supabase, user: null };
  }

  return {
    response: supabaseResponse,
    supabase,
    user: authResult?.data?.user ?? null,
  };
}
