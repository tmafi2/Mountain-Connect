import * as Sentry from "@sentry/nextjs";

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./sentry.server.config");
  }

  if (process.env.NEXT_RUNTIME === "edge") {
    await import("./sentry.edge.config");
  }
}

// Forward errors thrown inside nested React Server Components to Sentry.
// Without this, RSC errors silently disappear instead of showing up as
// issues. Required by the Sentry SDK as of v8+.
export const onRequestError = Sentry.captureRequestError;
