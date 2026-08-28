import { calcNewTariff, calcOldTariff, type TaxToggles } from "./tariff";

export interface CurvePoint {
  kwh: number;
  oldRM: number;
  newRM: number;
  diff: number;
}

/**
 * Cost curve samples from 0 to maxKwh at `step` intervals, plus extra points
 * hugging the thresholds (300/600/1,000/1,500 kWh) so the discontinuities
 * render as sharp steps rather than slopes.
 */
export function buildCurve(
  afaSen: number,
  icptSen: number,
  taxes: TaxToggles,
  maxKwh = 3000,
  step = 10,
): CurvePoint[] {
  const xs = new Set<number>();
  for (let k = 0; k <= maxKwh; k += step) xs.add(k);
  for (const k of [299, 301, 599, 601, 999, 1001, 1499, 1501]) {
    if (k <= maxKwh) xs.add(k);
  }
  return [...xs]
    .sort((a, b) => a - b)
    .map((kwh) => {
      const oldRM = calcOldTariff(kwh, icptSen, taxes).total;
      const newRM = calcNewTariff(kwh, afaSen, taxes).total;
      return { kwh, oldRM, newRM, diff: newRM - oldRM };
    });
}

export interface Breakeven {
  kwh: number;
  rm: number;
}

/**
 * Crossover points where the two curves intersect, detected from the computed
 * data (there may be more than one depending on the AFA value).
 */
export function findBreakevens(curve: CurvePoint[]): Breakeven[] {
  const crossings: Breakeven[] = [];
  for (let i = 1; i < curve.length; i++) {
    const a = curve[i - 1];
    const b = curve[i];
    if (a.diff === 0 && a.kwh > 0) {
      crossings.push({ kwh: a.kwh, rm: a.oldRM });
    } else if (a.diff * b.diff < 0) {
      const t = a.diff / (a.diff - b.diff);
      crossings.push({
        kwh: a.kwh + t * (b.kwh - a.kwh),
        rm: a.oldRM + t * (b.oldRM - a.oldRM),
      });
    }
  }
  return crossings.filter(
    (p, i) => i === 0 || Math.abs(p.kwh - crossings[i - 1].kwh) > 1,
  );
}

/**
 * Plain-language note on which usage ranges favor which tariff, derived from
 * the computed curve rather than hardcoded thresholds.
 */
export function favorabilityNote(curve: CurvePoint[]): string {
  const breakevens = findBreakevens(curve);
  const ranges: { from: number; to: number; newCheaper: boolean }[] = [];
  const bounds = [0, ...breakevens.map((b) => b.kwh), curve[curve.length - 1].kwh];
  for (let i = 0; i < bounds.length - 1; i++) {
    const mid = (bounds[i] + bounds[i + 1]) / 2;
    const nearest = curve.reduce((best, p) =>
      Math.abs(p.kwh - mid) < Math.abs(best.kwh - mid) ? p : best,
    );
    ranges.push({
      from: Math.round(bounds[i]),
      to: Math.round(bounds[i + 1]),
      newCheaper: nearest.diff < 0,
    });
  }
  // Merge adjacent ranges with the same winner (a tangent crossing can create them)
  const merged = ranges.filter(
    (r, i) => i === 0 || r.newCheaper !== ranges[i - 1].newCheaper,
  );
  for (let i = 0; i < merged.length; i++) {
    const next = merged[i + 1];
    merged[i] = { ...merged[i], to: next ? next.from : ranges[ranges.length - 1].to };
  }
  if (merged.length === 1) {
    return merged[0].newCheaper
      ? "At the current AFA, the new RP4 tariff is cheaper across the whole 0–3,000 kWh range."
      : "At the current AFA, the old RP3 tariff is cheaper across the whole 0–3,000 kWh range.";
  }
  const parts = merged.map((r) => {
    const range =
      r.to >= (curve[curve.length - 1]?.kwh ?? 3000)
        ? `above ${r.from.toLocaleString()} kWh`
        : `${r.from.toLocaleString()}–${r.to.toLocaleString()} kWh`;
    return `${range} favors the ${r.newCheaper ? "new RP4" : "old RP3"} tariff`;
  });
  return `${parts.join("; ")}.`;
}
