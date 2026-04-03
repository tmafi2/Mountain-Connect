"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { format } from "date-fns";
import type { BlogPost } from "@/types/database";

const STATUS_STYLES = {
  draft: { bg: "bg-yellow-50", text: "text-yellow-700", label: "Draft" },
  published: { bg: "bg-green-50", text: "text-green-700", label: "Published" },
};

export default function AdminBlogPage() {
  const [posts, setPosts] = useState<(BlogPost & { users?: { full_name: string } })[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "draft" | "published">("all");
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => {
    loadPosts();
  }, []);

  async function loadPosts() {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("blog_posts")
      .select("*, users!author_id(full_name)")
      .order("created_at", { ascending: false });

    if (error) console.error("Error loading blog posts:", error);
    setPosts(data || []);
    setLoading(false);
  }

  async function handleDelete(id: string) {
    if (!confirm("Are you sure you want to delete this post? This cannot be undone.")) return;

    setDeleting(id);
    try {
      const res = await fetch(`/api/admin/blog/${id}`, { method: "DELETE" });
      if (res.ok) {
        setPosts((prev) => prev.filter((p) => p.id !== id));
      } else {
        alert("Failed to delete post.");
      }
    } catch {
      alert("Failed to delete post.");
    } finally {
      setDeleting(null);
    }
  }

  async function handleToggleStatus(post: BlogPost) {
    const newStatus = post.status === "published" ? "draft" : "published";
    try {
      const res = await fetch(`/api/admin/blog/${post.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        const { post: updated } = await res.json();
        setPosts((prev) => prev.map((p) => (p.id === post.id ? { ...p, ...updated } : p)));
      }
    } catch {
      alert("Failed to update post status.");
    }
  }

  const filtered = useMemo(() => {
    return posts.filter((p) => {
      const matchesSearch = !search || p.title.toLowerCase().includes(search.toLowerCase());
      const matchesStatus = statusFilter === "all" || p.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [posts, search, statusFilter]);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-secondary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-primary">Blog Posts</h1>
          <p className="mt-1 text-sm text-foreground/60">
            {posts.length} total post{posts.length !== 1 ? "s" : ""}
          </p>
        </div>
        <Link
          href="/admin/blog/new"
          className="rounded-lg bg-secondary px-4 py-2.5 text-sm font-medium text-white hover:bg-secondary/90"
        >
          New Post
        </Link>
      </div>

      {/* Filters */}
      <div className="mb-4 flex items-center gap-3">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search posts..."
          className="w-64 rounded-lg border border-accent/50 bg-white px-3 py-2 text-sm text-foreground placeholder:text-foreground/30 focus:border-secondary focus:outline-none focus:ring-1 focus:ring-secondary"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as "all" | "draft" | "published")}
          className="rounded-lg border border-accent/50 bg-white px-3 py-2 text-sm text-foreground focus:border-secondary focus:outline-none"
        >
          <option value="all">All Status</option>
          <option value="draft">Draft</option>
          <option value="published">Published</option>
        </select>
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="rounded-lg border border-accent/30 bg-white p-12 text-center">
          <p className="text-foreground/50">
            {posts.length === 0 ? "No blog posts yet. Create your first post!" : "No posts match your filters."}
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-accent/30 bg-white">
          <table className="min-w-full">
            <thead>
              <tr className="border-b border-accent/30 bg-background/50">
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-foreground/50">Title</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-foreground/50">Status</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-foreground/50">Published</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-foreground/50">Created</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-foreground/50">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-accent/20">
              {filtered.map((post) => {
                const style = STATUS_STYLES[post.status as keyof typeof STATUS_STYLES] || STATUS_STYLES.draft;
                return (
                  <tr key={post.id} className="hover:bg-background/30">
                    <td className="px-4 py-3">
                      <Link
                        href={`/admin/blog/${post.id}/edit`}
                        className="text-sm font-medium text-primary hover:text-secondary"
                      >
                        {post.title}
                      </Link>
                      <p className="mt-0.5 text-xs text-foreground/40">/blog/{post.slug}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${style.bg} ${style.text}`}>
                        {style.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-foreground/60">
                      {post.published_at ? format(new Date(post.published_at), "MMM d, yyyy") : "—"}
                    </td>
                    <td className="px-4 py-3 text-sm text-foreground/60">
                      {format(new Date(post.created_at), "MMM d, yyyy")}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleToggleStatus(post)}
                          className="rounded px-2 py-1 text-xs text-foreground/50 hover:bg-accent/20 hover:text-foreground"
                        >
                          {post.status === "published" ? "Unpublish" : "Publish"}
                        </button>
                        <Link
                          href={`/admin/blog/${post.id}/edit`}
                          className="rounded px-2 py-1 text-xs text-secondary hover:bg-secondary/10"
                        >
                          Edit
                        </Link>
                        <button
                          onClick={() => handleDelete(post.id)}
                          disabled={deleting === post.id}
                          className="rounded px-2 py-1 text-xs text-red-500 hover:bg-red-50 disabled:opacity-50"
                        >
                          {deleting === post.id ? "..." : "Delete"}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
