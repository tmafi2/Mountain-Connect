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

      const { data: { user } } = await supabase.auth.getUser();

      if (user) {
        // Check if user already has a role in the users table
        const { data: userData } = await supabase
          .from("users")
          .select("role")
          .eq("id", user.id)
          .single();

        const role = userData?.role;

        // Determine account type from URL param, or fall back to user metadata
        const accountType = type || user.user_metadata?.account_type;

        // If user has no role yet, they're new — create user row and send to onboarding
        if (!role) {
          const newRole = accountType === "business" ? "business_owner" : "worker";

          // Create the users table row with the correct role
          await supabase.from("users").upsert(
            {
              id: user.id,
              email: user.email!,
              full_name: user.user_metadata?.full_name || "",
              role: newRole,
            },
            { onConflict: "id" }
          );

          if (accountType === "business") {
            return NextResponse.redirect(`${origin}/onboarding?type=business`);
          }
          return NextResponse.redirect(`${origin}/onboarding?type=worker`);
        }

        // ── Existing user — enforce role-based routing ──

        // Admin can access any portal
        if (role === "admin") {
          if (accountType === "business") {
            return NextResponse.redirect(`${origin}/business/dashboard`);
          }
          return NextResponse.redirect(`${origin}/dashboard`);
        }

        // For login flows, enforce role matches the selected login type
        if (accountType === "business" && role !== "business_owner") {
          await supabase.auth.signOut();
          return NextResponse.redirect(
            `${origin}/login?error=${encodeURIComponent("This account is registered as a worker. Please use the Seasonal Worker login.")}`
          );
        }

        if (accountType === "worker" && role === "business_owner") {
          await supabase.auth.signOut();
          return NextResponse.redirect(
            `${origin}/login?error=${encodeURIComponent("This account is registered as a business. Please use the Business login.")}`
          );
        }

        // Route to the correct dashboard based on actual role
        if (role === "business_owner") {
          return NextResponse.redirect(`${origin}/business/dashboard`);
        }
        return NextResponse.redirect(`${origin}/dashboard`);
      }

      // No user found — fall back to onboarding
      return NextResponse.redirect(`${origin}/onboarding?type=${type || "worker"}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth_failed`);
}
