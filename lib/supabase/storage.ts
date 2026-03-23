import { createClient } from "./client";

const BUCKET = "business-photos";

/**
 * Upload a photo to Supabase Storage (client-side).
 * Returns the public URL of the uploaded file.
 */
export async function uploadBusinessPhoto(
  businessId: string,
  file: File,
  photoId: string
): Promise<string> {
  const supabase = createClient();

  // Create a clean file path: business-photos/{businessId}/{photoId}.{ext}
  const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const path = `${businessId}/${photoId}.${ext}`;

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
 * Delete a photo from Supabase Storage (client-side).
 */
export async function deleteBusinessPhoto(
  businessId: string,
  fileUrl: string
): Promise<void> {
  const supabase = createClient();

  // Extract path from the public URL
  const urlParts = fileUrl.split(`${BUCKET}/`);
  if (urlParts.length < 2) return;
  const path = urlParts[1];

  const { error } = await supabase.storage.from(BUCKET).remove([path]);

  if (error) {
    console.error("Delete failed:", error.message);
  }
}

/**
 * Get all photos for a business from the database.
 */
export async function getBusinessPhotos(businessId: string) {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("business_photos")
    .select("*")
    .eq("business_id", businessId)
    .order("sort_order", { ascending: true });

  if (error) {
    console.error("Failed to fetch photos:", error.message);
    return [];
  }

  return data || [];
}

/**
 * Save photo metadata to the database (after upload).
 */
export async function saveBusinessPhotoRecord(params: {
  businessId: string;
  url: string;
  caption: string;
  sortOrder: number;
}) {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("business_photos")
    .insert({
      business_id: params.businessId,
      url: params.url,
      caption: params.caption || null,
      sort_order: params.sortOrder,
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to save photo record: ${error.message}`);
  }

  return data;
}

/**
 * Delete a photo record from the database.
 */
export async function deleteBusinessPhotoRecord(photoId: string) {
  const supabase = createClient();

  const { error } = await supabase
    .from("business_photos")
    .delete()
    .eq("id", photoId);

  if (error) {
    console.error("Failed to delete photo record:", error.message);
  }
}

/**
 * Update photo captions and sort orders in bulk.
 */
export async function updateBusinessPhotoRecords(
  photos: { id: string; caption: string; sort_order: number }[]
) {
  const supabase = createClient();

  // Update each photo individually (Supabase doesn't support bulk upsert on non-PK)
  const promises = photos.map((photo) =>
    supabase
      .from("business_photos")
      .update({ caption: photo.caption || null, sort_order: photo.sort_order })
      .eq("id", photo.id)
  );

  await Promise.all(promises);
}
