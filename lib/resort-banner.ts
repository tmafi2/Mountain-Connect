// Per-country gradient palette used as the background of every resort
// banner (explore cards, compare thumbnails, detail-page hero) until
// per-resort photos are supplied. Gradients lean alpine/cool and are
// chosen so the dark mountain-silhouette overlay reads cleanly on top.

export const countryGradients: Record<string, string> = {
  Andorra: "linear-gradient(135deg, #0f172a 0%, #1e3a8a 55%, #60a5fa 100%)",
  Argentina: "linear-gradient(135deg, #1e1b4b 0%, #3730a3 55%, #38bdf8 100%)",
  Australia: "linear-gradient(135deg, #1e293b 0%, #b45309 60%, #f59e0b 100%)",
  Austria: "linear-gradient(135deg, #064e3b 0%, #047857 55%, #34d399 100%)",
  Canada: "linear-gradient(135deg, #1e1b4b 0%, #047857 60%, #10b981 100%)",
  Chile: "linear-gradient(135deg, #450a0a 0%, #c2410c 55%, #f97316 100%)",
  France: "linear-gradient(135deg, #1e3a8a 0%, #3b82f6 55%, #93c5fd 100%)",
  Georgia: "linear-gradient(135deg, #3b0764 0%, #a16207 55%, #f59e0b 100%)",
  Italy: "linear-gradient(135deg, #0c1e3e 0%, #c2410c 55%, #fb923c 100%)",
  Japan: "linear-gradient(135deg, #1e1b4b 0%, #be185d 55%, #f9a8d4 100%)",
  "New Zealand":
    "linear-gradient(135deg, #0f3a3a 0%, #047857 55%, #6ee7b7 100%)",
  Sweden: "linear-gradient(135deg, #1e3a8a 0%, #1d4ed8 45%, #fbbf24 100%)",
  Switzerland:
    "linear-gradient(135deg, #7f1d1d 0%, #b91c1c 55%, #fca5a5 100%)",
  USA: "linear-gradient(135deg, #0c1e3e 0%, #1e40af 55%, #22d3ee 100%)",
};

export const defaultGradient =
  "linear-gradient(135deg, #0a1e33 0%, #3b9ede 50%, #22d3ee 100%)";

export function gradientForCountry(country: string | null | undefined): string {
  if (!country) return defaultGradient;
  return countryGradients[country] ?? defaultGradient;
}

export function countrySlug(name: string): string {
  return name.toLowerCase().replace(/\s+/g, "-");
}
