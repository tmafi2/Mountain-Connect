import Link from "next/link";
import { canQuoteShares, listRoles, type ResortHiring } from "@/lib/stats/hiring-by-resort";

/**
 * "What it takes to get hired here", counted from what is open right now.
 *
 * ⚠️ NEVER STATES THE INVERSE OF A PERK. The perk columns are tri-state and
 * NULL — "the advert did not say" — is most of the board, so "31 advertise
 * housing" is supportable and "92 do not include housing" is not. The copy
 * says what adverts SAY and names the silence as silence, the same rule the
 * three data pages keep.
 */
export default function HiringAtResort({ hiring }: { hiring: ResortHiring }) {
  const shares = canQuoteShares(hiring);
  const roles = listRoles(hiring.topRoles);
  const plural = hiring.jobCount === 1 ? "role" : "roles";
  const silence =
    hiring.saysHousing < hiring.jobCount || hiring.saysPass < hiring.jobCount;

  return (
    <section className="mt-8 rounded-2xl border border-accent/40 bg-white p-6">
      <h2 className="text-xl font-bold text-primary">Getting hired at {hiring.resort}</h2>

      <p className="mt-3 leading-relaxed text-foreground/75">
        <strong className="text-primary">
          {hiring.jobCount} {plural}
        </strong>{" "}
        {hiring.jobCount === 1 ? "is" : "are"} open here right now, across{" "}
        <strong className="text-primary">
          {hiring.employerCount} {hiring.employerCount === 1 ? "employer" : "employers"}
        </strong>
        {roles && <> — mostly {roles}</>}.
        {hiring.pricedCount > 0 && (
          <> {hiring.pricedCount} of them state an hourly rate.</>
        )}
      </p>

      {shares && (hiring.saysHousing > 0 || hiring.saysPass > 0) && (
        <p className="mt-3 leading-relaxed text-foreground/75">
          Of the {hiring.jobCount} open roles,{" "}
          {hiring.saysHousing > 0 && (
            <>
              <strong className="text-primary">{hiring.saysHousing}</strong>{" "}
              {/* "1 ... advertise" was the bug a count of one always finds. */}
              {hiring.saysHousing === 1 ? "advertises" : "advertise"} staff accommodation
              {hiring.saysPass > 0 ? " and " : ". "}
            </>
          )}
          {hiring.saysPass > 0 && (
            <>
              <strong className="text-primary">{hiring.saysPass}</strong>{" "}
              {hiring.saysPass === 1 ? "advertises" : "advertise"} a season pass.{" "}
            </>
          )}
          {/* ⚠️ The silence is named, never computed into a negative — these
              columns are tri-state and NULL is most of the board. And it is
              only said when something IS silent: at Rusutsu all five listings
              advertise housing, so "the rest" was an empty set. */}
          {silence && (
            <>
              Where a listing is not counted here its advert did not mention it
              either way, which is a question to ask rather than an answer.
            </>
          )}
        </p>
      )}

      <div className="mt-5 flex flex-wrap gap-3">
        <Link
          // By NAME, matching the "Browse all jobs at X" link already on this page.
          href={`/jobs?resort=${encodeURIComponent(hiring.resort)}`}
          className="rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-white transition hover:bg-primary/90"
        >
          See the {hiring.jobCount} open {plural}
        </Link>
        <Link
          href="/blog/questions-to-ask-before-accepting-ski-season-job"
          className="rounded-xl border border-accent px-5 py-3 text-sm font-semibold text-primary transition hover:border-secondary"
        >
          What to ask before you accept
        </Link>
      </div>
    </section>
  );
}
