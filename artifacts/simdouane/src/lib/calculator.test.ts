// Pins the CURRENT customs formulas of calculator.ts. These tests document
// existing behaviour; they do not validate the rates against Beninese law.
import { describe, expect, it } from "vitest";
import { calculate, type FormInput } from "./calculator";

const base: FormInput = {
  marque: "Toyota",
  modele: "Corolla",
  annee: 2018,
  cylindree: "1600-2000",
  carburant: "Essence",
  valeurCIF: 5_000_000,
  joursAuPort: 10,
  regime: "Droit commun",
};

describe("calculate", () => {
  it("droit commun: toutes taxes à 100 %", () => {
    const r = calculate(base);
    expect(r.ddRate).toBe(0.28);
    expect(r.DD).toBeCloseTo(1_400_000, 2);
    expect(r.RS).toBeCloseTo(50_000, 2);
    expect(r.PC).toBeCloseTo(25_000, 2);
    expect(r.PCS).toBeCloseTo(40_000, 2);
    expect(r.baseTVA).toBeCloseTo(6_515_000, 2);
    expect(r.TVA).toBeCloseTo(1_172_700, 2);
    expect(r.totalDouane).toBeCloseTo(2_687_700, 2);
    expect(r.magasinage).toBe(35_000);
    expect(r.totalPort).toBe(205_500);
    expect(r.totalGeneral).toBeCloseTo(7_893_200, 2);
    expect(r.portReductionApplied).toBe(false);
  });

  it("exonération partielle: DD × 0,6 et TVA × 0,8 (TVA calculée sur la base avec DD plein)", () => {
    const r = calculate({ ...base, regime: "Exonération partielle" });
    expect(r.DD).toBeCloseTo(840_000, 2);
    expect(r.baseTVA).toBeCloseTo(6_515_000, 2);
    expect(r.TVA).toBeCloseTo(938_160, 2);
    expect(r.totalDouane).toBeCloseTo(1_893_160, 2);
    expect(r.totalPort).toBe(205_500);
    expect(r.totalGeneral).toBeCloseTo(7_098_660, 2);
  });

  it("enlèvement direct: frais portuaires × 0,7 arrondis, taxes inchangées", () => {
    const r = calculate({ ...base, regime: "Enlèvement direct" });
    expect(r.totalDouane).toBeCloseTo(2_687_700, 2);
    expect([r.magasinage, r.manutention, r.beninControl, r.segub, r.fraisCAD, r.fraisGUCE])
      .toEqual([24_500, 31_500, 26_600, 5_250, 45_500, 10_500]);
    expect(r.totalPort).toBe(143_850);
    expect(r.totalGeneral).toBeCloseTo(7_831_550, 2);
    expect(r.portReductionApplied).toBe(true);
  });

  it.each([
    ["lt1000", 0.2],
    ["1000-1300", 0.22],
    ["1300-1600", 0.25],
    ["1600-2000", 0.28],
    ["2000-2500", 0.3],
    ["gt2500", 0.35],
  ] as const)("taux DD %s = %s", (cylindree, rate) => {
    expect(calculate({ ...base, cylindree }).ddRate).toBe(rate);
  });

  it("niveau de risque selon l'âge du véhicule", () => {
    const year = new Date().getFullYear();
    expect(calculate({ ...base, annee: year - 5 }).riskLevel).toBe("faible");
    expect(calculate({ ...base, annee: year - 10 }).riskLevel).toBe("moyen");
    expect(calculate({ ...base, annee: year - 11 }).riskLevel).toBe("eleve");
  });
});
