import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { slugify } from "@/lib/utils/slugify";

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/admin/blog/[id]
 * Get a single blog post by ID (admin only).
 */
export async function GET(_request: Request, { params }: RouteContext) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const admin = createAdminClient();
    const { data: adminUser } = await admin.from("users").select("role").eq("id", user.id).single();
    if (adminUser?.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { data: post, error } = await admin
      .from("blog_posts")
      .select("*")
      .eq("id", id)
      .single();

    if (error || !post) return NextResponse.json({ error: "Post not found" }, { status: 404 });

    return NextResponse.json({ post });
  } catch (error) {
    console.error("Error fetching blog post:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * PATCH /api/admin/blog/[id]
 * Update a blog post (admin only).
 */
export async function PATCH(request: Request, { params }: RouteContext) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const admin = createAdminClient();
    const { data: adminUser } = await admin.from("users").select("role").eq("id", user.id).single();
    if (adminUser?.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const body = await request.json();
    const updates: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (body.title !== undefined) updates.title = body.title;
    if (body.content !== undefined) updates.content = body.content;
    if (body.excerpt !== undefined) updates.excerpt = body.excerpt || null;
    if (body.hero_image_url !== undefined) updates.hero_image_url = body.hero_image_url || null;

    // Handle slug update if title changed
    if (body.slug !== undefined) {
      let newSlug = slugify(body.slug);
      if (!newSlug) newSlug = "post";

      // Check uniqueness (exclude current post)
      const { data: existing } = await admin
        .from("blog_posts")
        .select("slug")
        .like("slug", `${newSlug}%`)
        .neq("id", id);

      if (existing && existing.length > 0) {
        const existingSlugs = new Set(existing.map((p) => p.slug));
        if (existingSlugs.has(newSlug)) {
          let counter = 2;
          while (existingSlugs.has(`${newSlug}-${counter}`)) counter++;
          newSlug = `${newSlug}-${counter}`;
        }
      }
      updates.slug = newSlug;
    }

    // Handle status changes
    if (body.status !== undefined) {
      updates.status = body.status;

      if (body.status === "published") {
        // Get current post to check if it was already published
        const { data: current } = await admin
          .from("blog_posts")
          .select("published_at")
          .eq("id", id)
          .single();

        if (!current?.published_at) {
          updates.published_at = new Date().toISOString();
        }
      }
    }

    const { data: post, error } = await admin
      .from("blog_posts")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ post });
  } catch (error) {
    console.error("Error updating blog post:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * DELETE /api/admin/blog/[id]
 * Delete a blog post (admin only).
 */
export async function DELETE(_request: Request, { params }: RouteContext) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const admin = createAdminClient();
    const { data: adminUser } = await admin.from("users").select("role").eq("id", user.id).single();
    if (adminUser?.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    // Delete associated images from storage
    const { data: files } = await admin.storage
      .from("blog-images")
      .list(id);

    if (files && files.length > 0) {
      const paths = files.map((f) => `${id}/${f.name}`);
      await admin.storage.from("blog-images").remove(paths);
    }

    const { error } = await admin
      .from("blog_posts")
      .delete()
      .eq("id", id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting blog post:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
