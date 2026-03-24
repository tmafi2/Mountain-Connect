import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getStreamServerClient } from "@/lib/stream/server";

export async function POST() {
  const streamClient = getStreamServerClient();
  if (!streamClient) {
    return NextResponse.json(
      { error: "Messaging is not configured" },
      { status: 503 }
    );
  }

  // Authenticate user via Supabase
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Fetch profile data to populate Stream user
  const admin = createAdminClient();
  const { data: dbUser } = await admin
    .from("users")
    .select("role, full_name, avatar_url")
    .eq("id", user.id)
    .single();

  let name = dbUser?.full_name || user.user_metadata?.full_name || "User";
  let image: string | undefined;

  if (dbUser?.role === "business_owner") {
    const { data: biz } = await admin
      .from("business_profiles")
      .select("business_name, logo_url")
      .eq("user_id", user.id)
      .single();
    if (biz) {
      name = biz.business_name || name;
      image = biz.logo_url || undefined;
    }
  } else {
    const { data: worker } = await admin
      .from("worker_profiles")
      .select("first_name, last_name, profile_photo_url")
      .eq("user_id", user.id)
      .single();
    if (worker) {
      const fullName = [worker.first_name, worker.last_name]
        .filter(Boolean)
        .join(" ");
      if (fullName) name = fullName;
      image = worker.profile_photo_url || undefined;
    }
  }

  // Upsert user in Stream Chat
  await streamClient.upsertUser({
    id: user.id,
    name,
    image,
    role: "user",
    custom: { supabase_role: dbUser?.role || "worker" },
  });

  // Generate token
  const token = streamClient.createToken(user.id);

  return NextResponse.json({
    token,
    userId: user.id,
    userName: name,
    apiKey: process.env.NEXT_PUBLIC_STREAM_CHAT_API_KEY,
  });
}
