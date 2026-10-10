/**
 * Every word and photo on /go-for-a-season, in one place, so the campaign can
 * be edited without touching layout code. The quiz questions and options live
 * in lib/campaigns/season-quiz.ts, because signup and onboarding read them too.
 */

/**
 * PHOTOS — these are placeholders: stock shots already used elsewhere on the
 * site. The Meta ads use your own candid photos (friends in the snow, "Find
 * your people"), and the page will convert better when it shows the people the
 * ad did. To swap one: put the file in public/images/go-for-a-season/, set
 * `src` to "/images/go-for-a-season/<file>.jpg", and rewrite `alt` to describe
 * the new photo. `position` is the focal point kept in frame when a phone crops
 * a landscape photo to portrait.
 */
export const IMAGES = {
  hero: {
    src: "https://images.unsplash.com/photo-1605540436563-5bca919ae766?w=2400&q=80",
    alt: "Three skiers in bright retro ski suits carving down a groomed run, with snowy peaks behind them",
    position: "72% 60%",
  },
  story: {
    src: "https://images.unsplash.com/photo-1551524559-8af4e6624178?w=2000&q=80",
    alt: "A skier mid-jump against a clear sky above the mountains",
    position: "78% 35%",
  },
  finale: {
    src: "https://images.unsplash.com/photo-1519681393784-d120267933ba?w=2400&q=80",
    alt: "Snow-covered mountains under a starry night sky",
    position: "50% 60%",
  },
} as const;

/**
 * ⚠️ `proof` IS THE ONLY PLACE ON THIS PAGE THAT SAYS THE JOBS EXIST, and its
 * numbers are counted live — never typed in. /about carried hardcoded figures
 * for five months and understated the platform the whole time; see
 * lib/stats/platform-stats.ts. `body` is kept as the line underneath because
 * it sets the tone, but on its own it is atmosphere: a cold visitor learned
 * nothing from it, and 88% left before touching the quiz.
 *
 * The heading stays. "Go for a Season." is the ad creative's own line and
 * League Gothic was loaded for this route to carry it — the problem was never
 * the headline, it was that nothing underneath proved there was anything here.
 */
export const HERO = {
  headingLines: ["Go for a", "Season."],
  subheading: "See where it takes you.",
  /** `{jobs}` and `{accommodation}` are filled from live counts, or the whole
   *  line is dropped when we could not count. Never a remembered number. */
  // ⚠️ "say they include" rather than "come with". Since migration 00115
  // `accommodation_included` is tri-state and the count is what adverts
  // STATE — 139 of 355 open listings, with 207 silent on it. "Come with" was
  // a claim about the jobs; this is a claim about the adverts, which is the
  // only one the data supports. It is also still the stronger, truer line:
  // the number is a floor, not a ceiling.
  proof: "{jobs} ski resort jobs in Canada. {accommodation} say they include staff accommodation.",
  body: "Seasonal jobs. Mountain towns. New people. New places.",
  /** The primary action. People have been choosing jobs over a profile 30 to 3
   *  on the result screen; this offers that at the top, where the loss is. */
  jobsCta: "See the jobs",
  cta: "Find my season",
  support: "Free for workers · Takes about 20 seconds",
} as const;

/**
 * Three lines here differ from the campaign brief, deliberately. The brief
 * said workers "get discovered by businesses looking for workers like you",
 * listed "Get discovered by employers" as a benefit, and described "a free
 * worker profile businesses can discover". Businesses cannot browse worker
 * profiles: migration 00085 limits them to workers who applied to, messaged or
 * followed them, and the privacy policy tells workers exactly that. If worker
 * discovery is ever built, these are the lines to restore — RESULT.body,
 * RESULT.benefits[1] and HOW_IT_WORKS.steps[1].body.
 *
 * Nor may anything say the profile is what you APPLY with. On 2026-09-19, 248
 * of the 253 live listings belonged to unclaimed, imported businesses; those
 * take an anonymous apply form (name, email, message), not the worker's
 * profile, and have nobody to message. "Apply with one profile" was true for
 * 2% of the board. What holds for every listing: find jobs, apply straight
 * from the listing, save jobs to an account, free for workers. The ratio
 * shifts as businesses claim — re-count before strengthening these lines.
 */
export const RESULT = {
  subheading: "Your next season starts here.",
  body: "Create your free Mountain Connects worker profile to discover seasonal jobs and apply to the ones you like.",
  benefits: ["Find seasonal jobs", "Apply straight from the listing", "Keep your season search in one place"],
  primaryCta: "Create my free profile",
  secondaryCta: "Browse jobs first",
  changeAnswers: "Change answers",
} as const;

export const STORY = {
  heading: "One season can change a lot.",
  lead: "A new job. A new mountain. A new group of mates. A completely different way of living.",
  body: "Mountain Connects helps seasonal workers find opportunities and mountain communities around the world.",
  cta: "Find my season",
} as const;

export const HOW_IT_WORKS = {
  heading: "Your season starts here.",
  steps: [
    {
      title: "Find your season",
      body: "Explore where you want to go and what kind of work you're looking for.",
    },
    {
      title: "Create your profile",
      body: "It's free, and it keeps every job you save in one place.",
    },
    {
      title: "Make it happen",
      body: "Find seasonal jobs and start planning your next adventure.",
    },
  ],
} as const;

export const FINAL = {
  headingLines: ["Don’t just think about it.", "Go for a season."],
  body: "Your next season could start with one profile.",
  primaryCta: "Create my free profile",
  secondaryCta: "Browse jobs",
} as const;
