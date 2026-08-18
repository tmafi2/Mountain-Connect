/**
 * scripts/fb-monitor/collect.ts
 *
 *   npm run fb:collect -- --group https://www.facebook.com/groups/123 --posts 25
 *   npm run fb:collect -- --groups scripts/fb-monitor/groups.json --headed
 *
 * Walks group feeds in a signed-in browser and writes posts.json in the shape
 * fb:extract already consumes. Run `npm run fb:login` once first.
 *
 * SELECTOR STRATEGY. Facebook's class names are generated hashes that change
 * without notice, so none are used here. What this leans on instead, roughly in
 * order of durability:
 *
 *   [data-ad-preview="message"]   FB's own data attribute for post body text
 *   [role="feed"]                 accessibility markup for the feed container
 *   a[href*="/posts/"]            permalink shape, part of their URL contract
 *   img[src*="scontent"]          their CDN hostname
 *
 * Measured against the live site rather than assumed. Two findings drove the
 * current design, both the opposite of the obvious guess:
 *
 *   role="article" is used for COMMENTS, not posts. A group page has 2-3 of
 *   them, mostly with empty innerText. Anchoring on it returns nothing.
 *
 *   The feed is VIRTUALISED — posts are unmounted once they scroll out of
 *   view, so only 1-3 post bodies exist in the DOM at any moment however far
 *   you have scrolled. Scraping must therefore happen on every scroll step and
 *   accumulate; a single pass at the end collects almost nothing.
 *
 * So the anchor is the post BODY, and the container is found by walking up to
 * whichever ancestor is a direct child of the feed.
 *
 * Even so this WILL break eventually. The design principle throughout is that
 * breakage must be loud: zero articles, or articles with no text, are reported
 * as errors rather than returned as "the group was quiet today". A silent empty
 * result is the one failure mode that would let a scheduled job look healthy
 * while collecting nothing for weeks.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import * as path from "node:path";

import type { Page } from "playwright";

import { isLoggedOut, launch, pause } from "./browser";

const DEFAULT_POSTS_PER_GROUP = 25;
const MAX_SCROLLS = 30;
/** Images narrower than this are avatars, reaction icons and spacers. */
const MIN_IMAGE_WIDTH = 250;

type ScrapedPost = {
  id: string;
  group: string;
  author: string | null;
  text: string;
  permalink: string | null;
  postedAt: string | null;
  images?: string[];
};

/** What page.evaluate hands back, before images are downloaded. */
type RawScraped = {
  author: string | null;
  text: string;
  permalink: string | null;
  postedAt: string | null;
  imageUrls: string[];
};

function fail(message: string): never {
  process.stderr.write(`\nfb-collect: ${message}\n\n`);
  process.exit(1);
}

function note(message: string): void {
  process.stderr.write(`${message}\n`);
}

/** Expand every "See more" so the feed shows full post text rather than a teaser. */
async function expandPosts(page: Page): Promise<number> {
  return page.evaluate(String.raw`(() => {
    var buttons = Array.prototype.slice.call(
      document.querySelectorAll('div[role="button"], span[role="button"]')
    );
    var clicked = 0;
    for (var i = 0; i < buttons.length; i++) {
      var label = (buttons[i].textContent || '').trim().toLowerCase();
      if (label === 'see more' || label === '\u2026see more' || label === 'see more.') {
        buttons[i].click();
        clicked++;
      }
    }
    return clicked;
  })()`) as Promise<number>;
}

/**
 * Pull structured posts out of the rendered feed.
 *
 * Runs in browser context, so this is plain DOM code with no Node APIs. It
 * returns raw shapes; image downloading happens back in Node where the request
 * context carries the session cookies.
 */
async function scrapePosts(page: Page): Promise<RawScraped[]> {
  // Evaluated as a string on purpose: tsx/esbuild rewrites named arrow
  // functions with a __name helper that does not exist in page context, so a
  // normal TS callback here fails with "__name is not defined".
  return page.evaluate(String.raw`(() => {
    var MIN_IMAGE_WIDTH = ${MIN_IMAGE_WIDTH};
    var bodies = Array.prototype.slice.call(
      document.querySelectorAll('[data-ad-preview="message"], [data-ad-comet-preview="message"]')
    );
    var out = [];

    for (var b = 0; b < bodies.length; b++) {
      var body = bodies[b];
      var text = (body.innerText || '').trim();
      if (text.length < 20) continue;

      // Loading skeletons render as the word "Facebook" repeated.
      if (/^(Facebook\s*)+$/.test(text)) continue;

      // Walk up to the element that is a direct child of the feed; that is the
      // whole post, including its header, permalink and attachments.
      var container = body;
      for (var up = 0; up < 30; up++) {
        var parent = container.parentElement;
        if (!parent) break;
        if (parent.getAttribute('role') === 'feed') break;
        container = parent;
      }

      var links = Array.prototype.slice.call(container.querySelectorAll('a[href]'));

      var permalink = null;
      var postedAt = null;
      for (var i = 0; i < links.length; i++) {
        var href = links[i].href || '';
        if (/\/posts\/|permalink|story_fbid/.test(href) && href.indexOf('comment_id') === -1) {
          permalink = href.split('?')[0];
          postedAt =
            links[i].getAttribute('aria-label') ||
            links[i].getAttribute('title') ||
            (links[i].innerText || '').trim() ||
            null;
          break;
        }
      }

      var author = null;
      for (var j = 0; j < links.length; j++) {
        var ahref = links[j].href || '';
        var atext = (links[j].innerText || '').trim();
        if (!atext) continue;
        if (ahref.indexOf('/groups/') !== -1) continue;
        if (!/facebook\.com\/(profile\.php|people\/|[^\/]+\/?$)/.test(ahref)) continue;
        author = atext.split('\n')[0];
        break;
      }

      var imgs = Array.prototype.slice.call(container.querySelectorAll('img'));
      var seen = {};
      var imageUrls = [];
      for (var k = 0; k < imgs.length; k++) {
        var src = imgs[k].src || '';
        if (!/scontent|fbcdn/.test(src)) continue;
        var w = imgs[k].naturalWidth || imgs[k].width || 0;
        if (w < MIN_IMAGE_WIDTH) continue;
        if (seen[src]) continue;
        seen[src] = true;
        imageUrls.push(src);
      }

      out.push({
        author: author,
        text: text,
        permalink: permalink,
        postedAt: postedAt ? String(postedAt).trim() : null,
        imageUrls: imageUrls
      });
    }

    return out;
  })()`) as Promise<RawScraped[]>;
}

/** Read the group's own name so posts carry it rather than a bare id. */
async function readGroupName(page: Page, url: string): Promise<string> {
  // The h1 is the group name once the page settles. Reading it too early
  // returns whatever chrome rendered first — an earlier version of this
  // reliably picked up "Notifications".
  const fromPage = (await page.evaluate(String.raw`(() => {
    var h1 = document.querySelector('h1');
    var text = h1 ? (h1.innerText || '').trim() : '';
    if (text && text.toLowerCase() !== 'notifications') return text;
    return (document.title || '')
      .replace(/^\(\d+\+?\)\s*/, '')
      .replace(/\s*\|\s*Facebook$/, '')
      .trim();
  })()`)) as string;
  return fromPage || url;
}

/** Save an image through the browser's request context, so cookies apply. */
async function downloadImages(
  page: Page,
  urls: readonly string[],
  destDir: string,
  postId: string,
): Promise<string[]> {
  const saved: string[] = [];

  for (const [index, url] of urls.entries()) {
    try {
      const response = await page.request.get(url, { timeout: 20_000 });
      if (!response.ok()) continue;
      const body = await response.body();
      // Facebook serves jpeg/png/webp; the URL rarely carries a usable
      // extension, so take it from the content type.
      const contentType = response.headers()["content-type"] ?? "image/jpeg";
      const ext = contentType.includes("png")
        ? ".png"
        : contentType.includes("webp")
          ? ".webp"
          : contentType.includes("gif")
            ? ".gif"
            : ".jpg";
      const file = path.join(destDir, `${postId}-${index}${ext}`);
      writeFileSync(file, body);
      saved.push(file);
    } catch {
      // A missing decorative image must never cost us the post.
    }
  }

  return saved;
}

/** Stable-ish id: the permalink's own post id when available. */
function postIdFrom(permalink: string | null, groupId: string, index: number): string {
  if (permalink) {
    const match = /\/posts\/([^/?#]+)|story_fbid=([^&]+)/.exec(permalink);
    const id = match?.[1] ?? match?.[2];
    if (id) return `${groupId}-${id}`;
  }
  return `${groupId}-idx${index}`;
}

function groupIdFrom(url: string): string {
  return /\/groups\/([^/?#]+)/.exec(url)?.[1] ?? "group";
}

async function collectGroup(
  page: Page,
  url: string,
  wanted: number,
  imageDir: string,
): Promise<ScrapedPost[]> {
  note(`\n  ${url}`);
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 90_000 });
  await pause(6_000);

  if (await isLoggedOut(page)) {
    fail(
      `Facebook served a login wall for ${url}.\n\n` +
        `  The saved session has expired. Run:  npm run fb:login`,
    );
  }

  const groupName = await readGroupName(page, url);
  const groupId = groupIdFrom(url);
  note(`  group: ${groupName}`);

  const byId = new Map<string, ScrapedPost>();
  let scrolls = 0;
  let lastCount = -1;
  let stagnant = 0;

  while (byId.size < wanted && scrolls < MAX_SCROLLS) {
    const expanded = await expandPosts(page);
    if (expanded > 0) await pause(1_200);

    const scraped = await scrapePosts(page);

    for (const [index, raw] of scraped.entries()) {
      if (raw.text.length < 20) continue; // comment blocks and chrome
      const id = postIdFrom(raw.permalink, groupId, index);
      if (byId.has(id)) continue;

      byId.set(id, {
        id,
        group: groupName,
        author: raw.author,
        text: raw.text,
        permalink: raw.permalink,
        postedAt: raw.postedAt,
        images: raw.imageUrls.length > 0 ? raw.imageUrls : undefined,
      });
    }

    if (byId.size === lastCount) {
      stagnant += 1;
      // Two scrolls with nothing new means the feed has stopped producing.
      if (stagnant >= 2) break;
    } else {
      stagnant = 0;
      lastCount = byId.size;
    }

    // window.scrollTo, not mouse.wheel: the wheel scrolls whatever is under
    // the cursor, which on a fresh page is not the feed.
    await page.evaluate("window.scrollTo(0, document.body.scrollHeight)");
    scrolls += 1;
    await pause(1_800);
  }

  const posts = [...byId.values()].slice(0, wanted);

  if (posts.length === 0) {
    fail(
      `Found 0 posts in ${groupName}.\n\n` +
        `  Either the selectors have gone stale (Facebook changed its DOM) or the\n` +
        `  account cannot see this group's feed. Re-run with --headed to watch it.`,
    );
  }

  note(`  scraped: ${posts.length} posts after ${scrolls} scroll(s)`);

  // Download images only now, once posts are final — no point fetching
  // attachments for posts that got deduped away.
  let downloaded = 0;
  for (const post of posts) {
    if (!post.images?.length) continue;
    const files = await downloadImages(page, post.images, imageDir, post.id);
    post.images = files.length > 0 ? files : undefined;
    downloaded += files.length;
  }
  if (downloaded > 0) note(`  images:  ${downloaded} downloaded`);

  return posts;
}

async function main(): Promise<void> {
  const argv = process.argv.slice(2);
  const groups: string[] = [];
  let wanted = DEFAULT_POSTS_PER_GROUP;
  let headed = false;
  let outPath: string | null = null;

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--group") groups.push(argv[++i]);
    else if (arg === "--posts") wanted = Number(argv[++i]);
    else if (arg === "--out") outPath = argv[++i];
    else if (arg === "--headed") headed = true;
    else if (arg === "--help") {
      process.stderr.write(
        `\nUsage: npm run fb:collect -- --group <url> [--group <url>] [--posts 25] [--headed]\n\n` +
          `Run npm run fb:login once first.\n\n`,
      );
      return;
    }
  }

  if (groups.length === 0) fail(`No groups given. Use --group <url> (repeatable).`);
  if (!Number.isInteger(wanted) || wanted < 1) fail(`--posts must be a positive whole number.`);

  const outDir = path.join(process.cwd(), "scripts", "fb-monitor", "out");
  const imageDir = path.join(outDir, "images");
  mkdirSync(imageDir, { recursive: true });

  note(`\ngroups  ${groups.length}`);
  note(`posts   up to ${wanted} per group`);
  note(`browser ${headed ? "headed" : "headless"}`);

  const context = await launch(!headed);
  const page = context.pages()[0] ?? (await context.newPage());

  const all: ScrapedPost[] = [];
  try {
    for (const [index, url] of groups.entries()) {
      all.push(...(await collectGroup(page, url, wanted, imageDir)));
      // Space out groups; back-to-back navigation is the least human thing
      // a session can do.
      if (index < groups.length - 1) await pause(6_000);
    }
  } finally {
    await context.close();
  }

  const file = outPath ?? path.join(outDir, `posts-${Date.now()}.json`);
  writeFileSync(file, `${JSON.stringify(all, null, 2)}\n`, "utf8");

  note(`\ntotal   ${all.length} posts`);
  note(`\nNext:  npm run fb:extract -- --file ${file}\n`);
  process.stdout.write(`${file}\n`);
}

main().catch((error: unknown) => {
  fail(error instanceof Error ? error.message : String(error));
});
