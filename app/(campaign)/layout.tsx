import { League_Gothic } from "next/font/google";
import CampaignFooter from "./CampaignFooter";
import CampaignHeader from "./CampaignHeader";

/**
 * Chrome for paid-traffic landing pages. A route group, so "(campaign)" adds
 * nothing to the URL. It replaces the public site's header and footer with a
 * minimal pair, keeping a visitor from an ad on the page they came for.
 *
 * League Gothic is the campaign's display face — the condensed capitals on the
 * Meta ad creative — so the page looks like the ad that was tapped. It loads
 * here rather than in the root layout so only campaign pages download it, and
 * is used through the `font-display` utility defined in globals.css.
 */
const leagueGothic = League_Gothic({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-league-gothic",
});

export default function CampaignLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={`${leagueGothic.variable} relative overflow-x-clip bg-primary`}>
      <CampaignHeader />
      <main>{children}</main>
      <CampaignFooter />
    </div>
  );
}
