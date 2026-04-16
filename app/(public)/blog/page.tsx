import Link from "next/link";
import Image from "next/image";
import { createClient } from "@/lib/supabase/server";
import { format } from "date-fns";
import type { Metadata } from "next";
import { defaultOgImage } from "@/lib/seo";

const BASE_URL = "https://www.mountainconnects.com";

export const metadata: Metadata = {
  title: "Blog | Mountain Connects",
  description: "Tips, guides, and stories for seasonal mountain workers. Discover resort insights, visa advice, and community stories.",
  alternates: { canonical: `${BASE_URL}/blog` },
  openGraph: {
    title: "Blog | Mountain Connects",
    description: "Tips, guides, and stories for seasonal mountain workers.",
    url: `${BASE_URL}/blog`,
    siteName: "Mountain Connects",
    type: "website",
    images: [defaultOgImage],
  },
  twitter: {
    card: "summary_large_image",
    title: "Blog | Mountain Connects",
    description: "Tips, guides, and stories for seasonal mountain workers.",
    images: [defaultOgImage.url],
  },
};

export default async function BlogListingPage() {
  const supabase = await createClient();

  const { data: posts } = await supabase
    .from("blog_posts")
    .select("id, title, slug, excerpt, hero_image_url, published_at, author_name, users!author_id(full_name)")
    .eq("status", "published")
    .order("published_at", { ascending: false });

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-10 text-center">
        <h1 className="text-4xl font-bold text-primary">Blog</h1>
        <p className="mt-3 text-lg text-foreground/60">
          Tips, guides, and stories for the seasonal mountain community
        </p>
      </div>

      {/* Posts Grid */}
      {!posts || posts.length === 0 ? (
        <div className="rounded-xl border border-accent/30 bg-white p-16 text-center">
          <p className="text-lg text-foreground/40">No posts yet. Check back soon!</p>
        </div>
      ) : (
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {posts.map((post) => (
            <Link
              key={post.id}
              href={`/blog/${post.slug}`}
              className="group overflow-hidden rounded-xl border border-accent/30 bg-white transition-shadow hover:shadow-lg"
            >
              {/* Hero Image */}
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

              {/* Content */}
              <div className="p-5">
                <h2 className="mb-2 text-lg font-semibold text-primary group-hover:text-secondary transition-colors">
                  {post.title}
                </h2>
                {post.excerpt && (
                  <p className="mb-3 text-sm leading-relaxed text-foreground/60 line-clamp-3">
                    {post.excerpt}
                  </p>
                )}
                <div className="flex items-center gap-2 text-xs text-foreground/40">
                  {(post.author_name || (post.users as unknown as { full_name: string })?.full_name) && (
                    <>
                      <span>{post.author_name || (post.users as unknown as { full_name: string }).full_name}</span>
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
      )}
    </div>
  );
}
