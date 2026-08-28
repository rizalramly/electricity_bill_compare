import { useId, useState } from "react";
import type { AfaResult } from "../lib/afa";
import { MAX_KWH, type MonthEntry } from "../lib/model";
import type { TaxToggles } from "../lib/tariff";

interface Props {
  months: MonthEntry[];
  onMonthChange: (index: number, patch: Partial<MonthEntry>) => void;
  afaFetched: AfaResult | null;
  onAfaReset: () => void;
  icptInput: string;
  onIcptChange: (value: string) => void;
  taxes: TaxToggles;
  onTaxesChange: (taxes: TaxToggles) => void;
  onFillSample: () => void;
}

function afaCaption(afaFetched: AfaResult | null): string {
  if (afaFetched?.source === "mytnb") {
    return `Auto-fetched from myTNB (${afaFetched.month})`;
  }
  return "Default value (Aug 2026) — verify at mytnb.com.my/tariff";
}

function MonthField({
  month,
  index,
  onChange,
}: {
  month: MonthEntry;
  index: number;
  onChange: (patch: Partial<MonthEntry>) => void;
}) {
  const id = useId();
  const afaId = useId();
  const usage = month.kwh === "" ? 0 : Number(month.kwh) || 0;
  return (
    <fieldset className="rounded-xl border border-grid bg-white/60 p-3">
      <input
        aria-label={`Label for month ${index + 1}`}
        className="mb-2 w-full rounded-md border border-transparent bg-transparent px-1 py-0.5 text-sm font-semibold text-ink hover:border-grid focus:border-grid focus:outline-none"
        value={month.label}
        onChange={(e) => onChange({ label: e.target.value })}
      />
      <div className="flex items-center gap-3">
        <input
          type="range"
          aria-label={`${month.label || `Month ${index + 1}`} usage slider`}
          min={0}
          max={MAX_KWH}
          step={5}
          value={Math.min(usage, MAX_KWH)}
          onChange={(e) => onChange({ kwh: e.target.value })}
        />
        <div className="flex items-center gap-1.5">
          <input
            id={id}
            type="number"
            inputMode="decimal"
            className="input-field w-24 text-right tabular-nums"
            placeholder="—"
            min={0}
            max={MAX_KWH}
            value={month.kwh}
            onChange={(e) => onChange({ kwh: e.target.value })}
          />
          <label htmlFor={id} className="text-xs text-ink-muted">
            kWh
          </label>
        </div>
      </div>
      {month.kwh !== "" && (Number(month.kwh) < 0 || Number(month.kwh) > MAX_KWH) && (
        <p role="alert" className="mt-1 text-xs text-status-bad">
          Enter a value between 0 and 10,000 kWh (clamped for calculation).
        </p>
      )}
      <div className="mt-2 flex items-center gap-2">
        <label htmlFor={afaId} className="text-xs font-medium text-ink-secondary">
          AFA
        </label>
        <input
          id={afaId}
          type="number"
          inputMode="decimal"
          className="input-field w-24 text-right tabular-nums"
          min={-10}
          max={10}
          step={0.01}
          value={month.afa}
          onChange={(e) => onChange({ afa: e.target.value })}
        />
        <span className="text-xs text-ink-muted">sen/kWh</span>
      </div>
    </fieldset>
  );
}

export function InputsPanel({
  months,
  onMonthChange,
  afaFetched,
  onAfaReset,
  icptInput,
  onIcptChange,
  taxes,
  onTaxesChange,
  onFillSample,
}: Props) {
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const icptId = useId();

  return (
    <section aria-labelledby="inputs-heading" className="card p-5">
      <div className="mb-4 flex items-center justify-between gap-2">
        <h2 id="inputs-heading" className="text-base font-bold">
          Your usage
        </h2>
        <button type="button" className="btn-secondary" onClick={onFillSample}>
          Sample data
        </button>
      </div>

      <p className="mb-3 text-xs text-ink-secondary">
        Enter total monthly usage for up to 3 months (labels are editable).
      </p>
      <div className="flex flex-col gap-3">
        {months.map((month, index) => (
          <MonthField
            key={index}
            month={month}
            index={index}
            onChange={(patch) => onMonthChange(index, patch)}
          />
        ))}
      </div>

      <div className="mt-5 border-t border-grid pt-4">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-sm font-semibold">AFA — Automatic Fuel Adjustment</h3>
          <button
            type="button"
            className="btn-secondary"
            onClick={onAfaReset}
            title="Reset every month's AFA to the fetched value"
          >
            ↺ Reset all
          </button>
        </div>
        <p className="mt-1 text-xs text-ink-muted">{afaCaption(afaFetched)}</p>
        <p className="mt-1 text-xs text-ink-secondary">
          AFA is gazetted monthly — set it per month above. Negative = rebate.
          Exempt when usage ≤ 600 kWh.
        </p>
      </div>

      <div className="mt-5 border-t border-grid pt-4">
        <button
          type="button"
          className="flex w-full items-center justify-between text-sm font-semibold"
          aria-expanded={advancedOpen}
          onClick={() => setAdvancedOpen((v) => !v)}
        >
          Advanced
          <span aria-hidden="true" className="text-ink-muted">
            {advancedOpen ? "▴" : "▾"}
          </span>
        </button>
        {advancedOpen && (
          <div className="mt-3 flex flex-col gap-4">
            <div>
              <label htmlFor={icptId} className="text-sm font-medium">
                ICPT for old tariff
              </label>
              <div className="mt-1.5 flex items-center gap-2">
                <input
                  id={icptId}
                  type="number"
                  inputMode="decimal"
                  className="input-field w-28 text-right tabular-nums"
                  min={-10}
                  max={10}
                  step={0.01}
                  value={icptInput}
                  onChange={(e) => onIcptChange(e.target.value)}
                />
                <span className="text-xs text-ink-muted">sen/kWh</span>
              </div>
              <p className="mt-1 text-xs text-ink-muted">
                Default 0 — the old side is a base-tariff figure unless set.
              </p>
            </div>

            <div className="flex flex-col gap-2">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  className="h-4 w-4 accent-series-old"
                  checked={taxes.kwtbb}
                  onChange={(e) => onTaxesChange({ ...taxes, kwtbb: e.target.checked })}
                />
                KWTBB (RE Fund) 1.6% — usage &gt; 300 kWh
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  className="h-4 w-4 accent-series-old"
                  checked={taxes.sst}
                  onChange={(e) => onTaxesChange({ ...taxes, sst: e.target.checked })}
                />
                Service Tax (SST) 8% — usage &gt; 600 kWh
              </label>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
