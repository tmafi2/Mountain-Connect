"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import BlogEditor from "@/components/admin/BlogEditor";

export default function NewBlogPostPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [postId, setPostId] = useState<string | undefined>();
  const [currentUserName, setCurrentUserName] = useState("");

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        setCurrentUserName(data.user.user_metadata?.full_name || data.user.email || "");
      }
    });
  }, []);

  const handleSave = async (data: {
    title: string;
    slug: string;
    content: string;
    excerpt: string;
    hero_image_url: string;
    status: string;
    author_name: string;
  }) => {
    setSaving(true);
    try {
      if (postId) {
        // Update existing draft
        const res = await fetch(`/api/admin/blog/${postId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });

        if (!res.ok) throw new Error("Failed to update post");

        if (data.status === "published") {
          router.push("/admin/blog");
        }
      } else {
        // Create new post
        const res = await fetch("/api/admin/blog", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });

        if (!res.ok) throw new Error("Failed to create post");

        const { post } = await res.json();
        setPostId(post.id);

        if (data.status === "published") {
          router.push("/admin/blog");
        }
      }
    } catch (err) {
      console.error("Save failed:", err);
      alert("Failed to save post. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl p-6">
      <div className="mb-6">
        <button
          onClick={() => router.push("/admin/blog")}
          className="mb-4 text-sm text-foreground/50 hover:text-foreground"
        >
          &larr; Back to Blog
        </button>
        <h1 className="text-2xl font-bold text-primary">New Blog Post</h1>
        {!postId && (
          <p className="mt-1 text-sm text-foreground/50">
            Save as draft first to enable image uploads.
          </p>
        )}
      </div>

      <div className="rounded-xl border border-accent/30 bg-white p-6">
        <BlogEditor
          onSave={handleSave}
          saving={saving}
          postId={postId}
          currentUserName={currentUserName}
        />
      </div>
    </div>
  );
}
