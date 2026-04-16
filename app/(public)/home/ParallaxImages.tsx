"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

export default function ParallaxImages() {
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <>
      {/* Back card */}
      <div
        className="absolute -right-4 -top-4 h-72 w-full rounded-2xl shadow-xl overflow-hidden"
        style={{ transform: `translateY(${scrollY * 0.02}px)` }}
      >
        <Image
          src="https://images.unsplash.com/photo-1551524559-8af4e6624178?w=600&q=80"
          alt="Ski resort village"
          fill
          className="object-cover"
        />
      </div>
      {/* Front card */}
      <div
        className="relative z-10 mt-8 ml-4 h-72 w-full rounded-2xl shadow-2xl overflow-hidden"
        style={{ transform: `translateY(${scrollY * -0.02}px)` }}
      >
        <Image
          src="https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=600&q=80"
          alt="Mountain panorama"
          fill
          className="object-cover"
        />
      </div>
      {/* Floating badge — desktop */}
      <div className="absolute -left-6 bottom-4 z-20 rounded-xl bg-white p-4 shadow-xl animate-float">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary/10">
            <span className="text-lg">🏔️</span>
          </div>
          <div>
            <p className="text-sm font-bold text-primary">50+ Resorts</p>
            <p className="text-xs text-foreground/50">12 Countries</p>
          </div>
        </div>
      </div>
    </>
  );
}
