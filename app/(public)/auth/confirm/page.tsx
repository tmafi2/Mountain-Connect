import type { Metadata } from "next";
import Link from "next/link";
import { parseConfirmParams } from "@/lib/auth/confirm-link";
import ConfirmForm from "./ConfirmForm";

export const metadata: Metadata = {
  title: "Confirm your email",
  robots: { index: false, follow: false },
};

// Where the signup and password-reset emails link to. Loading this page uses
// nothing up, so a mail scanner that fetches the link does no harm; the
// button does the verifying (see lib/auth/confirm-link.ts).
export default async function ConfirmEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ token_hash?: string; type?: string }>;
}) {
  const params = parseConfirmParams(await searchParams);
  const isRecovery = params?.type === "recovery";

  return (
    <div className="flex min-h-[70vh] items-center justify-center px-6 py-16">
      <div className="w-full max-w-md rounded-2xl border border-accent bg-white p-8 text-center shadow-sm">
        {params ? (
          <>
            <h1 className="text-2xl font-extrabold text-primary">
              {isRecovery ? "Reset your password" : "Confirm your email"}
            </h1>
            <p className="mt-2 text-sm text-foreground/60">
              {isRecovery
                ? "Tap below to choose a new password."
                : "Tap below to finish creating your Mountain Connects account."}
            </p>
            <ConfirmForm
              tokenHash={params.tokenHash}
              type={params.type}
              label={isRecovery ? "Continue" : "Confirm my email"}
            />
          </>
        ) : (
          <>
            <h1 className="text-2xl font-extrabold text-primary">This link isn&apos;t complete</h1>
            <p className="mt-2 text-sm text-foreground/60">
              Open the button in your email again, or log in if you&apos;ve already confirmed.
            </p>
            <Link
              href="/login"
              className="mt-6 inline-block w-full rounded-xl bg-primary py-3 text-sm font-bold text-white"
            >
              Go to log in
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
