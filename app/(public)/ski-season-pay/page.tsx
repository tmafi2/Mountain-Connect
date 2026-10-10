import Link from "next/link";
import type { Metadata } from "next";
import { defaultOgImage } from "@/lib/seo";
import { getPayByTown } from "@/lib/stats/pay-by-town.server";
import {
  MIN_LISTINGS,
  canQuoteHousing,
  canQuotePay,
  money,
  publishable,
  range,
  rangeByCurrency,
  type TownPay,
} from "@/lib/stats/pay-by-town";

/**
 * "How much do ski season jobs pay?" — the first of the AEO data pages.
 *
 * ⚠️ EVERY FIGURE IS COUNTED FROM THE LIVE BOARD AND CARRIES ITS SAMPLE SIZE.
 * AEO.md commits to four honesty rules and this page keeps all four: nothing
 * from fewer than five listings, currencies never converted, outliers
 * excluded from medians and REPORTED rather than quietly dropped, and the
 * sample size printed beside the number it came from.
 *
 * ⚠️ IT IS A TOWN PAGE, NOT A RESORT PAGE, on purpose. A worker searching
 * "ski season pay" is deciding where to LIVE, and the town is the question
 * behind the wage. That was unanswerable until migration 00113 — nearby_town_id
 * was NULL on 354 of 355 open listings.
 *
 * ⚠️ NO FIRST-HAND TIP. AEO.md's guide template asks for a 2-3 sentence note
 * from the founder, and that is his to write: inventing one would be a fake
 * testimonial. The page reads fine without it and there is a marked place for
 * it below.
 */

const BASE_URL = "https://www.mountainconnects.com";
const PATH = "/ski-season-pay";

// Required by lib/stats: `revalidate` still prerenders at build time, where
// Vercel withholds the Sensitive Supabase keys and every count comes back
// empty. The page would ship saying the board is empty.
export const dynamic = "force-dynamic";

const TITLE = "How Much Do Ski Season Jobs Pay? Wages by Mountain Town";

export async function generateMetadata(): Promise<Metadata> {
  const { towns } = await getPayByTown();
  const quotable = publishable(towns).filter(canQuotePay);
  // ⚠️ Falls back to NO FIGURE, never a remembered one. A description is the
  // one place a stale number survives longest, because nobody reads their own
  // meta tags — which is how "69 resorts" lasted five months.
  const lead = quotable[0];
  const detail =
    lead && lead.medianHourly !== null
      ? ` In ${lead.town} the median is ${money(lead.medianHourly, lead.currency)} an hour across ${lead.pricedCount} listings.`
      : "";
  const description = `Real hourly pay from open ski resort job listings, by mountain town.${detail} Counted from live listings, not survey estimates — sample size shown for every figure.`;

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

/** "10 October 2026" — the date the figures were counted, shown on the page. */
function updatedOn(iso: string): string {
  const d = iso ? new Date(iso) : new Date();
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
}

function PayCell({ town }: { town: TownPay }) {
  if (!canQuotePay(town)) {
    return (
      <span className="text-foreground/40">
        Not enough data
        <span className="block text-xs">
          {town.pricedCount} of {town.jobCount} state pay
        </span>
      </span>
    );
  }
  return (
    <span className="font-bold text-primary">
      {money(town.medianHourly, town.currency)}
      <span className="block text-xs font-normal text-foreground/50">{range(town)}</span>
    </span>
  );
}

export default async function SkiSeasonPayPage() {
  const { towns, listingsWithTown, outliersExcluded, generatedAt } = await getPayByTown();
  const rows = publishable(towns);
  const withPay = rows.filter(canQuotePay);
  const updated = updatedOn(generatedAt);

  const faqs: { q: string; a: string }[] = [
    {
      q: "How much do ski season jobs pay?",
      // ⚠️ Per currency. A plain min/max across towns read "CAD $21 to CAD
      // $1,400" — yen compared with dollars and labelled CAD. See
      // rangeByCurrency.
      a: withPay.length
        ? `Across the mountain towns with enough open listings to measure, median hourly pay runs ${rangeByCurrency(
            withPay
          )}. Figures are medians of the hourly rates stated in open listings, so they describe what is being advertised now rather than a national average, and rates in different currencies are never converted or compared.`
        : "We count this from open listings on the board. Right now no town has enough listings stating a rate to publish a median.",
    },
    {
      q: "Is accommodation included in ski resort jobs?",
      a: `Some listings include staff accommodation and some do not, and it varies far more by town than by role. The table above shows the share of open listings in each town that include it. Where a listing states what housing costs the worker, we show that too — but most adverts do not say, and we leave that blank rather than guessing.`,
    },
    {
      q: "Where do these pay figures come from?",
      a: `They are counted from job listings currently open on Mountain Connects, read from the rate each advert states. Nothing is converted between currencies and nothing is estimated. A figure is only shown when at least ${MIN_LISTINGS} listings in that town state a rate, and the number of listings behind every figure is printed beside it.`,
    },
    {
      q: "Why do some towns show no pay figure?",
      a: `Because fewer than ${MIN_LISTINGS} of their open listings state a rate. A median from one or two adverts describes those employers, not the town, so we leave it blank and say how many listings did state one. Those towns still appear because the job count and the housing share are real.`,
    },
    {
      q: "Do these figures include tips?",
      a: "No. They are the hourly rates the adverts state. Hospitality roles in particular often add tips on top, and some listings mention that without putting a number on it, so treat these as the base rate rather than total earnings.",
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
    description: `Median hourly pay from open ski resort job listings, by mountain town. Counted from ${listingsWithTown} open listings.`,
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
      { "@type": "ListItem", position: 2, name: "Ski Season Pay", item: `${BASE_URL}${PATH}` },
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
          <span className="font-medium text-primary">Ski Season Pay</span>
        </nav>

        <h1 className="text-3xl font-extrabold text-primary md:text-4xl">
          How much do ski season jobs pay?
        </h1>

        {/* The direct answer, in the first paragraph, as plain fact. */}
        {withPay.length > 0 ? (
          <p className="mt-5 text-lg leading-relaxed text-foreground/80">
            Across the {withPay.length} mountain {withPay.length === 1 ? "town" : "towns"} with enough
            open listings to measure,{" "}
            {withPay.map((t, i) => (
              <span key={t.slug}>
                {i > 0 && (i === withPay.length - 1 ? " and " : ", ")}
                <strong className="text-primary">{t.town}</strong> pays a median of{" "}
                <strong className="text-primary">{money(t.medianHourly, t.currency)}</strong> an hour
              </span>
            ))}
            . These are medians of the rates stated in listings open right now — not survey estimates,
            and never converted between currencies.
          </p>
        ) : (
          <p className="mt-5 text-lg leading-relaxed text-foreground/80">
            We count this from the rates stated in open listings. Right now no town has at least{" "}
            {MIN_LISTINGS} open listings stating a rate, so there is no median worth publishing — the
            table below shows what each town does have.
          </p>
        )}

        <p className="mt-4 text-sm text-foreground/50">
          Last updated {updated} · Counted from {listingsWithTown} open listings on Mountain Connects
          {outliersExcluded > 0 && (
            <> · {outliersExcluded} implausible {outliersExcluded === 1 ? "rate" : "rates"} excluded from medians</>
          )}
        </p>

        {/* ═══ The table ═══ */}
        <div className="mt-8 overflow-x-auto rounded-2xl border border-accent/40 bg-white shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-accent/40 bg-accent/10 text-xs uppercase tracking-wider text-foreground/60">
              <tr>
                <th className="px-4 py-3 font-semibold">Town</th>
                <th className="px-4 py-3 font-semibold">Open jobs</th>
                <th className="px-4 py-3 font-semibold">Median hourly pay</th>
                <th className="px-4 py-3 font-semibold">Include housing</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-accent/25">
              {rows.map((t) => (
                <tr key={t.slug} className="align-top">
                  <td className="px-4 py-4">
                    <Link href={`/towns/${t.slug}`} className="font-semibold text-secondary hover:underline">
                      {t.town}
                    </Link>
                    <span className="block text-xs text-foreground/50">
                      {t.country}
                      {t.resorts.length > 0 && ` · ${t.resorts.join(", ")}`}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-foreground/80">
                    <Link href={`/jobs?town=${t.slug}`} className="text-secondary hover:underline">
                      {t.jobCount}
                    </Link>
                  </td>
                  <td className="px-4 py-4">
                    <PayCell town={t} />
                  </td>
                  <td className="px-4 py-4 text-foreground/80">
                    {t.pctWithHousing === null ? "—" : `${t.pctWithHousing}%`}
                    {canQuoteHousing(t) && (
                      <span className="block text-xs text-foreground/50">
                        ~{money(t.medianWeeklyHousing, t.currency)}/week when charged
                      </span>
                    )}
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-foreground/50">
                    No town currently has {MIN_LISTINGS} or more open listings. Check back as the
                    season fills up, or <Link href="/jobs" className="text-secondary hover:underline">browse every open job</Link>.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <p className="mt-3 text-xs text-foreground/50">
          A median is only shown where at least {MIN_LISTINGS} open listings in that town state a
          rate. The second line under each wage is the middle half of the range — a quarter of
          listings pay below it and a quarter above.
        </p>

        {/* ═══ Per-town sections, each headed by the question ═══ */}
        {withPay.map((t) => (
          <section key={t.slug} className="mt-10">
            <h2 className="text-xl font-bold text-primary">
              What do ski season jobs pay in {t.town}?
            </h2>
            <p className="mt-3 leading-relaxed text-foreground/75">
              The median open listing in {t.town} pays{" "}
              <strong className="text-primary">{money(t.medianHourly, t.currency)}</strong> an hour,
              from {t.pricedCount} of {t.jobCount} open {t.jobCount === 1 ? "listing" : "listings"}{" "}
              that state a rate.
              {range(t) !== null && <> The middle half fall between {range(t)}.</>}
              {t.pctWithHousing !== null && (
                <> {t.pctWithHousing}% of listings there include staff accommodation.</>
              )}
              {canQuoteHousing(t) && (
                <>
                  {" "}
                  Where a listing says what housing costs, the median works out at about{" "}
                  {money(t.medianWeeklyHousing, t.currency)} a week.
                </>
              )}
            </p>
            <Link
              href={`/jobs?town=${t.slug}`}
              className="mt-3 inline-block text-sm font-semibold text-secondary hover:underline"
            >
              See the {t.jobCount} open {t.jobCount === 1 ? "job" : "jobs"} in {t.town} &rarr;
            </Link>
          </section>
        ))}

        {/* ⚠️ A first-hand note from the founder belongs here — AEO.md's guide
            template asks for 2-3 sentences of it. Deliberately left empty:
            writing one on his behalf would be an invented testimonial, which
            is a standing rule on this project. */}

        {/* ═══ Where the numbers come from ═══ */}
        <section className="mt-10 rounded-2xl border border-accent/40 bg-white p-6">
          <h2 className="text-xl font-bold text-primary">Where these numbers come from</h2>
          <p className="mt-3 leading-relaxed text-foreground/75">
            Every figure is counted from job listings open on Mountain Connects on {updated}. We read
            the hourly rate each advert states; nothing is estimated, and nothing is converted
            between currencies — a Japanese wage is shown in yen and a Canadian one in dollars.
          </p>
          <p className="mt-3 leading-relaxed text-foreground/75">
            Listings that quote a season or lump-sum figure are left out of the hourly medians,
            because no advert records the hours behind them. Rates far below the local minimum wage
            or implausibly above it are excluded from the medians and counted at the top of this
            page rather than quietly dropped — they are almost always a mistake in the advert.
          </p>
          <p className="mt-3 leading-relaxed text-foreground/75">
            Most listings on the board are sourced from public job adverts rather than posted by the
            employer directly, so these are advertised rates, not figures employers have reported to
            us.
          </p>
        </section>

        {/* ═══ FAQ ═══ */}
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
            Which resorts include staff housing?
          </Link>
          <Link
            href="/towns"
            className="rounded-xl border border-accent px-5 py-3 text-sm font-semibold text-primary transition hover:border-secondary"
          >
            Explore mountain towns
          </Link>
          <Link
            href="/blog/questions-to-ask-before-accepting-ski-season-job"
            className="rounded-xl border border-accent px-5 py-3 text-sm font-semibold text-primary transition hover:border-secondary"
          >
            What to ask before you accept
          </Link>
        </div>
      </div>
    </div>
  );
}
