import { describe, expect, it } from "vitest";
import {
  calcNewTariff,
  calcOldTariff,
  eeiRebateSen,
  kwtbbCharge,
  sstCharge,
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

  it("applies ICPT to all kWh", () => {
    const base = calcOldTariff(500, 0, NO_TAXES);
    const withIcpt = calcOldTariff(500, 2, NO_TAXES);
    expect(withIcpt.subtotal - base.subtotal).toBeCloseTo(500 * 0.02, 6);
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

  it("applies to the old tariff too", () => {
    const bill = calcOldTariff(700, 0, ALL_TAXES);
    expect(bill.kwtbb).toBeCloseTo(bill.subtotal * 0.016, 6);
    expect(bill.sst).toBeCloseTo(bill.subtotal * 0.08, 6);
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
