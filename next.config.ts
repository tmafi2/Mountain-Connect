import { withSentryConfig } from "@sentry/nextjs";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
    ],
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(self \"https://*.daily.co\"), microphone=(self \"https://*.daily.co\"), geolocation=()" },
          { key: "X-DNS-Prefetch-Control", value: "on" },
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' https://www.googletagmanager.com",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "font-src 'self' https://fonts.gstatic.com",
              "img-src 'self' data: blob: https://images.unsplash.com https://kafekhemktqoczxclthy.supabase.co https://flagcdn.com https://unpkg.com",
              "media-src 'self' https://cdn.coverr.co",
              "connect-src 'self' https://kafekhemktqoczxclthy.supabase.co wss://kafekhemktqoczxclthy.supabase.co https://www.google-analytics.com https://region1.google-analytics.com https://*.ingest.sentry.io https://*.ingest.us.sentry.io",
              "frame-src 'self' https://*.daily.co https://kafekhemktqoczxclthy.supabase.co",
              "worker-src blob:",
              "frame-ancestors 'none'",
            ].join("; "),
          },
        ],
      },
    ];
  },
};

export default withSentryConfig(nextConfig, {
  // Quiet upload spam during build — release info still shows up in Sentry,
  // we just don't print every step to the console.
  silent: true,
  // disableLogger was removed (it was deprecated). Sentry's internal debug
  // logger has trivial bundle impact in modern versions; if you ever need
  // to strip it, use the new bundleSizeOptimizations.excludeDebugStatements
  // option here.
});
