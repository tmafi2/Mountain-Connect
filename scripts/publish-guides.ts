/**
 * Push the guides written in `docs/blog-drafts/` into `blog_posts` as DRAFTS.
 *
 * ⚠️ WHY THE GUIDES LIVE IN FILES AT ALL. `blog_posts` has no revision
 * history — that is why `docs/blog-originals/` exists, holding the one post a
 * rewrite replaced. A guide drafted straight into the admin editor is a guide
 * nobody can review in a diff and nobody can recover. The file is the source
 * and this script is the one-way door into the database.
 *
 * ⚠️ IT WILL NOT OVERWRITE AN EXISTING POST WITHOUT --force. Once a draft is
 * in the editor it is Tyler's: he fills in the founder tip, cuts what he
 * disagrees with, and publishes. A re-run that quietly restored my version
 * would throw that away. `--force` exists for fixing a guide I got wrong
 * before he has touched it, and it prints what it is about to replace.
 *
 * ⚠️ IT VALIDATES WITH THE REAL MODULES, not with its own copy of the rules.
 * A token nothing can supply, a token sitting in prose where a missing figure
 * would be visible, an FAQ that empties out when the figures are unavailable
 * — each of those is a published mistake, and each is caught here by calling
 * the same functions the page calls.
 *
 *   npx tsx scripts/publish-guides.ts            # validate + show what would change
 *   npx tsx scripts/publish-guides.ts --apply
 *   npx tsx scripts/publish-guides.ts --apply --force
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { KNOWN_TOKENS, render, tokensInProse, unknownTokens } from "../lib/blog/live-figures";
import { extractFaq } from "../lib/blog/faq";

for (const line of readFileSync(".env.local", "utf8").split("\n")) {
  const m = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
}

const APPLY = process.argv.includes("--apply");
const FORCE = process.argv.includes("--force");
const DIR = "docs/blog-drafts";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  // Names only. The values are secrets and this script prints its output.
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}
const db = createClient(url, key, { auth: { persistSession: false } });

type Draft = { file: string; title: string; slug: string; excerpt: string; content: string };

/** `---` frontmatter, then the markdown. Deliberately minimal. */
function parse(file: string, raw: string): Draft {
  const m = raw.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!m) throw new Error(`${file}: no --- frontmatter block`);
  const meta: Record<string, string> = {};
  for (const line of m[1].split("\n")) {
    const kv = line.match(/^([a-z_]+):\s*(.*)$/);
    if (kv) meta[kv[1]] = kv[2].trim();
  }
  for (const k of ["title", "slug", "excerpt"]) {
    if (!meta[k]) throw new Error(`${file}: frontmatter is missing ${k}`);
  }
  return {
    file,
    title: meta.title,
    slug: meta.slug,
    excerpt: meta.excerpt,
    content: m[2].trim(),
  };
}

/** Everything that would be wrong on the published page. */
function problems(d: Draft): string[] {
  const bad: string[] = [];

  const unknown = unknownTokens(d.content);
  if (unknown.length) bad.push(`unknown token(s): ${unknown.join(", ")} (known: ${KNOWN_TOKENS.join(", ")})`);

  const prose = tokensInProse(d.content);
  if (prose.length) bad.push(`token(s) in prose, where a missing figure would show: ${prose.join(", ")}`);

  // ⚠️ THE FAQ IS PARSED FROM THE RENDERED MARKDOWN, so it is the rendered
  // version that has to hold up — both with figures and without them.
  const withFigures = extractFaq(d.content);
  if (withFigures.length < 4 || withFigures.length > 6) {
    bad.push(`FAQ has ${withFigures.length} questions; AEO.md's template asks for 4-6`);
  }
  for (const e of withFigures) {
    if (e.answer.includes("{{")) bad.push(`FAQ answer carries a raw token: ${e.question}`);
    if (/\]\(|mailto:/.test(e.answer)) bad.push(`FAQ answer leaked a url: ${e.question}`);
  }

  const bare = extractFaq(render(d.content, null));
  if (bare.length !== withFigures.length) {
    bad.push(`FAQ loses ${withFigures.length - bare.length} question(s) when the figures are unavailable`);
  }

  if (d.slug !== d.file.replace(/\.md$/, "")) bad.push(`slug "${d.slug}" does not match the filename`);
  if (!/^[a-z0-9-]+$/.test(d.slug)) bad.push(`slug "${d.slug}" is not url-safe`);
  if (d.excerpt.length > 200) bad.push(`excerpt is ${d.excerpt.length} chars; keep it under 200`);

  return bad;
}

async function main() {
  // README.md documents the directory; it is not a guide.
  const files = readdirSync(DIR).filter((f) => f.endsWith(".md") && f !== "README.md");
  if (!files.length) {
    console.log(`No .md files in ${DIR}/`);
    return;
  }

  const drafts = files.map((f) => parse(f, readFileSync(join(DIR, f), "utf8")));

  let blocked = false;
  for (const d of drafts) {
    const bad = problems(d);
    const faq = extractFaq(d.content).length;
    console.log(`\n${d.slug}`);
    console.log(`  ${d.content.length} chars · ${faq} FAQ questions · "${d.title}"`);
    // A founder tip is Tyler's to write; a placeholder reaching a published
    // page would read as an invented first-hand note, which is the rule that
    // took /employers/{slug} down. Loud, but not fatal — these are drafts.
    if (/FOUNDER TIP/i.test(d.content)) console.log("  ⚠️  still carries the FOUNDER TIP placeholder");
    for (const b of bad) {
      console.log(`  ✗ ${b}`);
      blocked = true;
    }
    if (!bad.length) console.log("  ✓ validates");
  }

  if (blocked) {
    console.error("\nNothing written: fix the problems above first.");
    process.exit(1);
  }

  // The author every existing guide is filed under, read rather than
  // hardcoded so this cannot drift from the rest of the blog.
  const { data: author, error: authorErr } = await db
    .from("blog_posts")
    .select("author_id, author_name")
    .not("author_id", "is", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (authorErr) throw new Error(`author lookup: ${authorErr.message}`);
  if (!author) throw new Error("no existing post to take an author_id from");

  const slugs = drafts.map((d) => d.slug);
  const { data: existing, error: exErr } = await db
    .from("blog_posts")
    .select("slug, status, updated_at")
    .in("slug", slugs);
  if (exErr) throw new Error(`existing lookup: ${exErr.message}`);
  const bySlug = new Map((existing ?? []).map((r) => [r.slug, r]));

  // ⚠️ A /blog/ LINK TO AN UNPUBLISHED POST IS A 404 ON A PUBLIC PAGE, and
  // markdown gets no equivalent of the check `related-guides.server.ts` runs
  // over its own slugs. Two guides that cite each other are the normal case
  // here, so this reports the status rather than refusing: both published,
  // or the link is dead in whichever one goes live first.
  const linked = [...new Set(drafts.flatMap((d) => [...d.content.matchAll(/\]\(\/blog\/([a-z0-9-]+)\)/g)].map((m) => m[1])))];
  if (linked.length) {
    const { data: targets, error: tErr } = await db
      .from("blog_posts")
      .select("slug, status")
      .in("slug", linked);
    if (tErr) throw new Error(`blog link lookup: ${tErr.message}`);
    const status = new Map((targets ?? []).map((r) => [r.slug as string, r.status as string]));
    for (const slug of linked) {
      const inBatch = drafts.some((d) => d.slug === slug);
      const st = status.get(slug);
      if (st === "published") continue;
      const what = st ? `is a ${st}` : "does not exist";
      console.log(`⚠️  /blog/${slug} ${what}${inBatch ? " (it is in this batch)" : ""} — the link to it 404s until it is published`);
    }
  }

  console.log("");
  for (const d of drafts) {
    const row = bySlug.get(d.slug);
    if (row && !FORCE) {
      console.log(`− ${d.slug}: already in the database (${row.status}, updated ${row.updated_at}) — skipped. --force to replace.`);
      continue;
    }
    if (!APPLY) {
      console.log(`${row ? "~" : "+"} ${d.slug}: would ${row ? "REPLACE" : "insert as a draft"}`);
      continue;
    }

    if (row) {
      // Status is never touched: a published post stays published, a draft
      // stays a draft. This script decides content, not visibility.
      const { error } = await db
        .from("blog_posts")
        .update({ title: d.title, excerpt: d.excerpt, content: d.content, updated_at: new Date().toISOString() })
        .eq("slug", d.slug);
      if (error) throw new Error(`${d.slug}: ${error.message}`);
      console.log(`~ ${d.slug}: content replaced (${row.status})`);
    } else {
      const { error } = await db.from("blog_posts").insert({
        title: d.title,
        slug: d.slug,
        excerpt: d.excerpt,
        content: d.content,
        status: "draft",
        author_id: author.author_id,
        author_name: author.author_name ?? "Mountain Connects",
      });
      if (error) throw new Error(`${d.slug}: ${error.message}`);
      console.log(`+ ${d.slug}: inserted as a draft`);
    }
  }

  if (!APPLY) console.log("\nDry run. Pass --apply to write.");
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
