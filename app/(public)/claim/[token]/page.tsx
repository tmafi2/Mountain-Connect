import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import ClaimForm from "./ClaimForm";

export const dynamic = "force-dynamic";

interface ClaimPageProps {
  params: Promise<{ token: string }>;
}

export async function generateMetadata({ params }: ClaimPageProps) {
  const { token } = await params;
  return {
    title: "Claim your listing | Mountain Connects",
    description: "Take ownership of your Mountain Connects listing.",
    alternates: { canonical: `https://www.mountainconnects.com/claim/${token}` },
    robots: { index: false, follow: false },
  };
}

export default async function ClaimPage({ params }: ClaimPageProps) {
  const { token } = await params;
  const admin = createAdminClient();

  const { data: business, error: bizErr } = await admin
    .from("business_profiles")
    .select("id, business_name, email, location, country, is_claimed, logo_url, resort_id")
    .eq("claim_token", token)
    .maybeSingle();

  // Invalid / unknown token
  if (bizErr) console.error("Claim page lookup failed:", bizErr);
  if (!business) {
    return <ClaimError title="Invalid claim link" message="This claim link isn't recognised. It may have been revoked or mistyped. Please check the link in your email or contact our team." />;
  }

  // Already claimed
  if (business.is_claimed) {
    return (
      <ClaimError
        title="This listing has already been claimed"
        message="Someone has already claimed this listing. If that was you, log in to access your dashboard."
        action={{ label: "Log in", href: "/login" }}
      />
    );
  }

  // Fetch the business's listings so we can preview them
  const { data: jobs } = await admin
    .from("job_posts")
    .select("id, title, description, source, source_url, created_at")
    .eq("business_id", business.id)
    .eq("status", "active")
    .order("created_at", { ascending: false });

  // business_profiles.resort_id is a text column without an FK constraint, so
  // we fetch the resort name in a separate query rather than via nested select.
  let resortName: string | null = null;
  if (business.resort_id) {
    const { data: resort } = await admin
      .from("resorts")
      .select("name")
      .eq("id", business.resort_id)
      .maybeSingle();
    resortName = resort?.name || null;
  }

  return (
    <div className="min-h-screen bg-background py-12 px-4">
      <div className="mx-auto max-w-2xl">
        <Link href="/" className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-primary hover:text-secondary">
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 21l5-10 5 7 3-5 5 8H3z" />
          </svg>
          Mountain Connects
        </Link>

        <div className="rounded-2xl border border-accent bg-white p-8 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-semibold text-green-700">
              <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Valid claim link
            </span>
          </div>
          <h1 className="text-2xl font-extrabold text-primary sm:text-3xl">
            Claim {business.business_name}
          </h1>
          <p className="mt-2 text-sm text-foreground/60">
            We&apos;ve set up a Mountain Connects listing for {business.business_name}
            {resortName ? ` at ${resortName}` : ""}. Create your account below to take ownership and start managing it.
          </p>

          {/* Listing preview */}
          {jobs && jobs.length > 0 && (
            <div className="mt-6 rounded-xl border border-accent/50 bg-accent/10 p-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-foreground/50 mb-3">
                Your listing{jobs.length > 1 ? "s" : ""}
              </p>
              <div className="space-y-3">
                {jobs.map((j) => (
                  <div key={j.id} className="border-b border-accent/40 pb-3 last:border-0 last:pb-0">
                    <p className="text-sm font-bold text-primary">{j.title}</p>
                    <p className="mt-1 text-xs text-foreground/60 line-clamp-2">{j.description}</p>
                    {j.source && (
                      <p className="mt-1 text-[11px] text-foreground/40">
                        Sourced from {j.source}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="mt-8 border-t border-accent/40 pt-8">
            <ClaimForm
              claimToken={token}
              businessName={business.business_name}
              defaultEmail={business.email || ""}
            />
          </div>
        </div>

        <p className="mt-6 text-center text-xs text-foreground/50">
          Not your listing? Ignore this link — it won&apos;t do anything unless you complete the form above.
        </p>
      </div>
    </div>
  );
}

function ClaimError({
  title,
  message,
  action,
}: {
  title: string;
  message: string;
  action?: { label: string; href: string };
}) {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="max-w-md w-full rounded-2xl border border-accent bg-white p-8 shadow-sm text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-amber-100">
          <svg className="h-7 w-7 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
          </svg>
        </div>
        <h1 className="mt-4 text-xl font-bold text-primary">{title}</h1>
        <p className="mt-2 text-sm text-foreground/60">{message}</p>
        <div className="mt-6 flex items-center justify-center gap-2">
          {action && (
            <Link
              href={action.href}
              className="rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-white hover:bg-primary/90"
            >
              {action.label}
            </Link>
          )}
          <Link
            href="/"
            className="rounded-xl border border-accent px-5 py-2.5 text-sm font-semibold text-foreground/60 hover:bg-accent/20"
          >
            Go to home
          </Link>
        </div>
      </div>
    </div>
  );
}
