import { createAdminClient } from "@/lib/supabase/admin";
import { createNotification } from "@/lib/notifications/create";
import { sendBusinessNewJobEmail } from "@/lib/email/send";

/**
 * Notify all followers of a business when a new job is posted.
 * Creates in-app notifications and sends emails.
 */
export async function notifyFollowersNewJob(params: {
  businessId: string;
  businessName: string;
  jobTitle: string;
  jobUrl: string;
  location: string;
  pay: string;
}) {
  let admin;
  try {
    admin = createAdminClient();
  } catch {
    return; // Supabase not configured
  }

  // Get all followers of this business with their user details
  const { data: followers } = await admin
    .from("business_followers")
    .select(`
      worker_id,
      worker:worker_profiles(
        id,
        user_id,
        first_name,
        last_name
      )
    `)
    .eq("business_id", params.businessId);

  if (!followers || followers.length === 0) return;

  // Create notifications and send emails for each follower
  const promises = followers.map(async (follower) => {
    const worker = follower.worker as unknown as {
      id: string;
      user_id: string;
      first_name: string | null;
      last_name: string | null;
    };

    if (!worker) return;

    // In-app notification
    await createNotification({
      userId: worker.user_id,
      type: "business_new_job",
      title: `New job at ${params.businessName}`,
      message: `${params.businessName} just posted "${params.jobTitle}". Be one of the first to apply!`,
      link: params.jobUrl,
    });

    // Get user email for email notification
    const { data: userData } = await admin.auth.admin.getUserById(worker.user_id);
    if (userData?.user?.email) {
      await sendBusinessNewJobEmail({
        to: userData.user.email,
        workerName: worker.first_name || "there",
        businessName: params.businessName,
        jobTitle: params.jobTitle,
        jobUrl: params.jobUrl,
        location: params.location,
        pay: params.pay,
      });
    }
  });

  await Promise.allSettled(promises);
}

/**
 * Notify all followers when a business closes a job listing.
 */
export async function notifyFollowersJobClosed(params: {
  businessId: string;
  businessName: string;
  jobTitle: string;
}) {
  let admin;
  try {
    admin = createAdminClient();
  } catch {
    return; // Supabase not configured
  }

  const { data: followers } = await admin
    .from("business_followers")
    .select(`
      worker_id,
      worker:worker_profiles(user_id)
    `)
    .eq("business_id", params.businessId);

  if (!followers || followers.length === 0) return;

  const promises = followers.map(async (follower) => {
    const worker = follower.worker as unknown as { user_id: string };
    if (!worker) return;

    await createNotification({
      userId: worker.user_id,
      type: "business_closed_job",
      title: `Job closed at ${params.businessName}`,
      message: `"${params.jobTitle}" at ${params.businessName} is no longer accepting applications.`,
      link: undefined,
    });
  });

  await Promise.allSettled(promises);
}
