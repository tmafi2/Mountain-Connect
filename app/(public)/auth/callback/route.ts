import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { pathAfterSignIn } from "@/lib/auth/path-after-sign-in";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const type = searchParams.get("type");
  const next = searchParams.get("next") ?? "/onboarding";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      // Redirect to dashboard with reset modal for password recovery flows
      if (type === "recovery" || next === "/reset-password") {
        return NextResponse.redirect(`${origin}/reset-password`);
      }

      return NextResponse.redirect(`${origin}${await pathAfterSignIn(supabase, type)}`);
    }
  }

  // No code, or the exchange failed. From an emailed link this usually means
  // the email WAS confirmed: a mail scanner used the link first (Supabase then
  // redirects here with #error_code=otp_expired, which a server never sees), or
  // it opened in a browser without the signup's PKCE verifier. /login explains
  // that instead of calling it a failure. /auth/confirm avoids both cases.
  return NextResponse.redirect(`${origin}/login?error=auth_failed`);
}
