import type { CurvePoint } from "../lib/curve";
import { formatRM, formatSigned } from "../lib/format";
import type { MonthResult } from "../lib/model";

export function DataTable({
  results,
  curve,
}: {
  results: MonthResult[];
  curve: CurvePoint[];
}) {
  const curveRows = curve.filter((point) => point.kwh % 100 === 0);

  return (
    <div className="card mt-3 overflow-x-auto p-5">
      {results.length > 0 && (
        <>
          <h3 className="mb-2 text-sm font-bold">Your months</h3>
          <table className="mb-6 w-full min-w-[480px] text-left text-xs">
            <thead>
              <tr className="border-b border-grid text-ink-muted">
                <th scope="col" className="py-1.5 pr-4 font-medium">Month</th>
                <th scope="col" className="py-1.5 pr-4 text-right font-medium">Usage (kWh)</th>
                <th scope="col" className="py-1.5 pr-4 text-right font-medium">AFA (sen/kWh)</th>
                <th scope="col" className="py-1.5 pr-4 text-right font-medium">Old (RP3)</th>
                <th scope="col" className="py-1.5 pr-4 text-right font-medium">New (RP4)</th>
                <th scope="col" className="py-1.5 text-right font-medium">Difference</th>
              </tr>
            </thead>
            <tbody>
              {results.map((result) => (
                <tr key={result.index} className="border-b border-grid/60">
                  <th scope="row" className="py-1.5 pr-4 font-medium">{result.label}</th>
                  <td className="py-1.5 pr-4 text-right tabular-nums">
                    {result.usageEstimated ? "≈" : ""}
                    {result.usage.toLocaleString()}
                  </td>
                  <td className="py-1.5 pr-4 text-right tabular-nums">
                    {formatSigned(result.afaSen)}
                  </td>
                  <td className="py-1.5 pr-4 text-right tabular-nums">
                    {formatRM(result.oldBill.total)}
                  </td>
                  <td className="py-1.5 pr-4 text-right tabular-nums">
                    {formatRM(result.newTotalRM)}
                  </td>
                  <td
                    className={`py-1.5 text-right tabular-nums ${
                      result.diff < 0 ? "text-status-good" : "text-status-bad"
                    }`}
                  >
                    {formatRM(result.diff)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}

      <h3 className="mb-2 text-sm font-bold">Cost curve (every 100 kWh)</h3>
      <table className="w-full min-w-[480px] text-left text-xs">
        <thead>
          <tr className="border-b border-grid text-ink-muted">
            <th scope="col" className="py-1.5 pr-4 font-medium">Usage (kWh)</th>
            <th scope="col" className="py-1.5 pr-4 text-right font-medium">Old (RP3)</th>
            <th scope="col" className="py-1.5 pr-4 text-right font-medium">New (RP4)</th>
            <th scope="col" className="py-1.5 text-right font-medium">Difference (new − old)</th>
          </tr>
        </thead>
        <tbody>
          {curveRows.map((point) => (
            <tr key={point.kwh} className="border-b border-grid/60">
              <th scope="row" className="py-1.5 pr-4 font-medium tabular-nums">
                {point.kwh.toLocaleString()}
              </th>
              <td className="py-1.5 pr-4 text-right tabular-nums">{formatRM(point.oldRM)}</td>
              <td className="py-1.5 pr-4 text-right tabular-nums">{formatRM(point.newRM)}</td>
              <td
                className={`py-1.5 text-right tabular-nums ${
                  point.diff < 0 ? "text-status-good" : point.diff > 0 ? "text-status-bad" : ""
                }`}
              >
                {formatRM(point.diff)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
