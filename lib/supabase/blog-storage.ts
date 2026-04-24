import { createClient } from "./client";

const BUCKET = "blog-images";

/**
 * Upload an image to the blog-images bucket (client-side).
 * Returns the public URL of the uploaded file.
 */
export async function uploadBlogImage(
  postId: string,
  file: File,
  imageId: string
): Promise<string> {
  const supabase = createClient();

  const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const path = `${postId}/${imageId}.${ext}`;

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, {
      cacheControl: "3600",
      upsert: true,
    });

  if (error) {
    throw new Error(`Upload failed: ${error.message}`);
  }

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  // Cache-bust: upsert writes to the same path each time, so without a
  // unique query param browsers + the CDN keep serving the previous file.
  return `${data.publicUrl}?v=${Date.now()}`;
}

/**
 * Delete an image from the blog-images bucket (client-side).
 */
export async function deleteBlogImage(fileUrl: string): Promise<void> {
  const supabase = createClient();

  const urlParts = fileUrl.split(`${BUCKET}/`);
  if (urlParts.length < 2) return;
  // Strip any cache-busting query string (e.g. ?v=…) that uploadBlogImage
  // appends — the storage API expects the bare path.
  const path = urlParts[1].split("?")[0];

  const { error } = await supabase.storage.from(BUCKET).remove([path]);

  if (error) {
    console.error("Delete failed:", error.message);
  }
}
