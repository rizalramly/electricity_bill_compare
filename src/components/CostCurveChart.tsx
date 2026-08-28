import { useState } from "react";
import {
  Brush,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ReferenceDot,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { Breakeven, CurvePoint } from "../lib/curve";
import { formatRM, formatSigned } from "../lib/format";
import type { MonthResult } from "../lib/model";

const OLD_COLOR = "#2a78d6";
const NEW_COLOR = "#eb6834";
const INK = "#0b0b0b";
const MUTED = "#898781";

function CurveTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { payload: CurvePoint }[];
  label?: number;
}) {
  if (!active || !payload?.length) return null;
  const point = payload[0].payload;
  const saves = point.diff < 0;
  return (
    <div className="rounded-lg border border-grid bg-surface p-3 text-xs shadow-lg">
      <p className="mb-1 font-bold">{Number(label).toLocaleString()} kWh</p>
      <div className="flex justify-between gap-6">
        <span style={{ color: OLD_COLOR }}>Old tariff</span>
        <span className="tabular-nums">{formatRM(point.oldRM)}</span>
      </div>
      <div className="flex justify-between gap-6">
        <span style={{ color: NEW_COLOR }}>New (RP4)</span>
        <span className="tabular-nums">{formatRM(point.newRM)}</span>
      </div>
      <div className="mt-1 border-t border-grid pt-1 font-semibold">
        <div className="flex justify-between gap-6">
          <span>{saves ? "New saves" : point.diff > 0 ? "New costs more" : "Equal"}</span>
          <span className="tabular-nums">{formatRM(Math.abs(point.diff))}</span>
        </div>
      </div>
    </div>
  );
}

const THRESHOLDS: { x: number; label: string }[] = [
  { x: 300, label: "KWTBB > 300" },
  { x: 600, label: "Retail + AFA + SST > 600" },
  { x: 1000, label: "EEI ends" },
  { x: 1500, label: "37.03 sen > 1,500" },
];

export function CostCurveChart({
  curve,
  breakevens,
  results,
  afaSen,
  afaSourceLabel,
}: {
  curve: CurvePoint[];
  breakevens: Breakeven[];
  results: MonthResult[];
  afaSen: number;
  /** Which month's AFA the curve uses (null = fetched/default value). */
  afaSourceLabel: string | null;
}) {
  const [hidden, setHidden] = useState<Record<string, boolean>>({});
  const toggle = (key: string) =>
    setHidden((prev) => ({ ...prev, [key]: !prev[key] }));

  return (
    <section aria-labelledby="curve-heading" className="card p-5">
      <h2 id="curve-heading" className="text-base font-bold">
        Cost curve — 0 to 3,000 kWh
      </h2>
      <p className="mb-4 text-xs text-ink-secondary">
        Monthly bill vs usage at AFA {formatSigned(afaSen)} sen/kWh
        {afaSourceLabel ? ` (${afaSourceLabel}'s AFA)` : ""}. Note the EEI
        staircase below 1,000 kWh, the combined step at 600 kWh and the energy-rate
        jump at 1,500 kWh. Drag the strip below the chart to zoom (e.g. the
        0–1,000 kWh region).{" "}
        {breakevens.length > 0
          ? `Breakeven at ${breakevens
              .map((b) => `≈${Math.round(b.kwh).toLocaleString()} kWh`)
              .join(", ")} — marked ●.`
          : "The curves do not cross in this range."}
      </p>
      <div className="h-96 w-full">
        <ResponsiveContainer>
          <LineChart data={curve} margin={{ top: 20, right: 16, left: 8, bottom: 0 }}>
            <CartesianGrid stroke="#e1e0d9" vertical={false} />
            <XAxis
              dataKey="kwh"
              type="number"
              domain={["dataMin", "dataMax"]}
              tickFormatter={(v: number) => v.toLocaleString()}
              tick={{ fill: MUTED, fontSize: 12 }}
              axisLine={{ stroke: "#c3c2b7" }}
              tickLine={false}
              label={{ value: "kWh / month", position: "insideBottomRight", offset: -2, fill: MUTED, fontSize: 11 }}
            />
            <YAxis
              tickFormatter={(v: number) => `RM${v.toLocaleString()}`}
              tick={{ fill: MUTED, fontSize: 12 }}
              axisLine={false}
              tickLine={false}
              width={80}
            />
            <Tooltip
              content={<CurveTooltip />}
              cursor={{ stroke: MUTED, strokeDasharray: "4 4" }}
            />
            <Legend
              onClick={(entry) => toggle(String(entry.dataKey))}
              wrapperStyle={{ cursor: "pointer", fontSize: 13 }}
            />
            {THRESHOLDS.map((threshold) => (
              <ReferenceLine
                key={threshold.x}
                x={threshold.x}
                stroke={MUTED}
                strokeDasharray="4 4"
                strokeOpacity={0.6}
                label={{
                  value: threshold.label,
                  position: "top",
                  fill: MUTED,
                  fontSize: 10,
                }}
              />
            ))}
            <Line
              type="linear"
              dataKey="oldRM"
              name="Old tariff"
              stroke={OLD_COLOR}
              strokeWidth={2}
              dot={false}
              hide={hidden.oldRM}
              isAnimationActive
            />
            <Line
              type="linear"
              dataKey="newRM"
              name="New tariff (RP4)"
              stroke={NEW_COLOR}
              strokeWidth={2}
              dot={false}
              hide={hidden.newRM}
              isAnimationActive
            />
            {breakevens.map((breakeven) => (
              <ReferenceDot
                key={`be-${Math.round(breakeven.kwh)}`}
                x={breakeven.kwh}
                y={breakeven.rm}
                r={5}
                fill={INK}
                stroke="#fcfcfb"
                strokeWidth={2}
                label={{
                  value: `≈${Math.round(breakeven.kwh).toLocaleString()} kWh`,
                  position: "top",
                  fill: INK,
                  fontSize: 11,
                  fontWeight: 600,
                }}
              />
            ))}
            {results.flatMap((result) => [
              !hidden.oldRM && (
                <ReferenceDot
                  key={`m-${result.index}-old`}
                  x={result.usage}
                  y={result.oldBill.total}
                  r={5}
                  fill={OLD_COLOR}
                  stroke="#fcfcfb"
                  strokeWidth={2}
                />
              ),
              !hidden.newRM && (
                <ReferenceDot
                  key={`m-${result.index}-new`}
                  x={result.usage}
                  y={result.newBill.total}
                  r={5}
                  fill={NEW_COLOR}
                  stroke="#fcfcfb"
                  strokeWidth={2}
                  label={{
                    value: result.label,
                    position: "bottom",
                    fill: MUTED,
                    fontSize: 10,
                  }}
                />
              ),
            ])}
            <Brush
              dataKey="kwh"
              height={24}
              stroke={MUTED}
              travellerWidth={8}
              tickFormatter={(v: number) => `${v}`}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
