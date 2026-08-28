import { formatKwh, formatPercent, formatRM, formatSigned } from "../lib/format";
import type { MonthResult } from "../lib/model";

function Line({
  label,
  amount,
  muted = false,
  negative = false,
}: {
  label: string;
  amount: string;
  muted?: boolean;
  negative?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-2 py-0.5">
      <span className={muted ? "text-ink-muted" : "text-ink-secondary"}>{label}</span>
      <span
        className={`tabular-nums ${negative ? "text-status-good" : "text-ink"}`}
      >
        {amount}
      </span>
    </div>
  );
}

export function MonthCard({ result }: { result: MonthResult }) {
  const { oldBill } = result;
  const saves = result.diff < 0;
  const isZero = Math.abs(result.diff) < 0.005;

  return (
    <article className="card flex flex-col p-4">
      <header className="mb-3 flex items-start justify-between gap-2">
        <div>
          <h3 className="text-sm font-bold">{result.label}</h3>
          <p className="text-xs text-ink-muted">{formatKwh(result.usage)}</p>
        </div>
        <span
          className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
            isZero
              ? "bg-grid text-ink-secondary"
              : saves
                ? "bg-status-good/10 text-status-good ring-1 ring-status-good/30"
                : "bg-status-bad/10 text-status-bad ring-1 ring-status-bad/30"
          }`}
        >
          {isZero ? "Same cost" : saves ? "You save" : "You pay more"}
        </span>
      </header>

      <dl className="mb-2 grid grid-cols-2 gap-2 text-sm">
        <div>
          <dt className="flex items-center gap-1.5 text-xs text-ink-muted">
            <span aria-hidden="true" className="inline-block h-2.5 w-2.5 rounded-sm bg-series-old" />
            Old (RP3)
          </dt>
          <dd className="font-semibold tabular-nums">{formatRM(oldBill.total)}</dd>
        </div>
        <div>
          <dt className="flex items-center gap-1.5 text-xs text-ink-muted">
            <span aria-hidden="true" className="inline-block h-2.5 w-2.5 rounded-sm bg-series-new" />
            New (RP4, billed)
          </dt>
          <dd className="font-semibold tabular-nums">{formatRM(result.newTotalRM)}</dd>
        </div>
      </dl>

      <p
        className={`mb-3 text-sm font-bold tabular-nums ${
          isZero ? "text-ink-secondary" : saves ? "text-status-good" : "text-status-bad"
        }`}
      >
        {saves ? "−" : "+"}
        {formatRM(Math.abs(result.diff))} ({formatPercent(result.pct)})
      </p>

      <details className="mt-auto text-xs">
        <summary className="cursor-pointer select-none font-medium text-ink-secondary hover:text-ink">
          RP3 breakdown
        </summary>
        <div className="mt-2">
          <h4 className="mb-1 flex items-center gap-1.5 font-semibold">
            <span aria-hidden="true" className="inline-block h-2 w-2 rounded-sm bg-series-old" />
            Old tariff (RP3) — computed from {formatKwh(result.usage)}
          </h4>
          {oldBill.blocks.map((block) => (
            <Line
              key={block.label}
              label={`${block.label} × ${block.rateSen} sen`}
              amount={formatRM(block.amount)}
            />
          ))}
          {oldBill.icptSen !== 0 &&
            (oldBill.icptApplies ? (
              <Line
                label={`ICPT ${formatSigned(oldBill.icptSen)} sen × ${result.usage} kWh`}
                amount={formatRM(oldBill.icptAmount)}
                negative={oldBill.icptAmount < 0}
              />
            ) : (
              <Line label="ICPT — exempt (≤ 1,500 kWh)" amount={formatRM(0)} muted />
            ))}
          {oldBill.minimumChargeApplied && (
            <Line label="Minimum monthly charge" amount={formatRM(oldBill.subtotal)} />
          )}
          {oldBill.kwtbb > 0 && (
            <Line label="KWTBB 1.6%" amount={formatRM(oldBill.kwtbb)} />
          )}
          {oldBill.sst > 0 && (
            <Line label="SST 8% (portion > 600 kWh)" amount={formatRM(oldBill.sst)} />
          )}
          <div className="mt-1 border-t border-grid pt-1">
            <Line label="RP3 total" amount={formatRM(oldBill.total)} />
            <Line label="Your RP4 bill (as billed)" amount={formatRM(result.newTotalRM)} muted />
          </div>
          {result.usage > 0 && (
            <p className="mt-2 text-[11px] text-ink-muted">
              Effective rate: RP3 {((oldBill.total / result.usage) * 100).toFixed(1)} sen/kWh
              {" · "}RP4 {((result.newTotalRM / result.usage) * 100).toFixed(1)} sen/kWh
            </p>
          )}
        </div>
      </details>
    </article>
  );
}
