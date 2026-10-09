import Image from "next/image";
import { BTN_GHOST, BTN_PRIMARY } from "../buttons";
import { BrowseJobsLink, FindMySeasonButton } from "../CampaignLinks";
import { HERO, IMAGES } from "./content";
import { NO_COUNTRY_STATS, type CountryJobStats } from "@/lib/stats/country-job-stats";

/**
 * Sells the idea before anything else: no form, one button. On short screens
 * (`short:`, see globals.css) the content moves to the top and tightens up,
 * because the cookie banner covers the bottom of a phone on a first visit —
 * which, for paid traffic, is every visit — and the button must clear it.
 */
export default function Hero({ stats = NO_COUNTRY_STATS }: { stats?: CountryJobStats }) {
  // No invented numbers and no "—": at zero the proof line is simply not
  // rendered. A build-time prerender has no Supabase keys, so zero is a state
  // that really happens, and a dash on an advert reads as broken.
  const proof =
    stats.liveJobs > 0 && stats.withAccommodation > 0
      ? HERO.proof
          .replace("{jobs}", stats.liveJobs.toLocaleString("en-GB"))
          .replace("{accommodation}", stats.withAccommodation.toLocaleString("en-GB"))
      : null;
  // Only filter the board when we actually counted; otherwise send them to all
  // of it rather than to a filter that might be empty.
  const jobsHref = proof ? "/jobs?country=Canada&accommodation=yes" : "/jobs";
  return (
    <section
      aria-labelledby="gfas-hero-heading"
      className="relative isolate flex min-h-[min(100svh,58rem)] items-center overflow-hidden short:items-start"
    >
      <Image
        src={IMAGES.hero.src}
        alt={IMAGES.hero.alt}
        fill
        priority
        sizes="100vw"
        className="-z-20 object-cover motion-safe:animate-[heroSettle_16s_cubic-bezier(0.16,1,0.3,1)_both]"
        style={{ objectPosition: IMAGES.hero.position }}
      />
      {/* Navy wash — heavy at the top for the header, lighter through the
          middle so the photo still reads, solid at the bottom where the hero
          runs into the quiz. The side wash keeps the headline legible on
          desktop, where the text sits over the left of the photo. */}
      <div aria-hidden="true" className="absolute inset-0 -z-10 bg-gradient-to-b from-primary/80 via-primary/45 to-primary" />
      <div aria-hidden="true" className="absolute inset-0 -z-10 bg-gradient-to-r from-primary/70 via-primary/25 to-transparent" />

      <div className="mx-auto w-full max-w-6xl px-4 pb-16 pt-24 sm:px-6 sm:pb-24 short:pt-20">
        <h1
          id="gfas-hero-heading"
          className="font-display text-[clamp(5.25rem,25vw,11rem)] uppercase leading-[0.84] text-white short:text-[clamp(4.25rem,20vw,9rem)]"
        >
          <span className="block whitespace-nowrap">{HERO.headingLines[0]}</span>
          {/* Outlined, like "SEASON!" on the ad creative. */}
          <span className="block whitespace-nowrap text-transparent [-webkit-text-stroke:2px_#fff]">
            {HERO.headingLines[1]}
          </span>
        </h1>
        <p className="mt-5 text-2xl font-extrabold tracking-tight text-white sm:text-3xl short:mt-3">{HERO.subheading}</p>
        {proof && (
          <p className="mt-3 max-w-lg text-lg font-bold leading-snug text-white sm:text-xl short:mt-2">{proof}</p>
        )}
        <p className="mt-2 max-w-md text-base leading-relaxed text-white/85 sm:text-lg">{HERO.body}</p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center short:mt-5">
          <BrowseJobsLink placement="hero" href={jobsHref} className={`${BTN_PRIMARY} w-full max-w-xs sm:w-auto`}>
            {HERO.jobsCta}
            <svg aria-hidden="true" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </BrowseJobsLink>
          <FindMySeasonButton placement="hero" className={`${BTN_GHOST} w-full max-w-xs sm:w-auto`}>
            {HERO.cta}
          </FindMySeasonButton>
        </div>
        <p className="mt-3 text-sm font-medium text-white/80">{HERO.support}</p>
      </div>

      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-6 hidden justify-center sm:flex">
        <svg className="h-6 w-6 text-white/60 motion-safe:animate-bounce" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </div>
    </section>
  );
}
