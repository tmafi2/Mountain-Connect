import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { WorkerProfile } from "@/types/database";
import ProfileClient from "./ProfileClient";

export const dynamic = "force-dynamic";

export default async function WorkerProfilePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data } = await supabase
    .from("worker_profiles")
    .select("*")
    .eq("user_id", user.id)
    .single();

  const profile = data as WorkerProfile | null;

  let avatarUrl: string | null = null;
  if (profile) {
    if (profile.avatar_url) avatarUrl = profile.avatar_url;
    else if (profile.profile_photo_url) avatarUrl = profile.profile_photo_url;
  }

  return <ProfileClient initialProfile={profile} initialAvatarUrl={avatarUrl} />;
}
