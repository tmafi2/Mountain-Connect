import Link from "next/link";
import type { Metadata } from "next";
import { defaultOgImage } from "@/lib/seo";
import { getHousingByResort } from "@/lib/stats/housing-by-resort.server";
import { MIN_LISTINGS } from "@/lib/stats/figures";
import {
  bestForHousing,
  canDescribeHousing,
  canQuoteCost,
  costState,
  costSummary,
  publishableResorts,
  weeklyCost,
  type ResortHousing,
} from "@/lib/stats/housing-by-resort";

/**
 * "Which ski resorts provide staff housing?" — the second AEO data page.
 *
 * ⚠️ BY RESORT, where /ski-season-pay is by town, and for a dull reason:
 * every listing carries a resort while only 76 of 355 carry a town. Housing
 * is also a property of the employer rather than of the place you live.
 *
 * ⚠️ FREE AND CHARGED HOUSING ARE NEVER AVERAGED. See housing-by-resort.ts —
 * a median across both publishes "free" at a resort where one listing in five
 * still charges.
 *
 * ⚠️ NO FIRST-HAND TIP. AEO.md's template asks for 2-3 sentences from the
 * founder; writing them on his behalf would be an invented testimonial.
 */

const BASE_URL = "https://www.mountainconnects.com";
const PATH = "/staff-housing";

// Required by lib/stats: `revalidate` still prerenders at build time, where
// Vercel withholds the Sensitive Supabase keys and every count comes back
// empty — the page would ship saying no resort offers housing.
export const dynamic = "force-dynamic";

const TITLE = "Which Ski Resorts Provide Staff Housing?";

export async function generateMetadata(): Promise<Metadata> {
  const { resorts } = await getHousingByResort();
  const best = bestForHousing(resorts, 1)[0];
  // ⚠️ Falls back to NO FIGURE. A meta description is where a stale number
  // survives longest, because nobody reads their own meta tags.
  const detail =
    best && best.pctOffering !== null
      ? ` At ${best.resort}, ${best.pctOffering}% of open listings include it.`
      : "";
  const description = `Which ski resorts include staff accommodation, what kind, and what it costs — counted from open job listings.${detail} Sample size shown for every figure.`;

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

function HousingCell({ r }: { r: ResortHousing }) {
  if (!canDescribeHousing(r)) return <span className="text-foreground/40">—</span>;
  return (
    <span>
      <strong className="text-primary">{r.pctOffering}%</strong>
      <span className="block text-xs text-foreground/50">
        {r.offeringCount} of {r.jobCount} say so
      </span>
    </span>
  );
}

function CostCell({ r }: { r: ResortHousing }) {
  // The branch lives in costState, where it is tested — see the note there
  // about the two ways this cell got it wrong.
  const state = costState(r);
  switch (state.kind) {
    case "quoted":
      return (
        <span>
          <strong className="text-primary">{state.cost}</strong>
          <span className="block text-xs text-foreground/50">
            a week · {state.listings} listings state one
          </span>
        </span>
      );
    case "mostly-free":
      return (
        <span className="text-foreground/70">
          Mostly free
          <span className="block text-xs text-foreground/50">
            {state.free} of the {state.stating} that say
          </span>
        </span>
      );
    case "too-few":
      return (
        <span className="text-foreground/40">
          Not enough data
          <span className="block text-xs">
            {state.stating} of {state.jobCount} state a cost
          </span>
        </span>
      );
    default:
      // ⚠️ Says WHY it is blank. "—" alone reads as "housing is free here" to
      // a hopeful reader, which is the opposite of what an empty cell means.
      return (
        <span className="text-foreground/40">
          Not stated<span className="block text-xs">no listing says</span>
        </span>
      );
  }
}

export default async function StaffHousingPage() {
  const { resorts, listingsConsidered, listingsWithCost, generatedAt } = await getHousingByResort();
  const rows = publishableResorts(resorts);
  const best = bestForHousing(resorts, 3);
  const withCost = rows.filter(canQuoteCost);
  const updated = updatedOn(generatedAt);

  const faqs: { q: string; a: string }[] = [
    {
      q: "Do ski resort jobs include accommodation?",
      a: best.length
        ? `It depends far more on the resort than on the role, and more adverts stay silent on it than either offer or refuse it. ${best
            .map((r) => `At ${r.resort}, ${r.pctOffering}% of open listings include it`)
            .join("; ")}. The table above shows every resort with at least ${MIN_LISTINGS} open listings.`
        : `It depends on the resort far more than on the role. Right now no resort has enough open listings to give a reliable share.`,
    },
    {
      q: "Is staff accommodation free?",
      a: withCost.length
        ? `Rarely. Most adverts that mention a cost are charging for it — ${withCost
            .map((r) => `${r.resort} works out at about ${weeklyCost(r)} a week`)
            .join(", ")}. A minority say housing is free outright. Only ${listingsWithCost} of ${listingsConsidered} open listings state a cost at all, so treat a blank as "ask", not as "free".`
        : `Some listings say it is free and some charge, but only ${listingsWithCost} of ${listingsConsidered} open listings state a cost at all — not enough at any single resort to publish a figure. Treat a blank as "ask", not as "free".`,
    },
    {
      q: "Is the rent taken out of my pay?",
      a: `Usually nobody says. Of ${listingsConsidered} open listings, only a handful state whether accommodation is deducted from wages or paid separately, so we cannot publish a share. It is worth asking before you accept: a job paying slightly less with rent deducted can leave you better off than one paying more where you find your own place.`,
    },
    {
      q: "What kind of staff accommodation is it?",
      a: `Most commonly a bed in shared staff housing. Listings that are specific describe shared apartments, private rooms, or a subsidy toward rent you find yourself. The table shows the most common arrangement at each resort where enough listings say.`,
    },
    {
      q: "Where do these figures come from?",
      a: `They are counted from job listings currently open on Mountain Connects — ${listingsConsidered} of them on ${updated}. A figure is only shown where at least ${MIN_LISTINGS} listings support it, costs are never converted between currencies, and free accommodation is counted separately from charged rather than averaged with it.`,
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
    description: `Staff accommodation at ski resorts: which include it, what kind, and what it costs. Counted from ${listingsConsidered} open listings.`,
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
      { "@type": "ListItem", position: 2, name: "Staff Housing", item: `${BASE_URL}${PATH}` },
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
          <span className="font-medium text-primary">Staff Housing</span>
        </nav>

        <h1 className="text-3xl font-extrabold text-primary md:text-4xl">
          Which ski resorts provide staff housing?
        </h1>

        {best.length > 0 ? (
          <p className="mt-5 text-lg leading-relaxed text-foreground/80">
            Staff accommodation depends far more on the resort than on the job.{" "}
            {best.map((r, i) => (
              <span key={r.resort}>
                {i > 0 && (i === best.length - 1 ? " and " : ", ")}
                <strong className="text-primary">{r.resort}</strong> advertises it in{" "}
                <strong className="text-primary">{r.pctOffering}%</strong> of listings (
                {r.offeringCount} of {r.jobCount})
              </span>
            ))}
            . Everywhere else is below that — the table shows every resort with at least{" "}
            {MIN_LISTINGS} open jobs.
          </p>
        ) : (
          <p className="mt-5 text-lg leading-relaxed text-foreground/80">
            We count this from open listings. Right now no resort has {MIN_LISTINGS} or more open
            jobs, so there is no share worth publishing.
          </p>
        )}

        <p className="mt-4 text-sm text-foreground/50">
          Last updated {updated} · Counted from {listingsConsidered} open listings ·{" "}
          {listingsWithCost} of them state what housing costs
        </p>

        <div className="mt-8 overflow-x-auto rounded-2xl border border-accent/40 bg-white shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-accent/40 bg-accent/10 text-xs uppercase tracking-wider text-foreground/60">
              <tr>
                <th className="px-4 py-3 font-semibold">Resort</th>
                <th className="px-4 py-3 font-semibold">Advertise housing</th>
                <th className="px-4 py-3 font-semibold">Usual arrangement</th>
                <th className="px-4 py-3 font-semibold">Cost to you</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-accent/25">
              {rows.map((r) => (
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
                  <td className="px-4 py-4"><HousingCell r={r} /></td>
                  <td className="px-4 py-4 text-foreground/80">
                    {r.commonType ?? <span className="text-foreground/40">Not stated</span>}
                  </td>
                  <td className="px-4 py-4"><CostCell r={r} /></td>
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
          A figure is only shown where at least {MIN_LISTINGS} listings support it. Costs are
          weekly equivalents of whatever the advert quoted, never converted between currencies,
          and listings that say housing is free are counted separately rather than averaged into
          the price.
        </p>

        {/* Per-resort detail, only where there is something real to say. */}
        {rows.filter((r) => costSummary(r) !== null).map((r) => (
          <section key={r.resort} className="mt-10">
            <h2 className="text-xl font-bold text-primary">
              What does staff housing cost at {r.resort}?
            </h2>
            <p className="mt-3 leading-relaxed text-foreground/75">
              Staff accommodation at {r.resort} works out at {costSummary(r)}.{" "}
              {r.pctOffering !== null && (
                <>
                  {r.pctOffering}% of its {r.jobCount} open listings advertise accommodation
                  {r.commonType && <>, usually {r.commonType.toLowerCase()}</>}.
                </>
              )}
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

        {/* ⚠️ A first-hand note from the founder belongs here — AEO.md's guide
            template asks for 2-3 sentences. Deliberately empty: writing one on
            his behalf would be an invented testimonial. */}

        <section className="mt-10 rounded-2xl border border-accent/40 bg-white p-6">
          <h2 className="text-xl font-bold text-primary">What a blank actually means</h2>
          <p className="mt-3 leading-relaxed text-foreground/75">
            These are counts of what adverts <em>say</em>, not of what jobs include. A listing
            that never raises the subject is recorded as unknown rather than as a no, and most of
            the board is exactly that. Only {listingsWithCost} of{" "}
            {listingsConsidered} open listings say what accommodation costs the worker, and fewer
            still say whether the rent comes out of your wages. Where this page says &ldquo;not
            stated&rdquo;, that is what it means — not a quiet way of saying the housing is free.
          </p>
          <p className="mt-3 leading-relaxed text-foreground/75">
            It is worth asking before you accept an offer. A job paying a little less with rent
            deducted can leave you better off than one paying more where you have to find your own
            place in a ski town in December.
          </p>
          <p className="mt-3 leading-relaxed text-foreground/75">
            Most listings here are sourced from public job adverts rather than posted by the
            employer directly, so these describe what is being advertised rather than terms
            employers have confirmed to us.
          </p>
        </section>

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
            href="/jobs?accommodation=yes"
            className="rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-white transition hover:bg-primary/90"
          >
            Browse jobs that include housing
          </Link>
          <Link
            href="/ski-pass-and-meals"
            className="rounded-xl border border-accent px-5 py-3 text-sm font-semibold text-primary transition hover:border-secondary"
          >
            Passes and meals
          </Link>
          <Link
            href="/ski-season-pay"
            className="rounded-xl border border-accent px-5 py-3 text-sm font-semibold text-primary transition hover:border-secondary"
          >
            See what they pay
          </Link>
          <Link
            href="/blog/is-a-ski-season-worth-it"
            className="rounded-xl border border-accent px-5 py-3 text-sm font-semibold text-primary transition hover:border-secondary"
          >
            Can you save money on a season?
          </Link>
        </div>
      </div>
    </div>
  );
}
