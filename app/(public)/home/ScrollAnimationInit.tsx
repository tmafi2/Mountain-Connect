"use client";

import { useScrollAnimation } from "@/hooks/useScrollAnimation";

/**
 * Tiny client component that initializes the IntersectionObserver
 * for CSS scroll animations. Renders nothing visible.
 */
export default function ScrollAnimationInit() {
  useScrollAnimation();
  return null;
}
