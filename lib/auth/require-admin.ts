import { NextResponse } from "next/server";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export type AdminAuthContext = {
  supabase: SupabaseClient;
  admin: SupabaseClient;
  user: User;
};

/**
 * Gate an admin route handler. Returns the caller's Supabase clients plus
 * the authenticated user when the role is "admin", or a NextResponse error
 * (401 unauthenticated / 403 not-admin) that should be returned immediately.
 *
 *   const auth = await requireAdmin();
 *   if (auth instanceof NextResponse) return auth;
 *   const { admin, user } = auth;
 *
 * The role lookup always goes through the service-role client so it works
 * regardless of whether the caller's user-scoped RLS policy allows them to
 * read their own users row.
 */
export async function requireAdmin(): Promise<AdminAuthContext | NextResponse> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const { data: row } = await admin
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();

  if (row?.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return { supabase, admin, user };
}
