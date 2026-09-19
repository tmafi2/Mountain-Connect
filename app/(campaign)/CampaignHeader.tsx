import Image from "next/image";
import { BrowseJobsLink, SignupLink } from "./CampaignLinks";

/**
 * Deliberately thin. A paid visitor gets the brand, a way to browse jobs and a
 * way to sign up — not the site's full navigation, which offers a dozen ways
 * off the page. The logo is not a link for the same reason. On phones even
 * "Browse jobs" goes, leaving one button.
 */
export default function CampaignHeader() {
  return (
    <header className="absolute inset-x-0 top-0 z-20">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4 sm:h-20 sm:px-6">
        <div className="flex min-w-0 items-center gap-2.5">
          <Image
            src="/images/logo-source.png"
            alt=""
            width={36}
            height={36}
            loading="eager"
            className="h-9 w-9 shrink-0 rounded-md"
          />
          <span className="truncate text-base font-bold tracking-tight text-white sm:text-lg">Mountain Connects</span>
        </div>
        <nav aria-label="Get started" className="flex shrink-0 items-center gap-5">
          <BrowseJobsLink
            placement="header"
            className="hidden rounded-md py-2 text-sm font-semibold text-white/85 underline-offset-4 transition hover:text-white hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-highlight sm:inline-block"
          >
            Browse jobs
          </BrowseJobsLink>
          <SignupLink
            placement="header"
            className="inline-flex min-h-11 items-center rounded-md bg-white px-4 text-sm font-extrabold text-primary transition hover:bg-highlight focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-highlight"
          >
            Sign up
          </SignupLink>
        </nav>
      </div>
    </header>
  );
}
