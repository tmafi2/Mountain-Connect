import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 0.1,
  replaysSessionSampleRate: 0,
  replaysOnErrorSampleRate: 1.0,
  enabled: !!process.env.NEXT_PUBLIC_SENTRY_DSN,
});

// Instrument client-side navigations so transitions show up as spans in
// Sentry traces. Required by the Sentry SDK; without it the build prints
// an ACTION REQUIRED warning.
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
