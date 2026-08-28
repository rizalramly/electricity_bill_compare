import { describe, expect, it } from "vitest";
import {
  calcNewTariff,
  calcOldTariff,
  eeiRebateSen,
  kwtbbCharge,
  sstCharge,
  usageFromNewBill,
  OLD_MINIMUM_CHARGE_RM,
  RP4,
} from "./tariff";

const NO_TAXES = { kwtbb: false, sst: false };
const ALL_TAXES = { kwtbb: true, sst: true };

describe("old tariff — block boundaries", () => {
  it("charges the first block only up to 200 kWh", () => {
    const bill = calcOldTariff(200, 0, NO_TAXES);
    expect(bill.energyCharge).toBeCloseTo(200 * 0.218, 6);
    expect(bill.blocks).toHaveLength(1);
  });

  it("crosses into block 2 at 201 kWh", () => {
    const bill = calcOldTariff(201, 0, NO_TAXES);
    expect(bill.energyCharge).toBeCloseTo(200 * 0.218 + 1 * 0.334, 6);
    expect(bill.blocks).toHaveLength(2);
  });

  it("300 kWh: 200@21.8 + 100@33.4", () => {
    const bill = calcOldTariff(300, 0, NO_TAXES);
    expect(bill.energyCharge).toBeCloseTo(43.6 + 33.4, 6);
  });

  it("600 kWh: adds 300@51.6", () => {
    const bill = calcOldTariff(600, 0, NO_TAXES);
    expect(bill.energyCharge).toBeCloseTo(43.6 + 33.4 + 154.8, 6);
  });

  it("900 kWh: adds 300@54.6", () => {
    const bill = calcOldTariff(900, 0, NO_TAXES);
    expect(bill.energyCharge).toBeCloseTo(43.6 + 33.4 + 154.8 + 163.8, 6);
  });

  it("1000 kWh: 100 kWh land in the above-900 block at 57.1", () => {
    const bill = calcOldTariff(1000, 0, NO_TAXES);
    expect(bill.energyCharge).toBeCloseTo(43.6 + 33.4 + 154.8 + 163.8 + 57.1, 6);
    expect(bill.blocks).toHaveLength(5);
  });

  it("applies the RM3.00 minimum monthly charge", () => {
    const bill = calcOldTariff(5, 0, NO_TAXES);
    expect(bill.minimumChargeApplied).toBe(true);
    expect(bill.subtotal).toBe(OLD_MINIMUM_CHARGE_RM);
    expect(calcOldTariff(20, 0, NO_TAXES).minimumChargeApplied).toBe(false);
  });

  it("ICPT is exempt for domestic usage ≤ 1,500 kWh", () => {
    const base = calcOldTariff(500, 0, NO_TAXES);
    const withIcpt = calcOldTariff(500, 10, NO_TAXES);
    expect(withIcpt.icptApplies).toBe(false);
    expect(withIcpt.subtotal).toBeCloseTo(base.subtotal, 6);
    expect(calcOldTariff(1500, 10, NO_TAXES).icptAmount).toBe(0);
  });

  it("ICPT applies to ALL kWh once usage > 1,500 kWh", () => {
    const bill = calcOldTariff(1501, 10, NO_TAXES);
    expect(bill.icptApplies).toBe(true);
    expect(bill.icptAmount).toBeCloseTo(1501 * 0.1, 6);
  });
});

describe("EEI tier edges", () => {
  it.each([
    [1, 25.0],
    [200, 25.0],
    [201, 24.5],
    [250, 24.5],
    [300, 22.5],
    [600, 9.0],
    [601, 7.5],
    [900, 1.0],
    [1000, 0.5],
    [1001, 0],
    [2000, 0],
  ])("usage %d kWh → %f sen/kWh", (usage, rate) => {
    expect(eeiRebateSen(usage)).toBe(rate);
  });

  it("returns 0 for zero usage", () => {
    expect(eeiRebateSen(0)).toBe(0);
  });
});

describe("new tariff — retail charge waiver", () => {
  it("waives retail at exactly 600 kWh", () => {
    const bill = calcNewTariff(600, 0, NO_TAXES);
    expect(bill.retailWaived).toBe(true);
    expect(bill.retailCharge).toBe(0);
  });

  it("charges RM10 retail at 601 kWh", () => {
    const bill = calcNewTariff(601, 0, NO_TAXES);
    expect(bill.retailWaived).toBe(false);
    expect(bill.retailCharge).toBe(RP4.retailRM);
  });
});

describe("new tariff — AFA exemption at 600 kWh", () => {
  it("is exempt at exactly 600 kWh", () => {
    const bill = calcNewTariff(600, 3.8, NO_TAXES);
    expect(bill.afaApplies).toBe(false);
    expect(bill.afaAmount).toBe(0);
  });

  it("applies to ALL kWh at 601 kWh", () => {
    const bill = calcNewTariff(601, 3.8, NO_TAXES);
    expect(bill.afaApplies).toBe(true);
    expect(bill.afaAmount).toBeCloseTo(601 * 0.038, 6);
  });

  it("negative AFA is a rebate on all kWh above 600, none at/below 600", () => {
    const exempt = calcNewTariff(600, -1.1, NO_TAXES);
    expect(exempt.afaAmount).toBe(0);
    const applied = calcNewTariff(700, -1.1, NO_TAXES);
    expect(applied.afaAmount).toBeCloseTo(-700 * 0.011, 6);
    expect(applied.afaAmount).toBeLessThan(0);
  });
});

describe("new tariff — energy rate switch at 1,500 kWh", () => {
  it("uses 27.03 sen at exactly 1,500 kWh", () => {
    const bill = calcNewTariff(1500, 0, NO_TAXES);
    expect(bill.energyRateSen).toBe(RP4.energyLowSen);
    expect(bill.energyCharge).toBeCloseTo(1500 * 0.2703, 6);
  });

  it("uses 37.03 sen on ALL kWh at 1,501 kWh", () => {
    const bill = calcNewTariff(1501, 0, NO_TAXES);
    expect(bill.energyRateSen).toBe(RP4.energyHighSen);
    expect(bill.energyCharge).toBeCloseTo(1501 * 0.3703, 6);
  });
});

describe("taxes", () => {
  it("KWTBB only above 300 kWh", () => {
    expect(kwtbbCharge(100, 300)).toBe(0);
    expect(kwtbbCharge(100, 301)).toBeCloseTo(1.6, 6);
  });

  it("SST only above 600 kWh", () => {
    expect(sstCharge(100, 600)).toBe(0);
    expect(sstCharge(100, 601)).toBeCloseTo(8, 6);
  });

  it("toggles disable each tax independently", () => {
    const both = calcNewTariff(800, 0, ALL_TAXES);
    expect(both.kwtbb).toBeGreaterThan(0);
    expect(both.sst).toBeGreaterThan(0);
    const none = calcNewTariff(800, 0, NO_TAXES);
    expect(none.kwtbb).toBe(0);
    expect(none.sst).toBe(0);
    expect(none.total).toBeCloseTo(none.subtotal, 6);
  });

  it("old tariff: KWTBB on the energy charge, SST only on the portion above 600 kWh", () => {
    const bill = calcOldTariff(700, 0, ALL_TAXES);
    expect(bill.kwtbb).toBeCloseTo(bill.energyCharge * 0.016, 6);
    // kWh 601–700 are billed at 54.6 sen → RM54.60 taxable
    expect(bill.sst).toBeCloseTo(54.6 * 0.08, 6);
  });

  it("old tariff reference bill: 900 kWh with both taxes → RM415.03", () => {
    const bill = calcOldTariff(900, 0, ALL_TAXES);
    expect(bill.energyCharge).toBeCloseTo(395.6, 2);
    expect(bill.kwtbb).toBeCloseTo(6.33, 2);
    // portion above 600 kWh = 300 × 54.6 sen = RM163.80 → SST RM13.10
    expect(bill.sst).toBeCloseTo(13.1, 2);
    expect(bill.total).toBeCloseTo(415.03, 2);
  });

  it("RP4 reference bill: 900 kWh at AFA +3.80 with both taxes → RM452.53", () => {
    const bill = calcNewTariff(900, 3.8, ALL_TAXES);
    // KWTBB base excludes the RM10 retail charge: 399.87 + 34.20 − 9.00
    expect(bill.kwtbb).toBeCloseTo((399.87 + 34.2 - 9.0) * 0.016, 4);
    // SST on the 300 kWh above 600 at 44.43 sen/kWh (matches TNB-style RM10.66)
    expect(bill.sst).toBeCloseTo(300 * 0.4443 * 0.08, 4);
    expect(bill.total).toBeCloseTo(452.53, 2);
  });
});

describe("worked example from the spec", () => {
  it("900 kWh at AFA +3.80 sen → RM435.07 before taxes", () => {
    const bill = calcNewTariff(900, 3.8, NO_TAXES);
    // Components: 900×(0.2703+0.0455+0.1285) + RM10 = 409.87
    expect(
      bill.energyCharge + bill.capacityCharge + bill.networkCharge + bill.retailCharge,
    ).toBeCloseTo(409.87, 2);
    expect(bill.afaAmount).toBeCloseTo(34.2, 2);
    expect(bill.eeiRebate).toBeCloseTo(9.0, 2);
    expect(bill.subtotal).toBeCloseTo(435.07, 2);
  });
});

describe("usageFromNewBill (RP4 bill → estimated usage)", () => {
  it.each([150, 380, 599, 601, 900, 1499, 1501, 2500])(
    "round-trips usage %d kWh through the bill total",
    (usage) => {
      const bill = calcNewTariff(usage, 3.8, ALL_TAXES).total;
      expect(usageFromNewBill(bill, 3.8, ALL_TAXES)).toBeCloseTo(usage, 0);
    },
  );

  it("round-trips with a negative AFA and taxes off", () => {
    const bill = calcNewTariff(800, -1.1, NO_TAXES).total;
    expect(usageFromNewBill(bill, -1.1, NO_TAXES)).toBeCloseTo(800, 0);
  });

  it("returns 0 for zero or invalid bills", () => {
    expect(usageFromNewBill(0, 3.8)).toBe(0);
    expect(usageFromNewBill(-5, 3.8)).toBe(0);
    expect(usageFromNewBill(NaN, 3.8)).toBe(0);
  });

  it("clamps to the maximum when the bill exceeds the range", () => {
    expect(usageFromNewBill(1_000_000, 3.8)).toBe(10000);
  });
});

describe("zero usage", () => {
  it("old tariff falls back to minimum charge", () => {
    const bill = calcOldTariff(0, 0, NO_TAXES);
    expect(bill.subtotal).toBe(OLD_MINIMUM_CHARGE_RM);
  });

  it("new tariff is RM0 at 0 kWh", () => {
    const bill = calcNewTariff(0, 3.8, NO_TAXES);
    expect(bill.total).toBe(0);
  });
});
