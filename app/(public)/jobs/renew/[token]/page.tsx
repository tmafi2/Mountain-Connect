import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyRenewToken } from "@/lib/jobs/renew-token";
import { JOB_POST_LIFESPAN_DAYS } from "@/lib/jobs/expiry";
import { resolveEffectiveTier, type BusinessTier } from "@/lib/tier";
import RenewClient from "./RenewClient";

export const metadata: Metadata = {
  title: "Keep your listings live",
  robots: { index: false, follow: false },
};

/**
 * The landing page for the "Keep these listings live" button in the expiry
 * warning email.
 *
 * It exists so the emailed link can be a GET that changes nothing. Mail
 * scanners and link previewers fetch every URL in a message; if the link
 * itself renewed, listings would come back to life without anyone clicking.
 * The page shows exactly what is about to be renewed and posts to the API
 * on a button press.
 *
 * No login. The token is the authorisation, and it only ever affects the
 * business it was signed for.
 */
export default async function RenewPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const verdict = verifyRenewToken(token);

  if (!verdict.ok && verdict.reason !== "expired") notFound();

  if (!verdict.ok) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <h1 className="text-2xl font-bold text-primary">This link has expired</h1>
        <p className="mt-3 text-foreground/70">
          Renewal links last three weeks. You can still keep your listings live from your
          dashboard.
        </p>
        <a
          href="/business/manage-listings"
          className="mt-6 inline-block rounded-xl bg-secondary px-6 py-3 font-semibold text-white"
        >
          Go to my listings
        </a>
      </div>
    );
  }

  const admin = createAdminClient();
  const [{ data: business }, { data: jobs }] = await Promise.all([
    admin
      .from("business_profiles")
      .select("business_name, tier, selected_tier, subscription_status, grace_period_ends_at")
      .eq("id", verdict.businessId)
      .single(),
    admin
      .from("job_posts")
      .select("id, title, status, expires_at, paused_reason")
      .eq("business_id", verdict.businessId)
      .or("status.eq.active,and(status.eq.paused,paused_reason.eq.expired)")
      .order("expires_at", { ascending: true }),
  ]);

  const listings = (jobs ?? []).map((j) => ({
    id: j.id as string,
    title: j.title as string,
    lapsed: j.status === "paused",
    expiresAt: (j.expires_at as string | null) ?? null,
  }));

  // Free accounts cannot renew — the page says so up front rather than
  // letting them press a button that answers 402.
  const canRenew =
    resolveEffectiveTier({
      tier: (business?.tier ?? "free") as BusinessTier | null,
      selected_tier: (business?.selected_tier ?? null) as BusinessTier | null,
      subscription_status: (business?.subscription_status ?? null) as string | null,
      grace_period_ends_at: (business?.grace_period_ends_at ?? null) as string | null,
    }) !== "free";

  return (
    <RenewClient
      token={token}
      businessName={(business?.business_name as string | null) ?? null}
      listings={listings}
      lifespanDays={JOB_POST_LIFESPAN_DAYS}
      canRenew={canRenew}
    />
  );
}
