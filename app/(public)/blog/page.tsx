import { createPublicClient } from "@/lib/supabase/public";
import BlogGrid, { type BlogCard } from "./BlogGrid";
import type { Metadata } from "next";
import { defaultOgImage } from "@/lib/seo";

const BASE_URL = "https://www.mountainconnects.com";

// Cache for 5 minutes. Blog posts publish/edit infrequently and the
// list page is hit by all visitors, so this is one of the biggest
// edge-cache wins on the site.
export const revalidate = 300;

export const metadata: Metadata = {
  title: "Ski Resort Worker Blog — Tips, Guides, Stories",
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
  const supabase = createPublicClient();

  const { data: posts } = await supabase
    .from("blog_posts")
    .select("id, title, slug, excerpt, hero_image_url, published_at, author_name, users!author_id(full_name)")
    .eq("status", "published")
    .order("published_at", { ascending: false });

  const cards: BlogCard[] = (posts ?? []).map((p) => ({
    id: p.id,
    title: p.title,
    slug: p.slug,
    excerpt: p.excerpt,
    hero_image_url: p.hero_image_url,
    published_at: p.published_at,
    author: p.author_name || (p.users as unknown as { full_name: string } | null)?.full_name || null,
  }));

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
        <BlogGrid posts={cards} />
      )}
    </div>
  );
}
