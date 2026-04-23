import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/require-admin";
import { slugify } from "@/lib/utils/slugify";
import { rateLimit } from "@/lib/rate-limit";

/**
 * GET /api/admin/blog
 * List all blog posts (admin only).
 */
export async function GET() {
  try {
    const auth = await requireAdmin();
    if (auth instanceof NextResponse) return auth;
    const { admin } = auth;

    const { data: posts, error } = await admin
      .from("blog_posts")
      .select("*, users!author_id(full_name)")
      .order("created_at", { ascending: false });

    if (error) throw error;

    return NextResponse.json({ posts: posts || [] });
  } catch (error) {
    console.error("Error listing blog posts:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * POST /api/admin/blog
 * Create a new blog post (admin only).
 */
export async function POST(request: Request) {
  const rateLimited = await rateLimit(request, { identifier: "admin" });
  if (rateLimited) return rateLimited;

  try {
    const auth = await requireAdmin();
    if (auth instanceof NextResponse) return auth;
    const { admin, user } = auth;

    const { title, content, excerpt, hero_image_url, status, author_name, scheduled_at } = await request.json();
    if (!title) return NextResponse.json({ error: "Title is required" }, { status: 400 });

    // Generate unique slug
    let slug = slugify(title);
    if (!slug) slug = "post";

    const { data: existing } = await admin
      .from("blog_posts")
      .select("slug")
      .like("slug", `${slug}%`);

    if (existing && existing.length > 0) {
      const existingSlugs = new Set(existing.map((p) => p.slug));
      if (existingSlugs.has(slug)) {
        let counter = 2;
        while (existingSlugs.has(`${slug}-${counter}`)) counter++;
        slug = `${slug}-${counter}`;
      }
    }

    const postData: Record<string, unknown> = {
      title,
      slug,
      content: content || "",
      excerpt: excerpt || null,
      hero_image_url: hero_image_url || null,
      status: status || "draft",
      author_id: user.id,
      author_name: author_name || null,
    };

    if (postData.status === "published") {
      postData.published_at = new Date().toISOString();
    } else if (postData.status === "scheduled") {
      if (!scheduled_at || new Date(scheduled_at) <= new Date()) {
        return NextResponse.json({ error: "Scheduled time must be in the future" }, { status: 400 });
      }
      postData.scheduled_at = scheduled_at;
    }

    const { data: post, error } = await admin
      .from("blog_posts")
      .insert(postData)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ post });
  } catch (error) {
    console.error("Error creating blog post:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
