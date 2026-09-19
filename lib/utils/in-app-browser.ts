/**
 * Is this page open inside the Instagram or Facebook app's own browser?
 *
 * It matters because Google refuses to sign anyone in from an embedded
 * browser: "Continue with Google" there ends on Google's "Error 403:
 * disallowed_useragent" page, not on ours. Paid Meta traffic lands in exactly
 * these browsers, so the signup page hides the Google button in them and
 * leaves email signup, which works anywhere.
 *
 * Tokens: Instagram puts "Instagram" in its user agent; the Facebook app (and
 * Messenger) uses FBAN/FBAV on iOS and FB_IAB/FB4A on Android.
 */
const IN_APP_BROWSER = /\b(Instagram|FBAN|FBAV|FB_IAB|FBIOS|FB4A)\b/i;

export function isInAppBrowser(userAgent: string | null | undefined): boolean {
  return typeof userAgent === "string" && IN_APP_BROWSER.test(userAgent);
}
