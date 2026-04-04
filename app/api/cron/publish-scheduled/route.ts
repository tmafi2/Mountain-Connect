import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * GET /api/cron/publish-scheduled
 * Vercel Cron job that publishes scheduled blog posts whose time has arrived.
 * Runs every minute via vercel.json cron config.
 */
export async function GET(request: Request) {
  // Verify the request is from Vercel Cron
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
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
