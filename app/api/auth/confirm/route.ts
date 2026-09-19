import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { parseConfirmParams } from "@/lib/auth/confirm-link";
import { pathAfterSignIn } from "@/lib/auth/path-after-sign-in";

// The button on /auth/confirm posts here. Verifying on this POST, not on the
// emailed link's GET, is what keeps mail scanners from using links up. A
// token_hash needs no PKCE verifier, so it works in whichever browser opens
// the email. Every answer is a 303 so the browser follows it with a GET.
export async function POST(request: Request) {
  const { origin } = new URL(request.url);
  const form = await request.formData();
  const params = parseConfirmParams({
    token_hash: form.get("token_hash"),
    type: form.get("type"),
  });

  if (!params) {
    return NextResponse.redirect(`${origin}/login?notice=link_invalid`, 303);
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({
    type: params.type,
    token_hash: params.tokenHash,
  });

  if (error) {
    console.warn("auth/confirm: verifyOtp failed:", error.code ?? error.message);
    // A link used moments ago by this same browser (a second tap that got
    // past the button guard) leaves a session behind. Carry on with it.
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.redirect(`${origin}/login?notice=link_invalid`, 303);
    }
  }

  if (params.type === "recovery") {
    return NextResponse.redirect(`${origin}/reset-password`, 303);
  }

  return NextResponse.redirect(`${origin}${await pathAfterSignIn(supabase, null)}`, 303);
}
