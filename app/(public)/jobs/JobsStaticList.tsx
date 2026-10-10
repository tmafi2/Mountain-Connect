import Link from "next/link";
import type { JobListing } from "@/lib/data/jobs";

/**
 * The server-rendered job list — what a crawler, and anyone without
 * JavaScript, actually sees at /jobs.
 *
 * ⚠️ WHY THIS EXISTS AS A SUSPENSE FALLBACK. JobsClient wraps its content in
 * <Suspense> because that content calls useSearchParams(), which Next forces
 * into client-side rendering. During SSR, Next emits the FALLBACK — so the
 * fallback is literally the server HTML for this route. It used to be the
 * words "Loading jobs...", which meant /jobs shipped 814KB of markup
 * containing zero job links. Googlebot runs JavaScript and coped; GPTBot and
 * most LLM crawlers do not, so the job board was an empty page to AI
 * retrieval.
 *
 * Rendering the real first page here costs nothing extra: page.tsx has
 * already fetched and passed the rows. The client component then hydrates and
 * takes over filtering, sorting and pagination.
 *
 * ⚠️ NO HOOKS, EVER. The moment this uses state, an effect or
 * useSearchParams, it stops being server-renderable and the route silently
 * goes back to shipping a spinner.
 */

/** How many rows the server renders. The client shows the rest after hydrating. */
export const SSR_JOB_COUNT = 24;

function payLabel(job: JobListing): string | null {
  // salary_range already carries currency and period ("CAD 25/hour"); it is
  // the only field that does, so it beats reassembling pay_amount by hand.
  const raw = job.salary_range?.trim();
  return raw && raw.toLowerCase() !== "tbd" ? raw : null;
}

export default function JobsStaticList({ jobs }: { jobs: JobListing[] }) {
  if (jobs.length === 0) {
    return (
      <p className="mx-auto max-w-5xl px-6 py-10 text-foreground/60">
        No open roles match this view right now.
      </p>
    );
  }

  return (
    <section className="mx-auto max-w-5xl px-6 py-10" aria-label="Open roles">
      <ul className="space-y-3">
        {jobs.map((job) => {
          const place = job.nearby_town_name || job.resort_name || job.resort_country;
          const pay = payLabel(job);
          return (
            <li key={job.id}>
              <Link
                href={`/jobs/${job.id}`}
                className="block rounded-xl border border-accent bg-white p-4 transition hover:border-secondary hover:shadow-sm"
              >
                <h3 className="text-base font-bold text-primary">{job.title}</h3>
                <p className="mt-1 text-sm text-foreground/70">
                  {job.business_name}
                  {place ? ` · ${place}` : ""}
                  {job.resort_country && place !== job.resort_country ? `, ${job.resort_country}` : ""}
                </p>
                <div className="mt-2 flex flex-wrap gap-2 text-xs">
                  {pay && (
                    <span className="rounded-full bg-secondary/10 px-2 py-0.5 font-semibold text-primary">{pay}</span>
                  )}
                  {job.accommodation_included && (
                    <span className="rounded-full bg-accent/40 px-2 py-0.5 text-foreground/70">Staff accommodation</span>
                  )}
                  {job.ski_pass_included && (
                    <span className="rounded-full bg-accent/40 px-2 py-0.5 text-foreground/70">Ski pass</span>
                  )}
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
