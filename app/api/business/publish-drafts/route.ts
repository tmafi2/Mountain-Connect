import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * POST /api/business/publish-drafts
 *
 * Publishes ALL draft listings for the current business in a single call.
 * Primary use case: when a newly-verified business has a backlog of drafts
 * they prepared while pending verification and want to flip them all live.
 *
 * Requirements:
 *  - User must be authenticated
 *  - User must own a business_profile
 *
 * Sets BOTH status="active" AND is_active=true. The is_active sync is
 * important because the job_posts RLS policy "Anyone can view active jobs"
 * still checks is_active, and the buildJobRow helper only sets is_active
 * at insert time — it doesn't get updated by subsequent status changes.
 */
export async function POST() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Look up the current user's business
    const { data: business } = await supabase
      .from("business_profiles")
      .select("id")
      .eq("user_id", user.id)
      .single();

    if (!business) {
      return NextResponse.json({ error: "Business profile not found" }, { status: 404 });
    }

    // Update all the business's drafts to active in one go.
    // Using the RLS policy "Business owners can manage own jobs" so we don't
    // need the admin client — the user is allowed to mutate their own rows.
    const { data: updated, error } = await supabase
      .from("job_posts")
      .update({ status: "active", is_active: true })
      .eq("business_id", business.id)
      .eq("status", "draft")
      .select("id");

    if (error) {
      console.error("Failed to bulk publish drafts:", error);
      return NextResponse.json({ error: "Failed to publish drafts" }, { status: 500 });
    }

    const publishedCount = updated?.length || 0;

    // Fire job alert matching for each newly-published job (non-blocking).
    // Same pattern used by the single-publish flow when posting a new active job.
    if (updated && updated.length > 0) {
      const origin = process.env.NEXT_PUBLIC_BASE_URL || "https://www.mountainconnects.com";
      for (const job of updated) {
        fetch(`${origin}/api/job-alerts/match`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ jobId: job.id }),
        }).catch((err) => console.error("job-alerts/match fire-and-forget failed:", err));
      }
    }

    return NextResponse.json({ success: true, publishedCount });
  } catch (err) {
    console.error("publish-drafts error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
