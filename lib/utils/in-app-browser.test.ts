import { test } from "node:test";
import assert from "node:assert/strict";
import { isInAppBrowser } from "./in-app-browser";

// Full user agents in each app's format, not just the token the detector looks
// for — so the tests also prove nothing else in a real string trips it.
const IN_APP = {
  "Instagram, iPhone":
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Instagram 336.0.3.16.99 (iPhone15,2; iOS 17_5; en_AU; en; scale=3.00; 1179x2556; 609452313)",
  "Instagram, Android":
    "Mozilla/5.0 (Linux; Android 14; Pixel 8 Build/AP2A.240805.005; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/127.0.6533.103 Mobile Safari/537.36 Instagram 344.0.0.34.90 Android (34/14; 420dpi; 1080x2400; Google/google; Pixel 8; shiba; shiba; en_AU; 628412578)",
  "Facebook, iPhone":
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 [FBAN/FBIOS;FBAV/474.0.0.35.109;FBBV/618346471;FBDV/iPhone15,2;FBMD/iPhone;FBSN/iOS;FBSV/17.5;FBSS/3;FBID/phone;FBLC/en_US;FBOP/5;FBRV/620128413]",
  "Facebook, Android":
    "Mozilla/5.0 (Linux; Android 14; SM-S918B Build/UP1A.231005.007; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/127.0.6533.103 Mobile Safari/537.36 [FB_IAB/FB4A;FBAV/477.0.0.49.83;]",
  "Messenger, iPhone":
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 [FBAN/MessengerForiOS;FBAV/467.0.0.37.110;FBBV/610964386;FBDV/iPhone15,2;FBMD/iPhone;FBSN/iOS;FBSV/17.5;FBSS/3;FBCR/;FBID/phone;FBLC/en_AU;FBOP/5]",
};

const REAL_BROWSERS = {
  "Safari, iPhone":
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1",
  "Chrome, Android":
    "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36",
  "Chrome, Mac":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36",
  "Firefox, Windows": "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:129.0) Gecko/20100101 Firefox/129.0",
};

test("the Instagram, Facebook and Messenger browsers are recognised", () => {
  for (const [name, ua] of Object.entries(IN_APP)) assert.equal(isInAppBrowser(ua), true, name);
});

test("ordinary browsers keep the Google button", () => {
  for (const [name, ua] of Object.entries(REAL_BROWSERS)) assert.equal(isInAppBrowser(ua), false, name);
  assert.equal(isInAppBrowser(""), false);
  assert.equal(isInAppBrowser(undefined), false);
  assert.equal(isInAppBrowser(null), false);
});
