import { useEffect, useMemo, useState } from "react";
import { InputsPanel } from "./components/InputsPanel";
import { MonthCard } from "./components/MonthCard";
import { ComparisonBarChart } from "./components/ComparisonBarChart";
import { CostCurveChart } from "./components/CostCurveChart";
import { SummaryPanel } from "./components/SummaryPanel";
import { DataTable } from "./components/DataTable";
import { fetchAfa, type AfaResult, DEFAULT_AFA } from "./lib/afa";
import { buildCurve, findBreakevens } from "./lib/curve";
import { clamp, parseUsage, type MonthEntry, type MonthResult } from "./lib/model";
import { calcNewTariff, calcOldTariff, type TaxToggles } from "./lib/tariff";

const SAMPLE_KWH = ["380", "520", "745"];

export default function App() {
  const [months, setMonths] = useState<MonthEntry[]>([
    { label: "Month 1", kwh: "" },
    { label: "Month 2", kwh: "" },
    { label: "Month 3", kwh: "" },
  ]);
  const [afaInput, setAfaInput] = useState(DEFAULT_AFA.toFixed(2));
  const [afaFetched, setAfaFetched] = useState<AfaResult | null>(null);
  const [icptInput, setIcptInput] = useState("0");
  const [taxes, setTaxes] = useState<TaxToggles>({ kwtbb: true, sst: true });
  const [showTable, setShowTable] = useState(false);

  useEffect(() => {
    let alive = true;
    fetchAfa().then((result) => {
      if (!alive) return;
      setAfaFetched(result);
      setAfaInput(result.value.toFixed(2));
    });
    return () => {
      alive = false;
    };
  }, []);

  const afaSen = clamp(Number(afaInput) || 0, -10, 10);
  const icptSen = clamp(Number(icptInput) || 0, -10, 10);

  const results: MonthResult[] = useMemo(() => {
    return months.flatMap((month, index) => {
      const usage = parseUsage(month.kwh);
      if (usage === null) return [];
      const oldBill = calcOldTariff(usage, icptSen, taxes);
      const newBill = calcNewTariff(usage, afaSen, taxes);
      const diff = newBill.total - oldBill.total;
      return [
        {
          index,
          label: month.label || `Month ${index + 1}`,
          usage,
          oldBill,
          newBill,
          diff,
          pct: oldBill.total > 0 ? (diff / oldBill.total) * 100 : 0,
        },
      ];
    });
  }, [months, afaSen, icptSen, taxes]);

  const curve = useMemo(
    () => buildCurve(afaSen, icptSen, taxes),
    [afaSen, icptSen, taxes],
  );
  const breakevens = useMemo(() => findBreakevens(curve), [curve]);

  const updateMonth = (index: number, patch: Partial<MonthEntry>) =>
    setMonths((prev) => prev.map((m, i) => (i === index ? { ...m, ...patch } : m)));

  const fillSample = () =>
    setMonths((prev) => prev.map((m, i) => ({ ...m, kwh: SAMPLE_KWH[i] ?? "" })));

  const resetAfa = () => {
    if (afaFetched) setAfaInput(afaFetched.value.toFixed(2));
    else setAfaInput(DEFAULT_AFA.toFixed(2));
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
          Compare your monthly bill under the <strong>old domestic tariff</strong>{" "}
          (pre-July 2025 tiered blocks) vs the <strong>new RP4 tariff</strong> —
          including the monthly AFA fuel adjustment, EEI rebate, and taxes. For
          domestic users in Peninsular Malaysia.
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-1">
          <InputsPanel
            months={months}
            onMonthChange={updateMonth}
            afaInput={afaInput}
            onAfaChange={setAfaInput}
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
                Enter your monthly usage on the left (1–3 months), or load the
                sample data to see the comparison instantly.
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

          {results.length > 0 && <SummaryPanel results={results} afaSen={afaSen} curve={curve} />}
        </div>
      </div>

      <div className="mt-6 flex flex-col gap-6">
        {results.length > 0 && <ComparisonBarChart results={results} />}
        <CostCurveChart curve={curve} breakevens={breakevens} results={results} afaSen={afaSen} />

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
          Old tariff shown at base rate (ICPT = 0 unless set). New tariff includes
          AFA as entered. Rates: RP4, effective 1 July 2025. Verify with{" "}
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
