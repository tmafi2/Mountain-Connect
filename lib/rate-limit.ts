import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { NextResponse } from "next/server";

let ratelimit: Ratelimit | null = null;

function getRatelimit() {
  if (ratelimit) return ratelimit;

  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) return null;

  ratelimit = new Ratelimit({
    redis: new Redis({ url, token }),
    limiter: Ratelimit.slidingWindow(10, "60 s"), // 10 requests per 60 seconds
    analytics: true,
  });

  return ratelimit;
}

/**
 * Rate limit a request by IP. Returns null if allowed, or a 429 response if blocked.
 * Gracefully skips if Upstash is not configured.
 */
export async function rateLimit(
  request: Request,
  opts?: { limit?: number; window?: string; identifier?: string }
) {
  const rl = getRatelimit();
  if (!rl) return null; // Skip if not configured

  const forwarded = request.headers.get("x-forwarded-for");
  const ip = forwarded?.split(",")[0]?.trim() || "anonymous";
  const identifier = opts?.identifier || ip;

  const { success, remaining, reset } = await rl.limit(identifier);

  if (!success) {
    return NextResponse.json(
      { error: "Too many requests. Please try again later." },
      {
        status: 429,
        headers: {
          "X-RateLimit-Remaining": String(remaining),
          "X-RateLimit-Reset": String(reset),
          "Retry-After": String(Math.ceil((reset - Date.now()) / 1000)),
        },
      }
    );
  }

  return null;
}
