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
        return NextResponse.redirect(`${origin}/reset-password`);
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

        // Determine account type — check multiple sources for reliability
        // 1. URL param (most reliable when Supabase preserves it)
        // 2. user_metadata.account_type (set during signUp)
        // 3. user_metadata.business_name exists → must be business
        const accountType =
          type ||
          user.user_metadata?.account_type ||
          (user.user_metadata?.business_name ? "business" : null);

        // If user has no role yet, they're new — create user row and redirect to login
        if (!role) {
          const newRole = accountType === "business" ? "business_owner" : "worker";

          // Create the users table row with the correct role
          const { error: upsertError } = await supabase.from("users").upsert(
            {
              id: user.id,
              email: user.email!,
              full_name: user.user_metadata?.full_name || "",
              role: newRole,
            },
            { onConflict: "id" }
          );

          if (upsertError) {
            console.error("User upsert error:", upsertError);
          }

          // Sign out so user must log in manually
          await supabase.auth.signOut();
          return NextResponse.redirect(`${origin}/login`);
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

        // Check if user has completed onboarding (has a profile)
        if (role === "business_owner") {
          const { data: bizProfile } = await supabase
            .from("business_profiles")
            .select("id, business_name")
            .eq("user_id", user.id)
            .single();
          // If no profile or profile has no business_name (auto-created stub), redirect to onboarding
          if (!bizProfile || !bizProfile.business_name) {
            return NextResponse.redirect(`${origin}/onboarding?type=business`);
          }
          return NextResponse.redirect(`${origin}/business/dashboard`);
        }

        // Worker
        const { data: workerProfile } = await supabase
          .from("worker_profiles")
          .select("id, bio")
          .eq("user_id", user.id)
          .single();
        if (!workerProfile || !workerProfile.bio) {
          return NextResponse.redirect(`${origin}/onboarding?type=worker`);
        }
        return NextResponse.redirect(`${origin}/dashboard`);
      }

      // No user found — redirect to login
      await supabase.auth.signOut();
      return NextResponse.redirect(`${origin}/login`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth_failed`);
}
