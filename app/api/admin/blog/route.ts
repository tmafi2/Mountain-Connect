import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { slugify } from "@/lib/utils/slugify";

/**
 * GET /api/admin/blog
 * List all blog posts (admin only).
 */
export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const admin = createAdminClient();
    const { data: adminUser } = await admin.from("users").select("role").eq("id", user.id).single();
    if (adminUser?.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

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
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const admin = createAdminClient();
    const { data: adminUser } = await admin.from("users").select("role").eq("id", user.id).single();
    if (adminUser?.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { title, content, excerpt, hero_image_url, status, author_name } = await request.json();
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
