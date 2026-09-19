import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Decides where someone goes the moment they have a session: after an OAuth
 * or PKCE code exchange (/auth/callback) or after confirming their email
 * (/api/auth/confirm). Along the way it creates the users row and a
 * worker_profiles stub if they are missing, and signs the session out on a
 * role mismatch.
 *
 * Returns a path rather than a response because the callers must answer
 * differently: a GET can redirect with 307, but a form POST must answer 303 or
 * the browser re-POSTs to the destination.
 *
 * `accountTypeHint` is the ?type= the sign-in started with ("worker" |
 * "business"), when there is one.
 */
export async function pathAfterSignIn(
  supabase: SupabaseClient,
  accountTypeHint: string | null
): Promise<string> {
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    // No user found — redirect to login
    await supabase.auth.signOut();
    return "/login";
  }

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
    accountTypeHint ||
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
    return "/login?notice=confirmed";
  }

  // ── Existing user — enforce role-based routing ──

  // Admin can access any portal
  if (role === "admin") {
    return accountType === "business" ? "/business/dashboard" : "/dashboard";
  }

  // For login flows, enforce role matches the selected login type
  if (accountType === "business" && role !== "business_owner") {
    await supabase.auth.signOut();
    return `/login?error=${encodeURIComponent("This account is registered as a worker. Please use the Seasonal Worker login.")}`;
  }

  if (accountType === "worker" && role === "business_owner") {
    await supabase.auth.signOut();
    return `/login?error=${encodeURIComponent("This account is registered as a business. Please use the Business login.")}`;
  }

  // Check if user has completed onboarding (has a profile)
  if (role === "business_owner") {
    const { data: bizProfile } = await supabase
      .from("business_profiles")
      .select("id, business_name")
      .eq("user_id", user.id)
      .single();
    // Only redirect to onboarding if NO profile exists at all
    if (!bizProfile) {
      return "/onboarding?type=business";
    }
    return "/business/dashboard";
  }

  // Worker — make sure a worker_profiles row exists with names
  // before deciding where to send them. Without this, OAuth
  // users (whose names live only in user_metadata.full_name)
  // ended up with blank rows and showed as "Unknown" in admin
  // lists. The admin client is used here to bypass any RLS
  // timing concerns at first-login.
  const fullName = String(user.user_metadata?.full_name || "").trim();
  const [firstName, ...lastParts] = fullName.split(/\s+/);
  const lastName = lastParts.join(" ");
  const adminCli = createAdminClient();

  const { data: workerProfile } = await adminCli
    .from("worker_profiles")
    .select("id, first_name, last_name")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!workerProfile) {
    // No row yet — create a stub with names so the user shows
    // up in admin lists with a name even if they never finish
    // onboarding. Onboarding then fills out the rest.
    await adminCli.from("worker_profiles").insert({
      user_id: user.id,
      contact_email: user.email,
      first_name: firstName || null,
      last_name: lastName || null,
    });
    return "/onboarding?type=worker";
  }

  // Row exists. If first or last name is missing but auth
  // metadata has a full_name, backfill only the missing pieces.
  // Anything the user has set themselves stays untouched.
  if (fullName && (!workerProfile.first_name || !workerProfile.last_name)) {
    const updates: Record<string, string> = {};
    if (!workerProfile.first_name && firstName) updates.first_name = firstName;
    if (!workerProfile.last_name && lastName) updates.last_name = lastName;
    if (Object.keys(updates).length > 0) {
      await adminCli
        .from("worker_profiles")
        .update(updates)
        .eq("id", workerProfile.id);
    }
  }

  return "/dashboard";
}
