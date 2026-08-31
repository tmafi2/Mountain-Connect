import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 0.1,
  replaysSessionSampleRate: 0,
  replaysOnErrorSampleRate: 1.0,
  // Vercel sets VERCEL_ENV to production/preview; anything else is a
  // developer's machine. Separating them is what lets a real user's error be
  // told apart from a preview deploy's.
  environment: process.env.NEXT_PUBLIC_VERCEL_ENV || process.env.VERCEL_ENV || process.env.NODE_ENV,
  // Local development does NOT report. The DSN is present in .env.local, so
  // until now every crash from `npm run dev` landed in the same inbox as
  // production — including build-cache errors that mean nothing to anyone,
  // which is most of what arrived today.
  enabled:
    !!process.env.NEXT_PUBLIC_SENTRY_DSN && process.env.NODE_ENV === "production",
});

// Instrument client-side navigations so transitions show up as spans in
// Sentry traces. Required by the Sentry SDK; without it the build prints
// an ACTION REQUIRED warning.
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
