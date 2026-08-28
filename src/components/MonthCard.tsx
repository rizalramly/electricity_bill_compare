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
  const { oldBill, newBill } = result;
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
            Old tariff
          </dt>
          <dd className="font-semibold tabular-nums">{formatRM(oldBill.total)}</dd>
        </div>
        <div>
          <dt className="flex items-center gap-1.5 text-xs text-ink-muted">
            <span aria-hidden="true" className="inline-block h-2.5 w-2.5 rounded-sm bg-series-new" />
            New (RP4)
          </dt>
          <dd className="font-semibold tabular-nums">{formatRM(newBill.total)}</dd>
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
          Breakdown
        </summary>
        <div className="mt-2 grid gap-4 sm:grid-cols-1">
          <div>
            <h4 className="mb-1 flex items-center gap-1.5 font-semibold">
              <span aria-hidden="true" className="inline-block h-2 w-2 rounded-sm bg-series-old" />
              Old tariff
            </h4>
            {oldBill.blocks.map((block) => (
              <Line
                key={block.label}
                label={`${block.label} × ${block.rateSen} sen`}
                amount={formatRM(block.amount)}
              />
            ))}
            {oldBill.icptSen !== 0 && (
              <Line
                label={`ICPT ${formatSigned(oldBill.icptSen)} sen × ${result.usage} kWh`}
                amount={formatRM(oldBill.icptAmount)}
                negative={oldBill.icptAmount < 0}
              />
            )}
            {oldBill.minimumChargeApplied && (
              <Line label="Minimum monthly charge" amount={formatRM(oldBill.subtotal)} />
            )}
            {oldBill.kwtbb > 0 && (
              <Line label="KWTBB 1.6%" amount={formatRM(oldBill.kwtbb)} />
            )}
            {oldBill.sst > 0 && <Line label="SST 8%" amount={formatRM(oldBill.sst)} />}
            <div className="mt-1 border-t border-grid pt-1">
              <Line label="Total" amount={formatRM(oldBill.total)} />
            </div>
          </div>

          <div>
            <h4 className="mb-1 flex items-center gap-1.5 font-semibold">
              <span aria-hidden="true" className="inline-block h-2 w-2 rounded-sm bg-series-new" />
              New tariff (RP4)
            </h4>
            <Line
              label={`Energy ${newBill.energyRateSen} sen/kWh`}
              amount={formatRM(newBill.energyCharge)}
            />
            <Line label="Capacity 4.55 sen/kWh" amount={formatRM(newBill.capacityCharge)} />
            <Line label="Network 12.85 sen/kWh" amount={formatRM(newBill.networkCharge)} />
            <Line
              label={newBill.retailWaived ? "Retail — waived (≤ 600 kWh)" : "Retail RM10/month"}
              amount={formatRM(newBill.retailCharge)}
              muted={newBill.retailWaived}
            />
            <Line
              label={
                newBill.afaApplies
                  ? `AFA ${formatSigned(newBill.afaSen)} sen × ${result.usage} kWh`
                  : "AFA — exempt (≤ 600 kWh)"
              }
              amount={formatRM(newBill.afaAmount)}
              muted={!newBill.afaApplies}
              negative={newBill.afaAmount < 0}
            />
            {newBill.eeiRebate > 0 && (
              <Line
                label={`EEI rebate ${newBill.eeiRateSen} sen/kWh`}
                amount={`−${formatRM(newBill.eeiRebate)}`}
                negative
              />
            )}
            {newBill.kwtbb > 0 && (
              <Line label="KWTBB 1.6%" amount={formatRM(newBill.kwtbb)} />
            )}
            {newBill.sst > 0 && <Line label="SST 8%" amount={formatRM(newBill.sst)} />}
            <div className="mt-1 border-t border-grid pt-1">
              <Line label="Total" amount={formatRM(newBill.total)} />
            </div>
          </div>
        </div>
      </details>
    </article>
  );
}
