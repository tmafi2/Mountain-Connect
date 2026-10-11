"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { format } from "date-fns";
import { tagsFor, tagCounts, type Tag } from "@/lib/blog/tags";

export type BlogCard = {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  hero_image_url: string | null;
  published_at: string | null;
  author: string | null;
};

/**
 * The post grid, with a topic filter.
 *
 * ⚠️ THE FILTER IS CLIENT-SIDE AND CHANGES NO URL. Every post is already in
 * the markup, so there is nothing to fetch, nothing to cache separately and —
 * the point — no `/blog/tag/{x}` pages, which at this many posts would each
 * be a handful of links and no content of their own.
 *
 * ⚠️ EVERY CHIP CARRIES ITS COUNT, so nobody clicks into a near-empty list.
 * `/jobs` once offered a two-option category filter for 355 jobs and that
 * reads as "there is nothing here" (00110).
 */
export default function BlogGrid({ posts }: { posts: BlogCard[] }) {
  const [active, setActive] = useState<Tag | null>(null);
  const counts = useMemo(() => tagCounts(posts.map((p) => p.slug)), [posts]);
  const shown = active ? posts.filter((p) => tagsFor(p.slug).includes(active)) : posts;

  return (
    <>
      {counts.length > 0 && (
        <div className="mb-8 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setActive(null)}
            aria-pressed={active === null}
            className={`rounded-full border px-3 py-1.5 text-sm font-medium transition ${
              active === null
                ? "border-primary bg-primary text-white"
                : "border-accent/50 bg-white text-primary/70 hover:border-secondary"
            }`}
          >
            All {posts.length}
          </button>
          {counts.map(({ tag, count }) => (
            <button
              key={tag}
              type="button"
              onClick={() => setActive(active === tag ? null : tag)}
              aria-pressed={active === tag}
              className={`rounded-full border px-3 py-1.5 text-sm font-medium transition ${
                active === tag
                  ? "border-primary bg-primary text-white"
                  : "border-accent/50 bg-white text-primary/70 hover:border-secondary"
              }`}
            >
              {tag} <span className="opacity-60">{count}</span>
            </button>
          ))}
        </div>
      )}

      <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
        {shown.map((post) => (
          <Link
            key={post.id}
            href={`/blog/${post.slug}`}
            className="group overflow-hidden rounded-xl border border-accent/30 bg-white transition-shadow hover:shadow-lg"
          >
            <div className="relative h-48 w-full overflow-hidden bg-accent/10">
              {post.hero_image_url ? (
                <Image
                  src={post.hero_image_url}
                  alt={post.title}
                  fill
                  className="object-cover transition-transform duration-300 group-hover:scale-105"
                  unoptimized
                />
              ) : (
                <div className="flex h-full items-center justify-center">
                  <svg className="h-12 w-12 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
                  </svg>
                </div>
              )}
            </div>

            <div className="p-5">
              <h2 className="mb-2 text-lg font-semibold text-primary transition-colors group-hover:text-secondary">
                {post.title}
              </h2>
              {post.excerpt && (
                <p className="mb-3 line-clamp-3 text-sm leading-relaxed text-foreground/60">
                  {post.excerpt}
                </p>
              )}
              {tagsFor(post.slug).length > 0 && (
                <div className="mb-3 flex flex-wrap gap-1.5">
                  {tagsFor(post.slug).map((t) => (
                    <span
                      key={t}
                      className="rounded-full border border-accent/50 bg-accent/10 px-2 py-0.5 text-xs font-medium text-primary/70"
                    >
                      {t}
                    </span>
                  ))}
                </div>
              )}
              <div className="flex items-center gap-2 text-xs text-foreground/40">
                {post.author && (
                  <>
                    <span>{post.author}</span>
                    <span>&middot;</span>
                  </>
                )}
                {post.published_at && (
                  <time dateTime={post.published_at}>
                    {format(new Date(post.published_at), "MMMM d, yyyy")}
                  </time>
                )}
              </div>
            </div>
          </Link>
        ))}
      </div>
    </>
  );
}
