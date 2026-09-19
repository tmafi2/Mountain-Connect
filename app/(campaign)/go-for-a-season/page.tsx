import type { Metadata } from "next";
import { defaultOgImage } from "@/lib/seo";
import { createPublicClient } from "@/lib/supabase/public";
import { withTimeout } from "@/lib/utils/with-timeout";
import FinalCta from "./FinalCta";
import Hero from "./Hero";
import HowItWorks from "./HowItWorks";
import LandingInit from "./LandingInit";
import SeasonQuiz from "./SeasonQuiz";
import StorySection from "./StorySection";

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

/**
 * Countries with at least one live job, spelled as resorts.country spells
 * them. A visitor who picks one of these gets "Browse jobs first" filtered to
 * it; anyone else gets the full board, never an empty filter. Fails open to
 * the full board: this must never be what stops the page rendering.
 */
async function countriesWithLiveJobs(): Promise<string[]> {
  try {
    const [result, timedOut] = await withTimeout(
      Promise.resolve(createPublicClient().from("job_posts").select("resorts(country)").eq("status", "active")),
      5000,
    );
    if (timedOut || !result || result.error || !result.data) return [];
    // job_posts → resorts is many-to-one, so PostgREST returns one object;
    // without generated types supabase-js assumes an array. Accept both.
    type ResortRef = { country: string | null } | null;
    const countries = new Set<string>();
    for (const row of result.data as unknown as Array<{ resorts: ResortRef | ResortRef[] }>) {
      const resort = Array.isArray(row.resorts) ? row.resorts[0] : row.resorts;
      if (resort?.country) countries.add(resort.country);
    }
    return [...countries].sort();
  } catch {
    return [];
  }
}

export default async function GoForASeasonPage() {
  const countriesWithJobs = await countriesWithLiveJobs();

  return (
    <>
      <LandingInit />
      <Hero />
      <SeasonQuiz countriesWithJobs={countriesWithJobs} />
      <StorySection />
      <HowItWorks />
      <FinalCta />
    </>
  );
}
