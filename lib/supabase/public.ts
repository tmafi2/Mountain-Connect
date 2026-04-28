import { createClient as createPlainClient } from "@supabase/supabase-js";

/**
 * Cookie-free Supabase client for public pages that should be cached.
 *
 * Why this exists:
 *   The cookie-bound `createClient` from server.ts opts every page
 *   into dynamic rendering — Next.js sees the cookies() call and
 *   bails out of caching. For pages that show the same data to every
 *   visitor (jobs index, employers list, blog), that means every
 *   single request hits Supabase, which is both slow and costs us
 *   real DB load.
 *
 *   This client uses only the anon key with no cookie context, so
 *   pages can declare `export const revalidate = 120` (or similar)
 *   and Next.js will serve cached HTML between revalidations.
 *
 * RLS is still enforced — the anon key only sees rows that public
 * SELECT policies allow. Don't use this client for anything that
 * needs the caller's user identity.
 */
export function createPublicClient() {
  return createPlainClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false } }
  );
}
