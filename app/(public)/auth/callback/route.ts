import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

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
        return NextResponse.redirect(`${origin}/dashboard?reset_password=true`);
      }

      // For login flows (type is "business" or "worker"), check role enforcement
      if (type === "business" || type === "worker") {
        const { data: { user } } = await supabase.auth.getUser();

        if (user) {
          const { data: userData } = await supabase
            .from("users")
            .select("role")
            .eq("id", user.id)
            .single();

          const role = userData?.role;

          // If user has no role yet, they're new — send to onboarding
          if (!role) {
            return NextResponse.redirect(`${origin}/onboarding?type=${type}`);
          }

          // Admin can access any portal
          if (role === "admin") {
            if (type === "business") {
              return NextResponse.redirect(`${origin}/business/dashboard`);
            }
            return NextResponse.redirect(`${origin}/dashboard`);
          }

          // Enforce role matches login type
          if (type === "business" && role !== "business_owner") {
            await supabase.auth.signOut();
            return NextResponse.redirect(
              `${origin}/login?error=${encodeURIComponent("This account is registered as a worker. Please use the Seasonal Worker login.")}`
            );
          }

          if (type === "worker" && role === "business_owner") {
            await supabase.auth.signOut();
            return NextResponse.redirect(
              `${origin}/login?error=${encodeURIComponent("This account is registered as a business. Please use the Business login.")}`
            );
          }

          // Existing user with matching role — send to their dashboard
          if (role === "business_owner") {
            return NextResponse.redirect(`${origin}/business/dashboard`);
          }
          return NextResponse.redirect(`${origin}/dashboard`);
        }

        // Fallback: send to onboarding with type
        return NextResponse.redirect(`${origin}/onboarding?type=${type}`);
      }

      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // Check if there's an error param from the URL (e.g., from Supabase)
  return NextResponse.redirect(`${origin}/login?error=auth_failed`);
}
