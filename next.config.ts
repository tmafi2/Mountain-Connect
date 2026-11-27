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
              // 'unsafe-eval' is added in development ONLY. The Next dev server
              // compiles and evaluates modules at runtime, so without it the
              // client bundle downloads but never executes: the page renders
              // server-side and then sits there un-hydrated, with every
              // onChange/onClick in the app silently dead. The production CSP
              // is unchanged — a production build contains no eval.
              [
                "script-src 'self' 'unsafe-inline'",
                // Both of these are development ONLY, and the production CSP
                // is unchanged by either.
                //
                // 'unsafe-eval': the Next dev server compiles and evaluates
                // modules at runtime, so without it the client bundle
                // downloads but never executes: the page renders server-side
                // and then sits there un-hydrated, with every onChange/onClick
                // in the app silently dead. A production build contains no
                // eval.
                //
                // va.vercel-scripts.com: BOTH Vercel Web Analytics and Speed
                // Insights (<Analytics /> and <SpeedInsights /> in
                // app/layout.tsx) serve their scripts from the site's OWN
                // origin in production — /_vercel/insights/script.js and
                // /_vercel/speed-insights/script.js, already covered by
                // 'self' — but swap to third-party debug builds on this host
                // under `next dev`. Without it the dev console throws a CSP
                // violation and local analytics calls cannot be inspected,
                // which is the only place they CAN be inspected before a
                // deploy. Never add it to the production list: production must
                // keep loading analytics first-party, which is what makes it
                // survive ad blockers and need no CSP exception at all. The
                // one thing that would change that is passing a `dsn` prop to
                // <SpeedInsights />, which switches it to this host in
                // production too — don't, without revisiting this line.
                ...(process.env.NODE_ENV === "development"
                  ? ["'unsafe-eval'", "https://va.vercel-scripts.com"]
                  : []),
                "https://www.googletagmanager.com https://maps.googleapis.com https://maps.gstatic.com",
                // Meta Pixel (lib/analytics/meta-pixel.ts): fbevents.js and its
                // per-pixel config script. Loads only after cookie consent.
                "https://connect.facebook.net",
              ].join(" "),
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "font-src 'self' https://fonts.gstatic.com",
              "img-src 'self' data: blob: https://images.unsplash.com https://kafekhemktqoczxclthy.supabase.co https://flagcdn.com https://unpkg.com https://maps.googleapis.com https://maps.gstatic.com https://*.googleusercontent.com https://streetviewpixels-pa.googleapis.com https://www.facebook.com",
              "media-src 'self' https://cdn.coverr.co",
              // www.facebook.com (here and in img-src) is where the Meta Pixel
              // sends its events — as a beacon/fetch or as an image request.
              "connect-src 'self' https://kafekhemktqoczxclthy.supabase.co wss://kafekhemktqoczxclthy.supabase.co https://www.google-analytics.com https://region1.google-analytics.com https://*.ingest.sentry.io https://*.ingest.us.sentry.io https://maps.googleapis.com https://www.facebook.com",
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
