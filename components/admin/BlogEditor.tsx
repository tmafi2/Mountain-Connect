"use client";

import { useState, useRef, useCallback } from "react";
import Image from "next/image";
import { slugify } from "@/lib/utils/slugify";
import { uploadBlogImage, deleteBlogImage } from "@/lib/supabase/blog-storage";
import MarkdownRenderer from "@/components/ui/MarkdownRenderer";
import type { BlogPost } from "@/types/database";

interface BlogEditorProps {
  initialData?: Partial<BlogPost>;
  postId?: string; // Needed for image uploads
  onSave: (data: {
    title: string;
    slug: string;
    content: string;
    excerpt: string;
    hero_image_url: string;
    status: string;
  }) => Promise<void>;
  saving: boolean;
}

export default function BlogEditor({ initialData, postId, onSave, saving }: BlogEditorProps) {
  const [title, setTitle] = useState(initialData?.title || "");
  const [slug, setSlug] = useState(initialData?.slug || "");
  const [slugEdited, setSlugEdited] = useState(false);
  const [content, setContent] = useState(initialData?.content || "");
  const [excerpt, setExcerpt] = useState(initialData?.excerpt || "");
  const [heroImageUrl, setHeroImageUrl] = useState(initialData?.hero_image_url || "");
  const [activeTab, setActiveTab] = useState<"edit" | "preview">("edit");
  const [uploadingHero, setUploadingHero] = useState(false);
  const [uploadingInline, setUploadingInline] = useState(false);

  const contentRef = useRef<HTMLTextAreaElement>(null);
  const heroInputRef = useRef<HTMLInputElement>(null);
  const inlineInputRef = useRef<HTMLInputElement>(null);

  const handleTitleChange = (value: string) => {
    setTitle(value);
    if (!slugEdited) {
      setSlug(slugify(value));
    }
  };

  const handleHeroUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !postId) return;

    setUploadingHero(true);
    try {
      const url = await uploadBlogImage(postId, file, "hero");
      setHeroImageUrl(url);
    } catch (err) {
      console.error("Hero upload failed:", err);
      alert("Failed to upload hero image. Please try again.");
    } finally {
      setUploadingHero(false);
      if (heroInputRef.current) heroInputRef.current.value = "";
    }
  }, [postId]);

  const handleRemoveHero = useCallback(async () => {
    if (heroImageUrl) {
      await deleteBlogImage(heroImageUrl);
      setHeroImageUrl("");
    }
  }, [heroImageUrl]);

  const handleInlineImageUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !postId) return;

    setUploadingInline(true);
    try {
      const imageId = `inline-${Date.now()}`;
      const url = await uploadBlogImage(postId, file, imageId);

      // Insert markdown image at cursor position
      const textarea = contentRef.current;
      if (textarea) {
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const before = content.substring(0, start);
        const after = content.substring(end);
        const imageMarkdown = `\n![${file.name}](${url})\n`;
        setContent(before + imageMarkdown + after);
      } else {
        setContent((prev) => prev + `\n![${file.name}](${url})\n`);
      }
    } catch (err) {
      console.error("Inline image upload failed:", err);
      alert("Failed to upload image. Please try again.");
    } finally {
      setUploadingInline(false);
      if (inlineInputRef.current) inlineInputRef.current.value = "";
    }
  }, [postId, content]);

  const insertMarkdown = (prefix: string, suffix: string = "") => {
    const textarea = contentRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = content.substring(start, end);
    const before = content.substring(0, start);
    const after = content.substring(end);

    const newText = before + prefix + (selectedText || "text") + suffix + after;
    setContent(newText);

    // Restore focus
    setTimeout(() => {
      textarea.focus();
      const newCursorPos = start + prefix.length + (selectedText || "text").length;
      textarea.setSelectionRange(newCursorPos, newCursorPos);
    }, 0);
  };

  const handleSave = (status: string) => {
    onSave({
      title,
      slug,
      content,
      excerpt,
      hero_image_url: heroImageUrl,
      status,
    });
  };

  return (
    <div className="space-y-6">
      {/* Title */}
      <div>
        <label className="mb-1.5 block text-sm font-medium text-primary">Title</label>
        <input
          type="text"
          value={title}
          onChange={(e) => handleTitleChange(e.target.value)}
          placeholder="Enter post title..."
          className="w-full rounded-lg border border-accent/50 bg-white px-4 py-2.5 text-lg font-semibold text-primary placeholder:text-foreground/30 focus:border-secondary focus:outline-none focus:ring-1 focus:ring-secondary"
        />
      </div>

      {/* Slug */}
      <div>
        <label className="mb-1.5 block text-sm font-medium text-primary">
          URL Slug
          {!slugEdited && (
            <button
              type="button"
              onClick={() => setSlugEdited(true)}
              className="ml-2 text-xs text-secondary hover:underline"
            >
              Edit
            </button>
          )}
        </label>
        <div className="flex items-center gap-2">
          <span className="text-sm text-foreground/50">/blog/</span>
          <input
            type="text"
            value={slug}
            onChange={(e) => setSlug(slugify(e.target.value))}
            readOnly={!slugEdited}
            className={`flex-1 rounded-lg border border-accent/50 bg-white px-3 py-2 text-sm text-foreground ${
              slugEdited ? "focus:border-secondary focus:outline-none focus:ring-1 focus:ring-secondary" : "bg-background cursor-default"
            }`}
          />
        </div>
      </div>

      {/* Excerpt */}
      <div>
        <label className="mb-1.5 block text-sm font-medium text-primary">
          Excerpt
          <span className="ml-2 text-xs font-normal text-foreground/40">
            ({excerpt.length}/160 recommended for SEO)
          </span>
        </label>
        <textarea
          value={excerpt}
          onChange={(e) => setExcerpt(e.target.value)}
          placeholder="Brief description for listing cards and search results..."
          rows={2}
          className="w-full rounded-lg border border-accent/50 bg-white px-4 py-2.5 text-sm text-foreground placeholder:text-foreground/30 focus:border-secondary focus:outline-none focus:ring-1 focus:ring-secondary"
        />
      </div>

      {/* Hero Image */}
      <div>
        <label className="mb-1.5 block text-sm font-medium text-primary">Hero Image</label>
        {heroImageUrl ? (
          <div className="relative">
            <div className="relative h-48 w-full overflow-hidden rounded-lg">
              <Image
                src={heroImageUrl}
                alt="Hero image preview"
                fill
                className="object-cover"
                unoptimized
              />
            </div>
            <button
              type="button"
              onClick={handleRemoveHero}
              className="absolute top-2 right-2 rounded-full bg-red-500 p-1.5 text-white shadow hover:bg-red-600"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        ) : (
          <div>
            <input
              ref={heroInputRef}
              type="file"
              accept="image/*"
              onChange={handleHeroUpload}
              disabled={uploadingHero || !postId}
              className="hidden"
              id="hero-upload"
            />
            <label
              htmlFor="hero-upload"
              className={`flex cursor-pointer items-center justify-center gap-2 rounded-lg border-2 border-dashed border-accent/50 p-8 text-sm text-foreground/50 hover:border-secondary/50 hover:text-secondary ${
                !postId ? "opacity-50 cursor-not-allowed" : ""
              }`}
            >
              {uploadingHero ? (
                "Uploading..."
              ) : !postId ? (
                "Save as draft first to upload images"
              ) : (
                <>
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  Click to upload hero image
                </>
              )}
            </label>
          </div>
        )}
      </div>

      {/* Content Editor */}
      <div>
        <div className="mb-1.5 flex items-center justify-between">
          <label className="text-sm font-medium text-primary">Content (Markdown)</label>
          <div className="flex rounded-lg border border-accent/50 bg-background">
            <button
              type="button"
              onClick={() => setActiveTab("edit")}
              className={`px-3 py-1 text-sm ${
                activeTab === "edit"
                  ? "bg-white text-primary font-medium shadow-sm rounded-l-lg"
                  : "text-foreground/50 hover:text-foreground"
              }`}
            >
              Edit
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("preview")}
              className={`px-3 py-1 text-sm ${
                activeTab === "preview"
                  ? "bg-white text-primary font-medium shadow-sm rounded-r-lg"
                  : "text-foreground/50 hover:text-foreground"
              }`}
            >
              Preview
            </button>
          </div>
        </div>

        {activeTab === "edit" ? (
          <>
            {/* Toolbar */}
            <div className="flex items-center gap-1 rounded-t-lg border border-b-0 border-accent/50 bg-background px-2 py-1.5">
              <button
                type="button"
                onClick={() => insertMarkdown("**", "**")}
                className="rounded px-2 py-1 text-sm font-bold text-foreground/60 hover:bg-white hover:text-primary"
                title="Bold"
              >
                B
              </button>
              <button
                type="button"
                onClick={() => insertMarkdown("*", "*")}
                className="rounded px-2 py-1 text-sm italic text-foreground/60 hover:bg-white hover:text-primary"
                title="Italic"
              >
                I
              </button>
              <button
                type="button"
                onClick={() => insertMarkdown("## ", "")}
                className="rounded px-2 py-1 text-sm text-foreground/60 hover:bg-white hover:text-primary"
                title="Heading"
              >
                H2
              </button>
              <button
                type="button"
                onClick={() => insertMarkdown("### ", "")}
                className="rounded px-2 py-1 text-sm text-foreground/60 hover:bg-white hover:text-primary"
                title="Sub-heading"
              >
                H3
              </button>
              <button
                type="button"
                onClick={() => insertMarkdown("[", "](url)")}
                className="rounded px-2 py-1 text-sm text-foreground/60 hover:bg-white hover:text-primary"
                title="Link"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                </svg>
              </button>
              <button
                type="button"
                onClick={() => insertMarkdown("- ", "")}
                className="rounded px-2 py-1 text-sm text-foreground/60 hover:bg-white hover:text-primary"
                title="List item"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
              <button
                type="button"
                onClick={() => insertMarkdown("> ", "")}
                className="rounded px-2 py-1 text-sm text-foreground/60 hover:bg-white hover:text-primary"
                title="Quote"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                </svg>
              </button>
              <div className="mx-1 h-5 w-px bg-accent/50" />
              <input
                ref={inlineInputRef}
                type="file"
                accept="image/*"
                onChange={handleInlineImageUpload}
                disabled={uploadingInline || !postId}
                className="hidden"
                id="inline-upload"
              />
              <label
                htmlFor="inline-upload"
                className={`flex cursor-pointer items-center gap-1 rounded px-2 py-1 text-sm text-foreground/60 hover:bg-white hover:text-primary ${
                  !postId ? "opacity-50 cursor-not-allowed" : ""
                }`}
                title={postId ? "Insert image" : "Save as draft first"}
              >
                {uploadingInline ? (
                  "Uploading..."
                ) : (
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                )}
              </label>
            </div>

            <textarea
              ref={contentRef}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Write your blog post content in Markdown..."
              rows={20}
              className="w-full rounded-b-lg border border-accent/50 bg-white px-4 py-3 font-mono text-sm text-foreground placeholder:text-foreground/30 focus:border-secondary focus:outline-none focus:ring-1 focus:ring-secondary"
            />
          </>
        ) : (
          <div className="min-h-[480px] rounded-lg border border-accent/50 bg-white p-6">
            {content ? (
              <MarkdownRenderer content={content} />
            ) : (
              <p className="text-sm text-foreground/30 italic">Nothing to preview yet...</p>
            )}
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-3 border-t border-accent/30 pt-4">
        <button
          type="button"
          onClick={() => handleSave("draft")}
          disabled={saving || !title}
          className="rounded-lg border border-accent/50 bg-white px-5 py-2.5 text-sm font-medium text-foreground hover:bg-background disabled:opacity-50"
        >
          {saving ? "Saving..." : "Save Draft"}
        </button>
        <button
          type="button"
          onClick={() => handleSave("published")}
          disabled={saving || !title}
          className="rounded-lg bg-secondary px-5 py-2.5 text-sm font-medium text-white hover:bg-secondary/90 disabled:opacity-50"
        >
          {saving ? "Saving..." : initialData?.status === "published" ? "Update" : "Publish"}
        </button>
        {initialData?.status === "published" && (
          <button
            type="button"
            onClick={() => handleSave("draft")}
            disabled={saving}
            className="rounded-lg border border-amber-300 bg-amber-50 px-5 py-2.5 text-sm font-medium text-amber-700 hover:bg-amber-100 disabled:opacity-50"
          >
            Unpublish
          </button>
        )}
      </div>
    </div>
  );
}
