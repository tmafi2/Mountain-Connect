"use client";

import { useState, useRef, useCallback } from "react";
import Image from "next/image";
import { slugify } from "@/lib/utils/slugify";
import { uploadBlogImage, deleteBlogImage } from "@/lib/supabase/blog-storage";
import MarkdownRenderer from "@/components/ui/MarkdownRenderer";
import ImageCropper from "@/components/admin/ImageCropper";
import type { BlogPost } from "@/types/database";

interface BlogEditorProps {
  initialData?: Partial<BlogPost>;
  postId?: string; // Needed for image uploads
  currentUserName?: string; // Logged-in user's full name
  onSave: (data: {
    title: string;
    slug: string;
    content: string;
    excerpt: string;
    hero_image_url: string;
    status: string;
    author_name: string;
    scheduled_at?: string | null;
  }) => Promise<void>;
  saving: boolean;
}

export default function BlogEditor({ initialData, postId, currentUserName, onSave, saving }: BlogEditorProps) {
  const [title, setTitle] = useState(initialData?.title || "");
  const [slug, setSlug] = useState(initialData?.slug || "");
  const [slugEdited, setSlugEdited] = useState(false);
  const [content, setContent] = useState(initialData?.content || "");
  const [excerpt, setExcerpt] = useState(initialData?.excerpt || "");
  const [heroImageUrl, setHeroImageUrl] = useState(initialData?.hero_image_url || "");
  const [activeTab, setActiveTab] = useState<"edit" | "preview">("edit");
  const [uploadingHero, setUploadingHero] = useState(false);
  const [uploadingInline, setUploadingInline] = useState(false);

  // Author state
  const hasCustomAuthor = !!initialData?.author_name;
  const [authorMode, setAuthorMode] = useState<"account" | "custom">(hasCustomAuthor ? "custom" : "account");
  const [customAuthorName, setCustomAuthorName] = useState(initialData?.author_name || "");

  // Schedule state
  const [showSchedule, setShowSchedule] = useState(initialData?.status === "scheduled");
  const [scheduledAt, setScheduledAt] = useState(() => {
    if (initialData?.scheduled_at) {
      // Convert UTC to local datetime-local format
      const d = new Date(initialData.scheduled_at);
      return d.getFullYear() + "-" +
        String(d.getMonth() + 1).padStart(2, "0") + "-" +
        String(d.getDate()).padStart(2, "0") + "T" +
        String(d.getHours()).padStart(2, "0") + ":" +
        String(d.getMinutes()).padStart(2, "0");
    }
    return "";
  });

  // Image cropper state
  const [cropImageSrc, setCropImageSrc] = useState<string | null>(null);
  const [cropFile, setCropFile] = useState<File | null>(null);

  const contentRef = useRef<HTMLTextAreaElement>(null);
  const heroInputRef = useRef<HTMLInputElement>(null);
  const inlineInputRef = useRef<HTMLInputElement>(null);

  const handleTitleChange = (value: string) => {
    setTitle(value);
    if (!slugEdited) {
      setSlug(slugify(value));
    }
  };

  // When a hero image file is selected, open the cropper instead of uploading directly
  const handleHeroFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setCropFile(file);
    const reader = new FileReader();
    reader.onload = () => {
      setCropImageSrc(reader.result as string);
    };
    reader.readAsDataURL(file);

    // Reset input so the same file can be re-selected
    if (heroInputRef.current) heroInputRef.current.value = "";
  }, []);

  // After cropping, upload the cropped blob
  const handleCropComplete = useCallback(async (croppedBlob: Blob) => {
    if (!postId || !cropFile) return;

    setCropImageSrc(null);
    setUploadingHero(true);

    try {
      // Create a File from the blob using the original filename
      const croppedFile = new File([croppedBlob], cropFile.name, { type: "image/jpeg" });
      const url = await uploadBlogImage(postId, croppedFile, "hero");
      setHeroImageUrl(url);
    } catch (err) {
      console.error("Hero upload failed:", err);
      alert("Failed to upload hero image. Please try again.");
    } finally {
      setUploadingHero(false);
      setCropFile(null);
    }
  }, [postId, cropFile]);

  const handleCropCancel = useCallback(() => {
    setCropImageSrc(null);
    setCropFile(null);
  }, []);

  // Re-crop: open cropper with the existing hero image
  const handleRecrop = useCallback(() => {
    if (heroImageUrl) {
      setCropImageSrc(heroImageUrl);
      // No file needed for re-crop since we'll upload from blob
      setCropFile(new File([], "hero-recrop.jpg", { type: "image/jpeg" }));
    }
  }, [heroImageUrl]);

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
    const data: Parameters<typeof onSave>[0] = {
      title,
      slug,
      content,
      excerpt,
      hero_image_url: heroImageUrl,
      status,
      author_name: authorMode === "custom" ? customAuthorName : "",
    };

    if (status === "scheduled") {
      if (!scheduledAt) return;
      data.scheduled_at = new Date(scheduledAt).toISOString();
    } else {
      data.scheduled_at = null;
    }

    onSave(data);
  };

  return (
    <div className="space-y-6">
      {/* Image Cropper Modal */}
      {cropImageSrc && (
        <ImageCropper
          imageSrc={cropImageSrc}
          onCropComplete={handleCropComplete}
          onCancel={handleCropCancel}
          aspect={16 / 9}
        />
      )}

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

      {/* Author */}
      <div>
        <label className="mb-1.5 block text-sm font-medium text-primary">Author</label>
        <div className="flex items-center gap-3 mb-2">
          <button
            type="button"
            onClick={() => setAuthorMode("account")}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
              authorMode === "account"
                ? "bg-secondary/15 text-secondary"
                : "bg-background text-foreground/50 hover:text-foreground"
            }`}
          >
            My Account
          </button>
          <button
            type="button"
            onClick={() => setAuthorMode("custom")}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
              authorMode === "custom"
                ? "bg-secondary/15 text-secondary"
                : "bg-background text-foreground/50 hover:text-foreground"
            }`}
          >
            Custom Name
          </button>
        </div>
        {authorMode === "account" ? (
          <p className="text-sm text-foreground/60">
            Will be published as <span className="font-medium text-primary">{currentUserName || "your account name"}</span>
          </p>
        ) : (
          <input
            type="text"
            value={customAuthorName}
            onChange={(e) => setCustomAuthorName(e.target.value)}
            placeholder="Enter author name..."
            className="w-full rounded-lg border border-accent/50 bg-white px-4 py-2.5 text-sm text-foreground placeholder:text-foreground/30 focus:border-secondary focus:outline-none focus:ring-1 focus:ring-secondary"
          />
        )}
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
            <div className="absolute top-2 right-2 flex gap-1.5">
              <button
                type="button"
                onClick={handleRecrop}
                className="rounded-full bg-white/90 p-1.5 text-foreground/70 shadow hover:bg-white hover:text-primary"
                title="Crop & zoom"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14" />
                </svg>
              </button>
              <button
                type="button"
                onClick={() => heroInputRef.current?.click()}
                className="rounded-full bg-white/90 p-1.5 text-foreground/70 shadow hover:bg-white hover:text-primary"
                title="Replace image"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
              </button>
              <button
                type="button"
                onClick={handleRemoveHero}
                className="rounded-full bg-red-500 p-1.5 text-white shadow hover:bg-red-600"
                title="Remove image"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <input
              ref={heroInputRef}
              type="file"
              accept="image/*"
              onChange={handleHeroFileSelect}
              disabled={uploadingHero || !postId}
              className="hidden"
            />
          </div>
        ) : (
          <div>
            <input
              ref={heroInputRef}
              type="file"
              accept="image/*"
              onChange={handleHeroFileSelect}
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

      {/* Schedule Section */}
      <div className="rounded-lg border border-accent/30 bg-background/50 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <svg className="h-5 w-5 text-foreground/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-sm font-medium text-primary">Schedule Publication</span>
          </div>
          <button
            type="button"
            onClick={() => {
              setShowSchedule(!showSchedule);
              if (showSchedule) setScheduledAt("");
            }}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
              showSchedule
                ? "bg-blue-100 text-blue-700"
                : "bg-background text-foreground/50 hover:text-foreground"
            }`}
          >
            {showSchedule ? "Cancel Schedule" : "Set Schedule"}
          </button>
        </div>

        {showSchedule && (
          <div className="mt-3">
            <label className="mb-1 block text-xs text-foreground/50">Publish Date & Time (your local timezone)</label>
            <input
              type="datetime-local"
              value={scheduledAt}
              onChange={(e) => setScheduledAt(e.target.value)}
              min={new Date(Date.now() + 60000).toISOString().slice(0, 16)}
              className="w-full rounded-lg border border-accent/50 bg-white px-3 py-2 text-sm text-foreground focus:border-secondary focus:outline-none focus:ring-1 focus:ring-secondary"
            />
            {initialData?.status === "scheduled" && initialData?.scheduled_at && (
              <p className="mt-1.5 text-xs text-blue-600">
                Currently scheduled for {new Date(initialData.scheduled_at).toLocaleString()}
              </p>
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
        {showSchedule && scheduledAt ? (
          <button
            type="button"
            onClick={() => handleSave("scheduled")}
            disabled={saving || !title || !scheduledAt}
            className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? "Saving..." : "Schedule"}
          </button>
        ) : (
          <button
            type="button"
            onClick={() => handleSave("published")}
            disabled={saving || !title}
            className="rounded-lg bg-secondary px-5 py-2.5 text-sm font-medium text-white hover:bg-secondary/90 disabled:opacity-50"
          >
            {saving ? "Saving..." : initialData?.status === "published" ? "Update" : "Publish Now"}
          </button>
        )}
        {(initialData?.status === "published" || initialData?.status === "scheduled") && (
          <button
            type="button"
            onClick={() => { setShowSchedule(false); setScheduledAt(""); handleSave("draft"); }}
            disabled={saving}
            className="rounded-lg border border-amber-300 bg-amber-50 px-5 py-2.5 text-sm font-medium text-amber-700 hover:bg-amber-100 disabled:opacity-50"
          >
            {initialData?.status === "scheduled" ? "Unschedule" : "Unpublish"}
          </button>
        )}
      </div>
    </div>
  );
}
