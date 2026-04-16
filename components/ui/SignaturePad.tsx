"use client";

import { useRef, useState, useEffect, useCallback } from "react";

interface SignaturePadProps {
  onSign: (dataUrl: string) => void;
  width?: number;
  height?: number;
}

export default function SignaturePad({ onSign, width = 500, height = 200 }: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);
  const [canvasWidth, setCanvasWidth] = useState(width);

  // Responsive canvas sizing
  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        const w = Math.min(containerRef.current.offsetWidth - 2, width);
        setCanvasWidth(w);
      }
    };
    updateSize();
    window.addEventListener("resize", updateSize);
    return () => window.removeEventListener("resize", updateSize);
  }, [width]);

  // Initialize canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.strokeStyle = "#0a1e33";
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
  }, [canvasWidth]);

  const getPos = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    if ("touches" in e) {
      const touch = e.touches[0];
      return {
        x: (touch.clientX - rect.left) * scaleX,
        y: (touch.clientY - rect.top) * scaleY,
      };
    }
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  }, []);

  const startDrawing = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    const pos = getPos(e);
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
    setIsDrawing(true);
    setHasDrawn(true);
  }, [getPos]);

  const draw = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    if (!isDrawing) return;
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    const pos = getPos(e);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
  }, [isDrawing, getPos]);

  const stopDrawing = useCallback(() => {
    setIsDrawing(false);
  }, []);

  const clear = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasDrawn(false);
  };

  const handleSubmit = () => {
    const canvas = canvasRef.current;
    if (!canvas || !hasDrawn) return;
    const dataUrl = canvas.toDataURL("image/png");
    onSign(dataUrl);
  };

  return (
    <div ref={containerRef} className="w-full">
      <label className="block text-xs font-semibold uppercase tracking-wider text-foreground/50 mb-2">
        Your Signature
      </label>
      <div className="rounded-xl border-2 border-dashed border-accent bg-white overflow-hidden">
        <canvas
          ref={canvasRef}
          width={canvasWidth}
          height={height}
          className="w-full cursor-crosshair touch-none"
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
        />
      </div>
      <div className="mt-2 flex items-center justify-between">
        <button
          type="button"
          onClick={clear}
          className="text-xs text-foreground/40 hover:text-foreground/60 transition-colors"
        >
          Clear signature
        </button>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={!hasDrawn}
          className="rounded-xl bg-green-600 px-6 py-2.5 text-sm font-semibold text-white transition-all hover:bg-green-700 hover:-translate-y-0.5 disabled:opacity-40 disabled:hover:translate-y-0 disabled:cursor-not-allowed flex items-center gap-2"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Sign Contract
        </button>
      </div>
    </div>
  );
}
