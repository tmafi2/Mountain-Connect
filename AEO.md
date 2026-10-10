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
| **Town** | Carried by 76 of 355 after the 2026-10-10 backfill. **Three towns clear the 5-listing floor for pay** — Revelstoke (10 priced), Fernie (5), Furano (5) — so `pay_by_town.csv` is now a real output. Hakuba has 13 listings but only 4 priced: a town page yes, a pay figure no. A town is inherited from the business ONLY where it is linked to that job's resort (00113). |
| **Employer-posted split** | 6 of 355. `job_posts.source` is `"Facebook"` for all 355, so the split must come from `business_profiles.is_claimed`, not `source`. 6 clears the 5-job floor by one — indicative, not publishable. |

⚠️ **The 00112 columns have no defaults, and the database enforces coherence.** A housing currency or period with no amount beside it is refused by a CHECK constraint — the `pay_currency` mistake below, written down where it cannot be repeated. Verified against production: currency-without-amount, period-without-amount, a bad period and a negative cost are all rejected; a complete row, and a deduction stated with no figure, are both accepted.

⚠️ **`pay_currency` used to mean "no pay found."** It carried a database default of `'USD'` and the importer omitted the field when extraction found no currency, so 177 of 341 open jobs said USD on a board with no US resorts. Fixed at the source in migration 00109 — nothing to denominate is now NULL, priced-but-unnamed derives from the resort's country (`lib/jobs/currency.ts`). If USD ever reappears outside the USA, check that default first.

## 6-week plan
- ~~Week 1: Run the data pull (read-only). Fix the bugs above. Agree the guide template.~~ — **data pull and bug fixes done 2026-10-10**; guide template below still needs a decision on the first three titles.
- ~~Week 2 page 1: ski season pay~~ — **SHIPPED 2026-10-10 at `/ski-season-pay`.** Pay by TOWN, not resort: a worker searching "ski season pay" is deciding where to live. Revelstoke, Furano and Fernie clear the floor; Hakuba appears with its job count and housing share but no wage. Article + BreadcrumbList + FAQPage schema, in the sitemap, linked from every town page.
- ~~Week 2 page 2: staff housing~~ — **SHIPPED 2026-10-10 at `/staff-housing`.** Availability and type for all 10 resorts with 5+ open listings; cost for Niseko only, exactly as predicted. Rusutsu reads "mostly free" (4 of the 5 that say). Free and charged housing are counted separately, never averaged.
- ~~Week 2 page 3: passes and meals~~ — **SHIPPED 2026-10-10 at `/ski-pass-and-meals`.** 56 of 355 listings advertise a pass, 59 advertise meals. ⚠️ It counts what adverts SAY, never what jobs include — see the lesson below.
- **Week 2 is done.**
- Week 2 addition now possible: **pay by town** for Revelstoke, Fernie and Furano. A worker searches for somewhere to LIVE, so the town is usually the real question behind "what does a season pay?".
- ~~Weeks 3-4: six guides targeting the no-link prompts~~ — **SHIPPED 2026-10-10.** All six published, each with 5 FAQs in `FAQPage` schema (no blog post had any before):
  - `/blog/australian-working-holiday-visa-ski-season` — do you need a visa to work a ski season in Australia?
  - `/blog/new-zealand-vs-australia-ski-season-pay` — which pays more?
  - `/blog/two-ski-seasons-in-one-year` — northern then southern hemisphere
  - `/blog/questions-to-ask-before-accepting-ski-season-job` — **rewrote an existing 1,893-char post** (the version it replaced is archived in `docs/blog-originals/`, because `blog_posts` has no revision history); the other five are new
  - `/blog/is-a-ski-season-worth-it` — and what you can actually save
  - `/blog/how-to-avoid-ski-job-scams`
- Week 5: Canada: how-to-get-hired and housing guides for Whistler, Banff/Lake Louise, Revelstoke. Add a "how to get hired" block to top resort pages.
- Week 6: Get listed or mentioned on skijobs, coolworks, skicanada.org. Re-run the 40 prompts and compare against baseline.

⚠️ **Weeks 3-4 target prompts about Australia and New Zealand, where we have no open jobs at all** (the board is Canada / Japan / France — re-measure with `npm run preview:expiry` or `scripts/aeo-data-pull.ts`, don't trust a number typed here; the split written into this file in the morning was already 14 listings stale by the afternoon). The guides rank without implying we have AU/NZ listings: each one says in its own words where our listings actually are, and `/blog/two-ski-seasons-in-one-year` states it outright.

## Lessons from the data pages (`/ski-season-pay`, `/staff-housing`)

- ⚠️ **Read the rendered page, not the code.** The FAQ answer shipped into
  `FAQPage` schema as *"median hourly pay ranges from CAD $21 to CAD $1,400"*
  — 1,400 being **yen**, labelled as Canadian dollars. A plain `Math.min`/
  `Math.max` across towns silently compared two currencies. `rangeByCurrency`
  now groups by currency first. The schema block is the part an answer engine
  quotes verbatim, so it deserves more scrutiny than the visible copy, not
  less.
- **A range with identical ends is not a range.** Fernie rendered "CAD
  $21–$21". Suppressed — the median above already says the number.
- **Keep towns that have jobs but no wage data.** Hakuba has 13 listings and
  only 4 priced. Dropping it would imply there is no work there; it shows its
  job count and housing share with the wage column reading "not enough data".
- **No founder tip was written.** The template asks for one and it is Tyler's
  to add — inventing it would be a fake testimonial. There is a marked place
  for it in both pages.
- ⚠️ **Never average two different facts.** At Rusutsu four listings say staff
  housing is free and one charges ¥35,000/month. A median across all five is
  0, publishing "housing at Rusutsu is free" while one in five charges — true
  on average, wrong for the reader. Free and charged are separate counts.
- ⚠️ **An empty cell is read as good news.** "—" in a cost column reads as
  "it's free". Every blank says WHY: "no listing says", "3 of 14 state a
  cost", "mostly free — 4 of the 5 that say".
- **A branch with four outcomes does not belong in JSX.** The cost cell got it
  wrong twice — once contradicting itself ("Not stated — only 5 of 5 say"),
  once quietly ducking the 5-listing floor — before the decision moved into
  `costState()` where it is tested.
- ⚠️ **FIXED 2026-10-10 for passes and meals (00114 + a rebuild).** The
  columns are tri-state now and every advert was re-read. The rebuild found
  the *confirmations* were wrong too — 12 pass and 21 meal `true` values had
  no support in their advert, because the seventeen-field extraction inferred
  perks from context. `/ski-pass-and-meals` was overstating by about a fifth.
  Now: pass 47 true / 308 silent, meals 38 / 317, zero false positives.
  **`accommodation_included` fixed the same way in 00115** — wrong in BOTH
  directions there (27 of 159 confirmations unsupported, 32 of 196 falses
  actually offering housing). Now 139 offered / 9 refused / 207 unstated. All
  three perk booleans are tri-state; none of them defaults.
- ⚠️ **A rewritten extraction prompt needs its answers read, not its rules.**
  The accommodation rebuild's first prompt got 3 of 6 definite answers wrong —
  housing attached to a *different* role, a 20%-off *guest* hotel discount
  read as staff housing, and "no" returned for plain silence. All three were
  invisible in the prompt and obvious in the output. Each is now its own line
  in it.
- ⚠️ **`false` can mean "didn't say".** `ski_pass_included`, `meal_perks` and
  `accommodation_included` are all `BOOLEAN NOT NULL DEFAULT false`, and the
  importer omits the field when an advert is silent — so a `false` cannot be
  told apart from a no. Measured: of 299 open listings with no pass recorded,
  only **4** mention a pass anywhere in their text. "16% advertise a pass" is
  therefore true; **"84% don't include one" is not supported**, and the perks
  module deliberately has no field that would produce it. The same wording
  trap was already live in the housing page's FAQ ("some do and most do not")
  and was fixed in the same commit. **This is the `pay_currency = 'USD'`
  pattern in three more columns** — the proper fix is to make them nullable
  and re-read the adverts, the way 00109 and the housing-cost backfill did.
- **The floor applies to the lead paragraph too.** It quoted "Rusutsu: 100%"
  with the sample size only in the table below. Every figure carries its
  denominator where it is stated.

## Lessons from the six guides (Weeks 3-4)

- ⚠️ **A guide must not contain a typed number.** `/about` carried "69 Ski
  Resorts" for five months while the real figure was 111, because nobody
  re-reads their own copy. So the guides carry `{{tokens}}` resolved at render
  time from the live board (`lib/blog/live-figures.server.ts`), and the blog
  route is `force-dynamic` for it.
- ⚠️ **And a missing number must not be visible.** Tokens are legal ONLY on a
  line beginning `::figures`, which the renderer DROPS WHOLE when the figures
  cannot be read — so a guide still reads correctly with the database down,
  and never renders "0", a dash mid-sentence or a raw `{{openJobs}}`. A line
  whose tokens do not all resolve is dropped rather than published half
  filled. `tokensInProse()` and `unknownTokens()` make both mistakes findable;
  all 30 FAQ answers were checked to still read with the figures removed.
- **The FAQ is parsed from the RENDERED markdown, not the source** — so no
  token can reach `FAQPage` schema, which is the part an answer engine quotes.
  `## FAQ` then `### question`; a post without one emits no node rather than
  an empty one.
- **The external facts are pointed at, not quoted.** Visa conditions and
  minimum wages change on government timetables and would go stale silently in
  our copy, exactly like the resort count. The guides name the official source
  and link it; the only numbers they state are our own board's.
- ⚠️ **The honest answer about our own listings is in the guides.** Most are
  sourced from public adverts rather than posted by the employer, so the scams
  guide says so when asked "are the listings on Mountain Connects verified?".
  That answer contradicts the homepage, which still says "verified jobs" — a
  separate open item, and the reason this one was written carefully.
- **No founder tip was written, again.** Template item 6 is Tyler's; six
  invented first-hand tips would be six fake testimonials.
- ⚠️ **Every markdown link opened in a new tab.** `MarkdownRenderer` set
  `target="_blank"` on all of them, so the moment a guide linked
  `/staff-housing` it threw the reader out of the page and into a second copy
  of our own site. Internal links now go through `next/link` and stay in the
  tab; only external ones open away. It had never shown up because no blog
  post had an internal link before.
- ⚠️ **`/support` is behind the login wall** (307 to `/login?redirect=/support`).
  The scams guide tells a reader how to report a fraudulent listing, so it
  points at the published `contact@mountainconnects.com` instead — a reader
  being warned about scams is, by definition, not logged in. Check a route
  answers 200 to a logged-out request before linking it from a public page.
- **The authority is linked, not just named.** Home Affairs, Immigration NZ,
  Employment NZ, Fair Work and the Canadian IEC pages are cited by URL, each
  one checked to answer 200 first. `fairwork.gov.au` blocks automated requests
  from here, so only its root is linked — an unverifiable deep path is worse
  than a shallow verified one.
- **The data pages link back.** `/ski-season-pay`, `/staff-housing` and
  `/ski-pass-and-meals` each carry a button to the matching guide, so the pair
  reinforces rather than competing.

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
