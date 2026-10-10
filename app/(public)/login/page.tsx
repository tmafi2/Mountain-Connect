import { getPlatformStats } from "@/lib/stats/platform-stats.server";
import LoginClient from "./LoginClient";

/**
 * A server shell around the (unchanged) login form, so the marketing panel
 * beside it can quote real counts instead of the 69 / 12 / 50+ that were
 * typed in when the platform was a third of its current size.
 *
 * The form itself, its hooks and the whole auth flow moved to LoginClient.tsx
 * verbatim — this file exists only to fetch the numbers that a client
 * component cannot.
 *
 * Metadata still comes from layout.tsx, which was added when this page could
 * not export any. Left there deliberately: moving it would be churn, and two
 * copies would be a second thing to keep in step.
 */

// Required by lib/stats/platform-stats.ts: `revalidate` still prerenders at
// build time, where the Sensitive Supabase keys are withheld, and the counts
// would come back empty.
export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const stats = await getPlatformStats();
  return <LoginClient stats={stats} />;
}
