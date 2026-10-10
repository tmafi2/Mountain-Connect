import Link from "next/link";
import type { RelatedGuide } from "@/lib/blog/related-guides.server";

/**
 * A short reading list at the foot of a country, resort or town page.
 *
 * Renders NOTHING when the list is empty — which is what a failed lookup
 * returns — so a page never shows an empty "Read next" heading, and never
 * links to a post that is no longer published.
 */
export default function RelatedGuides({
  guides,
  heading = "Before you go",
  intro,
}: {
  guides: RelatedGuide[];
  heading?: string;
  intro?: string;
}) {
  if (guides.length === 0) return null;

  return (
    <section className="px-6 py-12">
      <div className="mx-auto max-w-3xl">
        <h2 className="text-xl font-bold text-primary">{heading}</h2>
        {intro && <p className="mt-2 text-sm leading-relaxed text-foreground/70">{intro}</p>}
        <ul className="mt-5 space-y-3">
          {guides.map((g) => (
            <li key={g.slug}>
              <Link
                href={`/blog/${g.slug}`}
                className="group block rounded-xl border border-accent/40 bg-white p-4 transition hover:border-secondary"
              >
                <span className="block font-semibold text-primary group-hover:text-secondary">
                  {g.title}
                </span>
                {g.excerpt && (
                  <span className="mt-1 block text-sm leading-relaxed text-foreground/70">
                    {g.excerpt}
                  </span>
                )}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
