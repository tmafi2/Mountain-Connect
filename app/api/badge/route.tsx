import { ImageResponse } from "next/og";
import { resorts } from "@/lib/data/resorts";
import { createPublicClient } from "@/lib/supabase/public";
import { leagueGothicData } from "@/lib/badges/display-font";

/**
 * GET /api/badge?resort=<legacy_id>&season=2025/26 → a 1080x1920 PNG
 *
 * The shareable season badge: something a worker posts to their own story.
 *
 * ⚠️ IT NAMES THE MOUNTAIN, NEVER THE PERSON. That is not a privacy
 * compromise, it is the design: they are posting it to their own feed, so the
 * context already says who they are. It also means this endpoint handles no
 * personal data at all, needs no auth, and cannot leak a worker profile —
 * which matters, because businesses cannot even browse those (00085) and a
 * publicly addressable page naming a worker would invert that completely.
 *
 * ⚠️ NOTHING HERE IS VERIFIED and the badge says so. The dates behind it are
 * what the worker typed about themselves; no employer confirmed anything. The
 * footer line carries that, and it is not decoration — see
 * lib/stats/work-history-claims.test.ts for the trust claim this platform
 * already had to take back once.
 *
 * Public and unauthenticated because the thing it draws is public: a resort
 * name and a season. Inputs are validated rather than trusted — an unknown
 * resort or a malformed season gets a 404, so this cannot be used to render
 * arbitrary text onto a branded image.
 *
 * 1080x1920 is the Instagram/TikTok story frame. Drawn from the static resorts
 * array, so a share costs no database round-trip, exactly as the
 * opengraph-image routes do.
 */

/** "2025/26" or "2026". Anything else is refused. */
const SEASON = /^\d{4}(\/\d{2})?$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Accepts EITHER the static legacy id ("1") or the database UUID.
 *
 * ⚠️ This is not belt and braces, it is required: `work_history[].resort_id`
 * stores the UUID that /api/search-resorts returns, while the static resorts
 * array — the one every opengraph-image renders from — is keyed on legacy_id.
 * A badge link built from a real work-history entry passes a UUID, so matching
 * only the static array would 404 on every genuine share.
 *
 * The UUID path costs one indexed lookup, and only on a cache miss: the
 * response is immutable, and a resort's name and season never change.
 */
async function findResort(idOrUuid: string) {
  const direct = resorts.find((r) => r.id === idOrUuid);
  if (direct) return direct;
  if (!UUID.test(idOrUuid)) return null;
  try {
    const { data, error } = await createPublicClient()
      .from("resorts")
      .select("legacy_id")
      .eq("id", idOrUuid)
      .maybeSingle();
    if (error || !data?.legacy_id) return null;
    return resorts.find((r) => r.id === data.legacy_id) ?? null;
  } catch {
    return null;
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const resortId = searchParams.get("resort") ?? "";
  const season = searchParams.get("season") ?? "";

  if (!SEASON.test(season)) {
    return new Response("Unknown resort or season", { status: 404 });
  }
  const resort = await findResort(resortId);
  if (!resort) {
    return new Response("Unknown resort or season", { status: 404 });
  }

  // NO PHOTO, deliberately. The only resort imagery this project holds is
  // `banner_image_url`, and every value is a per-COUNTRY flag graphic with the
  // country's name set into the artwork — there are 14 of them and not one is
  // a photograph of a mountain. Behind this type it read as a national banner
  // rather than a season badge, and printed "CANADA" twice. A photo-backed
  // badge needs real resort photography, which is Tyler's to supply; until
  // then the brand gradient is the honest option.
  const display = await leagueGothicData();
  // League Gothic is very condensed, so it carries a bigger size than the
  // fallback would at the same width.
  const headline = display ? 190 : 140;
  const nameSize =
    resort.name.length > 22 ? headline * 0.62 : resort.name.length > 15 ? headline * 0.78 : headline;
  const fontFamily = display ? "League Gothic" : "system-ui, -apple-system, sans-serif";

  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          position: "relative",
          background: "linear-gradient(160deg, #0a1e33 0%, #0f2942 45%, #1a3a5c 100%)",
          color: "white",
          fontFamily: "system-ui, -apple-system, sans-serif",
        }}
      >
        <div
          style={{
            position: "relative",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            alignItems: "center",
            width: "100%",
            height: "100%",
            padding: "140px 70px",
            textAlign: "center",
          }}
        >
          <div style={{ display: "flex", fontSize: 32, letterSpacing: 10, color: "#22d3ee", fontWeight: 700 }}>
            MOUNTAIN CONNECTS
          </div>

          <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
            <div style={{ display: "flex", fontSize: 40, letterSpacing: 16, color: "rgba(255,255,255,0.75)", fontWeight: 600 }}>
              A SEASON AT
            </div>
            <div
              style={{
                display: "flex",
                fontFamily,
                fontSize: nameSize,
                fontWeight: 900,
                lineHeight: 0.92,
                marginTop: 26,
                letterSpacing: display ? 0 : -2,
                textTransform: "uppercase",
                textShadow: "0 8px 40px rgba(0,0,0,0.55)",
              }}
            >
              {resort.name}
            </div>
            <div
              style={{
                display: "flex",
                fontFamily,
                marginTop: 34,
                fontSize: display ? 150 : 112,
                fontWeight: 900,
                color: "#22d3ee",
                lineHeight: 1,
              }}
            >
              {season}
            </div>
            <div style={{ display: "flex", marginTop: 26, fontSize: 38, color: "rgba(255,255,255,0.85)", letterSpacing: 3 }}>
              {resort.country.toUpperCase()}
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
            {/* The honesty line. Not decoration: nobody verified this. */}
            <div style={{ display: "flex", fontSize: 25, color: "rgba(255,255,255,0.6)" }}>Self-reported season</div>
            <div style={{ display: "flex", marginTop: 14, fontSize: 31, color: "rgba(255,255,255,0.92)", fontWeight: 700 }}>
              mountainconnects.com
            </div>
          </div>
        </div>
      </div>
    ),
    {
      width: 1080,
      height: 1920,
      ...(display
        ? { fonts: [{ name: "League Gothic", data: display, style: "normal" as const, weight: 400 as const }] }
        : {}),
      headers: {
        // A resort name and a season never change; let it cache hard.
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    },
  );
}
