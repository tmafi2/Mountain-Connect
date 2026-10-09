/**
 * League Gothic as a binary, for next/og. It is the campaign's display face —
 * the condensed capitals from the ad creative — and `next/font/google` cannot
 * help here: that gives a CSS class, while ImageResponse needs the font file.
 *
 * ⚠️ THE USER-AGENT IS LOAD-BEARING. Google Fonts serves woff2 to a modern
 * browser, and Satori (what renders these images) cannot read woff2. An old UA
 * gets woff or truetype instead, both of which it can. Without it the fetch
 * appears to succeed and the font is silently unusable — which is exactly how
 * this failed the first time, falling back to system-ui with no error anyone
 * would notice on the image itself.
 *
 * woff2 is excluded explicitly rather than by omission: the accepted list is
 * what Satori reads, and 'woff2' would otherwise match a 'woff' substring.
 *
 * ⚠️ FAILS TO NULL, NEVER THROWS. A badge that renders in a plainer typeface
 * is a small disappointment; a badge endpoint that 500s because Google Fonts
 * was slow is a broken share button. The caller falls back to system fonts.
 */

const CSS_URL = "https://fonts.googleapis.com/css2?family=League+Gothic&display=swap";
// Something old enough that Google serves TrueType rather than woff2.
const OLD_UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_6_8) AppleWebKit/534.30 (KHTML, like Gecko) Version/5.1 Safari/534.30";

let cached: ArrayBuffer | null | undefined;

export async function leagueGothicData(): Promise<ArrayBuffer | null> {
  // Module-level memo: an immutable image response still re-renders on a cold
  // start, and there is no reason to pay for the font twice in one process.
  if (cached !== undefined) return cached;
  try {
    const css = await fetch(CSS_URL, { headers: { "User-Agent": OLD_UA } }).then((r) =>
      r.ok ? r.text() : "",
    );
    const url = css.match(/src:\s*url\((https:\/\/[^)]+)\)\s*format\('(truetype|opentype|woff)'\)/)?.[1];
    if (!url) {
      console.error("display-font: no satori-readable font url in the Google Fonts css");
      cached = null;
      return cached;
    }
    const res = await fetch(url);
    if (!res.ok) {
      console.error("display-font: font fetch failed", res.status);
      cached = null;
      return cached;
    }
    cached = await res.arrayBuffer();
    return cached;
  } catch (err) {
    console.error("display-font: unavailable:", err);
    cached = null;
    return cached;
  }
}
