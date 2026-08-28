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
  const totalNew = results.reduce((sum, r) => sum + r.newTotalRM, 0);
  const diff = totalNew - totalOld;
  const pct = totalOld > 0 ? (diff / totalOld) * 100 : 0;
  const saves = diff < 0;
  const monthWord = results.length === 1 ? "month" : `${results.length} months`;

  return (
    <section
      aria-labelledby="summary-heading"
      className={`card border-l-4 p-5 ${saves ? "border-l-status-good" : "border-l-status-bad"}`}
    >
      <h2 id="summary-heading" className="text-base font-bold">
        Summary
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-ink-secondary">
        Across your {monthWord} ({formatKwh(totalKwh)} total), your actual RP4
        bills add up to{" "}
        <strong className={saves ? "text-status-good" : "text-status-bad"}>
          {formatRM(Math.abs(diff))} {saves ? "less" : "more"} (
          {formatSigned(pct, 1)}%)
        </strong>{" "}
        than the same usage under the old RP3 tariff — {formatRM(totalNew)}{" "}
        billed vs {formatRM(totalOld)} computed.
      </p>
      <p className="mt-2 text-xs text-ink-muted">{favorabilityNote(curve)}</p>
    </section>
  );
}
