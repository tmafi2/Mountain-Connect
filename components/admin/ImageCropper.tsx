"use client";

import { useState, useCallback } from "react";
import Cropper, { Area } from "react-easy-crop";

interface ImageCropperProps {
  imageSrc: string;
  onCropComplete: (croppedBlob: Blob) => void;
  onCancel: () => void;
  aspect?: number;
}

export default function ImageCropper({
  imageSrc,
  onCropComplete,
  onCancel,
  aspect = 16 / 9,
}: ImageCropperProps) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);

  const handleCropComplete = useCallback((_: Area, croppedPixels: Area) => {
    setCroppedAreaPixels(croppedPixels);
  }, []);

  const handleSave = async () => {
    if (!croppedAreaPixels) return;

    const image = new Image();
    image.crossOrigin = "anonymous";
    image.src = imageSrc;

    await new Promise((resolve) => {
      image.onload = resolve;
    });

    const canvas = document.createElement("canvas");
    canvas.width = croppedAreaPixels.width;
    canvas.height = croppedAreaPixels.height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.drawImage(
      image,
      croppedAreaPixels.x,
      croppedAreaPixels.y,
      croppedAreaPixels.width,
      croppedAreaPixels.height,
      0,
      0,
      croppedAreaPixels.width,
      croppedAreaPixels.height
    );

    canvas.toBlob(
      (blob) => {
        if (blob) onCropComplete(blob);
      },
      "image/jpeg",
      0.92
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
      <div className="w-full max-w-2xl rounded-xl bg-white p-6 shadow-2xl">
        <h3 className="mb-4 text-lg font-semibold text-primary">
          Crop Hero Image
        </h3>

        {/* Crop area */}
        <div className="relative h-80 w-full overflow-hidden rounded-lg bg-black">
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            aspect={aspect}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={handleCropComplete}
          />
        </div>

        {/* Zoom slider */}
        <div className="mt-4 flex items-center gap-3">
          <span className="text-xs text-foreground/50">Zoom</span>
          <input
            type="range"
            min={1}
            max={3}
            step={0.05}
            value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
            className="flex-1 accent-secondary"
          />
          <span className="w-10 text-right text-xs text-foreground/50">
            {zoom.toFixed(1)}x
          </span>
        </div>

        {/* Actions */}
        <div className="mt-5 flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="rounded-lg border border-accent/50 bg-white px-4 py-2 text-sm font-medium text-foreground hover:bg-background"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="rounded-lg bg-secondary px-4 py-2 text-sm font-medium text-white hover:bg-secondary/90"
          >
            Apply Crop
          </button>
        </div>
      </div>
    </div>
  );
}
