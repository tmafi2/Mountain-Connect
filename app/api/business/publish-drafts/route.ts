import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { notifyGoogleIndexing } from "@/lib/seo/google-indexing";
import { checkPostGate } from "@/lib/billing/post-gate";

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

    // Publishing flips drafts live, so it's subject to the plan's posting
    // limit exactly like posting a new active job. Load the drafts (oldest
    // first — they queued them in that order), then publish only as many as
    // the plan has room for and report the remainder.
    const { data: drafts, error: draftsError } = await supabase
      .from("job_posts")
      .select("id")
      .eq("business_id", business.id)
      .eq("status", "draft")
      .order("created_at", { ascending: true });

    if (draftsError) {
      console.error("Failed to load drafts:", draftsError);
      return NextResponse.json({ error: "Failed to publish drafts" }, { status: 500 });
    }
    if (!drafts || drafts.length === 0) {
      return NextResponse.json({ success: true, publishedCount: 0, blockedCount: 0 });
    }

    // Find the largest N such that publishing N more is still within limit.
    let room = 0;
    for (let n = 1; n <= drafts.length; n++) {
      const gate = await checkPostGate(supabase, business.id, { extraPending: n - 1 });
      if (!gate.allowed) break;
      room = n;
    }
    const gateNow = await checkPostGate(supabase, business.id);

    if (room === 0) {
      return NextResponse.json(
        {
          error:
            gateNow.reason === "free_limit"
              ? "You've used your free job post. Choose a plan to publish more."
              : `Your plan allows ${gateNow.limit} active job listings. Upgrade to publish more.`,
          gate: gateNow,
          publishedCount: 0,
          blockedCount: drafts.length,
        },
        { status: 403 }
      );
    }

    const toPublish = drafts.slice(0, room).map((d) => d.id);
    const { data: updated, error } = await supabase
      .from("job_posts")
      .update({ status: "active", is_active: true })
      .in("id", toPublish)
      .eq("business_id", business.id)
      .select("id");

    if (error) {
      console.error("Failed to bulk publish drafts:", error);
      return NextResponse.json({ error: "Failed to publish drafts" }, { status: 500 });
    }

    const publishedCount = updated?.length || 0;
    const blockedCount = drafts.length - publishedCount;

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

        notifyGoogleIndexing(`${origin}/jobs/${job.id}`, "URL_UPDATED").catch((err) =>
          console.error("Google indexing notify failed:", err)
        );
      }
    }

    return NextResponse.json({ success: true, publishedCount, blockedCount, gate: gateNow });
  } catch (err) {
    console.error("publish-drafts error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
