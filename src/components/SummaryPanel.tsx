import { favorabilityNote, type CurvePoint } from "../lib/curve";
import { formatKwh, formatRM, formatSigned } from "../lib/format";
import type { MonthResult } from "../lib/model";

export function SummaryPanel({
  results,
  curve,
}: {
  results: MonthResult[];
  curve: CurvePoint[];
}) {
  const totalKwh = results.reduce((sum, r) => sum + r.usage, 0);
  const totalOld = results.reduce((sum, r) => sum + r.oldBill.total, 0);
  const totalNew = results.reduce((sum, r) => sum + r.newBill.total, 0);
  const diff = totalNew - totalOld;
  const pct = totalOld > 0 ? (diff / totalOld) * 100 : 0;
  const saves = diff < 0;
  const monthWord = results.length === 1 ? "month" : `${results.length} months`;
  const uniqueAfas = [...new Set(results.map((r) => r.afaSen))];
  const afaText =
    uniqueAfas.length === 1
      ? `at AFA ${formatSigned(uniqueAfas[0])} sen`
      : `at monthly AFA of ${results.map((r) => formatSigned(r.afaSen)).join(" / ")} sen`;

  return (
    <section
      aria-labelledby="summary-heading"
      className={`card border-l-4 p-5 ${saves ? "border-l-status-good" : "border-l-status-bad"}`}
    >
      <h2 id="summary-heading" className="text-base font-bold">
        Summary
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-ink-secondary">
        Across your {monthWord} ({formatKwh(totalKwh)} total) {afaText}, the
        new RP4 tariff costs{" "}
        <strong className={saves ? "text-status-good" : "text-status-bad"}>
          {formatRM(Math.abs(diff))} {saves ? "less" : "more"} (
          {formatSigned(pct, 1)}%)
        </strong>{" "}
        than the old tariff — {formatRM(totalNew)} vs {formatRM(totalOld)}.
      </p>
      <p className="mt-2 text-xs text-ink-muted">{favorabilityNote(curve)}</p>
    </section>
  );
}
