// The grid (src/grid.ts) must describe exactly what the engine applies: if
// someone changes a rate in calculator.ts without updating the grid (or the
// other way round), these tests fail.
import { describe, expect, it } from "vitest";
import { calculate, DD_RATES, ENGINE_GRID, engineReadiness, gridEntry, type CylindreeKey, type FormInput } from "../src";

const base: FormInput = {
  marque: "Toyota", modele: "Corolla", annee: 2018, cylindree: "1600-2000", carburant: "Essence",
  valeurCIF: 1_000_000, joursAuPort: 4, regime: "Droit commun",
};
const rate = (id: string) => gridEntry(id).applied!.value as number;
const rates = (id: string) => gridEntry(id).applied!.value as Record<string, number>;

describe("grille des taux et frais (préparation S4/S5)", () => {
  it("identifiants uniques, statut et source cohérents", () => {
    const ids = ENGINE_GRID.map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const e of ENGINE_GRID) {
      // Only an amount with no source at all may have no source. A confirmed
      // entry may cite a written answer of a CAD instead of a link.
      if (e.status === "confirmed") expect(e.source?.trim(), e.id).toBeTruthy();
      else if (e.status !== "unsourced") expect(e.source, e.id).toMatch(/^https:\/\//);
      if (e.cadQuestion !== null) expect(e.cadQuestion).toBeGreaterThanOrEqual(1);
      if (e.cadQuestion !== null) expect(e.cadQuestion).toBeLessThanOrEqual(15);
      expect(e.found.length, e.id).toBeGreaterThan(0);
    }
  });

  it("DD : les 6 taux par cylindrée de la grille sont ceux du moteur", () => {
    expect(rates("dd")).toEqual(DD_RATES);
    for (const [cylindree, r] of Object.entries(rates("dd"))) {
      expect(calculate({ ...base, cylindree: cylindree as CylindreeKey }).DD).toBeCloseTo(1_000_000 * r, 6);
    }
  });

  it("RS, PC, PCS, TVA : taux de la grille = taux du moteur", () => {
    const r = calculate(base);
    expect(r.RS).toBeCloseTo(1_000_000 * rate("rs"), 6);
    expect(r.PC).toBeCloseTo(1_000_000 * rate("pc"), 6);
    expect(r.PCS).toBeCloseTo(1_000_000 * rate("pcs"), 6);
    expect(r.baseTVA).toBeCloseTo(1_000_000 + r.DD + r.RS + r.PC + r.PCS, 6);
    expect(r.TVA).toBeCloseTo(r.baseTVA * rate("tva"), 6);
  });

  it("frais de port : montants de la grille = montants du moteur", () => {
    const r = calculate(base);
    expect(r.magasinage).toBe(4 * rate("magasinage"));
    expect(r.manutention).toBe(rate("manutention"));
    expect(r.beninControl).toBe(rate("benin_control"));
    expect(r.segub).toBe(rate("segub"));
    expect(r.fraisGUCE).toBe(rate("frais_guce"));
    expect(r.fraisCAD).toBe(rate("frais_cad"));
  });

  it("régimes : coefficients de la grille = coefficients du moteur", () => {
    const normal = calculate(base);
    const partial = calculate({ ...base, regime: "Exonération partielle" });
    expect(partial.DD).toBeCloseTo(normal.DD * rates("regime_exoneration_partielle").dd, 6);
    expect(partial.TVA).toBeCloseTo(normal.TVA * rates("regime_exoneration_partielle").tva, 6);
    const direct = calculate({ ...base, regime: "Enlèvement direct" });
    const k = rates("regime_enlevement_direct").port;
    expect(direct.manutention).toBe(Math.round(normal.manutention * k));
    expect(direct.magasinage).toBe(Math.round(normal.magasinage * k));
    expect(direct.fraisCAD).toBe(Math.round(normal.fraisCAD * k));
  });

  it("aucune règle absente du moteur n'a de valeur appliquée", () => {
    for (const id of ["ps", "rau", "ri", "aib", "consignation", "taxe_voirie", "valeur_reference", "vehicule_neuf", "age_occasion"]) {
      expect(gridEntry(id).applied, id).toBeNull();
    }
  });

  it("le moteur n'est pas validé : tout reste à confirmer (aucune entrée « confirmée »)", () => {
    const readiness = engineReadiness();
    expect(readiness.validated).toBe(false);
    expect(readiness.byStatus.confirmed).toBe(0);
    expect(readiness.blocking).toHaveLength(ENGINE_GRID.length);
    // Every port fee and both regimes have no source at all.
    expect(readiness.blocking.filter((b) => b.status === "unsourced").map((b) => b.id).sort()).toEqual(
      ["benin_control", "frais_cad", "frais_guce", "magasinage", "manutention", "regime_enlevement_direct", "regime_exoneration_partielle", "segub"],
    );
    // A grid where everything is confirmed would be ready.
    expect(engineReadiness(ENGINE_GRID.map((e) => ({ ...e, status: "confirmed" as const }))).validated).toBe(true);
  });
});
