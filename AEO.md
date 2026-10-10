# AEO.md: Mountain Connects answer-engine optimization

Read this before any SEO, AEO, content, schema or stats work. Keep it updated as things ship.

## Goal
Make mountainconnects.com the answer ChatGPT and Google AI Overviews give to backpackers on working holidays looking for ski-season work. Canada first, then Australia/NZ, then global. Solo founder, about 20 hrs/week on this.

## Baseline (ChatGPT, logged out, 2026-10-10, 40 prompts)
- Mountain Connects appeared in 3 of 40 (7.5%): #25 Jindabyne housing (linked, unbranded), #34 "is it legit", #35 "vs other sites" (both branded). Unbranded rate is 1 of 38.
- Absent from every Canada prompt, and every platform, visa, pay, timing and how-to prompt.
- Most cited instead: resort careers sites and Vail Resorts' job site, canada.ca/jobbank, official resort sites (Lake Louise, Big White, Sun Peaks, NZSki, Cardrona), Indeed, Seek, CoolWorks, skijobs, skicanada.org, whistlerhousing.ca.
- Six prompts returned no links (ChatGPT answered from general knowledge): #21 Thredbo/Perisher housing, #22 AU working holiday visa, #24 NZ vs AU pay, #32 doing two seasons in one year, #38 questions before accepting an offer, #40 is a season worth it. These are the easiest wins.
- Google AI Overviews: not measured (automated search hits a CAPTCHA). Check manually or via the owner's own Chrome.
- Scoreboard: MC_AEO_Phase0_Scoreboard.xlsx. Re-run every 4-6 weeks.

## Known bugs — ALL FIXED, verified live 2026-10-10
Each was re-checked against raw production HTML, not against a deploy status.

- ~~/jobs is not server-rendered~~ — fixed (`7948abf`). It emitted only a `<Suspense>` fallback; `JobsStaticList` is now the fallback and carries real listings.
- ~~/ski-resort-jobs/[country] shows "Open roles: 0"~~ — fixed (`7ad70da`). Root cause was an id-type mismatch: the query filtered `job_posts.resort_id` (UUID) with legacy ids ("1", "2"), so it matched nothing. Canada now reads **193**.
- ~~Homepage hero counters render 0 / 0 / 0+~~ — fixed (`2ed058e`). `AnimatedCounter` opened at `useState(0)`, so the server HTML said the platform had zero resorts in zero countries. It now opens at the true value and animates only when it cannot be seen starting. Reads **111 / 14 / 89**.
- ~~Homepage says both "50+ resorts" and "69 resorts"~~ — fixed. Zero occurrences of either; every figure comes from `getPlatformStats()`.

Verify any of these the same way — raw HTML, never the deploy status:
```
curl -s https://www.mountainconnects.com/ski-resort-jobs/canada | grep -i "open roles"
```

## JobPosting schema on unclaimed listings — DECIDED 2026-10-10: KEEP IT

Unclaimed listings emit a full `JobPosting` node, and that stays. 349 of 355
open listings are unclaimed imports, so this is the whole board; removing it
would take the site out of Google Jobs almost entirely.

This supersedes the earlier "do NOT emit JobPosting for unclaimed listings"
compromise. **Revisit only if Google Search Console flags them.**

What makes it defensible, each verified live rather than assumed:
- **`validThrough` is emitted** from `expires_at`, and expired listings answer
  **410** with the sitemap agreeing on the same filter. Stale postings are the
  main thing Google's job policy is about.
- `directApply` is now accurate. It was inverted and claiming `true` on all
  341 listings, including ones whose only route is an external email
  (`aee5657`).
- No duplicate (business + title) listings — the importer's idempotency holds.
- Pay and currency are correct at the source since migration 00109.
- Each unclaimed listing already carries a visible "hasn't claimed their
  Mountain Connects account yet" notice to the reader.

⚠️ **This raises the stakes on `occupationalCategory`.** It is published in
the schema on ~98% of the board, so a wrong category is a wrong claim to
Google, not just an odd filter result. Three were wrong and were corrected in
00111 — "Man-Lift Operator" (an aerial work platform) was the only job in
Lift Operations. Check the rendered schema, not just the rules, after any
change to `lib/jobs/category.ts`:

```
curl -s https://www.mountainconnects.com/jobs/<id> | grep -o '"occupationalCategory":"[^"]*"'
```

## Decisions
- Facebook-sourced / unclaimed listings stay indexed, **and keep their JobPosting JSON-LD** (decided 2026-10-10 — see the section above, which replaces the earlier compromise).
- Original data comes from our own live listings (no employer relationships yet). Most listings have pay and housing.
- Guides are drafted by Claude, edited by the founder, who adds first-hand details (moved from Australia to Canada).

## Honesty rules for published data
- Never publish a stat from fewer than 5 listings. Show sample size and "last updated" on every figure.
- Keep currencies separate (CAD/AUD/NZD/JPY...), no conversion.
- Show employer-posted vs sourced/unclaimed splits in internal reports.
- Flag outliers instead of silently dropping them.

**Backfilling a new field:** `scripts/backfill-housing-cost.ts` is the pattern. It reads the answer out of `job_posts.description` — which IS the advert text — rather than re-scraping Facebook, asks the model FOUR questions instead of seventeen (the project measured that a narrow schema is far more accurate), caches every paid answer so a re-run costs nothing, and never overwrites a value that is already there. Dry run by default.

**Enforced by `scripts/aeo-data-pull.ts`** — read-only, writes aggregates to `./aeo-data/` (gitignored). It applies all four rules and prints a measured, conditional data-quality report. Re-run it rather than quoting these numbers from memory.

## What the data can and cannot support (measured 2026-10-10, 355 open jobs)

Before writing a page, check it against this. Three of the planned figures do not exist in the database.

⚠️ **The counts below are a snapshot and go stale within hours** — the scrapes add listings and the expiry sweep removes them; "priced" moved 165 → 178 in the course of one afternoon. What is stable is which fields *exist* and which are *empty*, which is what this table is for. For a current number, run `npx tsx scripts/aeo-data-pull.ts` — never quote these.

| | |
|---|---|
| **Pay** | ~50% priced; of those, ~92% usable as hourly. `pay_amount` is numeric on **100%** of priced rows and `salary_range` is `"{CUR} {amount}/{period}"`, so pay parses cleanly despite being a text column. |
| ⚠️ **Pay period** | Read it from the `salary_range` suffix, **never infer it from the number**. `JPY 3500/hour` is about CAD 32 — a magnitude rule mislabels the entire Japanese board. |
| **Non-hourly pay** | ~14 jobs priced per season/total/month. Hours are recorded nowhere, and only 1 mentions them even in prose, so they are **excluded and counted**, never normalised. |
| **Housing offered** | `accommodation_included` on 355, `accommodation_type` on ~147. Usable. |
| **Housing cost** | Stated on 23 of 355 (15 priced, 8 explicitly free) after the 2026-10-10 backfill. **Only Niseko United clears the 5-listing floor** — 10 listings, median **JPY 4,615/week**. Aggregated as a median WEEKLY figure (night/month/season normalised; a month is 52/12 weeks, not 4). Check the pull before promising a cost page for any other resort. |
| ⏳ **Housing deducted from pay** | Stated on 2 of 355 — adverts rarely say. ⚠️ **NULLABLE boolean with no default** on purpose: "unknown" must never render as "paid separately", so this stays unpublishable rather than becoming quietly wrong. |
| **Passes / meals** | `ski_pass_included`, `meal_perks` — booleans, usable. |
| **Role category** | Populated on 349 of 355 since migration 00110. The 6 without carry titles with no signal and are NULL on purpose. |
| ❌ **Town** | `nearby_town_id` is null on 354 of 355. **"Pay by town" is not buildable** — only "pay by resort". 75 are recoverable from the business, but a business with venues in two towns would get the wrong one stamped on all its jobs. |
| **Employer-posted split** | 6 of 355. `job_posts.source` is `"Facebook"` for all 355, so the split must come from `business_profiles.is_claimed`, not `source`. 6 clears the 5-job floor by one — indicative, not publishable. |

⚠️ **The 00112 columns have no defaults, and the database enforces coherence.** A housing currency or period with no amount beside it is refused by a CHECK constraint — the `pay_currency` mistake below, written down where it cannot be repeated. Verified against production: currency-without-amount, period-without-amount, a bad period and a negative cost are all rejected; a complete row, and a deduction stated with no figure, are both accepted.

⚠️ **`pay_currency` used to mean "no pay found."** It carried a database default of `'USD'` and the importer omitted the field when extraction found no currency, so 177 of 341 open jobs said USD on a board with no US resorts. Fixed at the source in migration 00109 — nothing to denominate is now NULL, priced-but-unnamed derives from the resort's country (`lib/jobs/currency.ts`). If USD ever reappears outside the USA, check that default first.

## 6-week plan
- ~~Week 1: Run the data pull (read-only). Fix the bugs above. Agree the guide template.~~ — **data pull and bug fixes done 2026-10-10**; guide template below still needs a decision on the first three titles.
- Week 2: Three data pages: ski season pay by resort 2026/27; staff housing **availability and type** by resort, plus **cost for Niseko only** (the one resort over the 5-listing floor); resorts giving free passes/meals.
- Weeks 3-4: Six guides targeting the no-link prompts: AU working holiday visa for ski seasons; NZ vs AU pay; Northern then Southern Hemisphere in one year; questions before accepting an offer; is a season worth it and what you can save; how to avoid ski job scams.
- Week 5: Canada: how-to-get-hired and housing guides for Whistler, Banff/Lake Louise, Revelstoke. Add a "how to get hired" block to top resort pages.
- Week 6: Get listed or mentioned on skijobs, coolworks, skicanada.org. Re-run the 40 prompts and compare against baseline.

⚠️ **Weeks 3-4 target prompts about Australia and New Zealand, where we currently have no open jobs at all** (the board is Canada 182 / Japan 155 / France 4). The guides can still rank, but must not imply we have AU/NZ listings to apply to.

## Guide template
1. Title is the question people ask.
2. Two-line direct answer in the first paragraph, stated as plain fact.
3. "Last updated [date]" plus data source and sample size.
4. One table with the key figures.
5. Three to five short sections, each headed by a sub-question.
6. A 2-3 sentence first-hand tip from the founder.
7. FAQ block of 4-6 questions with FAQPage schema.
8. Links to the matching live job and resort pages.

Technical: server-rendered HTML, canonical URL, BlogPosting or Article schema, BreadcrumbList, listed in sitemap.xml, internal links from the relevant country/town/resort pages.

## Site-wide rules already enforced (do not undo these)
- **Numbers about our own size come from `lib/stats/platform-stats.server.ts`, never a literal.** Any page using it needs `export const dynamic = "force-dynamic"`; `revalidate` still prerenders at build time, where Vercel withholds the Sensitive Supabase keys and the counts come back empty.
- **One URL per resort.** `/resorts/<uuid>` permanently redirects to `/resorts/<legacy_id>`; link with `resortPath` from `lib/data/resort-url.ts`.
- **Expired listings answer 410**, and the sitemap must agree with that filter (`expires_at` null or in the future) or it advertises URLs that answer Gone.
- **One Organization and one WebSite node per page**, both from `app/layout.tsx` with a stable `@id`. The home page used to emit a second pair, one of which declared `sameAs: []`.
- **No page title may contain "Mountain Connects"** — the root layout appends it. Guarded by `lib/seo/title-template.test.ts`.
- **Reads of growing tables must page or head-count**, never a plain select: this project caps a select at 1000 rows silently. See `lib/supabase/fetch-all.ts`.
- **No invented copy.** No fake testimonials, named people or reviews. Nothing promising "get discovered", "apply with one profile" or "follow employers" — businesses cannot browse workers (00085), the follow feature is dormant, and 349 of 355 listings have nobody to message.

## Constraints
Don't touch auth, billing, dashboards or anything under /business or /employers.
Always run `git status` and `git diff --stat` first and never overwrite uncommitted work.
