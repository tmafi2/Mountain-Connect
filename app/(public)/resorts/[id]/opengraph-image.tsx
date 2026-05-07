import { ImageResponse } from "next/og";
import { resorts } from "@/lib/data/resorts";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "Mountain Connects resort guide";

interface Props {
  params: Promise<{ id: string }>;
}

/**
 * Per-resort OG image. Resort name big, country + nearest town as the
 * subline, brand wordmark in the corner. Pulls from the static resorts
 * dataset so we don't pay a Supabase round-trip on every share preview
 * generation (resort metadata barely changes).
 */
export default async function Image({ params }: Props) {
  const { id } = await params;
  const resort = resorts.find((r) => r.id === id);

  const name = resort?.name ?? "Ski resort";
  const sublineParts = [resort?.nearest_town, resort?.state_province, resort?.country].filter(
    Boolean
  ) as string[];

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
            Resort &amp; jobs guide
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
          <span>Seasonal jobs · resort details</span>
        </div>
      </div>
    ),
    size
  );
}
