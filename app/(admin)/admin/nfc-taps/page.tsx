import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

const CARD_LABELS: Record<string, string> = {
  biz: "Business card",
  worker: "Worker card",
  tyler: "Generic / Tyler",
  default: "Untagged tap",
};

function describeCard(code: string) {
  return CARD_LABELS[code] || code;
}

function describeEvent(type: string) {
  if (type === "tap") return "Tap";
  if (type === "vcard_download") return "Saved contact";
  return type;
}

export default async function NfcTapsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?redirect=/admin/nfc-taps");

  const { data: userRow } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();

  if (userRow?.role !== "admin") redirect("/");

  const { data: taps } = await supabase
    .from("nfc_taps")
    .select("id, event_type, card_code, tapped_at, country, city, region, timezone, os, browser, device_type, user_agent")
    .order("tapped_at", { ascending: false })
    .limit(500);

  const rows = (taps || []) as Array<{
    id: string;
    event_type: string;
    card_code: string;
    tapped_at: string;
    country: string | null;
    city: string | null;
    region: string | null;
    timezone: string | null;
    os: string | null;
    browser: string | null;
    device_type: string | null;
    user_agent: string | null;
  }>;

  // Split by event type
  const tapRows = rows.filter((r) => r.event_type === "tap");
  const downloadRows = rows.filter((r) => r.event_type === "vcard_download");

  // Per-card tap counts
  const tapsPerCard = new Map<string, number>();
  for (const r of tapRows) {
    tapsPerCard.set(r.card_code, (tapsPerCard.get(r.card_code) || 0) + 1);
  }
  const tapCardEntries = Array.from(tapsPerCard.entries()).sort((a, b) => b[1] - a[1]);

  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);
  const dayAgo = new Date();
  dayAgo.setHours(dayAgo.getHours() - 24);

  const last24h = tapRows.filter((r) => new Date(r.tapped_at) >= dayAgo).length;
  const last7Days = tapRows.filter((r) => new Date(r.tapped_at) >= weekAgo).length;

  // Conversion: saved contacts / tyler taps
  const tylerTaps = tapRows.filter((r) => r.card_code === "tyler").length;
  const conversionPct = tylerTaps > 0 ? Math.round((downloadRows.length / tylerTaps) * 100) : null;

  // Device breakdown (taps only)
  const deviceCounts = new Map<string, number>();
  for (const r of tapRows) {
    const key = [r.os, r.device_type].filter(Boolean).join(" · ") || "Unknown";
    deviceCounts.set(key, (deviceCounts.get(key) || 0) + 1);
  }
  const deviceEntries = Array.from(deviceCounts.entries()).sort((a, b) => b[1] - a[1]);

  return (
    <div className="mx-auto max-w-6xl">
      <h1 className="text-2xl font-bold text-primary">NFC Card Taps</h1>
      <p className="mt-1 text-sm text-foreground/60">
        Every event from physical NFC cards — taps plus contact saves. Showing the latest 500.
      </p>

      {/* Summary tiles */}
      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatTile label="Total taps" value={tapRows.length} />
        <StatTile label="Last 24 hours" value={last24h} />
        <StatTile label="Last 7 days" value={last7Days} />
        <StatTile
          label="Contacts saved"
          value={downloadRows.length}
          caption={conversionPct !== null ? `${conversionPct}% of Tyler taps` : undefined}
        />
      </div>

      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* By card */}
        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-foreground/50">
            Taps by card
          </h2>
          {tapCardEntries.length === 0 ? (
            <EmptyState>No taps recorded yet.</EmptyState>
          ) : (
            <div className="overflow-hidden rounded-xl border border-accent bg-white">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-accent bg-accent/10 text-left text-xs uppercase tracking-wider text-foreground/50">
                    <th className="px-5 py-3">Card</th>
                    <th className="px-5 py-3">Code</th>
                    <th className="px-5 py-3 text-right">Taps</th>
                  </tr>
                </thead>
                <tbody>
                  {tapCardEntries.map(([code, count]) => (
                    <tr key={code} className="border-b border-accent/30">
                      <td className="px-5 py-3 font-medium text-primary">{describeCard(code)}</td>
                      <td className="px-5 py-3 font-mono text-xs text-foreground/60">{code}</td>
                      <td className="px-5 py-3 text-right font-semibold text-primary">{count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Device breakdown */}
        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-foreground/50">
            Devices
          </h2>
          {deviceEntries.length === 0 ? (
            <EmptyState>No device data yet.</EmptyState>
          ) : (
            <div className="overflow-hidden rounded-xl border border-accent bg-white">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-accent bg-accent/10 text-left text-xs uppercase tracking-wider text-foreground/50">
                    <th className="px-5 py-3">OS · Device</th>
                    <th className="px-5 py-3 text-right">Count</th>
                  </tr>
                </thead>
                <tbody>
                  {deviceEntries.map(([key, count]) => (
                    <tr key={key} className="border-b border-accent/30">
                      <td className="px-5 py-3 text-primary">{key}</td>
                      <td className="px-5 py-3 text-right font-semibold text-primary">{count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>

      {/* Recent events */}
      <section className="mt-10">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-foreground/50">
          Recent events
        </h2>
        {rows.length === 0 ? (
          <EmptyState>No events yet. Once a card is tapped, it&apos;ll show up here.</EmptyState>
        ) : (
          <div className="overflow-hidden rounded-xl border border-accent bg-white">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-accent bg-accent/10 text-left text-xs uppercase tracking-wider text-foreground/50">
                  <th className="px-5 py-3">When</th>
                  <th className="px-5 py-3">Event</th>
                  <th className="px-5 py-3">Card</th>
                  <th className="px-5 py-3">Location</th>
                  <th className="px-5 py-3">Device</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-b border-accent/30 align-top">
                    <td className="px-5 py-3 text-foreground/70">
                      {new Date(r.tapped_at).toLocaleString("en-US", {
                        month: "short",
                        day: "numeric",
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                    </td>
                    <td className="px-5 py-3">
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                          r.event_type === "vcard_download"
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-secondary/10 text-secondary"
                        }`}
                      >
                        {describeEvent(r.event_type)}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <span className="font-medium text-primary">{describeCard(r.card_code)}</span>
                      <span className="ml-2 font-mono text-[10px] text-foreground/40">{r.card_code}</span>
                    </td>
                    <td className="px-5 py-3 text-foreground/70">
                      {[r.city, r.region, r.country].filter(Boolean).join(", ") || "—"}
                    </td>
                    <td className="px-5 py-3 text-foreground/70">
                      {[r.os, r.browser, r.device_type].filter(Boolean).join(" · ") || "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

function StatTile({ label, value, caption }: { label: string; value: number; caption?: string }) {
  return (
    <div className="rounded-2xl border border-accent bg-white p-5 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wider text-foreground/50">{label}</p>
      <p className="mt-2 text-3xl font-bold text-primary">{value}</p>
      {caption && <p className="mt-1 text-[11px] text-foreground/50">{caption}</p>}
    </div>
  );
}

function EmptyState({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-accent/40 bg-white p-8 text-center text-sm text-foreground/50">
      {children}
    </div>
  );
}
