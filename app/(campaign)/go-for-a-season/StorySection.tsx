import Image from "next/image";
import { BTN_PRIMARY } from "../buttons";
import { FindMySeasonButton } from "../CampaignLinks";
import { IMAGES, STORY } from "./content";

/** For the visitor who scrolls past the quiz: the feeling, then back up to it. */
export default function StorySection() {
  return (
    <section aria-labelledby="gfas-story-heading" className="bg-primary">
      <div className="relative isolate flex h-[64svh] min-h-[26rem] max-h-[46rem] items-end overflow-hidden">
        <Image
          src={IMAGES.story.src}
          alt={IMAGES.story.alt}
          fill
          sizes="100vw"
          className="-z-20 object-cover"
          style={{ objectPosition: IMAGES.story.position }}
        />
        <div aria-hidden="true" className="absolute inset-0 -z-10 bg-gradient-to-b from-primary/10 via-primary/30 to-primary" />
        <div className="mx-auto w-full max-w-6xl px-4 pb-6 sm:px-6 sm:pb-10">
          <h2
            id="gfas-story-heading"
            className="max-w-4xl text-balance font-display text-[clamp(3.5rem,15vw,8.5rem)] uppercase leading-[0.86] text-white"
          >
            {STORY.heading}
          </h2>
        </div>
      </div>
      <div className="mx-auto max-w-6xl px-4 pb-20 pt-4 sm:px-6 sm:pb-28">
        <p className="max-w-2xl text-xl font-bold leading-snug text-white sm:text-2xl">{STORY.lead}</p>
        <p className="mt-4 max-w-xl text-base leading-relaxed text-white/80 sm:text-lg">{STORY.body}</p>
        <FindMySeasonButton placement="story" className={`${BTN_PRIMARY} mt-8 w-full max-w-xs sm:w-auto`}>
          {STORY.cta}
        </FindMySeasonButton>
      </div>
    </section>
  );
}
