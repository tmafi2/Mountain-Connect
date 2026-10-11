/**
 * Crawl production and report what is actually wrong, page by page.
 *
 * ⚠️ WHY NOT JUST LIGHTHOUSE. Its SEO category checks that a title exists, a
 * meta description exists and links are crawlable. Every problem this site has
 * actually shipped passed all of that: a `validThrough` built from the wrong
 * column, `directApply` inverted so it was true exactly when it was false, a
 * median labelled CAD that was yen, an FAQ answer carrying raw markdown into
 * the schema, "69 Ski Resorts" for five months. Those are content and
 * structured-data faults, and they need checks that know what this site claims.
 *
 * ⚠️ IT REPORTS, IT NEVER FIXES. Read-only: GET requests to production and a
 * printed report.
 *
 *   npx tsx scripts/seo-audit.ts                 # a sample of every page type
 *   npx tsx scripts/seo-audit.ts --all           # every url in sitemap.xml
 *   npx tsx scripts/seo-audit.ts --base http://localhost:3000
 */

const args = process.argv.slice(2);
const BASE = (args[args.indexOf("--base") + 1] ?? "").startsWith("http")
  ? args[args.indexOf("--base") + 1]
  : "https://www.mountainconnects.com";
const ALL = args.includes("--all");
const LIMIT = Number(args[args.indexOf("--limit") + 1]) || 60;

type Issue = { url: string; level: "error" | "warn"; check: string; detail: string };
const issues: Issue[] = [];
const add = (url: string, level: Issue["level"], check: string, detail: string) =>
  issues.push({ url, level, check, detail });

async function get(url: string): Promise<{ status: number; body: string; headers: Headers }> {
  const res = await fetch(url, { redirect: "follow", headers: { "user-agent": "mountain-connect-seo-audit" } });
  return { status: res.status, body: await res.text(), headers: res.headers };
}

const tag = (html: string, re: RegExp): string | null => html.match(re)?.[1]?.trim() ?? null;
const metaName = (html: string, name: string) =>
  tag(html, new RegExp(`<meta[^>]+name=["']${name}["'][^>]+content=["']([^"']*)["']`, "i")) ??
  tag(html, new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]+name=["']${name}["']`, "i"));
const metaProp = (html: string, p: string) =>
  tag(html, new RegExp(`<meta[^>]+property=["']${p}["'][^>]+content=["']([^"']*)["']`, "i"));

function jsonLd(html: string): Record<string, unknown>[] {
  const out: Record<string, unknown>[] = [];
  for (const m of html.matchAll(/<script[^>]+application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi)) {
    const raw = m[1].replace(/&quot;/g, '"').replace(/&amp;/g, "&").replace(/&#x27;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">");
    try {
      const parsed = JSON.parse(raw);
      for (const node of Array.isArray(parsed) ? parsed : [parsed]) out.push(node);
    } catch {
      out.push({ __invalid: raw.slice(0, 120) });
    }
  }
  return out;
}

function checkPage(url: string, status: number, html: string) {
  if (status !== 200) {
    add(url, "error", "status", `returned ${status}`);
    return;
  }

  // ── the basics, which are cheap and do occasionally break ──────────────
  const title = tag(html, /<title>([\s\S]*?)<\/title>/i);
  if (!title) add(url, "error", "title", "no <title>");
  else if (title.length > 65) add(url, "warn", "title", `${title.length} chars — truncated in results: "${title.slice(0, 70)}…"`);

  const desc = metaName(html, "description");
  if (!desc) add(url, "error", "meta-description", "missing");
  else if (desc.length > 165) add(url, "warn", "meta-description", `${desc.length} chars, will be cut`);

  const canonical = tag(html, /<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)["']/i);
  if (!canonical) add(url, "error", "canonical", "missing");
  else {
    if (!canonical.startsWith("https://www.")) add(url, "error", "canonical", `not the canonical host: ${canonical}`);
    // ⚠️ A page declaring ITSELF canonical under two urls was a real bug here
    // (/resorts/<legacy> and /resorts/<uuid>), so compare, don't just exist.
    const self = url.split("?")[0].replace(/\/$/, "");
    const can = canonical.split("?")[0].replace(/\/$/, "");
    if (can !== self && !url.includes("?")) add(url, "warn", "canonical", `points elsewhere: ${can}`);
  }

  const robots = metaName(html, "robots") ?? "";
  if (/noindex/i.test(robots)) add(url, "warn", "robots", `noindex: "${robots}"`);

  const h1s = [...html.matchAll(/<h1[^>]*>([\s\S]*?)<\/h1>/gi)].map((m) => m[1].replace(/<[^>]+>/g, "").trim());
  if (h1s.length === 0) add(url, "error", "h1", "no h1");
  else if (h1s.length > 1) add(url, "warn", "h1", `${h1s.length} h1s: ${h1s.map((h) => h.slice(0, 28)).join(" | ")}`);

  if (!metaProp(html, "og:image")) add(url, "warn", "og:image", "missing — shares render bare");

  // ── the body, in the state a crawler sees it ───────────────────────────
  const text = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&[a-z]+;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (text.split(" ").length < 120) add(url, "warn", "thin", `${text.split(" ").length} words of rendered text`);

  // ⚠️ The template placeholders that have reached production before.
  for (const leak of ["::figures", "{{", "Loading jobs", "undefined", "NaN", "[object Object]", "migration 00"]) {
    if (text.includes(leak)) add(url, "error", "leaked", `rendered text contains ${JSON.stringify(leak)}`);
  }

  // ── structured data, where this site's real faults have lived ──────────
  const nodes = jsonLd(html);
  const types = nodes.map((n) => String(n["@type"] ?? "?"));
  if (nodes.some((n) => "__invalid" in n)) add(url, "error", "json-ld", "a block does not parse");

  for (const n of nodes) {
    const t = String(n["@type"] ?? "");

    if (t === "JobPosting") {
      for (const req of ["title", "description", "datePosted", "hiringOrganization", "jobLocation"]) {
        if (!n[req]) add(url, "error", "JobPosting", `missing ${req}`);
      }
      if (!n.validThrough) add(url, "warn", "JobPosting", "no validThrough — Google drops stale postings");
      const sal = n.baseSalary as Record<string, any> | undefined;
      const unit = sal?.value?.unitText;
      const amount = Number(sal?.value?.value ?? sal?.value?.minValue ?? 0);
      // ⚠️ "60000 an hour" shipped once. The period must come from the advert,
      // never be inferred — but a yen hourly rate is legitimately ~3500.
      if (unit === "HOUR" && amount >= 10000) {
        add(url, "warn", "JobPosting", `baseSalary ${amount} ${sal?.currency ?? ""} per HOUR — check the period`);
      }
      if (sal && !sal.currency) add(url, "error", "JobPosting", "baseSalary with no currency");
    }

    if (t === "FAQPage") {
      const qs = (n.mainEntity as any[]) ?? [];
      if (qs.length === 0) add(url, "error", "FAQPage", "empty mainEntity");
      for (const q of qs) {
        const a = String(q?.acceptedAnswer?.text ?? "");
        if (!a) add(url, "error", "FAQPage", `"${String(q?.name).slice(0, 40)}" has no answer`);
        // ⚠️ Raw markdown reached this block once; the page looked perfect.
        if (/\]\(|\*\*|^#|`/m.test(a)) add(url, "error", "FAQPage", `markdown in an answer: ${a.slice(0, 70)}`);
        if (/\{\{|::figures/.test(a)) add(url, "error", "FAQPage", "unsubstituted token in an answer");
        // ⚠️ "CAD $21 to CAD $1,400" where 1,400 was yen.
        const codes = [...new Set((a.match(/\b(CAD|JPY|AUD|NZD|USD|EUR|GBP)\b/g) ?? []))];
        if (codes.length > 1) add(url, "warn", "FAQPage", `two currencies in one answer (${codes.join(", ")}) — check they are not compared`);
      }
    }

    if (t === "BlogPosting" || t === "Article") {
      if (!n.datePublished) add(url, "warn", t, "no datePublished");
      if (!n.headline) add(url, "error", t, "no headline");
    }

    if (t === "BreadcrumbList") {
      const items = (n.itemListElement as any[]) ?? [];
      if (items.some((i) => !i.item)) add(url, "warn", "BreadcrumbList", "an item has no url");
    }
  }

  return { types, title, canonical };
}

async function sitemapUrls(): Promise<string[]> {
  const { body } = await get(`${BASE}/sitemap.xml`);
  return [...body.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
}

/** One of each kind of page, which is where a type-wide fault shows up. */
function sample(urls: string[]): string[] {
  const want: [string, RegExp][] = [
    ["home", /^https?:\/\/[^/]+\/?$/],
    ["jobs index", /\/jobs\/?$/],
    ["job", /\/jobs\/[0-9a-f-]{8,}/],
    ["resort", /\/resorts\//],
    ["town", /\/towns\//],
    ["blog index", /\/blog\/?$/],
    ["blog post", /\/blog\/[a-z]/],
    ["country", /\/ski-resort-jobs\/[a-z]/],
    ["business", /\/business\//],
    ["region", /\/regions\//],
  ];
  const picked = new Set<string>([`${BASE}/`, `${BASE}/jobs`, `${BASE}/blog`,
    `${BASE}/ski-season-pay`, `${BASE}/staff-housing`, `${BASE}/ski-pass-and-meals`, `${BASE}/about`]);
  for (const [, re] of want) {
    for (const u of urls) if (re.test(u) && !picked.has(u)) { picked.add(u); break; }
  }
  // A couple more of the big templates, where one bad row hides among many.
  for (const re of [/\/resorts\//, /\/towns\//, /\/blog\/[a-z]/, /\/jobs\/[0-9a-f-]{8,}/]) {
    let n = 0;
    for (const u of urls) {
      if (re.test(u) && !picked.has(u) && n < 2) { picked.add(u); n++; }
    }
  }
  return [...picked];
}

async function main() {
  console.log(`\nAuditing ${BASE}\n${"─".repeat(72)}`);

  // ── site-wide ──────────────────────────────────────────────────────────
  const robots = await get(`${BASE}/robots.txt`);
  const AI = ["GPTBot", "OAI-SearchBot", "PerplexityBot", "ClaudeBot", "Google-Extended", "CCBot"];
  const blocked = AI.filter((b) => new RegExp(`User-agent:\\s*${b}[\\s\\S]{0,200}?Disallow:\\s*/\\s*$`, "im").test(robots.body));
  console.log(`robots.txt            ${robots.status} · ${blocked.length ? "BLOCKS " + blocked.join(", ") : "no AI crawler blocked"}`);
  if (!/sitemap:/i.test(robots.body)) add(`${BASE}/robots.txt`, "error", "robots", "no Sitemap: line");

  const llms = await get(`${BASE}/llms.txt`);
  console.log(`llms.txt              ${llms.status === 200 ? "present" : "absent (optional, emerging convention)"}`);

  const urls = await sitemapUrls();
  console.log(`sitemap.xml           ${urls.length} urls`);
  const offHost = urls.filter((u) => !u.startsWith("https://www.mountainconnects.com"));
  if (offHost.length) add(`${BASE}/sitemap.xml`, "error", "sitemap", `${offHost.length} urls on another host`);
  if (new Set(urls).size !== urls.length) add(`${BASE}/sitemap.xml`, "warn", "sitemap", "duplicate urls");

  const targets = (ALL ? urls : sample(urls)).slice(0, ALL ? urls.length : LIMIT);
  console.log(`checking              ${targets.length} page(s)\n`);

  const byType = new Map<string, number>();
  for (const u of targets) {
    try {
      const { status, body } = await get(u);
      const r = checkPage(u, status, body);
      for (const t of r?.types ?? []) byType.set(t, (byType.get(t) ?? 0) + 1);
    } catch (err) {
      add(u, "error", "fetch", String(err).slice(0, 90));
    }
  }

  console.log("structured data seen:");
  for (const [t, n] of [...byType.entries()].sort((a, b) => b[1] - a[1])) console.log(`  ${String(n).padStart(3)} × ${t}`);

  const errors = issues.filter((i) => i.level === "error");
  const warns = issues.filter((i) => i.level === "warn");
  for (const [label, list] of [["ERRORS", errors], ["WARNINGS", warns]] as const) {
    if (!list.length) continue;
    console.log(`\n${label} (${list.length})\n${"─".repeat(72)}`);
    const grouped = new Map<string, Issue[]>();
    for (const i of list) grouped.set(i.check, [...(grouped.get(i.check) ?? []), i]);
    for (const [check, items] of [...grouped.entries()].sort((a, b) => b[1].length - a[1].length)) {
      console.log(`\n  ${check} — ${items.length}`);
      for (const i of items.slice(0, 6)) console.log(`    ${i.url.replace(BASE, "")}\n      ${i.detail}`);
      if (items.length > 6) console.log(`    … and ${items.length - 6} more`);
    }
  }

  console.log(`\n${"─".repeat(72)}`);
  console.log(`${errors.length} error(s), ${warns.length} warning(s) across ${targets.length} page(s)`);
  process.exit(errors.length ? 1 : 0);
}

main();
