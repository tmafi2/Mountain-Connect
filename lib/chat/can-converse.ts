import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Who is allowed to open a conversation with whom.
 *
 * WHY THIS EXISTS: the Privacy page promises workers that "businesses can
 * only see profiles of workers who have applied to their job listings".
 * The RLS policy from 00085 (`business_can_view_worker`) grants a business
 * read access to a worker profile on ANY of three relationships — applied,
 * shares a conversation, or follows. Clause 2 means that simply *being in a
 * conversation* unlocks the profile. So if conversation creation is
 * unguarded, a business can mint the relationship that grants it the data:
 * POST an arbitrary user id, and the worker's phone, date of birth,
 * nationality, visa status and resume path become readable.
 *
 * Until this file existed the only thing stopping that was the UI — the new
 * conversation modal lists applicants and nothing else. That is not a
 * control; the route accepted any uuid.
 *
 * THE RULE: an application must link the two users. That mirrors the promise
 * word for word, and it covers every legitimate caller we have:
 *   - business → applicant (applicants inbox)
 *   - business → interviewee (interviews sidebar; interviews.application_id
 *     is NOT NULL, so an interview always implies an application)
 *   - worker → business they applied to (applications list, new-conversation
 *     modal)
 * Direction doesn't matter: either party may open the thread once the
 * application exists.
 *
 * Runs on the admin client deliberately. The lookups cross worker_profiles,
 * business_profiles, applications and job_posts, and the caller can only ever
 * read a yes/no out of it — the same reasoning that makes 00085's
 * SECURITY DEFINER function safe.
 */
export async function canConverse(
  userId: string,
  targetUserId: string
): Promise<boolean> {
  if (!userId || !targetUserId || userId === targetUserId) return false;

  const admin = createAdminClient();

  // Work out which side each party is on. A business owner is identified by
  // owning a business_profiles row; everyone else who can chat is a worker.
  const [{ data: myBusiness }, { data: theirBusiness }] = await Promise.all([
    admin.from("business_profiles").select("id").eq("user_id", userId).maybeSingle(),
    admin.from("business_profiles").select("id").eq("user_id", targetUserId).maybeSingle(),
  ]);

  // Two businesses, or two workers, have no application to stand on.
  if (Boolean(myBusiness) === Boolean(theirBusiness)) return false;

  const workerUserId = myBusiness ? targetUserId : userId;
  const businessId = (myBusiness ?? theirBusiness)!.id;

  const { data: workerProfile } = await admin
    .from("worker_profiles")
    .select("id")
    .eq("user_id", workerUserId)
    .maybeSingle();

  if (!workerProfile) return false;

  // Does this worker have an application against any job owned by this
  // business? inner join on job_posts so the business filter actually
  // constrains the result rather than returning applications with a null job.
  const { data: application } = await admin
    .from("applications")
    .select("id, job_posts!inner(business_id)")
    .eq("worker_id", workerProfile.id)
    .eq("job_posts.business_id", businessId)
    .limit(1)
    .maybeSingle();

  return Boolean(application);
}
