import { tagsFor } from "@/lib/blog/tags";

/**
 * The chips on a post: what it covers, at a glance.
 *
 * Not links. There are no tag pages by design (see lib/blog/tags.ts), and a
 * chip that looks clickable and goes nowhere is worse than a plain label.
 * Filtering lives on the index, where there is something to filter.
 */
export default function PostTags({ slug, className = "" }: { slug: string; className?: string }) {
  const tags = tagsFor(slug);
  if (tags.length === 0) return null;
  return (
    <ul className={`flex flex-wrap gap-2 ${className}`} aria-label="Topics">
      {tags.map((t) => (
        <li
          key={t}
          className="rounded-full border border-accent/50 bg-accent/10 px-2.5 py-0.5 text-xs font-medium text-primary/70"
        >
          {t}
        </li>
      ))}
    </ul>
  );
}
