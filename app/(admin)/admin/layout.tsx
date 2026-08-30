import type { Metadata } from "next";

/**
 * Titles and crawler policy for every /admin/* page.
 *
 * Same reasoning as the business portal: app/(admin)/layout.tsx is a client
 * component and cannot export metadata, so all 19 admin pages inherited the
 * public job-search title from app/layout.tsx. This server layout sits
 * between them and fixes it in one place.
 *
 * `noindex` belt-and-braces. Middleware already gates /admin on the admin
 * role and robots.txt disallows it, but a meta tag is the one signal that
 * survives a crawler ignoring robots.txt.
 *
 * The `default` deliberately carries NO " | Mountain Connects" suffix: the
 * root layout's template appends it, and spelling it out here produced
 * "Admin | Mountain Connects | Mountain Connects". The `template`
 * below is what child pages use, so their own titles are suffixed once.
 */
export const metadata: Metadata = {
  title: {
    default: "Admin",
    template: "%s | Admin | Mountain Connects",
  },
  robots: { index: false, follow: false },
};

export default function AdminPortalLayout({ children }: { children: React.ReactNode }) {
  return children;
}
