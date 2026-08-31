import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * GET /api/cron/publish-scheduled
 * Vercel Cron job that publishes scheduled blog posts whose time has arrived.
 * Runs every minute via vercel.json cron config.
 */
export async function GET(request: Request) {
  // Verify the request is from Vercel Cron
  // Fail closed when the secret is absent. With CRON_SECRET unset this
  // compared against the literal "Bearer undefined" — which anyone can send,
  // and which was live: a request with that header returned 200 in
  // production. Vercel also sends no Authorization header at all when the
  // variable is missing, so the scheduled runs were getting 401 and this job
  // had never actually executed.
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    console.error("[cron] CRON_SECRET is not set; refusing to run");
    return NextResponse.json({ error: "Cron is not configured" }, { status: 503 });
  }
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const admin = createAdminClient();

    // Find all scheduled posts whose time has passed
    const { data: posts, error: fetchError } = await admin
      .from("blog_posts")
      .select("id, scheduled_at")
      .eq("status", "scheduled")
      .lte("scheduled_at", new Date().toISOString());

    if (fetchError) throw fetchError;

    if (!posts || posts.length === 0) {
      return NextResponse.json({ published: 0 });
    }

    // Publish each post
    let publishedCount = 0;
    for (const post of posts) {
      const { error: updateError } = await admin
        .from("blog_posts")
        .update({
          status: "published",
          published_at: post.scheduled_at, // Use the intended publish time
          scheduled_at: null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", post.id);

      if (updateError) {
        console.error(`Failed to publish scheduled post ${post.id}:`, updateError);
      } else {
        publishedCount++;
      }
    }

    return NextResponse.json({ published: publishedCount });
  } catch (error) {
    console.error("Error in publish-scheduled cron:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
