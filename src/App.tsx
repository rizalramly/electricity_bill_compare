import { useEffect, useMemo, useState } from "react";
import { InputsPanel } from "./components/InputsPanel";
import { MonthCard } from "./components/MonthCard";
import { ComparisonBarChart } from "./components/ComparisonBarChart";
import { CostCurveChart } from "./components/CostCurveChart";
import { SummaryPanel } from "./components/SummaryPanel";
import { DataTable } from "./components/DataTable";
import { fetchAfa, type AfaResult, DEFAULT_AFA } from "./lib/afa";
import { buildCurve, findBreakevens } from "./lib/curve";
import {
  clamp,
  parseBill,
  parseUsage,
  type InputMode,
  type MonthEntry,
  type MonthResult,
} from "./lib/model";
import {
  calcNewTariff,
  calcOldTariff,
  usageFromNewBill,
  type TaxToggles,
} from "./lib/tariff";

// Sample data: ~380 / 520 / 745 kWh at AFA +3.80 sen, as usage and as RP4 bills.
const SAMPLE_KWH = ["380", "520", "745"];
const SAMPLE_BILL = ["105.90", "179.26", "368.02"];

export default function App() {
  const [inputMode, setInputMode] = useState<InputMode>("bill");
  const [months, setMonths] = useState<MonthEntry[]>([
    { label: "Month 1", kwh: "", bill: "", afa: DEFAULT_AFA.toFixed(2) },
    { label: "Month 2", kwh: "", bill: "", afa: DEFAULT_AFA.toFixed(2) },
    { label: "Month 3", kwh: "", bill: "", afa: DEFAULT_AFA.toFixed(2) },
  ]);
  const [afaFetched, setAfaFetched] = useState<AfaResult | null>(null);
  const [icptInput, setIcptInput] = useState("0");
  const [taxes, setTaxes] = useState<TaxToggles>({ kwtbb: true, sst: true });
  const [showTable, setShowTable] = useState(false);

  useEffect(() => {
    let alive = true;
    fetchAfa().then((result) => {
      if (!alive) return;
      setAfaFetched(result);
      // Prefill every month's AFA with the fetched value (all still editable).
      setMonths((prev) => prev.map((m) => ({ ...m, afa: result.value.toFixed(2) })));
    });
    return () => {
      alive = false;
    };
  }, []);

  const icptSen = clamp(Number(icptInput) || 0, -10, 10);

  const results: MonthResult[] = useMemo(() => {
    return months.flatMap((month, index) => {
      const afaSen = clamp(Number(month.afa) || 0, -10, 10);

      let usage: number;
      let usageEstimated: boolean;
      let newTotalRM: number;
      if (inputMode === "bill") {
        const billRM = parseBill(month.bill);
        if (billRM === null) return [];
        usage = usageFromNewBill(billRM, afaSen, taxes);
        usageEstimated = true;
        newTotalRM = billRM;
      } else {
        const parsed = parseUsage(month.kwh);
        if (parsed === null) return [];
        usage = parsed;
        usageEstimated = false;
        newTotalRM = calcNewTariff(usage, afaSen, taxes).total;
      }

      const oldBill = calcOldTariff(usage, icptSen, taxes);
      const newBill = calcNewTariff(usage, afaSen, taxes);
      const diff = newTotalRM - oldBill.total;
      return [
        {
          index,
          label: month.label || `Month ${index + 1}`,
          usage,
          usageEstimated,
          afaSen,
          oldBill,
          newBill,
          newTotalRM,
          diff,
          pct: oldBill.total > 0 ? (diff / oldBill.total) * 100 : 0,
        },
      ];
    });
  }, [months, inputMode, icptSen, taxes]);

  // The cost curve needs a single AFA: use the first entered month's value,
  // falling back to the fetched/default AFA when no month is entered yet.
  const curveAfaSen =
    results.length > 0
      ? results[0].afaSen
      : clamp(afaFetched?.value ?? DEFAULT_AFA, -10, 10);
  const curveAfaLabel = results.length > 0 ? results[0].label : null;

  const curve = useMemo(
    () => buildCurve(curveAfaSen, icptSen, taxes),
    [curveAfaSen, icptSen, taxes],
  );
  const breakevens = useMemo(() => findBreakevens(curve), [curve]);

  const updateMonth = (index: number, patch: Partial<MonthEntry>) =>
    setMonths((prev) => prev.map((m, i) => (i === index ? { ...m, ...patch } : m)));

  const fillSample = () =>
    setMonths((prev) =>
      prev.map((m, i) => ({
        ...m,
        kwh: SAMPLE_KWH[i] ?? "",
        bill: SAMPLE_BILL[i] ?? "",
      })),
    );

  const resetAfa = () => {
    const value = (afaFetched?.value ?? DEFAULT_AFA).toFixed(2);
    setMonths((prev) => prev.map((m) => ({ ...m, afa: value })));
  };

  return (
    <div className="mx-auto max-w-6xl px-4 pb-16 pt-8 sm:px-6">
      <header className="mb-8">
        <div className="flex flex-wrap items-center gap-3">
          <span aria-hidden="true" className="text-3xl">⚡</span>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
            TNB Tariff Comparison
          </h1>
          <span className="rounded-full bg-series-new/10 px-3 py-1 text-xs font-semibold text-series-new ring-1 ring-series-new/30">
            RP4 · effective 1 July 2025
          </span>
        </div>
        <p className="mt-2 max-w-3xl text-sm text-ink-secondary">
          Key in your actual monthly TNB bill (billed under the new{" "}
          <strong>RP4</strong> tariff) — the calculator estimates your usage and
          shows what the same month would have cost under the{" "}
          <strong>old RP3 domestic tariff</strong> (pre-July 2025 tiered blocks).
          For domestic users in Peninsular Malaysia.
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-1">
          <InputsPanel
            inputMode={inputMode}
            onInputModeChange={setInputMode}
            months={months}
            onMonthChange={updateMonth}
            afaFetched={afaFetched}
            onAfaReset={resetAfa}
            icptInput={icptInput}
            onIcptChange={setIcptInput}
            taxes={taxes}
            onTaxesChange={setTaxes}
            onFillSample={fillSample}
          />
        </div>

        <div className="flex flex-col gap-6 lg:col-span-2">
          {results.length === 0 ? (
            <div className="card flex h-full min-h-[200px] flex-col items-center justify-center gap-3 p-8 text-center">
              <p className="text-lg font-semibold">No months entered yet</p>
              <p className="max-w-sm text-sm text-ink-secondary">
                {inputMode === "bill"
                  ? "Key in your monthly bill amount on the left (1–3 months), or load the sample data to see the comparison instantly."
                  : "Enter your monthly usage on the left (1–3 months), or load the sample data to see the comparison instantly."}
              </p>
              <button type="button" className="btn-secondary" onClick={fillSample}>
                Load sample data
              </button>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {results.map((result) => (
                <MonthCard key={result.index} result={result} />
              ))}
            </div>
          )}

          {results.length > 0 && <SummaryPanel results={results} curve={curve} />}
        </div>
      </div>

      <div className="mt-6 flex flex-col gap-6">
        {results.length > 0 && <ComparisonBarChart results={results} />}
        <CostCurveChart
          curve={curve}
          breakevens={breakevens}
          results={results}
          afaSen={curveAfaSen}
          afaSourceLabel={curveAfaLabel}
        />

        <div>
          <button
            type="button"
            className="btn-secondary"
            aria-expanded={showTable}
            onClick={() => setShowTable((v) => !v)}
          >
            {showTable ? "Hide data table" : "Show data table"}
            <span aria-hidden="true">{showTable ? "▴" : "▾"}</span>
          </button>
          {showTable && <DataTable results={results} curve={curve} />}
        </div>
      </div>

      <footer className="mt-10 border-t border-grid pt-4 text-xs text-ink-muted">
        <p>
          Old RP3 tariff shown at base rate (ICPT = 0 unless set). New RP4 tariff
          includes AFA as entered; usage estimated from bills is approximate.
          Rates: RP4, effective 1 July 2025. Verify with{" "}
          <a
            className="underline hover:text-ink"
            href="https://www.mytnb.com.my/tariff/index.html"
            target="_blank"
            rel="noreferrer"
          >
            myTNB
          </a>{" "}
          for official figures. This tool is an unofficial estimate.
        </p>
      </footer>
    </div>
  );
}
