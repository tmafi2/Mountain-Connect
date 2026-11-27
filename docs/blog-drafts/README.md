# Blog drafts

Guides written here, then pushed into `blog_posts` as **drafts** with:

```
npx tsx scripts/publish-guides.ts            # validate, show what would change
npx tsx scripts/publish-guides.ts --apply
```

They land as drafts, not published. Editing and publishing happen in
`/admin/blog`, which is where the founder tip gets written — the template in
[AEO.md](../../AEO.md) asks every guide for a first-hand note and that is the
one part nobody else can write, because inventing it would be a fake
testimonial.

## Why the files exist

`blog_posts` has no revision history. That is why `../blog-originals/` holds
the one post a rewrite replaced, and it is why a guide drafted straight into
the admin editor cannot be reviewed in a diff or recovered afterwards. The
file is the source; the script is the one-way door.

The script will **not** overwrite a post that already exists without
`--force`, so once a draft is in the editor it belongs to whoever is editing
it.

## Rules the script enforces

It calls the same functions `/blog/[slug]` calls, rather than keeping its own
copy of the rules:

- **No typed numbers about our own board.** Live figures go in `{{tokens}}`
  on a line beginning `::figures`, which the renderer drops whole when the
  numbers cannot be read. A token anywhere else is rejected, because a
  missing figure would be visible to a reader.
- **Every token has to be a real one** — see `KNOWN_TOKENS` in
  `lib/blog/live-figures.ts`.
- **4-6 FAQ questions**, under a `## Common questions` (or `## FAQ`) heading.
  They become `FAQPage` structured data, which is the part an answer engine
  quotes.
- **The FAQ has to survive the figures being unavailable.** The schema is
  parsed from the rendered markdown, so an answer built around a figures line
  would come out short exactly when the database is down.

A new post also needs two hand edits, neither of which the script can do:

1. `lib/blog/tags.ts` — its chips, or the blog index shows none.
2. `lib/blog/related-guides.ts` — or the only route to it is the index, where
   every post sinks as the next one is published.
