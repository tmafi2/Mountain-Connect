import Link from "next/link";
import type { Metadata } from "next";
import { defaultOgImage } from "@/lib/seo";
import { getPerksByResort } from "@/lib/stats/perks-by-resort.server";
import { MIN_LISTINGS } from "@/lib/stats/figures";
import {
  bestForPasses,
  mealsState,
  passState,
  publishablePerks,
  type PerkState,
  type ResortPerks,
} from "@/lib/stats/perks-by-resort";

/**
 * "Do ski resort jobs include a free season pass?" — the third AEO data page.
 *
 * ⚠️ THIS PAGE COUNTS ADVERTS, NOT JOBS, AND SAYS SO REPEATEDLY — which is
 * still true after migration 00114, but for a better reason than before.
 *
 * `ski_pass_included` and `meal_perks` used to be `NOT NULL DEFAULT false`
 * with the import route omitting the field on silence, so a `false` could not
 * be told apart from "never mentioned". 00114 made them tri-state and
 * `scripts/backfill-pass-and-meals.ts --rebuild` re-read every advert.
 *
 * ⚠️ THAT REBUILD FOUND THE CONFIRMATIONS WERE WRONG TOO. 12 pass and 21 meal
 * `true` values were not supported by their advert at all — the original
 * seventeen-field extraction had been inferring perks from context rather
 * than reading them. The headline was overstated by about a fifth before it
 * was corrected.
 *
 * So the figures are now accurate, and the framing still holds: a listing
 * that says nothing is silent, not negative. 308 of 355 do not mention a pass
 * and NOT ONE says a pass is withheld. "13% say a pass is included" is
 * publishable; "87% do not include a pass" is not, and `perks-by-resort.ts`
 * offers no field that would produce it.
 *
 * ⚠️ NO FIRST-HAND TIP — Tyler's to write, as on the other two pages.
 */

const BASE_URL = "https://www.mountainconnects.com";
const PATH = "/ski-pass-and-meals";

// Required by lib/stats: `revalidate` still prerenders at build time, where
// Vercel withholds the Sensitive Supabase keys and every count returns empty.
export const dynamic = "force-dynamic";

const TITLE = "Do Ski Resort Jobs Include a Free Season Pass?";

export async function generateMetadata(): Promise<Metadata> {
  const { totals } = await getPerksByResort();
  // ⚠️ Falls back to NO FIGURE, never a remembered one.
  const detail =
    totals.pctSaysPass !== null
      ? ` ${totals.saysPass} of ${totals.listings} open listings (${totals.pctSaysPass}%) say a pass is included.`
      : "";
  const description = `How often ski resort job adverts actually offer a season pass or staff meals, counted from open listings.${detail} Most adverts do not mention either — which is not the same as a no.`;

  return {
    title: TITLE,
    description,
    alternates: { canonical: `${BASE_URL}${PATH}` },
    openGraph: {
      title: TITLE,
      description,
      url: `${BASE_URL}${PATH}`,
      siteName: "Mountain Connects",
      type: "article",
      images: [defaultOgImage],
    },
    twitter: { card: "summary_large_image", title: TITLE, description, images: [defaultOgImage.url] },
  };
}

function updatedOn(iso: string): string {
  const d = iso ? new Date(iso) : new Date();
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
}

/**
 * ⚠️ "none" RENDERS AS "No listing says", never as "No pass".
 * The second is a claim about the jobs; only the first is a claim about the
 * data we have.
 */
function PerkCell({ state }: { state: PerkState }) {
  if (state.kind === "quoted") {
    return (
      <span>
        <strong className="text-primary">{state.pct}%</strong>
        <span className="block text-xs text-foreground/50">
          {state.count} of {state.jobCount} say so
        </span>
      </span>
    );
  }
  if (state.kind === "some") {
    return (
      <span className="text-foreground/70">
        {state.count} {state.count === 1 ? "listing" : "listings"}
        <span className="block text-xs text-foreground/50">of {state.jobCount} — too few for a share</span>
      </span>
    );
  }
  return (
    <span className="text-foreground/40">
      No listing says
      <span className="block text-xs">of {state.jobCount}</span>
    </span>
  );
}

export default async function SkiPassAndMealsPage() {
  const { resorts, totals, generatedAt } = await getPerksByResort();
  const rows = publishablePerks(resorts);
  const best = bestForPasses(resorts, 2);
  const updated = updatedOn(generatedAt);

  const faqs: { q: string; a: string }[] = [
    {
      q: "Do ski resort jobs include a free season pass?",
      a:
        totals.pctSaysPass !== null
          ? `Fewer adverts say so than most people expect. ${totals.saysPass} of ${totals.listings} open listings — ${totals.pctSaysPass}% — state that a season or lift pass is included. The other ${totals.silentOnPass} do not mention a pass at all, which is not the same as saying there isn't one. Not a single advert on the board explicitly says a pass is withheld.`
          : `We count this from what open listings actually say. Right now there are not enough open listings to publish a reliable share.`,
    },
    {
      q: "Which resorts most often offer a pass?",
      a: best.length
        ? `${best
            .map((r) => `${r.resort}, where ${r.pctSaysPass}% of open listings say so (${r.saysPass} of ${r.jobCount})`)
            .join(", and ")}. Elsewhere, too few adverts mention a pass to give a meaningful share — the table shows the raw counts instead.`
        : `No resort currently has enough listings mentioning a pass to publish a share. The table shows the raw counts.`,
    },
    {
      q: "Are staff meals included?",
      a:
        totals.pctSaysMeals !== null
          ? `${totals.saysMeals} of ${totals.listings} open listings (${totals.pctSaysMeals}%) say meals or staff food are included — slightly more often than a pass. ${totals.saysEither} listings offer at least one of the two.`
          : `Not enough open listings mention meals to publish a share yet.`,
    },
    {
      q: "If a listing doesn't mention a pass, does that mean there isn't one?",
      a: `No, and this is the most important thing on this page. ${totals.silentOnPass} of the ${totals.listings} open listings do not mention a pass at all — they are silent, not negative, and none of them says a pass is withheld. Plenty of employers hand out a staff pass without putting it in the advert. Ask before you accept; a season pass is worth more than a small difference in hourly pay.`,
    },
    {
      q: "Where do these figures come from?",
      a: `They are counted from job listings open on Mountain Connects on ${updated}. A share is only shown where at least ${MIN_LISTINGS} listings support it, and every figure counts what adverts SAY rather than what jobs include — we have no way to know the second.`,
    },
  ];

  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map(({ q, a }) => ({
      "@type": "Question",
      name: q,
      acceptedAnswer: { "@type": "Answer", text: a },
    })),
  };

  const articleJsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: TITLE,
    description: `How often ski resort job adverts offer a season pass or staff meals. Counted from ${totals.listings} open listings.`,
    datePublished: "2026-10-10",
    dateModified: generatedAt || new Date().toISOString(),
    author: { "@id": `${BASE_URL}/#organization` },
    publisher: { "@id": `${BASE_URL}/#organization` },
    mainEntityOfPage: `${BASE_URL}${PATH}`,
    isAccessibleForFree: true,
  };

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: BASE_URL },
      { "@type": "ListItem", position: 2, name: "Passes and Meals", item: `${BASE_URL}${PATH}` },
    ],
  };

  return (
    <div className="min-h-screen bg-background">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />

      <div className="mx-auto max-w-4xl px-6 py-12">
        <nav className="mb-5 flex items-center gap-2 text-sm text-foreground/50">
          <Link href="/" className="hover:text-primary transition-colors">Home</Link>
          <span>/</span>
          <span className="font-medium text-primary">Passes and Meals</span>
        </nav>

        <h1 className="text-3xl font-extrabold text-primary md:text-4xl">
          Do ski resort jobs include a free season pass?
        </h1>

        {totals.pctSaysPass !== null ? (
          <p className="mt-5 text-lg leading-relaxed text-foreground/80">
            Fewer adverts say so than most people expect.{" "}
            <strong className="text-primary">
              {totals.saysPass} of {totals.listings} open listings ({totals.pctSaysPass}%)
            </strong>{" "}
            state that a season or lift pass is included, and{" "}
            <strong className="text-primary">
              {totals.saysMeals} ({totals.pctSaysMeals}%)
            </strong>{" "}
            state staff meals. Most of the rest simply do not mention either —{" "}
            <strong className="text-primary">which is not the same as a no.</strong>
          </p>
        ) : (
          <p className="mt-5 text-lg leading-relaxed text-foreground/80">
            We count this from what open listings actually say. Right now there are not enough open
            listings to publish a reliable share.
          </p>
        )}

        <p className="mt-4 text-sm text-foreground/50">
          Last updated {updated} · Counted from {totals.listings} open listings
        </p>

        {/* ⚠️ The caveat comes BEFORE the table, not in a footnote. A reader
            shown "16%" will supply the other 84% themselves unless told what
            it is made of. */}
        <div className="mt-8 rounded-2xl border-l-4 border-warm bg-warm/5 p-5">
          <h2 className="font-bold text-primary">What a blank means here</h2>
          <p className="mt-2 leading-relaxed text-foreground/75">
            These figures count what adverts <em>say</em>, not what jobs include. Of the
            open listings, <strong>{totals.silentOnPass}</strong> do not mention a
            pass at all — they are silent, not negative, and none of them says a pass is
            withheld. Plenty of employers hand a staff pass to everyone and never write it down.
          </p>
          <p className="mt-2 leading-relaxed text-foreground/75">
            So read the table as &ldquo;how often it is advertised&rdquo;, and ask the employer
            before you accept. A season pass is worth more than a small difference in hourly pay.
          </p>
        </div>

        <div className="mt-8 overflow-x-auto rounded-2xl border border-accent/40 bg-white shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-accent/40 bg-accent/10 text-xs uppercase tracking-wider text-foreground/60">
              <tr>
                <th className="px-4 py-3 font-semibold">Resort</th>
                <th className="px-4 py-3 font-semibold">Open jobs</th>
                <th className="px-4 py-3 font-semibold">Advertise a pass</th>
                <th className="px-4 py-3 font-semibold">Advertise meals</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-accent/25">
              {rows.map((r: ResortPerks) => (
                <tr key={r.resort} className="align-top">
                  <td className="px-4 py-4">
                    {r.resortId ? (
                      <Link href={`/resorts/${r.resortId}`} className="font-semibold text-secondary hover:underline">
                        {r.resort}
                      </Link>
                    ) : (
                      <span className="font-semibold text-primary">{r.resort}</span>
                    )}
                    <span className="block text-xs text-foreground/50">{r.country}</span>
                  </td>
                  <td className="px-4 py-4 text-foreground/80">{r.jobCount}</td>
                  <td className="px-4 py-4"><PerkCell state={passState(r)} /></td>
                  <td className="px-4 py-4"><PerkCell state={mealsState(r)} /></td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-foreground/50">
                    No resort currently has {MIN_LISTINGS} or more open listings.{" "}
                    <Link href="/jobs" className="text-secondary hover:underline">Browse every open job</Link>.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <p className="mt-3 text-xs text-foreground/50">
          A percentage is only shown where at least {MIN_LISTINGS} listings at that resort say so.
          Below that the raw count is given instead, because a share built from two listings
          describes two employers rather than a resort.
        </p>

        {best.map((r) => (
          <section key={r.resort} className="mt-10">
            <h2 className="text-xl font-bold text-primary">
              Do jobs at {r.resort} come with a season pass?
            </h2>
            <p className="mt-3 leading-relaxed text-foreground/75">
              {r.pctSaysPass}% of open listings at {r.resort} say a pass is included — {r.saysPass}{" "}
              of {r.jobCount}. {r.saysMeals} also mention staff meals, and {r.saysBoth} offer both.
              It is the most commonly advertised perk there after accommodation, which{" "}
              {r.saysHousing} listings mention.
            </p>
            {r.resortId && (
              <Link
                href={`/resorts/${r.resortId}`}
                className="mt-3 inline-block text-sm font-semibold text-secondary hover:underline"
              >
                See {r.resort} jobs and the guide &rarr;
              </Link>
            )}
          </section>
        ))}

        {/* ⚠️ A first-hand note from the founder belongs here — AEO.md's
            template asks for 2-3 sentences. Deliberately empty: writing one on
            his behalf would be an invented testimonial. */}

        <section className="mt-10">
          <h2 className="text-xl font-bold text-primary">Common questions</h2>
          <div className="mt-4 space-y-4">
            {faqs.map((f) => (
              <div key={f.q} className="rounded-xl border border-accent/40 bg-white p-5">
                <h3 className="font-semibold text-primary">{f.q}</h3>
                <p className="mt-2 text-sm leading-relaxed text-foreground/75">{f.a}</p>
              </div>
            ))}
          </div>
        </section>

        <div className="mt-10 flex flex-wrap gap-3">
          <Link
            href="/jobs"
            className="rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-white transition hover:bg-primary/90"
          >
            Browse every open job
          </Link>
          <Link
            href="/staff-housing"
            className="rounded-xl border border-accent px-5 py-3 text-sm font-semibold text-primary transition hover:border-secondary"
          >
            Which resorts include housing?
          </Link>
          <Link
            href="/ski-season-pay"
            className="rounded-xl border border-accent px-5 py-3 text-sm font-semibold text-primary transition hover:border-secondary"
          >
            What they pay
          </Link>
        </div>
      </div>
    </div>
  );
}
