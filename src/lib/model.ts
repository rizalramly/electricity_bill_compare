import type { OldBillBreakdown } from "./tariff";

export interface MonthEntry {
  label: string;
  /** Actual monthly bill in RM as billed under RP4 (raw input string). */
  bill: string;
  /** Monthly usage in kWh from the bill statement (raw input string). */
  kwh: string;
}

export interface MonthResult {
  index: number;
  label: string;
  /** Usage entered from the bill statement (kWh) — drives the RP3 calculation. */
  usage: number;
  /** Computed old RP3 tariff bill for that usage. */
  oldBill: OldBillBreakdown;
  /** The actual RP4 bill amount as entered (RM) — used as-is, no calculation. */
  newTotalRM: number;
  /** new − old (negative = new tariff is cheaper). */
  diff: number;
  /** diff as a % of the old bill. */
  pct: number;
}

export const MAX_KWH = 10000;
export const MAX_BILL_RM = 10000;

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function parseUsage(raw: string): number | null {
  if (raw.trim() === "") return null;
  const value = Number(raw);
  if (!Number.isFinite(value)) return null;
  return clamp(value, 0, MAX_KWH);
}

export function parseBill(raw: string): number | null {
  if (raw.trim() === "") return null;
  const value = Number(raw);
  if (!Number.isFinite(value)) return null;
  return clamp(value, 0, MAX_BILL_RM);
}
