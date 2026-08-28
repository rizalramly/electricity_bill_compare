/**
 * TNB domestic tariff engine (Peninsular Malaysia).
 *
 * Old tariff: Tariff A — Domestic, pre-July 2025 tiered blocks.
 * New tariff: RP4 Domestic, effective 1 July 2025 (flat component rates + AFA + EEI).
 *
 * All functions are pure. Monetary amounts are RM; rates are sen/kWh unless noted.
 * Sources: myTNB published tariff schedules (verify at https://www.mytnb.com.my/tariff).
 */

export interface TaxToggles {
  /** KWTBB (RE Fund): 1.6% of the bill, only when monthly usage > 300 kWh. */
  kwtbb: boolean;
  /** Service Tax (SST): 8%, only when monthly usage > 600 kWh. */
  sst: boolean;
}

export const DEFAULT_TAXES: TaxToggles = { kwtbb: true, sst: true };

// ---------------------------------------------------------------------------
// Old tariff (Tariff A — Domestic, pre-July 2025)
// ---------------------------------------------------------------------------

export interface OldBlockLine {
  label: string;
  kwh: number;
  rateSen: number;
  amount: number;
}

export interface OldBillBreakdown {
  usage: number;
  blocks: OldBlockLine[];
  energyCharge: number;
  icptSen: number;
  /** ICPT applies only when monthly usage > 1,500 kWh (domestic exemption). */
  icptApplies: boolean;
  icptAmount: number;
  minimumChargeApplied: boolean;
  /** After minimum charge, before taxes. */
  subtotal: number;
  kwtbb: number;
  sst: number;
  total: number;
}

/** Progressive blocks: [block upper bound (kWh), rate (sen/kWh)]. */
export const OLD_BLOCKS: { upTo: number; rateSen: number; label: string }[] = [
  { upTo: 200, rateSen: 21.8, label: "First 200 kWh (1–200)" },
  { upTo: 300, rateSen: 33.4, label: "Next 100 kWh (201–300)" },
  { upTo: 600, rateSen: 51.6, label: "Next 300 kWh (301–600)" },
  { upTo: 900, rateSen: 54.6, label: "Next 300 kWh (601–900)" },
  { upTo: Infinity, rateSen: 57.1, label: "Above 900 kWh" },
];

export const OLD_MINIMUM_CHARGE_RM = 3.0;

// ---------------------------------------------------------------------------
// New tariff (RP4 Domestic, effective 1 July 2025)
// ---------------------------------------------------------------------------

export const RP4 = {
  /** Energy/Generation charge when monthly usage ≤ 1,500 kWh. */
  energyLowSen: 27.03,
  /** Energy/Generation charge applied to ALL kWh once usage > 1,500 kWh. */
  energyHighSen: 37.03,
  energyThresholdKwh: 1500,
  capacitySen: 4.55,
  networkSen: 12.85,
  retailRM: 10.0,
  /** Retail charge waived when monthly usage ≤ 600 kWh. */
  retailWaiverKwh: 600,
  /** AFA applies only when monthly usage > 600 kWh (then on ALL kWh). */
  afaExemptionKwh: 600,
} as const;

export interface NewBillBreakdown {
  usage: number;
  energyRateSen: number;
  energyCharge: number;
  capacityCharge: number;
  networkCharge: number;
  retailCharge: number;
  retailWaived: boolean;
  afaSen: number;
  afaApplies: boolean;
  afaAmount: number;
  eeiRateSen: number;
  /** Positive RM amount; rendered as a negative line item. */
  eeiRebate: number;
  /** Before taxes. */
  subtotal: number;
  kwtbb: number;
  sst: number;
  total: number;
}

// ---------------------------------------------------------------------------
// Energy Efficiency Incentive (EEI) — rebate in sen/kWh on ALL kWh, by usage.
// Applies only when usage ≤ 1,000 kWh.
// ---------------------------------------------------------------------------

export const EEI_TIERS: { upTo: number; rebateSen: number }[] = [
  { upTo: 200, rebateSen: 25.0 },
  { upTo: 250, rebateSen: 24.5 },
  { upTo: 300, rebateSen: 22.5 },
  { upTo: 350, rebateSen: 21.0 },
  { upTo: 400, rebateSen: 17.0 },
  { upTo: 450, rebateSen: 14.5 },
  { upTo: 500, rebateSen: 12.0 },
  { upTo: 550, rebateSen: 10.5 },
  { upTo: 600, rebateSen: 9.0 },
  { upTo: 650, rebateSen: 7.5 },
  { upTo: 700, rebateSen: 5.5 },
  { upTo: 750, rebateSen: 4.5 },
  { upTo: 800, rebateSen: 4.0 },
  { upTo: 850, rebateSen: 2.5 },
  { upTo: 900, rebateSen: 1.0 },
  { upTo: 1000, rebateSen: 0.5 },
];

/** EEI rebate rate (sen/kWh) for a given monthly usage. 0 above 1,000 kWh. */
export function eeiRebateSen(usageKwh: number): number {
  if (usageKwh <= 0) return 0;
  for (const tier of EEI_TIERS) {
    if (usageKwh <= tier.upTo) return tier.rebateSen;
  }
  return 0;
}

// ---------------------------------------------------------------------------
// Taxes / levies (both tariffs)
// ---------------------------------------------------------------------------

export const KWTBB_RATE = 0.016;
export const KWTBB_THRESHOLD_KWH = 300;
export const SST_RATE = 0.08;
export const SST_THRESHOLD_KWH = 600;
/** Domestic users ≤ 1,500 kWh/month were ICPT-exempt (Jan 2023 – Jun 2025). */
export const OLD_ICPT_EXEMPTION_KWH = 1500;

/**
 * KWTBB (RE Fund): 1.6% of the consumption-related charges, only when monthly
 * usage > 300 kWh. The base EXCLUDES statutory pass-throughs and taxes:
 * under the old tariff it is the tiered energy charge (excluding ICPT); under
 * RP4 it is energy + capacity + network + AFA − EEI (excluding the RM10
 * retail charge and SST).
 */
export function kwtbbCharge(baseRM: number, usageKwh: number): number {
  return usageKwh > KWTBB_THRESHOLD_KWH ? baseRM * KWTBB_RATE : 0;
}

/**
 * Service Tax (SST), 8% (rate since 1 Mar 2024), only when monthly usage
 * > 600 kWh — and officially charged ONLY on the charges attributable to the
 * consumption ABOVE 600 kWh (the first 600 kWh stay exempt). Callers pass the
 * charge for the portion above 600 kWh as the base.
 */
export function sstCharge(baseAbove600RM: number, usageKwh: number): number {
  return usageKwh > SST_THRESHOLD_KWH ? baseAbove600RM * SST_RATE : 0;
}

/** Tiered energy charge (RM) for a given usage under the old tariff. */
export function oldEnergyCharge(usageKwh: number): number {
  let remaining = Math.max(0, usageKwh);
  let prevBound = 0;
  let charge = 0;
  for (const block of OLD_BLOCKS) {
    if (remaining <= 0) break;
    const kwhInBlock = Math.min(remaining, block.upTo - prevBound);
    charge += (kwhInBlock * block.rateSen) / 100;
    remaining -= kwhInBlock;
    prevBound = block.upTo;
  }
  return charge;
}

// ---------------------------------------------------------------------------
// Bill calculators
// ---------------------------------------------------------------------------

/**
 * Old tariff bill (Tariff A — Domestic).
 * @param usageKwh monthly usage in kWh
 * @param icptSen optional ICPT surcharge/rebate in sen/kWh on all kWh (default 0)
 */
export function calcOldTariff(
  usageKwh: number,
  icptSen = 0,
  taxes: TaxToggles = DEFAULT_TAXES,
): OldBillBreakdown {
  const usage = Math.max(0, usageKwh);
  const blocks: OldBlockLine[] = [];
  let remaining = usage;
  let prevBound = 0;
  let energyCharge = 0;

  for (const block of OLD_BLOCKS) {
    if (remaining <= 0) break;
    const blockSize = block.upTo - prevBound;
    const kwhInBlock = Math.min(remaining, blockSize);
    const amount = (kwhInBlock * block.rateSen) / 100;
    blocks.push({ label: block.label, kwh: kwhInBlock, rateSen: block.rateSen, amount });
    energyCharge += amount;
    remaining -= kwhInBlock;
    prevBound = block.upTo;
  }

  // Domestic ICPT exemption: only months above 1,500 kWh paid the surcharge
  // (then on ALL kWh), per the RP3 ICPT schedules of 2023 – Jun 2025.
  const icptApplies = usage > OLD_ICPT_EXEMPTION_KWH;
  const icptAmount = icptApplies ? (usage * icptSen) / 100 : 0;
  const beforeMinimum = energyCharge + icptAmount;
  const minimumChargeApplied = beforeMinimum < OLD_MINIMUM_CHARGE_RM;
  const subtotal = minimumChargeApplied ? OLD_MINIMUM_CHARGE_RM : beforeMinimum;

  // KWTBB base: the tiered energy charge only (excludes ICPT and taxes).
  const kwtbb = taxes.kwtbb ? kwtbbCharge(energyCharge, usage) : 0;
  // SST base: the charges attributable to kWh above 600 — the tiered energy
  // beyond the 600 kWh mark plus the ICPT share of those kWh.
  const energyAbove600 = Math.max(0, energyCharge - oldEnergyCharge(SST_THRESHOLD_KWH));
  const icptAbove600 = icptApplies ? (Math.max(0, usage - SST_THRESHOLD_KWH) * icptSen) / 100 : 0;
  const sst = taxes.sst ? sstCharge(energyAbove600 + icptAbove600, usage) : 0;

  return {
    usage,
    blocks,
    energyCharge,
    icptSen,
    icptApplies,
    icptAmount,
    minimumChargeApplied,
    subtotal,
    kwtbb,
    sst,
    total: subtotal + kwtbb + sst,
  };
}

/**
 * Invert an RP4 bill: estimate the monthly usage (kWh) that produces the given
 * total bill (RM, including AFA, EEI and enabled taxes).
 *
 * The RP4 total is piecewise-linear in usage with upward jumps at the EEI tier
 * edges and (for non-negative AFA) at 600 kWh, so bisection converges to the
 * usage whose computed total is nearest the entered bill. A strongly negative
 * AFA can make the 600 kWh step non-monotonic; the estimate then lands on one
 * of the candidate usages, which is acceptable for an estimator.
 */
export function usageFromNewBill(
  totalRM: number,
  afaSen = 0,
  taxes: TaxToggles = DEFAULT_TAXES,
  maxKwh = 10000,
): number {
  if (!Number.isFinite(totalRM) || totalRM <= 0) return 0;
  const billAt = (usage: number) => calcNewTariff(usage, afaSen, taxes).total;
  if (billAt(maxKwh) <= totalRM) return maxKwh;
  let lo = 0;
  let hi = maxKwh;
  for (let i = 0; i < 60; i++) {
    const mid = (lo + hi) / 2;
    if (billAt(mid) < totalRM) lo = mid;
    else hi = mid;
  }
  return Math.round((lo + hi) / 2);
}

/**
 * New tariff bill (RP4 Domestic, effective 1 July 2025).
 * @param usageKwh monthly usage in kWh
 * @param afaSen AFA in sen/kWh (may be negative = rebate); exempt when usage ≤ 600 kWh
 */
export function calcNewTariff(
  usageKwh: number,
  afaSen = 0,
  taxes: TaxToggles = DEFAULT_TAXES,
): NewBillBreakdown {
  const usage = Math.max(0, usageKwh);

  const energyRateSen =
    usage > RP4.energyThresholdKwh ? RP4.energyHighSen : RP4.energyLowSen;
  const energyCharge = (usage * energyRateSen) / 100;
  const capacityCharge = (usage * RP4.capacitySen) / 100;
  const networkCharge = (usage * RP4.networkSen) / 100;

  const retailWaived = usage <= RP4.retailWaiverKwh;
  const retailCharge = retailWaived ? 0 : RP4.retailRM;

  const afaApplies = usage > RP4.afaExemptionKwh;
  const afaAmount = afaApplies ? (usage * afaSen) / 100 : 0;

  const eeiRate = eeiRebateSen(usage);
  const eeiRebate = (usage * eeiRate) / 100;

  const subtotal =
    energyCharge + capacityCharge + networkCharge + retailCharge + afaAmount - eeiRebate;

  // KWTBB base: energy + capacity + network + AFA − EEI (retail excluded).
  const kwtbbBase =
    energyCharge + capacityCharge + networkCharge + afaAmount - eeiRebate;
  const kwtbb = taxes.kwtbb ? kwtbbCharge(kwtbbBase, usage) : 0;
  // SST base: the per-kWh charges for the consumption above 600 kWh
  // (energy + capacity + network on those kWh; retail excluded).
  const perKwhRateSen = energyRateSen + RP4.capacitySen + RP4.networkSen;
  const sstBase = (Math.max(0, usage - SST_THRESHOLD_KWH) * perKwhRateSen) / 100;
  const sst = taxes.sst ? sstCharge(sstBase, usage) : 0;

  return {
    usage,
    energyRateSen,
    energyCharge,
    capacityCharge,
    networkCharge,
    retailCharge,
    retailWaived,
    afaSen,
    afaApplies,
    afaAmount,
    eeiRateSen: eeiRate,
    eeiRebate,
    subtotal,
    kwtbb,
    sst,
    total: subtotal + kwtbb + sst,
  };
}
