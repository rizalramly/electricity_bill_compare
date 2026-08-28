import { useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatKwh, formatRM, formatSigned } from "../lib/format";
import type { MonthResult } from "../lib/model";

const OLD_COLOR = "#2a78d6";
const NEW_COLOR = "#eb6834";

interface BarDatum {
  name: string;
  Old: number;
  New: number;
  result: MonthResult;
}

function BreakdownTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: { payload: BarDatum }[];
}) {
  if (!active || !payload?.length) return null;
  const { result } = payload[0].payload;
  const { oldBill, newBill } = result;
  const row = (label: string, value: number) => (
    <div className="flex justify-between gap-6">
      <span className="text-ink-secondary">{label}</span>
      <span className="tabular-nums">{formatRM(value)}</span>
    </div>
  );
  return (
    <div className="rounded-lg border border-grid bg-surface p-3 text-xs shadow-lg">
      <p className="mb-1 font-bold">
        {result.label} · {formatKwh(result.usage)}
      </p>
      <p className="mb-0.5 font-semibold" style={{ color: OLD_COLOR }}>
        Old tariff — {formatRM(oldBill.total)}
      </p>
      {row("Energy (blocks)", oldBill.energyCharge)}
      {oldBill.icptAmount !== 0 && row(`ICPT ${formatSigned(oldBill.icptSen)} sen`, oldBill.icptAmount)}
      {oldBill.kwtbb > 0 && row("KWTBB 1.6%", oldBill.kwtbb)}
      {oldBill.sst > 0 && row("SST 8%", oldBill.sst)}
      <p className="mb-0.5 mt-2 font-semibold" style={{ color: NEW_COLOR }}>
        New RP4 — {formatRM(newBill.total)}
      </p>
      {row(`Energy ${newBill.energyRateSen} sen`, newBill.energyCharge)}
      {row("Capacity 4.55 sen", newBill.capacityCharge)}
      {row("Network 12.85 sen", newBill.networkCharge)}
      {row(newBill.retailWaived ? "Retail (waived)" : "Retail", newBill.retailCharge)}
      {row(
        newBill.afaApplies ? `AFA ${formatSigned(newBill.afaSen)} sen` : "AFA (exempt ≤ 600)",
        newBill.afaAmount,
      )}
      {newBill.eeiRebate > 0 && row(`EEI −${newBill.eeiRateSen} sen`, -newBill.eeiRebate)}
      {newBill.kwtbb > 0 && row("KWTBB 1.6%", newBill.kwtbb)}
      {newBill.sst > 0 && row("SST 8%", newBill.sst)}
      <div className="mt-2 border-t border-grid pt-1 font-semibold">
        {row("Difference (new − old)", result.diff)}
      </div>
    </div>
  );
}

export function ComparisonBarChart({ results }: { results: MonthResult[] }) {
  const [hidden, setHidden] = useState<Record<string, boolean>>({});

  const data: BarDatum[] = results.map((result) => ({
    name: result.label,
    Old: result.oldBill.total,
    New: result.newBill.total,
    result,
  }));

  const toggle = (key: string) =>
    setHidden((prev) => ({ ...prev, [key]: !prev[key] }));

  return (
    <section aria-labelledby="bar-heading" className="card p-5">
      <h2 id="bar-heading" className="text-base font-bold">
        Month comparison
      </h2>
      <p className="mb-4 text-xs text-ink-secondary">
        Old vs new total per month — hover a bar for the full breakdown; click a
        legend entry to show/hide a series.
      </p>
      <div className="h-72 w-full">
        <ResponsiveContainer>
          <BarChart data={data} barGap={2} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
            <CartesianGrid stroke="#e1e0d9" strokeDasharray="0" vertical={false} />
            <XAxis
              dataKey="name"
              tick={{ fill: "#898781", fontSize: 12 }}
              axisLine={{ stroke: "#c3c2b7" }}
              tickLine={false}
            />
            <YAxis
              tickFormatter={(v: number) => `RM${v.toLocaleString()}`}
              tick={{ fill: "#898781", fontSize: 12 }}
              axisLine={false}
              tickLine={false}
              width={70}
            />
            <Tooltip content={<BreakdownTooltip />} cursor={{ fill: "rgba(11,11,11,0.04)" }} />
            <Legend
              onClick={(entry) => toggle(String(entry.dataKey))}
              wrapperStyle={{ cursor: "pointer", fontSize: 13 }}
            />
            <Bar
              dataKey="Old"
              name="Old tariff"
              fill={OLD_COLOR}
              radius={[4, 4, 0, 0]}
              hide={hidden.Old}
              isAnimationActive
            />
            <Bar
              dataKey="New"
              name="New tariff (RP4)"
              fill={NEW_COLOR}
              radius={[4, 4, 0, 0]}
              hide={hidden.New}
              isAnimationActive
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
