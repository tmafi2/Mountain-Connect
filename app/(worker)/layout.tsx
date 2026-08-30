import type { Metadata } from "next";
import WorkerLayoutShell from "./WorkerLayoutShell";

/**
 * Titles and crawler policy for every worker-portal page.
 *
 * Unlike the business and admin portals, worker routes sit directly under the
 * route group (/dashboard, /applications, …) with no shared subdirectory to
 * hang a layout on — so the metadata has to live on the group layout itself.
 * That layout was a client component and could not export any, which is why
 * all 16 pages inherited the public job-search title. The interactive part
 * moved to WorkerLayoutShell unchanged; this file only adds the metadata.
 *
 * `noindex` because every page here is for a signed-in worker. That includes
 * /employers/{slug}, which is reachable anonymously and still renders seed
 * data — it should not be in an index either.
 *
 * The `default` deliberately carries NO " | Mountain Connects" suffix: the
 * root layout's template appends it, and spelling it out here produced
 * "My Account | Mountain Connects | Mountain Connects". The `template`
 * below is what child pages use, so their own titles are suffixed once.
 */
export const metadata: Metadata = {
  title: {
    default: "My Account",
    template: "%s | Mountain Connects",
  },
  robots: { index: false, follow: false },
};

export default function WorkerLayout({ children }: { children: React.ReactNode }) {
  return <WorkerLayoutShell>{children}</WorkerLayoutShell>;
}
