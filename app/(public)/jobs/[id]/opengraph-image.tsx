import { ImageResponse } from "next/og";
import { createClient } from "@/lib/supabase/server";

// Standard OG dimensions — fits LinkedIn / Facebook / Twitter previews.
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "Mountain Connects job listing";

interface Props {
  params: Promise<{ id: string }>;
}

/**
 * Per-job OG image. Job title front-and-centre, business name + a
 * pay/location line for context, brand wordmark in the corner. All
 * rendered server-side via next/og's ImageResponse so it works
 * without needing pre-baked image files per job.
 */
export default async function Image({ params }: Props) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: job } = await supabase
    .from("job_posts")
    .select(
      "title, pay_amount, pay_currency, position_type, business_profiles(business_name), resorts(name, country), nearby_towns(name)"
    )
    .eq("id", id)
    .single();

  const title = job?.title ?? "Seasonal job";
  const biz = (job?.business_profiles as unknown as { business_name?: string } | null)?.business_name;
  const town = (job?.nearby_towns as unknown as { name?: string } | null)?.name;
  const resort = (job?.resorts as unknown as { name?: string; country?: string } | null);
  const location = town || resort?.name;
  const country = resort?.country;
  const pay =
    job?.pay_amount && job?.pay_currency
      ? `${job.pay_currency} ${job.pay_amount}`
      : null;
  const positionLabel =
    job?.position_type === "full_time" ? "Full Time" :
    job?.position_type === "part_time" ? "Part Time" :
    job?.position_type === "casual" ? "Casual" : null;

  const sublineParts = [biz, location, country].filter(Boolean) as string[];
  const metaParts = [pay, positionLabel].filter(Boolean) as string[];

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
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
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
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          <div
            style={{
              fontSize: 28,
              fontWeight: 600,
              color: "#22d3ee",
              textTransform: "uppercase",
              letterSpacing: "2px",
            }}
          >
            Seasonal job
          </div>
          <div
            style={{
              fontSize: 76,
              fontWeight: 800,
              lineHeight: 1.05,
              letterSpacing: "-1px",
              maxWidth: "100%",
            }}
          >
            {title}
          </div>
          {sublineParts.length > 0 && (
            <div style={{ fontSize: 32, opacity: 0.85, marginTop: 8 }}>
              {sublineParts.join(" · ")}
            </div>
          )}
          {metaParts.length > 0 && (
            <div style={{ display: "flex", gap: 16, marginTop: 16 }}>
              {metaParts.map((part) => (
                <div
                  key={part}
                  style={{
                    background: "rgba(34, 211, 238, 0.15)",
                    border: "2px solid rgba(34, 211, 238, 0.4)",
                    color: "#22d3ee",
                    padding: "10px 22px",
                    borderRadius: 999,
                    fontSize: 24,
                    fontWeight: 600,
                  }}
                >
                  {part}
                </div>
              ))}
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
          <span>Apply free, no fees</span>
        </div>
      </div>
    ),
    size
  );
}
