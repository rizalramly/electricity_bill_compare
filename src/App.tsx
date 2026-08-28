import { useEffect, useMemo, useState } from "react";
import { FeedbackPanel } from "./components/FeedbackPanel";
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
  type MonthEntry,
  type MonthResult,
} from "./lib/model";
import { calcOldTariff, type TaxToggles } from "./lib/tariff";

// Sample data: ~380 / 520 / 745 kWh with their RP4 bills at AFA +3.80 sen.
const SAMPLE_KWH = ["380", "520", "745"];
const SAMPLE_BILL = ["105.90", "179.26", "368.02"];

type Tab = "calculator" | "feedback";

export default function App() {
  const [tab, setTab] = useState<Tab>("calculator");
  const [months, setMonths] = useState<MonthEntry[]>([
    { label: "Month 1", bill: "", kwh: "" },
    { label: "Month 2", bill: "", kwh: "" },
    { label: "Month 3", bill: "", kwh: "" },
  ]);
  // Auto-fetched AFA is only used for the RP4 line on the cost-curve chart —
  // the per-month RP4 side is the entered bill, taken as-is.
  const [afaFetched, setAfaFetched] = useState<AfaResult | null>(null);
  const [icptInput, setIcptInput] = useState("0");
  const [taxes, setTaxes] = useState<TaxToggles>({ kwtbb: true, sst: true });
  const [showTable, setShowTable] = useState(false);

  useEffect(() => {
    let alive = true;
    fetchAfa().then((result) => {
      if (alive) setAfaFetched(result);
    });
    return () => {
      alive = false;
    };
  }, []);

  const icptSen = clamp(Number(icptInput) || 0, -10, 10);

  const results: MonthResult[] = useMemo(() => {
    return months.flatMap((month, index) => {
      const billRM = parseBill(month.bill);
      const usage = parseUsage(month.kwh);
      if (billRM === null || usage === null) return [];
      const oldBill = calcOldTariff(usage, icptSen, taxes);
      const diff = billRM - oldBill.total;
      return [
        {
          index,
          label: month.label || `Month ${index + 1}`,
          usage,
          oldBill,
          newTotalRM: billRM,
          diff,
          pct: oldBill.total > 0 ? (diff / oldBill.total) * 100 : 0,
        },
      ];
    });
  }, [months, icptSen, taxes]);

  const curveAfaSen = clamp(afaFetched?.value ?? DEFAULT_AFA, -10, 10);
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
        bill: SAMPLE_BILL[i] ?? "",
        kwh: SAMPLE_KWH[i] ?? "",
      })),
    );

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
          Key in your actual monthly TNB bill (<strong>RM</strong>, as billed
          under the new <strong>RP4</strong> tariff) and the usage
          (<strong>kWh</strong>) shown on that bill — the calculator computes what
          the same usage would have cost under the{" "}
          <strong>old RP3 domestic tariff</strong> (pre-July 2025 tiered blocks).
          For domestic users in Peninsular Malaysia.
        </p>
        <p className="mt-3 max-w-3xl rounded-lg border border-series-new/30 bg-series-new/5 px-3 py-2 text-xs text-ink-secondary">
          <strong>* Simulation only.</strong> The RP3 amounts are computed
          estimates and may contain errors, as only limited public information
          about the old tariff is available. If you have complete bill details,
          please share them via the{" "}
          <button
            type="button"
            className="font-semibold text-series-old underline hover:opacity-80"
            onClick={() => setTab("feedback")}
          >
            Feedback
          </button>{" "}
          tab.
        </p>

        <nav aria-label="Sections" className="mt-5 flex gap-1 border-b border-grid">
          {(
            [
              ["calculator", "Calculator"],
              ["feedback", "Feedback"],
            ] as [Tab, string][]
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              aria-current={tab === key ? "page" : undefined}
              className={`-mb-px rounded-t-lg border-x border-t px-4 py-2 text-sm font-semibold transition ${
                tab === key
                  ? "border-grid bg-surface text-ink"
                  : "border-transparent text-ink-secondary hover:text-ink"
              }`}
              onClick={() => setTab(key)}
            >
              {label}
            </button>
          ))}
        </nav>
      </header>

      {tab === "feedback" && <FeedbackPanel />}

      {tab === "calculator" && (
      <>
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-1">
          <InputsPanel
            months={months}
            onMonthChange={updateMonth}
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
                Key in the bill amount (RM) and usage (kWh) from your TNB bill
                for 1–3 months, or load the sample data to see the comparison
                instantly.
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
          afaSource={afaFetched?.source === "mytnb" ? "auto-fetched from myTNB" : "default value"}
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
      </>
      )}

      <footer className="mt-10 border-t border-grid pt-4 text-xs text-ink-muted">
        <p>
          Old RP3 tariff computed at base rate (ICPT = 0 unless set). The RP4
          side is your bill as entered. Cost-curve RP4 line uses AFA{" "}
          {curveAfaSen >= 0 ? "+" : "−"}
          {Math.abs(curveAfaSen).toFixed(2)} sen/kWh. Rates: RP4, effective 1
          July 2025. Verify with{" "}
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
