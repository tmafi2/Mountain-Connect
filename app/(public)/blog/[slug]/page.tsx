import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { format } from "date-fns";
import MarkdownRenderer from "@/components/ui/MarkdownRenderer";
import type { Metadata } from "next";

interface BlogPostPageProps {
  params: Promise<{ slug: string }>;
}

const BASE_URL = "https://www.mountainconnects.com";
const DEFAULT_OG_IMAGE = "/og-default.png";

export async function generateMetadata({ params }: BlogPostPageProps): Promise<Metadata> {
  const { slug } = await params;
  const supabase = await createClient();

  const { data: post } = await supabase
    .from("blog_posts")
    .select("title, excerpt, content, hero_image_url, published_at")
    .eq("slug", slug)
    .eq("status", "published")
    .single();

  if (!post) return { title: "Post Not Found | Mountain Connect" };

  const description = post.excerpt || (post.content ? post.content.slice(0, 155) + "..." : "Read this article on Mountain Connect.");
  const ogImage = post.hero_image_url || DEFAULT_OG_IMAGE;

  return {
    title: `${post.title} | Mountain Connect Blog`,
    description,
    alternates: { canonical: `${BASE_URL}/blog/${slug}` },
    openGraph: {
      title: post.title,
      description,
      url: `${BASE_URL}/blog/${slug}`,
      siteName: "Mountain Connect",
      type: "article",
      publishedTime: post.published_at || undefined,
      images: [{ url: ogImage, width: 1200, height: 630 }],
    },
    twitter: {
      card: "summary_large_image",
      title: post.title,
      description,
      images: [ogImage],
    },
  };
}

export default async function BlogPostPage({ params }: BlogPostPageProps) {
  const { slug } = await params;
  const supabase = await createClient();

  const { data: post } = await supabase
    .from("blog_posts")
    .select("*, users!author_id(full_name, avatar_url)")
    .eq("slug", slug)
    .eq("status", "published")
    .single();

  if (!post) notFound();

  const author = post.users as unknown as { full_name: string; avatar_url: string | null } | null;

  // JSON-LD structured data
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description: post.excerpt || post.content?.slice(0, 155),
    image: post.hero_image_url || undefined,
    datePublished: post.published_at,
    dateModified: post.updated_at,
    author: {
      "@type": "Person",
      name: author?.full_name || "Mountain Connect",
    },
    publisher: {
      "@type": "Organization",
      name: "Mountain Connect",
      url: BASE_URL,
    },
    mainEntityOfPage: `${BASE_URL}/blog/${slug}`,
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <article className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
        {/* Back link */}
        <Link
          href="/blog"
          className="mb-8 inline-flex items-center gap-1 text-sm text-foreground/50 hover:text-secondary"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Blog
        </Link>

        {/* Hero Image */}
        {post.hero_image_url && (
          <div className="relative mb-8 h-64 w-full overflow-hidden rounded-xl sm:h-80 lg:h-96">
            <Image
              src={post.hero_image_url}
              alt={post.title}
              fill
              className="object-cover"
              priority
              unoptimized
            />
          </div>
        )}

        {/* Title */}
        <h1 className="mb-4 text-3xl font-bold leading-tight text-primary sm:text-4xl">
          {post.title}
        </h1>

        {/* Author + Date */}
        <div className="mb-8 flex items-center gap-3 border-b border-accent/30 pb-6">
          {author?.avatar_url && (
            <Image
              src={author.avatar_url}
              alt={author.full_name}
              width={40}
              height={40}
              className="rounded-full"
              unoptimized
            />
          )}
          <div>
            {author?.full_name && (
              <p className="text-sm font-medium text-primary">{author.full_name}</p>
            )}
            {post.published_at && (
              <time
                dateTime={post.published_at}
                className="text-sm text-foreground/50"
              >
                {format(new Date(post.published_at), "MMMM d, yyyy")}
              </time>
            )}
          </div>
        </div>

        {/* Content */}
        <MarkdownRenderer content={post.content} />
      </article>
    </>
  );
}
