import type { Metadata } from "next";

/**
 * Titles and crawler policy for every /business/* portal page.
 *
 * The portal's own layout — app/(business)/layout.tsx — is a client component
 * and cannot export metadata, and none of the 19 pages beneath it could
 * either, so all of them fell through to the site-wide default in
 * app/layout.tsx. A business managing its listings saw a tab reading "Ski
 * Resort Jobs — Seasonal Winter Work Worldwide", the public job-search title.
 * This layout sits between the two and is a server component, so it can.
 *
 * `noindex` because every page here is for a signed-in business. Four of them
 * (upgrade, venues, referrals, admin) are not in the middleware's protected
 * list, so they answer an anonymous request with a 200 and render their shell
 * — this makes sure that shell is never indexed regardless.
 *
 * The public /business/{id} profile pages live in app/(public)/, a different
 * segment, and are unaffected.
 *
 * The `default` deliberately carries NO " | Mountain Connects" suffix: the
 * root layout's template appends it, and spelling it out here produced
 * "Business Portal | Mountain Connects | Mountain Connects". The `template`
 * below is what child pages use, so their own titles are suffixed once.
 */
export const metadata: Metadata = {
  title: {
    default: "Business Portal",
    template: "%s | Mountain Connects",
  },
  robots: { index: false, follow: false },
};

export default function BusinessPortalLayout({ children }: { children: React.ReactNode }) {
  return children;
}
