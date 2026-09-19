/**
 * The Meta Pixel that measures the Instagram and Facebook ads — the
 * "Mountain Connects website" dataset in Meta Events Manager.
 *
 * WHY THE ID IS IN CODE: it is public by design (it sits in the source of every
 * page that loads the pixel), so an environment variable would hide nothing.
 * What keeps test traffic out of the ad data is the host check below: the
 * pixel loads on the production domain only — never on localhost or a Vercel
 * preview, whose visits would otherwise count as ad results.
 *
 * WHEN IT LOADS: only after the visitor accepts cookies, from
 * components/ui/CookieConsent.tsx — the same gate as Google Analytics.
 *
 * WHAT IT MAY SEND: page views and the funnel events in lib/analytics/track.ts,
 * nothing else. Automatic configuration is switched off below, so the pixel
 * does not read button text or page metadata on its own. Automatic advanced
 * matching — Meta hashing emails it finds in forms — is a toggle in Events
 * Manager, not in code, and must stay OFF there: the privacy policy promises
 * that nothing typed into a form is sent to Meta.
 */

export const META_PIXEL_ID = "1334369685232975";

const PRODUCTION_HOSTS = new Set(["www.mountainconnects.com", "mountainconnects.com"]);

export function metaPixelAllowedOn(hostname: string | null | undefined): boolean {
  return typeof hostname === "string" && PRODUCTION_HOSTS.has(hostname);
}

/**
 * Meta's standard base code, with two changes: automatic configuration is
 * disabled before init, and the <noscript> image is dropped — a visitor
 * without JavaScript cannot accept the cookie banner, so it could only ever
 * fire without consent.
 *
 * The pixel's own history listener records a PageView on every client-side
 * navigation, so a Next.js route change needs nothing extra.
 */
export function metaPixelBootstrap(pixelId: string): string {
  if (!/^\d{10,20}$/.test(pixelId)) throw new Error(`Not a Meta Pixel ID: ${pixelId}`);
  return [
    "!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?",
    "n.callMethod.apply(n,arguments):n.queue.push(arguments)};",
    "if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';",
    "n.queue=[];t=b.createElement(e);t.async=!0;",
    "t.src=v;s=b.getElementsByTagName(e)[0];",
    "s.parentNode.insertBefore(t,s)}(window,document,'script',",
    "'https://connect.facebook.net/en_US/fbevents.js');",
    `fbq('set','autoConfig',false,'${pixelId}');`,
    `fbq('init','${pixelId}');`,
    "fbq('track','PageView');",
  ].join("");
}
