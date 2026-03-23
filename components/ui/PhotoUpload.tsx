"use client";

import { useState, useRef, useCallback } from "react";
import {
  uploadBusinessPhoto,
  deleteBusinessPhoto,
  saveBusinessPhotoRecord,
  deleteBusinessPhotoRecord,
  updateBusinessPhotoRecords,
} from "@/lib/supabase/storage";

/* ─── Types ──────────────────────────────────────────────── */

export interface UploadedPhoto {
  id: string;
  url: string; // object URL for preview, or remote URL
  caption: string;
  file?: File; // original file (for upload)
  dbId?: string; // database record id (when persisted)
  uploading?: boolean;
}

interface PhotoUploadProps {
  photos: UploadedPhoto[];
  onChange: (photos: UploadedPhoto[]) => void;
  maxPhotos?: number;
  /** If provided, photos are uploaded to Supabase Storage and saved to the database */
  businessId?: string;
}

/* ─── Component ──────────────────────────────────────────── */

export default function PhotoUpload({
  photos,
  onChange,
  maxPhotos = 8,
  businessId,
}: PhotoUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [editingCaption, setEditingCaption] = useState<string | null>(null);
  const [captionText, setCaptionText] = useState("");
  const [saving, setSaving] = useState(false);

  const addFiles = useCallback(
    async (files: FileList | File[]) => {
      const fileArray = Array.from(files).filter((f) => f.type.startsWith("image/"));
      const remaining = maxPhotos - photos.length;
      const toAdd = fileArray.slice(0, remaining);

      if (toAdd.length === 0) return;

      // Create local preview photos immediately
      const newPhotos: UploadedPhoto[] = toAdd.map((file) => ({
        id: `photo-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        url: URL.createObjectURL(file),
        caption: "",
        file,
        uploading: !!businessId,
      }));

      const allPhotos = [...photos, ...newPhotos];
      onChange(allPhotos);

      // If businessId is provided, upload to Supabase Storage
      if (businessId) {
        const uploadedPhotos = await Promise.all(
          newPhotos.map(async (photo) => {
            try {
              const remoteUrl = await uploadBusinessPhoto(
                businessId,
                photo.file!,
                photo.id
              );
              const record = await saveBusinessPhotoRecord({
                businessId,
                url: remoteUrl,
                caption: "",
                sortOrder: allPhotos.findIndex((p) => p.id === photo.id),
              });
              // Revoke the blob URL now that we have the remote URL
              URL.revokeObjectURL(photo.url);
              return {
                ...photo,
                url: remoteUrl,
                dbId: record.id,
                file: undefined,
                uploading: false,
              };
            } catch (err) {
              console.error("Upload failed for", photo.id, err);
              return { ...photo, uploading: false };
            }
          })
        );

        // Replace the uploading photos with the uploaded versions
        onChange(
          allPhotos.map((p) => {
            const uploaded = uploadedPhotos.find((u) => u.id === p.id);
            return uploaded || p;
          })
        );
      }
    },
    [photos, onChange, maxPhotos, businessId]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      if (e.dataTransfer.files.length > 0) {
        addFiles(e.dataTransfer.files);
      }
    },
    [addFiles]
  );

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = () => {
    setDragOver(false);
  };

  const removePhoto = async (id: string) => {
    const photo = photos.find((p) => p.id === id);
    if (!photo) return;

    // Revoke blob URL if local
    if (photo.url.startsWith("blob:")) {
      URL.revokeObjectURL(photo.url);
    }

    // Delete from Supabase Storage + database if persisted
    if (businessId && photo.dbId) {
      try {
        await deleteBusinessPhoto(businessId, photo.url);
        await deleteBusinessPhotoRecord(photo.dbId);
      } catch (err) {
        console.error("Failed to delete from storage:", err);
      }
    }

    onChange(photos.filter((p) => p.id !== id));
  };

  const movePhoto = (id: string, direction: "left" | "right") => {
    const idx = photos.findIndex((p) => p.id === id);
    if (idx === -1) return;
    const newIdx = direction === "left" ? idx - 1 : idx + 1;
    if (newIdx < 0 || newIdx >= photos.length) return;

    const updated = [...photos];
    [updated[idx], updated[newIdx]] = [updated[newIdx], updated[idx]];
    onChange(updated);

    // Persist order to database
    if (businessId) {
      const records = updated
        .filter((p) => p.dbId)
        .map((p, i) => ({ id: p.dbId!, caption: p.caption, sort_order: i }));
      if (records.length > 0) {
        updateBusinessPhotoRecords(records).catch(console.error);
      }
    }
  };

  const saveCaption = async (id: string) => {
    const updated = photos.map((p) =>
      p.id === id ? { ...p, caption: captionText } : p
    );
    onChange(updated);
    setEditingCaption(null);

    // Persist caption to database
    const photo = updated.find((p) => p.id === id);
    if (businessId && photo?.dbId) {
      setSaving(true);
      try {
        await updateBusinessPhotoRecords([
          { id: photo.dbId, caption: captionText, sort_order: updated.indexOf(photo) },
        ]);
      } catch (err) {
        console.error("Failed to save caption:", err);
      }
      setSaving(false);
    }

    setCaptionText("");
  };

  const canAdd = photos.length < maxPhotos;

  return (
    <div>
      {/* Drop zone */}
      {canAdd && (
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={() => fileInputRef.current?.click()}
          className={`cursor-pointer rounded-xl border-2 border-dashed p-6 text-center transition-colors ${
            dragOver
              ? "border-secondary bg-secondary/10"
              : "border-accent bg-accent/5 hover:border-secondary/50 hover:bg-accent/10"
          }`}
        >
          <svg
            className="mx-auto h-10 w-10 text-foreground/30"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
          <p className="mt-2 text-sm font-medium text-foreground/60">
            Drag & drop photos here, or click to browse
          </p>
          <p className="mt-1 text-xs text-foreground/40">
            JPG, PNG up to 5MB each. {photos.length}/{maxPhotos} photos uploaded.
          </p>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => {
              if (e.target.files) addFiles(e.target.files);
              e.target.value = "";
            }}
          />
        </div>
      )}

      {/* Photo grid */}
      {photos.length > 0 && (
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
          {photos.map((photo, idx) => (
            <div
              key={photo.id}
              className="group relative overflow-hidden rounded-lg border border-accent bg-white"
            >
              {/* Image */}
              <div className="aspect-[4/3] overflow-hidden bg-accent/10">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={photo.url}
                  alt={photo.caption || `Photo ${idx + 1}`}
                  className="h-full w-full object-cover"
                />
                {/* Upload spinner */}
                {photo.uploading && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                    <div className="h-6 w-6 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  </div>
                )}
              </div>

              {/* Overlay controls */}
              {!photo.uploading && (
                <div className="absolute inset-0 flex flex-col justify-between bg-gradient-to-t from-black/60 via-transparent to-black/30 opacity-0 transition-opacity group-hover:opacity-100">
                  {/* Top controls */}
                  <div className="flex justify-between p-1.5">
                    <span className="rounded bg-black/50 px-1.5 py-0.5 text-[10px] font-medium text-white">
                      {idx + 1}/{photos.length}
                    </span>
                    <button
                      onClick={() => removePhoto(photo.id)}
                      className="rounded bg-red-500/80 p-1 text-white transition-colors hover:bg-red-600"
                      title="Remove photo"
                    >
                      <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>

                  {/* Bottom controls */}
                  <div className="flex items-center justify-between p-1.5">
                    <div className="flex gap-1">
                      {idx > 0 && (
                        <button
                          onClick={() => movePhoto(photo.id, "left")}
                          className="rounded bg-black/50 p-1 text-white transition-colors hover:bg-black/70"
                          title="Move left"
                        >
                          <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                          </svg>
                        </button>
                      )}
                      {idx < photos.length - 1 && (
                        <button
                          onClick={() => movePhoto(photo.id, "right")}
                          className="rounded bg-black/50 p-1 text-white transition-colors hover:bg-black/70"
                          title="Move right"
                        >
                          <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </button>
                      )}
                    </div>
                    <button
                      onClick={() => {
                        setEditingCaption(photo.id);
                        setCaptionText(photo.caption);
                      }}
                      className="rounded bg-black/50 p-1 text-white transition-colors hover:bg-black/70"
                      title="Edit caption"
                    >
                      <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                      </svg>
                    </button>
                  </div>
                </div>
              )}

              {/* Caption display */}
              {photo.caption && (
                <div className="border-t border-accent px-2 py-1.5">
                  <p className="text-[11px] text-foreground/60 truncate">{photo.caption}</p>
                </div>
              )}

              {/* Caption edit modal */}
              {editingCaption === photo.id && (
                <div className="absolute inset-0 flex items-end bg-black/40 p-2">
                  <div className="w-full rounded-lg bg-white p-2 shadow-lg">
                    <input
                      value={captionText}
                      onChange={(e) => setCaptionText(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && saveCaption(photo.id)}
                      placeholder="Add a caption..."
                      autoFocus
                      className="w-full rounded border border-accent px-2 py-1.5 text-xs text-primary focus:border-secondary focus:outline-none"
                    />
                    <div className="mt-1.5 flex justify-end gap-1">
                      <button
                        onClick={() => setEditingCaption(null)}
                        className="rounded px-2 py-1 text-[10px] text-foreground/50 hover:bg-accent/20"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => saveCaption(photo.id)}
                        disabled={saving}
                        className="rounded bg-primary px-2 py-1 text-[10px] text-white disabled:opacity-50"
                      >
                        {saving ? "Saving..." : "Save"}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
