import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Metadata } from "next";

interface PageProps {
  params: Promise<{ token: string }>;
}

export const metadata: Metadata = {
  title: "Unsubscribed — Mountain Connects",
  robots: { index: false, follow: false },
};

/**
 * /unsubscribe/[token]
 *
 * Public, no-auth unsubscribe landing. Each outreach email's footer
 * link points here with the lead's per-row token. Hitting the page
 * marks the lead as unsubscribed so the drip cron stops emailing.
 *
 * No POST or confirmation step on purpose — one-click unsubscribe is
 * the legal/anti-spam standard, and adding friction here just gets
 * complaints filed instead.
 */
export default async function UnsubscribePage({ params }: PageProps) {
  const { token } = await params;
  const admin = createAdminClient();

  // Look up the lead by token. We update only if currently active so a
  // refresh doesn't overwrite a `signed_up` status — but we still show
  // the success page either way so we never reveal whether the token
  // matched a real lead (anti-enumeration).
  const { data: lead } = await admin
    .from("outreach_leads")
    .select("id, business_name, status")
    .eq("unsubscribe_token", token)
    .maybeSingle();

  if (lead && lead.status === "active") {
    await admin
      .from("outreach_leads")
      .update({
        status: "unsubscribed",
        unsubscribed_at: new Date().toISOString(),
      })
      .eq("id", lead.id);
  }

  return (
    <main className="mx-auto flex min-h-[60vh] max-w-xl flex-col items-center justify-center px-6 py-16 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-50 text-3xl">
        ✓
      </div>
      <h1 className="mt-6 text-2xl font-bold text-primary sm:text-3xl">
        You've been unsubscribed
      </h1>
      <p className="mt-3 text-sm leading-relaxed text-foreground/60 sm:text-base">
        We won't email you again from our outreach campaigns. If you change your
        mind, you can always sign up directly on Mountain Connects to list jobs
        or get featured.
      </p>
      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <Link
          href="/"
          className="rounded-xl border border-accent bg-white px-5 py-2.5 text-sm font-semibold text-primary transition-colors hover:border-secondary/50 hover:bg-secondary/5"
        >
          Back to Mountain Connects
        </Link>
        <Link
          href="/signup"
          className="rounded-xl bg-secondary px-5 py-2.5 text-sm font-semibold text-white transition-all hover:bg-secondary-light hover:shadow-lg hover:shadow-secondary/20"
        >
          List your business
        </Link>
      </div>
    </main>
  );
}
