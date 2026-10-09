import type { Metadata } from "next";
import { defaultOgImage } from "@/lib/seo";
import FinalCta from "./FinalCta";
import Hero from "./Hero";
import HowItWorks from "./HowItWorks";
import LandingInit from "./LandingInit";
import SeasonQuiz from "./SeasonQuiz";
import StorySection from "./StorySection";
import { countriesWithLiveJobs } from "@/lib/jobs/live-countries";
import { getCountryJobStats } from "@/lib/stats/country-job-stats";

/**
 * Landing page for the "Go For A Season" Meta campaign:
 *   ad → this page → Find My Season (3 taps) → worker signup.
 *
 * Static and cached, so a burst of paid traffic costs nothing per visit. The
 * one query below only decides where "Browse jobs first" points, and is
 * refreshed every ten minutes.
 */
export const revalidate = 600;

const PAGE_URL = "https://www.mountainconnects.com/go-for-a-season";
const TITLE = "Go For A Season";
const DESCRIPTION =
  "Find seasonal jobs in mountain towns around the world. Discover where your next season could take you with Mountain Connects.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: PAGE_URL },
  openGraph: {
    title: `${TITLE} | Mountain Connects`,
    description: DESCRIPTION,
    url: PAGE_URL,
    siteName: "Mountain Connects",
    type: "website",
    images: [defaultOgImage],
  },
  twitter: {
    card: "summary_large_image",
    title: `${TITLE} | Mountain Connects`,
    description: DESCRIPTION,
    images: [defaultOgImage.url],
  },
};

export default async function GoForASeasonPage() {
  // Canada is the campaign's market and the bigger half of the board; the
  // hero's proof line is counted, never written down.
  const [countriesWithJobs, canadaStats] = await Promise.all([
    countriesWithLiveJobs(),
    getCountryJobStats("Canada"),
  ]);

  return (
    <>
      <LandingInit />
      <Hero stats={canadaStats} />
      <SeasonQuiz countriesWithJobs={countriesWithJobs} />
      <StorySection />
      <HowItWorks />
      <FinalCta />
    </>
  );
}
