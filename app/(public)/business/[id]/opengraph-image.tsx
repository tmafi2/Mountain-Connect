import { ImageResponse } from "next/og";
import { createClient } from "@/lib/supabase/server";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "Mountain Connects business profile";

interface Props {
  params: Promise<{ id: string }>;
}

/**
 * Per-business OG image. Business name front-and-centre with location
 * subline, brand wordmark in the corner. Skips the logo for now —
 * fetching/embedding remote images in next/og adds a latency tax and
 * many business logos are inconsistent shapes that distort the layout.
 */
export default async function Image({ params }: Props) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: biz } = await supabase
    .from("business_profiles")
    .select(
      "business_name, location, country, verification_status, resorts(name), nearby_towns(name)"
    )
    .eq("id", id)
    .single();

  const name = biz?.business_name ?? "Business profile";
  const town = (biz?.nearby_towns as unknown as { name?: string } | null)?.name;
  const resort = (biz?.resorts as unknown as { name?: string } | null)?.name;
  const sublineParts = [town || resort, biz?.country].filter(Boolean) as string[];
  const isVerified = biz?.verification_status === "verified";

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
              display: "flex",
              alignItems: "center",
              gap: 16,
              fontSize: 28,
              fontWeight: 600,
              color: "#22d3ee",
              textTransform: "uppercase",
              letterSpacing: "2px",
            }}
          >
            <span>Business profile</span>
            {isVerified && (
              <span
                style={{
                  background: "rgba(16, 185, 129, 0.2)",
                  border: "2px solid rgba(16, 185, 129, 0.5)",
                  color: "#34d399",
                  padding: "4px 14px",
                  borderRadius: 999,
                  fontSize: 18,
                  letterSpacing: "1px",
                }}
              >
                ✓ Verified
              </span>
            )}
          </div>
          <div
            style={{
              fontSize: 88,
              fontWeight: 800,
              lineHeight: 1.05,
              letterSpacing: "-1.5px",
            }}
          >
            {name}
          </div>
          {sublineParts.length > 0 && (
            <div style={{ fontSize: 32, opacity: 0.85, marginTop: 8 }}>
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
          <span>Open roles · seasonal hiring</span>
        </div>
      </div>
    ),
    size
  );
}
