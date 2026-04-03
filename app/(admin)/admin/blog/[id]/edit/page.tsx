"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import BlogEditor from "@/components/admin/BlogEditor";
import type { BlogPost } from "@/types/database";

export default function EditBlogPostPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [post, setPost] = useState<BlogPost | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function loadPost() {
      try {
        const res = await fetch(`/api/admin/blog/${id}`);
        if (!res.ok) throw new Error("Failed to load post");
        const { post } = await res.json();
        setPost(post);
      } catch (err) {
        console.error("Load failed:", err);
        alert("Failed to load post.");
        router.push("/admin/blog");
      } finally {
        setLoading(false);
      }
    }
    loadPost();
  }, [id, router]);

  const handleSave = async (data: {
    title: string;
    slug: string;
    content: string;
    excerpt: string;
    hero_image_url: string;
    status: string;
  }) => {
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/blog/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!res.ok) throw new Error("Failed to update post");

      const { post: updated } = await res.json();
      setPost(updated);

      if (data.status === "published" && post?.status !== "published") {
        router.push("/admin/blog");
      }
    } catch (err) {
      console.error("Save failed:", err);
      alert("Failed to save post. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this post? This cannot be undone.")) return;

    try {
      const res = await fetch(`/api/admin/blog/${id}`, { method: "DELETE" });
      if (res.ok) {
        router.push("/admin/blog");
      } else {
        alert("Failed to delete post.");
      }
    } catch {
      alert("Failed to delete post.");
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-secondary border-t-transparent" />
      </div>
    );
  }

  if (!post) return null;

  return (
    <div className="mx-auto max-w-4xl p-6">
      <div className="mb-6 flex items-start justify-between">
        <div>
          <button
            onClick={() => router.push("/admin/blog")}
            className="mb-4 text-sm text-foreground/50 hover:text-foreground"
          >
            &larr; Back to Blog
          </button>
          <h1 className="text-2xl font-bold text-primary">Edit Post</h1>
          {post.status === "published" && (
            <a
              href={`/blog/${post.slug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-1 inline-block text-sm text-secondary hover:underline"
            >
              View live post &rarr;
            </a>
          )}
        </div>
        <button
          onClick={handleDelete}
          className="rounded-lg border border-red-200 px-3 py-2 text-sm text-red-500 hover:bg-red-50"
        >
          Delete Post
        </button>
      </div>

      <div className="rounded-xl border border-accent/30 bg-white p-6">
        <BlogEditor
          initialData={post}
          postId={post.id}
          onSave={handleSave}
          saving={saving}
        />
      </div>
    </div>
  );
}
