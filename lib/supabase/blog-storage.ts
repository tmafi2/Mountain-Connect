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
  return data.publicUrl;
}

/**
 * Delete an image from the blog-images bucket (client-side).
 */
export async function deleteBlogImage(fileUrl: string): Promise<void> {
  const supabase = createClient();

  const urlParts = fileUrl.split(`${BUCKET}/`);
  if (urlParts.length < 2) return;
  const path = urlParts[1];

  const { error } = await supabase.storage.from(BUCKET).remove([path]);

  if (error) {
    console.error("Delete failed:", error.message);
  }
}
