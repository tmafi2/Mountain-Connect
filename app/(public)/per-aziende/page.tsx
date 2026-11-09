import Link from "next/link";
import type { Metadata } from "next";
import { createPublicClient } from "@/lib/supabase/public";
import { createAdminClient } from "@/lib/supabase/admin";
import { resorts as staticResorts } from "@/lib/data/resorts";
import { PRICING, isFoundingPricingOpen, SEASON_PASS_MONTHS, TIER_FEATURES } from "@/lib/tier";
import { SITE_ORIGIN } from "@/lib/config/site";

/**
 * The Italian employer landing page — the one market where the listings, the
 * adverts and the businesses are all in Italian.
 *
 * ⚠️ A LOCALISED PAGE, NOT AN i18n FRAMEWORK. The October 2026 i18n review
 * measured translating the platform and recommended localised landing pages
 * instead. This is that: one hand-written Italian page, no locale routing, no
 * message catalogue, nothing for the other 13 markets to inherit by accident.
 *
 * ⚠️ IT DOES NOT GO IN EMPLOYER_MARKETS. That array drives
 * /for-employers/[country], whose chrome, headings and copy are English. Italy
 * there would be an English page for an audience that writes 44 of its 45
 * listings in Italian — which is the likeliest reason none of the 27 Italian
 * businesses has claimed, since every email they were sent was in English too.
 *
 * ⚠️ EVERY NUMBER IS QUERIED, never typed. The application count is the whole
 * argument of the page to a business owner, and a figure typed into JSX goes
 * stale silently — /about understated the platform for five months that way.
 * It is also the number the Meta campaign quotes, so the two must agree.
 *
 * The site header and footer are still English. That is a known seam: the
 * page content is what converts, and translating the global nav is a much
 * larger change with no evidence yet that this page works at all.
 */

/**
 * ⚠️ force-dynamic, NOT revalidate, and the reason is the application count.
 * `expressions_of_interest` is RLS-protected — an anonymous client reads zero
 * rows from it, by design — so the count has to come from the service role.
 * Under `revalidate` this page would prerender at build time, where the
 * sensitive keys are withheld, and the number would silently render as 0:
 * the same trap the sitemap hit in 57fb081.
 *
 * The cost is that every visit queries. Four indexed queries on a landing
 * page is cheap, and the count is the entire argument the page makes to a
 * business owner — a stale or absent one is worse than the compute.
 */
export const dynamic = "force-dynamic";

const PATH = "/per-aziende";

export const metadata: Metadata = {
  title: "Personale Stagionale",
  description:
    "Pubblica offerte di lavoro per la stagione invernale a Bormio, Livigno, Courmayeur, Cervinia e nelle Dolomiti. Il primo annuncio è gratuito.",
  alternates: { canonical: `${SITE_ORIGIN}${PATH}` },
  openGraph: {
    title: "Trova personale per la stagione invernale",
    description:
      "Pubblica offerte di lavoro stagionale nelle località sciistiche italiane. Il primo annuncio è gratuito.",
    url: `${SITE_ORIGIN}${PATH}`,
    siteName: "Mountain Connects",
    locale: "it_IT",
    type: "website",
  },
};

/** Italian for "N località", with the singular the language actually wants. */
function plural(n: number, one: string, many: string) {
  return n === 1 ? one : many;
}

export default async function PerAziendePage() {
  const supabase = createPublicClient();

  const italianResortIds = staticResorts.filter((r) => r.country === "Italy").map((r) => r.id);
  const { data: resortRows } = await supabase
    .from("resorts")
    .select("id, name")
    .in("legacy_id", italianResortIds);
  const resortUuids = (resortRows ?? []).map((r) => r.id);
  const resortNames = (resortRows ?? []).map((r) => r.name as string).sort((a, b) => a.localeCompare(b, "it"));

  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  // Service role for this one query only: the rest of the page reads public
  // tables and has no business holding an elevated client.
  const admin = createAdminClient();

  const [{ count: jobCount }, { count: townCount }, { count: eoiCount }] = await Promise.all([
    resortUuids.length
      ? supabase
          .from("job_posts")
          .select("id", { count: "exact", head: true })
          .eq("status", "active")
          .in("resort_id", resortUuids)
      : Promise.resolve({ count: 0 }),
    supabase.from("nearby_towns").select("id", { count: "exact", head: true }).eq("country", "Italy"),
    // Applications on Italian listings in the last 30 days. Counted through
    // the job post, because expressions_of_interest has no country of its own.
    resortUuids.length
      ? admin
          .from("expressions_of_interest")
          .select("id, job_posts!inner(resort_id)", { count: "exact", head: true })
          .gte("created_at", since)
          .in("job_posts.resort_id", resortUuids)
      : Promise.resolve({ count: 0 }),
  ]);

  const jobs = jobCount ?? 0;
  const towns = townCount ?? 0;
  const resorts = resortUuids.length;
  const applications = eoiCount ?? 0;

  // ⚠️ Each figure renders only when it argues for us. A page telling a hotel
  // owner that three people applied last month makes the opposite case, and
  // the same floor already guards the English employer pages.
  const showApplications = applications >= 20;
  const showJobs = jobs >= 3;

  // Numbers, not display strings: PRICING is the single source of truth and
  // the English helpers next to it ("6 months", "per month · founding rate")
  // cannot be used on an Italian page.
  const founding = isFoundingPricingOpen();
  const band = founding ? "founding" : "full";
  const rate = { standard: PRICING.standard[band], premium: PRICING.premium[band] };

  return (
    <main className="bg-background">
      {/* ── Hero ─────────────────────────────────────────────────────── */}
      <section className="bg-primary text-white">
        <div className="mx-auto max-w-5xl px-6 py-16 sm:py-20">
          <p className="text-xs font-semibold uppercase tracking-widest text-highlight">
            Per le aziende delle località sciistiche
          </p>
          <h1 className="mt-3 text-3xl font-bold leading-tight sm:text-5xl">
            Trova personale per la stagione invernale
          </h1>

          {showApplications ? (
            <p className="mt-5 max-w-2xl text-lg text-white/80">
              Nell&apos;ultimo mese <strong className="text-white">{applications} persone</strong> hanno
              risposto a offerte di lavoro nelle località sciistiche italiane che pubblichiamo.
              Il primo annuncio è gratuito.
            </p>
          ) : (
            <p className="mt-5 max-w-2xl text-lg text-white/80">
              Pubblica le tue offerte per la stagione invernale e raggiungi chi sta cercando
              lavoro in montagna adesso. Il primo annuncio è gratuito.
            </p>
          )}

          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/signup?role=business"
              className="rounded-xl bg-white px-6 py-3 text-sm font-semibold text-primary transition hover:bg-white/90"
            >
              Pubblica un annuncio gratis
            </Link>
            <Link
              href="/jobs?country=Italy"
              className="rounded-xl border border-white/30 px-6 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
            >
              Guarda gli annunci già online
            </Link>
          </div>
        </div>
      </section>

      {/* ── Already here ─────────────────────────────────────────────── */}
      <section className="mx-auto max-w-5xl px-6 py-12">
        <div className="rounded-2xl border border-accent bg-white p-6 sm:p-8">
          <h2 className="text-xl font-bold text-primary">Il tuo annuncio potrebbe essere già online</h2>
          <p className="mt-3 text-sm leading-relaxed text-foreground/80">
            Raccogliamo le offerte di lavoro stagionale pubblicate nei gruppi Facebook delle
            località sciistiche e le riuniamo in un unico posto, dove chi cerca lavoro può
            trovarle e rispondere. Se hai pubblicato un annuncio in uno di quei gruppi, è
            possibile che sia già qui.
          </p>
          <p className="mt-3 text-sm leading-relaxed text-foreground/80">
            Rivendicare la tua scheda è gratuito e ti permette di vedere chi ha risposto, di
            rispondere direttamente e di modificare o rimuovere l&apos;annuncio.
          </p>
          <Link
            href="/jobs?country=Italy"
            className="mt-4 inline-block text-sm font-semibold text-secondary hover:underline"
          >
            Cerca la tua attività tra gli annunci →
          </Link>
        </div>
      </section>

      {/* ── How it works ─────────────────────────────────────────────── */}
      <section className="mx-auto max-w-5xl px-6 pb-12">
        <h2 className="text-2xl font-bold text-primary">Come funziona</h2>
        <ol className="mt-6 grid gap-5 sm:grid-cols-3">
          {[
            {
              n: "1",
              t: "Pubblichi l'annuncio",
              d: "Ruolo, periodo, paga e se offri vitto e alloggio. Bastano pochi minuti e il primo annuncio non si paga.",
            },
            {
              n: "2",
              t: "Ricevi le candidature",
              d: "Chi è interessato risponde direttamente dall'annuncio. Ti arriva un'email a ogni candidatura.",
            },
            {
              n: "3",
              t: "Rispondi e assumi",
              d: "Vedi i profili, scrivi ai candidati e organizzi i colloqui dalla tua area riservata.",
            },
          ].map((s) => (
            <li key={s.n} className="rounded-2xl border border-accent bg-white p-5">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-secondary/10 text-sm font-bold text-secondary">
                {s.n}
              </span>
              <h3 className="mt-3 text-base font-semibold text-primary">{s.t}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-foreground/75">{s.d}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* ── Coverage ─────────────────────────────────────────────────── */}
      <section className="mx-auto max-w-5xl px-6 pb-12">
        <h2 className="text-2xl font-bold text-primary">Dove siamo in Italia</h2>
        <div className="mt-5 grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-accent bg-white p-5 text-center">
            <p className="text-3xl font-bold text-primary">{resorts}</p>
            <p className="mt-1 text-sm text-foreground/70">
              {plural(resorts, "località sciistica", "località sciistiche")}
            </p>
          </div>
          <div className="rounded-2xl border border-accent bg-white p-5 text-center">
            <p className="text-3xl font-bold text-primary">{towns}</p>
            <p className="mt-1 text-sm text-foreground/70">
              {plural(towns, "paese di montagna", "paesi di montagna")}
            </p>
          </div>
          {showJobs && (
            <div className="rounded-2xl border border-accent bg-white p-5 text-center">
              <p className="text-3xl font-bold text-primary">{jobs}</p>
              <p className="mt-1 text-sm text-foreground/70">
                {plural(jobs, "annuncio attivo", "annunci attivi")}
              </p>
            </div>
          )}
        </div>
        {resortNames.length > 0 && (
          <p className="mt-5 text-sm leading-relaxed text-foreground/70">
            {resortNames.join(" · ")}
          </p>
        )}
      </section>

      {/* ── Pricing ──────────────────────────────────────────────────── */}
      <section className="mx-auto max-w-5xl px-6 pb-16">
        <h2 className="text-2xl font-bold text-primary">Quanto costa</h2>
        <p className="mt-2 text-sm text-foreground/70">
          Gli importi sono in dollari statunitensi: il pagamento è gestito da Stripe e la cifra
          addebitata viene convertita dalla tua banca.
        </p>

        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-accent bg-white p-5">
            <h3 className="text-base font-semibold text-primary">Gratuito</h3>
            <p className="mt-2 text-2xl font-bold text-primary">$0</p>
            <p className="mt-1 text-xs text-foreground/60">Un annuncio, attivo 4 settimane</p>
            <p className="mt-3 text-sm leading-relaxed text-foreground/75">
              Per chi deve coprire un solo ruolo. Non serve la carta di credito.
            </p>
          </div>

          <div className="rounded-2xl border-2 border-secondary bg-white p-5">
            <h3 className="text-base font-semibold text-primary">Standard</h3>
            <p className="mt-2 text-2xl font-bold text-primary">
              ${rate.standard.month}
              <span className="text-sm font-medium text-foreground/60"> / mese</span>
            </p>
            <p className="mt-1 text-xs text-foreground/60">
              oppure ${rate.standard.season} per {SEASON_PASS_MONTHS} mesi
            </p>
            <p className="mt-3 text-sm leading-relaxed text-foreground/75">
              Fino a {TIER_FEATURES.standard.maxActiveJobs} annunci attivi insieme, per chi
              assume per tutta la struttura.
            </p>
          </div>

          <div className="rounded-2xl border border-accent bg-white p-5">
            <h3 className="text-base font-semibold text-primary">Premium</h3>
            <p className="mt-2 text-2xl font-bold text-primary">
              ${rate.premium.month}
              <span className="text-sm font-medium text-foreground/60"> / mese</span>
            </p>
            <p className="mt-1 text-xs text-foreground/60">
              oppure ${rate.premium.season} per {SEASON_PASS_MONTHS} mesi
            </p>
            <p className="mt-3 text-sm leading-relaxed text-foreground/75">
              Annunci illimitati, per gruppi alberghieri e strutture con più sedi.
            </p>
          </div>
        </div>

        {founding && (
          <p className="mt-4 text-xs text-foreground/60">
            Prezzi di lancio, bloccati finché l&apos;abbonamento resta attivo.
          </p>
        )}

        <div className="mt-8">
          <Link
            href="/signup?role=business"
            className="inline-block rounded-xl bg-secondary px-6 py-3 text-sm font-semibold text-white transition hover:bg-secondary/90"
          >
            Inizia gratis
          </Link>
        </div>
      </section>
    </main>
  );
}
