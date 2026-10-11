/**
 * The first-hand note AEO.md's guide template asks every data page for.
 *
 * ⚠️ It is labelled "From the founder" rather than signed, because nothing
 * public on this site names him — /about carries no name — and a note is not
 * the place to publish one by accident.
 *
 * ⚠️ ANY FIGURE INSIDE IT IS PASSED IN FROM THE LIVE COUNT, never typed. A
 * note is exactly the kind of copy nobody re-reads, which is how /about kept
 * saying "69 Ski Resorts" for five months against a real 111.
 */
export default function FounderNote({ children }: { children: React.ReactNode }) {
  return (
    <section className="mt-10 rounded-2xl border-l-4 border-l-warm border-y border-r border-accent/40 bg-white p-6">
      <p className="text-xs font-semibold uppercase tracking-wider text-warm">From the founder</p>
      <div className="mt-3 space-y-3 leading-relaxed text-foreground/80">{children}</div>
    </section>
  );
}
