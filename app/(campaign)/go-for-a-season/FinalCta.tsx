import Image from "next/image";
import { BTN_GHOST, BTN_PRIMARY_XL } from "../buttons";
import { BrowseJobsLink, SignupLink } from "../CampaignLinks";
import { FINAL, IMAGES } from "./content";

export default function FinalCta() {
  return (
    <section aria-labelledby="gfas-final-heading" className="relative isolate overflow-hidden bg-primary py-24 text-center sm:py-32">
      <Image
        src={IMAGES.finale.src}
        alt={IMAGES.finale.alt}
        fill
        sizes="100vw"
        className="-z-20 object-cover"
        style={{ objectPosition: IMAGES.finale.position }}
      />
      <div aria-hidden="true" className="absolute inset-0 -z-10 bg-gradient-to-b from-primary via-primary/60 to-primary" />
      <div className="mx-auto max-w-4xl px-4 sm:px-6">
        <h2
          id="gfas-final-heading"
          className="text-balance font-display text-[clamp(3.25rem,13.5vw,7.5rem)] uppercase leading-[0.88] text-white"
        >
          <span className="block">{FINAL.headingLines[0]}</span>
          <span className="block text-highlight">{FINAL.headingLines[1]}</span>
        </h2>
        <p className="mx-auto mt-5 max-w-md text-balance text-lg leading-relaxed text-white/85">{FINAL.body}</p>
        <div className="mx-auto mt-9 flex max-w-sm flex-col gap-3 sm:max-w-none sm:flex-row sm:justify-center">
          <SignupLink placement="final" className={BTN_PRIMARY_XL}>
            {FINAL.primaryCta}
          </SignupLink>
          <BrowseJobsLink placement="final" className={BTN_GHOST}>
            {FINAL.secondaryCta}
          </BrowseJobsLink>
        </div>
      </div>
    </section>
  );
}
