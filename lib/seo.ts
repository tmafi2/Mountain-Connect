/** Default OG image shared across all pages.
 *  Note: the filename includes a version suffix to bust Facebook/LinkedIn/etc
 *  image caches when the logo is updated. Bump the version when the image
 *  changes so social platforms re-fetch instead of serving old cached bytes. */
export const defaultOgImage = {
  url: "/images/og-image-v2.jpg",
  width: 1200,
  height: 630,
  alt: "Mountain Connects — Seasonal Jobs at Ski Resorts Worldwide",
};
