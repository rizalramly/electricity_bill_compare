import type { NewBillBreakdown, OldBillBreakdown } from "./tariff";

export interface MonthEntry {
  label: string;
  /** Raw input string; empty = month not entered. */
  kwh: string;
  /** Per-month AFA in sen/kWh (raw input string) — AFA is gazetted monthly. */
  afa: string;
}

export interface MonthResult {
  index: number;
  label: string;
  usage: number;
  /** AFA used for this month (sen/kWh). */
  afaSen: number;
  oldBill: OldBillBreakdown;
  newBill: NewBillBreakdown;
  /** new − old (negative = new tariff is cheaper). */
  diff: number;
  /** diff as a % of the old bill. */
  pct: number;
}

export const MAX_KWH = 10000;

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function parseUsage(raw: string): number | null {
  if (raw.trim() === "") return null;
  const value = Number(raw);
  if (!Number.isFinite(value)) return null;
  return clamp(value, 0, MAX_KWH);
}
