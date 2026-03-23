import { createAdminClient } from "@/lib/supabase/admin";
import type { NotificationType } from "@/types/database";

interface CreateNotificationParams {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  link?: string;
  metadata?: Record<string, unknown>;
}

export async function createNotification(params: CreateNotificationParams) {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("notifications")
    .insert({
      user_id: params.userId,
      type: params.type,
      title: params.title,
      message: params.message,
      link: params.link || null,
      metadata: params.metadata || null,
    })
    .select()
    .single();

  if (error) {
    console.error("Failed to create notification:", error);
    throw error;
  }

  return data;
}
