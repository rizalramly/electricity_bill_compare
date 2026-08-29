import { useId, useState } from "react";
import { MAX_BILL_RM, MAX_KWH, type MonthEntry } from "../lib/model";
import type { TaxToggles } from "../lib/tariff";

interface Props {
  months: MonthEntry[];
  onMonthChange: (index: number, patch: Partial<MonthEntry>) => void;
  icptInput: string;
  onIcptChange: (value: string) => void;
  taxes: TaxToggles;
  onTaxesChange: (taxes: TaxToggles) => void;
  onFillSample: () => void;
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
  const billId = useId();
  const kwhId = useId();
  const billValue = month.bill === "" ? 0 : Number(month.bill) || 0;
  const billInvalid =
    month.bill !== "" && (Number(month.bill) < 0 || Number(month.bill) > MAX_BILL_RM);
  const kwhInvalid =
    month.kwh !== "" && (Number(month.kwh) < 0 || Number(month.kwh) > MAX_KWH);
  const oneMissing =
    (month.bill !== "") !== (month.kwh !== "");

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
          aria-label={`${month.label || `Month ${index + 1}`} bill slider`}
          min={0}
          max={3000}
          step={1}
          value={Math.min(billValue, 3000)}
          onChange={(e) => onChange({ bill: e.target.value })}
        />
        <div className="flex items-center gap-1.5">
          <label htmlFor={billId} className="text-xs text-ink-muted">
            RM
          </label>
          <input
            id={billId}
            type="number"
            inputMode="decimal"
            className="input-field w-24 text-right tabular-nums"
            placeholder="Bill"
            min={0}
            max={MAX_BILL_RM}
            step={0.01}
            value={month.bill}
            onChange={(e) => onChange({ bill: e.target.value })}
          />
        </div>
      </div>
      <p className="mt-0.5 text-[11px] text-ink-muted">
        Bill amount as billed under RP4
      </p>

      <div className="mt-2 flex items-center gap-2">
        <input
          id={kwhId}
          type="number"
          inputMode="decimal"
          className="input-field w-24 text-right tabular-nums"
          placeholder="Usage"
          min={0}
          max={MAX_KWH}
          step={1}
          value={month.kwh}
          onChange={(e) => onChange({ kwh: e.target.value })}
        />
        <label htmlFor={kwhId} className="text-xs text-ink-muted">
          kWh — usage on that bill (for the RP3 calculation)
        </label>
      </div>

      {(billInvalid || kwhInvalid) && (
        <p role="alert" className="mt-1 text-xs text-status-bad">
          {billInvalid
            ? `Bill must be between RM 0 and RM ${MAX_BILL_RM.toLocaleString()}`
            : `Usage must be between 0 and ${MAX_KWH.toLocaleString()} kWh`}{" "}
          (clamped for calculation).
        </p>
      )}
      {oneMissing && !billInvalid && !kwhInvalid && (
        <p className="mt-1 text-xs text-ink-muted">
          Enter both the bill (RM) and the usage (kWh) to include this month.
        </p>
      )}
    </fieldset>
  );
}

export function InputsPanel({
  months,
  onMonthChange,
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
          Your bills
        </h2>
        <button type="button" className="btn-secondary" onClick={onFillSample}>
          Sample data
        </button>
      </div>

      <p className="mb-3 text-xs text-ink-secondary">
        From each electricity bill (up to 3 months), key in the total amount (RM) and
        the usage (kWh) printed on it. Labels are editable.
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
                ICPT for old RP3 tariff
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
                Default 0 — the RP3 side is a base-tariff figure unless set.
                Domestic users ≤ 1,500 kWh/month were ICPT-exempt; above that,
                the surcharge (historically +10 sen in H1 2025) applied to all
                kWh.
              </p>
            </div>

            <div className="flex flex-col gap-2">
              <p className="text-sm font-medium">Taxes on the RP3 side</p>
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
