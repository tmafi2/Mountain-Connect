import { ImageResponse } from "next/og";
import { createClient } from "@/lib/supabase/server";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "Mountain Connects town guide";

interface Props {
  params: Promise<{ slug: string }>;
}

/**
 * Per-town OG image. Town name big, region/country sub-line,
 * brand wordmark in the corner. Same visual system as the resort
 * and job OG images so a thread of links across LinkedIn or
 * WhatsApp reads as one consistent brand.
 */
export default async function Image({ params }: Props) {
  const { slug } = await params;
  const supabase = await createClient();

  const { data: town } = await supabase
    .from("nearby_towns")
    .select("name, state_region, country")
    .eq("slug", slug)
    .single();

  const name = town?.name ?? "Town guide";
  const sublineParts = [town?.state_region, town?.country].filter(Boolean) as string[];

  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "72px 80px",
          background:
            "linear-gradient(135deg, #0a1e33 0%, #0f2942 40%, #1a3a5c 100%)",
          color: "white",
          fontFamily: "system-ui, -apple-system, sans-serif",
        }}
      >
        <div
          style={{
            fontSize: 24,
            fontWeight: 700,
            letterSpacing: "-0.5px",
            color: "#22d3ee",
            textTransform: "uppercase",
          }}
        >
          Mountain Connects
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div
            style={{
              fontSize: 28,
              fontWeight: 600,
              color: "#22d3ee",
              textTransform: "uppercase",
              letterSpacing: "2px",
            }}
          >
            Living &amp; jobs guide
          </div>
          <div
            style={{
              fontSize: 96,
              fontWeight: 800,
              lineHeight: 1.05,
              letterSpacing: "-1.5px",
            }}
          >
            {name}
          </div>
          {sublineParts.length > 0 && (
            <div style={{ fontSize: 36, opacity: 0.85, marginTop: 8 }}>
              {sublineParts.join(" · ")}
            </div>
          )}
        </div>

        <div
          style={{
            fontSize: 22,
            opacity: 0.6,
            display: "flex",
            justifyContent: "space-between",
          }}
        >
          <span>mountainconnects.com</span>
          <span>Where seasonal workers live</span>
        </div>
      </div>
    ),
    size
  );
}
