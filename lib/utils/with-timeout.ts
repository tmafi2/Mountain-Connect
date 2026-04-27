/**
 * Race a promise against a deadline. Resolves to a Result tuple instead
 * of throwing so callers can fail open without try/catch noise:
 *
 *   const [data, timedOut] = await withTimeout(supabase.from(...), 3000);
 *   if (timedOut) return null; // graceful fallback
 *
 * The timeout is intentionally not aborting the original promise — that
 * requires AbortController plumbing on the caller's side. The underlying
 * request still completes in the background; we just stop waiting.
 */
export async function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
): Promise<[T | null, boolean]> {
  let timer: ReturnType<typeof setTimeout> | null = null;
  const timeout = new Promise<typeof TIMED_OUT>((resolve) => {
    timer = setTimeout(() => resolve(TIMED_OUT), ms);
  });

  try {
    const result = await Promise.race([promise, timeout]);
    if (result === TIMED_OUT) return [null, true];
    return [result as T, false];
  } finally {
    if (timer) clearTimeout(timer);
  }
}

const TIMED_OUT = Symbol("withTimeout::timed_out");
