"use client";

import { useState } from "react";
import type { ConfirmType } from "@/lib/auth/confirm-link";

// A plain form POST, so it works without JavaScript and inside in-app
// browsers. The guard only stops a double tap from sending a second request
// that would find the link already used.
export default function ConfirmForm({
  tokenHash,
  type,
  label,
}: {
  tokenHash: string;
  type: ConfirmType;
  label: string;
}) {
  const [sending, setSending] = useState(false);

  return (
    <form
      method="post"
      action="/api/auth/confirm"
      className="mt-6"
      onSubmit={(e) => {
        if (sending) {
          e.preventDefault();
          return;
        }
        setSending(true);
      }}
    >
      <input type="hidden" name="token_hash" value={tokenHash} />
      <input type="hidden" name="type" value={type} />
      <button
        type="submit"
        aria-disabled={sending}
        className="w-full rounded-xl bg-primary py-3 text-sm font-bold text-white shadow-lg shadow-primary/20 transition-all hover:bg-primary/90 hover:shadow-xl hover:shadow-primary/25 aria-disabled:opacity-60"
      >
        {sending ? "One moment..." : label}
      </button>
    </form>
  );
}
