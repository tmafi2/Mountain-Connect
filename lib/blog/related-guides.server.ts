import { createPublicClient } from "@/lib/supabase/public";
import { guideSlugsFor, type GuideScope } from "./related-guides";

export type RelatedGuide = { title: string; slug: string; excerpt: string | null };

/**
 * The guides for a page, checked against the database before they render.
 *
 * ⚠️ FAILS TO NOTHING, NEVER TO A BROKEN LINK. A slug that no longer names a
 * published post is dropped rather than linked, and any error returns an
 * empty list — the section simply does not appear. A dead internal link on
 * 200+ pages is worse than no link at all.
 */
export async function getRelatedGuides(scope: GuideScope, limit = 3): Promise<RelatedGuide[]> {
  const wanted = guideSlugsFor(scope, limit);
  if (wanted.length === 0) return [];
  try {
    const supabase = createPublicClient();
    const { data, error } = await supabase
      .from("blog_posts")
      .select("title, slug, excerpt")
      .in("slug", wanted)
      .eq("status", "published");
    if (error) throw error;
    const found = new Map((data ?? []).map((r) => [r.slug, r as RelatedGuide]));
    // Back in the order the map declared, not the order PostgREST returned.
    return wanted.map((s) => found.get(s)).filter((g): g is RelatedGuide => Boolean(g));
  } catch (err) {
    console.error("related-guides: unavailable:", err);
    return [];
  }
}
