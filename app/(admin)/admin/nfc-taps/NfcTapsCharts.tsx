"use client";

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";

interface Slice {
  name: string;
  value: number;
  color: string;
}

interface NfcTapsChartsProps {
  eventMix: Slice[];
  cardSplit: Slice[];
}

export default function NfcTapsCharts({ eventMix, cardSplit }: NfcTapsChartsProps) {
  const hasEvents = eventMix.some((s) => s.value > 0);
  const hasCards = cardSplit.some((s) => s.value > 0);

  if (!hasEvents && !hasCards) {
    return (
      <div className="rounded-2xl border border-accent/40 bg-white p-8 text-center text-sm text-foreground/50">
        Charts will appear once the first tap is recorded.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <ChartCard title="Event mix" subtitle="Taps vs saved contacts vs CTA clicks">
        {hasEvents ? (
          <PieBlock data={eventMix} />
        ) : (
          <EmptyChart>No event data yet.</EmptyChart>
        )}
      </ChartCard>
      <ChartCard title="Taps by card" subtitle="Which physical card was tapped">
        {hasCards ? (
          <PieBlock data={cardSplit} />
        ) : (
          <EmptyChart>No taps recorded yet.</EmptyChart>
        )}
      </ChartCard>
    </div>
  );
}

function ChartCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-accent bg-white p-5 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wider text-foreground/50">{title}</p>
      {subtitle && <p className="mt-0.5 text-[11px] text-foreground/40">{subtitle}</p>}
      <div className="mt-3 h-64">{children}</div>
    </div>
  );
}

function PieBlock({ data }: { data: Slice[] }) {
  const visible = data.filter((s) => s.value > 0);
  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Pie
          data={visible}
          dataKey="value"
          nameKey="name"
          innerRadius={40}
          outerRadius={80}
          paddingAngle={2}
          strokeWidth={2}
          stroke="#ffffff"
        >
          {visible.map((s, i) => (
            <Cell key={i} fill={s.color} />
          ))}
        </Pie>
        <Tooltip
          formatter={(value: number) => [`${value}`, "Count"]}
          contentStyle={{
            background: "white",
            border: "1px solid #e2e8f0",
            borderRadius: 8,
            fontSize: 12,
          }}
        />
        <Legend
          verticalAlign="bottom"
          height={36}
          iconSize={10}
          wrapperStyle={{ fontSize: 11 }}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}

function EmptyChart({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-full items-center justify-center text-xs text-foreground/40">
      {children}
    </div>
  );
}
