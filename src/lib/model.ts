import type { NewBillBreakdown, OldBillBreakdown } from "./tariff";

/** How months are entered: actual RP4 bill amount (default) or usage in kWh. */
export type InputMode = "bill" | "kwh";

export interface MonthEntry {
  label: string;
  /** Raw usage input string (kWh mode); empty = month not entered. */
  kwh: string;
  /** Raw bill input string in RM (bill mode); empty = month not entered. */
  bill: string;
  /** Per-month AFA in sen/kWh (raw input string) — AFA is gazetted monthly. */
  afa: string;
}

export interface MonthResult {
  index: number;
  label: string;
  usage: number;
  /** True when usage was estimated from an entered bill amount. */
  usageEstimated: boolean;
  /** AFA used for this month (sen/kWh). */
  afaSen: number;
  oldBill: OldBillBreakdown;
  newBill: NewBillBreakdown;
  /**
   * The RP4 total shown/compared: the entered bill amount in bill mode
   * (authoritative), or the computed newBill.total in kWh mode.
   */
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
