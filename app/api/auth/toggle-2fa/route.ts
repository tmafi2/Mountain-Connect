import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { enabled, password } = await request.json();

  if (typeof enabled !== "boolean") {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  // When disabling, require password confirmation
  if (!enabled) {
    if (!password) {
      return NextResponse.json({ error: "Password required to disable 2FA" }, { status: 400 });
    }

    // Verify password
    const admin = createAdminClient();
    const { error: verifyError } = await admin.auth.signInWithPassword({
      email: user.email!,
      password,
    });

    if (verifyError) {
      return NextResponse.json({ error: "Incorrect password" }, { status: 401 });
    }
  }

  // Update 2FA flag
  const admin = createAdminClient();
  const { error } = await admin
    .from("users")
    .update({ two_factor_enabled: enabled })
    .eq("id", user.id);

  if (error) {
    return NextResponse.json({ error: "Failed to update 2FA setting" }, { status: 500 });
  }

  return NextResponse.json({ success: true, two_factor_enabled: enabled });
}

// GET — check current 2FA status
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const { data } = await admin
    .from("users")
    .select("two_factor_enabled")
    .eq("id", user.id)
    .single();

  return NextResponse.json({
    two_factor_enabled: data?.two_factor_enabled ?? false,
  });
}
