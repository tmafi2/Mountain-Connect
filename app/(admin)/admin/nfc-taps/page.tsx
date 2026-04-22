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
    .select("id, card_code, tapped_at, user_agent, referrer, country")
    .order("tapped_at", { ascending: false })
    .limit(500);

  const rows = taps || [];

  // Per-card counts
  const counts = new Map<string, number>();
  for (const r of rows) {
    counts.set(r.card_code, (counts.get(r.card_code) || 0) + 1);
  }
  const codeEntries = Array.from(counts.entries()).sort((a, b) => b[1] - a[1]);

  // Last 7 days count
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);
  const last7Days = rows.filter((r) => new Date(r.tapped_at) >= weekAgo).length;

  // Last 24 hours
  const dayAgo = new Date();
  dayAgo.setHours(dayAgo.getHours() - 24);
  const last24h = rows.filter((r) => new Date(r.tapped_at) >= dayAgo).length;

  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="text-2xl font-bold text-primary">NFC Card Taps</h1>
      <p className="mt-1 text-sm text-foreground/60">
        Every tap of a physical NFC card that redirected through /card. Showing the latest 500.
      </p>

      {/* Summary tiles */}
      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatTile label="Total taps" value={rows.length} />
        <StatTile label="Last 24 hours" value={last24h} />
        <StatTile label="Last 7 days" value={last7Days} />
      </div>

      {/* Per-card breakdown */}
      <section className="mt-8">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-foreground/50">
          By card
        </h2>
        {codeEntries.length === 0 ? (
          <div className="rounded-2xl border border-accent/40 bg-white p-8 text-center text-sm text-foreground/50">
            No taps recorded yet.
          </div>
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
                {codeEntries.map(([code, count]) => (
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

      {/* Recent taps list */}
      <section className="mt-8">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-foreground/50">
          Recent taps
        </h2>
        {rows.length === 0 ? (
          <div className="rounded-2xl border border-accent/40 bg-white p-8 text-center text-sm text-foreground/50">
            No taps yet. Once a card is tapped, events will appear here.
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-accent bg-white">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-accent bg-accent/10 text-left text-xs uppercase tracking-wider text-foreground/50">
                  <th className="px-5 py-3">When</th>
                  <th className="px-5 py-3">Card</th>
                  <th className="px-5 py-3">Country</th>
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
                      <span className="font-medium text-primary">{describeCard(r.card_code)}</span>
                      <span className="ml-2 font-mono text-xs text-foreground/40">{r.card_code}</span>
                    </td>
                    <td className="px-5 py-3 text-foreground/60">{r.country || "—"}</td>
                    <td className="px-5 py-3 font-mono text-[11px] text-foreground/50 max-w-xs truncate" title={r.user_agent || ""}>
                      {r.user_agent || "—"}
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

function StatTile({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-accent bg-white p-5 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wider text-foreground/50">{label}</p>
      <p className="mt-2 text-3xl font-bold text-primary">{value}</p>
    </div>
  );
}
