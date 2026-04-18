import { createAdminClient } from "@/lib/supabase/admin";

export type AuditAction =
  | "business_approved"
  | "business_rejected"
  | "business_info_requested"
  | "business_verified"
  | "business_unverified"
  | "worker_suspended"
  | "worker_reactivated"
  | "job_featured"
  | "job_unfeatured"
  | "business_tier_changed"
  | "report_resolved"
  | "report_dismissed"
  | "blog_created"
  | "blog_updated"
  | "blog_deleted";

interface LogAdminActionParams {
  adminId: string;
  action: AuditAction;
  targetType: "business" | "worker" | "job" | "report" | "blog";
  targetId: string;
  details?: Record<string, unknown>;
  ipAddress?: string | null;
}

export async function logAdminAction(params: LogAdminActionParams) {
  const admin = createAdminClient();

  const { error } = await admin.from("audit_logs").insert({
    admin_id: params.adminId,
    action: params.action,
    target_type: params.targetType,
    target_id: params.targetId,
    details: params.details || null,
    ip_address: params.ipAddress || null,
  });

  if (error) {
    console.error("Failed to log admin action:", error);
  }
}
