# SEO Roadmap — "Ski Resort Jobs"

**Goal:** rank top 3 on Google for **"ski resort jobs"** (and country variants like "ski resort jobs Australia").

**Realistic timeline:** 6–12 months. Country variants come faster (3–6 months).

---

## ✅ Already shipped (2026-04-28)

- [x] Title + meta on homepage and `/jobs` lead with "Ski Resort Jobs"
- [x] New SEO landing page at `/ski-resort-jobs` (FAQ schema + CollectionPage schema + live job counts)
- [x] 14 country landing pages: `/ski-resort-jobs/australia`, `/canada`, `/japan`, `/usa`, `/france`, `/switzerland`, `/austria`, `/italy`, `/andorra`, `/argentina`, `/chile`, `/georgia`, `/sweden`, `/new-zealand`
- [x] Sitewide title cleanup (no more duplicated `| Mountain Connects`)
- [x] ISR caching on `/jobs`, `/employers`, `/blog` (faster page loads = better SEO)
- [x] Sitemap.xml lists all 156 URLs (homepage, jobs, resorts, towns, blog, businesses, ski-resort-jobs hub + countries)
- [x] JobPosting JSON-LD on every job detail page
- [x] Sentry wired up for error tracking
- [x] Google Search Console verified + sitemap submitted

---

## 🔥 This week (15 minutes total)

### Search Console — finish the bootstrap

- [ ] **Validate redirect fix** — Pages report → "Page with redirect" → click **VALIDATE FIX** button
- [ ] **Request indexing** for these 5 URLs (paste each in the top URL bar, click "Request indexing"):
  - `https://www.mountainconnects.com/`
  - `https://www.mountainconnects.com/ski-resort-jobs`
  - `https://www.mountainconnects.com/jobs`
  - `https://www.mountainconnects.com/ski-resort-jobs/australia`
  - `https://www.mountainconnects.com/employers`
- [ ] **Set up Bing Webmaster Tools** — same idea, submit sitemap. 5% market share, less competition. https://www.bing.com/webmasters

---

## 📊 Week 2 — measure baseline

- [ ] Open Search Console → **Performance** tab
- [ ] Filter by **Country: Australia** (your highest-content market)
- [ ] Note: which queries you're showing up for, what position, what CTR
- [ ] Repeat for **Canada**, **NZ**, **Japan**

> First time "ski resort jobs" appears, you'll likely be at position 30–80. That's normal. The job is to climb.

---

## ✍️ Weeks 2–8 — content engine

### Three highest-priority blog posts (1500+ words each)

- [ ] **"How to Get a Ski Resort Job With No Experience"**
  - Target keyword: "ski resort jobs no experience"
  - Why first: high volume, low difficulty
  - Internal links: every country page + `/jobs` filter for entry-level

- [ ] **"Working Holiday Visa Guide: Ski Resort Jobs in Australia"**
  - Target keyword: "ski resort jobs Australia visa"
  - Why second: links naturally to your AU country landing page
  - Repeat for Canada, NZ, Japan after this one performs

- [ ] **"Best Ski Resorts to Work At in 2026"**
  - Target keyword: "best ski resorts to work at"
  - Why third: ranking listicles always pull traffic
  - Link to your top 10 most active business profiles

### Then 2–3 posts/month on these themes
- [ ] Country-specific: "Working at Niseko: A Beginner's Guide"
- [ ] Role guides: "What Does a Lift Operator Actually Do?"
- [ ] Worker stories: real interviews, day-in-the-life, salary breakdowns
- [ ] Resort comparisons: "Whistler vs Banff vs Revelstoke for Workers"

---

## 🔗 Months 2–6 — backlinks (the slow lever)

This is the big one. Code can't help here. **Aim: 10–30 quality backlinks in 6 months.**

### Targets (in rough effort/reward order)

- [ ] **University career sites** — email AU/NZ/CA unis: "Free job board resource for your students chasing seasonal work, would your travel/exchange office find this useful?"
- [ ] **Reddit answers** — r/skijobs, r/skiing, r/snowboarding, r/IWantOut. Answer questions genuinely; link to specific listings or the country page when relevant. **Never spam.**
- [ ] **Facebook groups** — share specific high-value job postings, not general "check out my site" promos
- [ ] **Resort HR pages** — cold email resort marketing teams: "I run a free aggregator that drives candidates to your job pages — would you be open to a link in your careers section?"
- [ ] **Press pitches** — Mountain Watch, Powder Magazine, Snow Industry News. Pitch story angles ("Australian seasonal worker shortage" / "Top 10 employers for working visa holders") with a link back
- [ ] **Coolworks** — they're #1 for "seasonal jobs". Long shot but pitch a content collaboration
- [ ] **Industry directories** — Ski Resort Trust, SnowsBest, ChillFactor. Paid + free directory listings
- [ ] **Podcast appearances** — pitch yourself as a guest on ski-industry / digital nomad / working holiday podcasts

---

## 🏗 Months 2–4 — structural improvements

Things to ship as code when there's bandwidth.

- [ ] **Internal-link pass** — homepage CTA + footer links + cross-links from blog posts pointing to `/ski-resort-jobs`. Pumps page authority into the keyword hub.
- [ ] **Per-resort job listings cache improvements** — `/resorts/[id]` and `/jobs/[id]` are still dynamic. Adding `revalidate = 300` would speed them up.
- [ ] **Image optimisation pass** — Unsplash hero images on towns/resorts could be served via Vercel's image optimisation with proper `priority` / `loading` flags
- [ ] **Lighthouse audit** — run on prod, fix anything under 90 score
- [ ] **Hreflang tags** — when we have country-specific content, add `<link rel="alternate" hreflang="en-AU" />` etc. to country pages
- [ ] **Mobile UX audit** — most ski-job seekers browse on phones. Confirm filters and apply flow are tappable

---

## 📈 Honest expectations

| Timeframe | Expected position for "ski resort jobs" |
|---|---|
| Week 1–2 | Not ranking yet (Google still crawling) |
| Week 3–6 | Showing up at position 50–100 |
| Month 2–4 | Position 20–50 if content is good |
| Month 4–8 | Position 5–15 if you've earned 10+ quality backlinks |
| Month 8–12 | Top 3 achievable for **regional variants**. Top 1 globally takes longer. |

**Country variants are your easier wins.** "Ski resort jobs Australia" is far less competitive than "ski resort jobs". Aim for top 3 there in 4–6 months.

---

## 🎯 Quarterly checkpoints

Every 3 months:

- [ ] Review Search Console Performance — what's pulling traffic, what isn't
- [ ] Audit competitors — search "ski resort jobs" yourself; what's ranked above you, why?
- [ ] Refresh hero copy on `/ski-resort-jobs` and country pages with current season info
- [ ] Update blog posts that have aged (year references, salary numbers, visa rules)
- [ ] Add 5+ new backlinks via the targets list above
- [ ] Decide if any new country/role landing pages would pull search volume worth the effort

---

## 🔧 Tools you should know

- **Google Search Console** — your daily driver. Performance report = traffic data; Pages report = indexing health
- **Google Analytics 4** — you have it (`G-WZ9DNV9C57`). Cross-reference with GSC for behaviour after the click
- **Bing Webmaster Tools** — bonus traffic source
- **Ahrefs / Semrush** — paid keyword + backlink trackers. Useful but not essential at this stage. ~$100/mo each. **Skip until you've published 10+ blog posts.**
- **Manual: search incognito** — every couple weeks, search "ski resort jobs" in incognito mode and note what's ranked. Scrape your competitors' tactics.

---

## 📞 Who to call if something breaks

- **Sudden ranking drop** → Search Console → Manual Actions tab. Should be empty. If not, fix immediately.
- **Indexing keeps failing** → Pages report shows reasons. Most common: "Page with redirect" (false positive on apex/HTTPS), "Discovered - not indexed" (wait it out), "Crawled - not indexed" (content quality flag — improve the page).
- **Sitemap shows errors** → fetch `https://www.mountainconnects.com/sitemap.xml` directly in browser; if it loads as XML, sitemap is fine. Errors usually mean prod is down or migration broke something.

---

*Last updated: 2026-04-28*
