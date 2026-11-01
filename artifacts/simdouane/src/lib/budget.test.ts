import { describe, expect, it } from "vitest";
import { buildBudget, legacyValue, NOTHING_PAID } from "./budget";
import type { CifDetermination } from "./cif-input";

const ESTIMATES = { totalDouane: 1_243_015, totalPort: 170_500 };

const PRICE_CASE: CifDetermination = {
  mode: "price",
  valeurXof: 2_663_185,
  components: [
    { kind: "price", amount: 3000, currency: "EUR", valeurXof: 1_967_871, conversion: null },
    { kind: "freight", amount: 1000, currency: "EUR", valeurXof: 655_957, conversion: null },
    { kind: "insurance", amount: 39_357, currency: "XOF", valeurXof: 39_357, conversion: null },
  ],
  missing: [],
};

describe("budget selon la situation", () => {
  it("pas encore arrivé : budget complet, rien de payé", () => {
    const b = buildBudget("not_arrived", PRICE_CASE, ESTIMATES, NOTHING_PAID);
    expect(b.total).toBe(2_663_185 + 1_243_015 + 170_500);
    expect(b.paid).toBe(0);
    expect(b.remaining).toBe(b.total);
    expect(b.lines.map((l) => [l.key, l.basis])).toEqual([
      ["price", "declared"], ["freight", "declared"], ["insurance", "declared"], ["customs", "estimated"], ["port", "estimated"],
    ]);
  });

  it("pas encore arrivé : des cases « payé » éventuellement restées cochées sont ignorées", () => {
    const b = buildBudget("not_arrived", PRICE_CASE, ESTIMATES, { vehicleParts: { price: true }, customsPaid: 10 });
    expect(b.paid).toBe(0);
  });

  it("en transport : prix et transport payés, droits et frais restent à payer (estimés)", () => {
    const b = buildBudget("in_transit", PRICE_CASE, ESTIMATES, { vehicleParts: { price: true, freight: true } });
    expect(b.paid).toBe(1_967_871 + 655_957);
    expect(b.remaining).toBe(39_357 + 1_243_015 + 170_500);
    expect(b.total).toBe(b.paid + b.remaining);
  });

  it("au port : un montant réellement payé REMPLACE l'estimation, il ne s'y ajoute pas", () => {
    const b = buildBudget("at_port", PRICE_CASE, ESTIMATES, {
      vehicleParts: { price: true, freight: true, insurance: true },
      portPaid: 95_000,
    });
    const port = b.lines.find((l) => l.key === "port")!;
    expect(port).toEqual({ key: "port", amount: 95_000, basis: "actual", paid: 95_000, estimate: 170_500 });
    expect(b.total).toBe(2_663_185 + 1_243_015 + 95_000);
    expect(b.remaining).toBe(1_243_015); // seuls les droits restent
  });

  it("droits réellement payés : comptés une seule fois, au montant réel", () => {
    const b = buildBudget("at_port", PRICE_CASE, ESTIMATES, { vehicleParts: { price: true, freight: true, insurance: true }, customsPaid: 1_300_000, portPaid: 180_000 });
    expect(b.total).toBe(2_663_185 + 1_300_000 + 180_000);
    expect(b.remaining).toBe(0);
  });

  it("0 FCFA réellement payé est un montant réel valide", () => {
    const b = buildBudget("at_port", PRICE_CASE, ESTIMATES, { vehicleParts: {}, portPaid: 0 });
    expect(b.lines.find((l) => l.key === "port")).toMatchObject({ amount: 0, basis: "actual" });
  });

  it("partie inconnue (transport) : pas de montant, non comptée, budget signalé incomplet", () => {
    const value: CifDetermination = { ...PRICE_CASE, valeurXof: 2_007_228, components: [PRICE_CASE.components[0], PRICE_CASE.components[2]], missing: ["freight"] };
    const b = buildBudget("in_transit", value, ESTIMATES, { vehicleParts: { price: true } });
    expect(b.lines.find((l) => l.key === "freight")).toEqual({ key: "freight", amount: null, basis: "declared", paid: 0 });
    expect(b.total).toBe(2_007_228 + 1_243_015 + 170_500);
    expect(b.missing).toEqual(["freight"]);
  });

  it("cas C (montant total payé) : toujours compté comme déjà réglé", () => {
    const total: CifDetermination = { mode: "total", valeurXof: 3_000_000, missing: [],
      components: [{ kind: "total", amount: 3_000_000, currency: "XOF", valeurXof: 3_000_000, conversion: null }] };
    for (const situation of ["not_arrived", "in_transit", "at_port"] as const) {
      expect(buildBudget(situation, total, ESTIMATES, NOTHING_PAID).paid).toBe(3_000_000);
    }
  });

  it("ancienne simulation sans détail : une ligne « valeur CIF » déclarée", () => {
    const b = buildBudget("not_arrived", legacyValue(5_000_000), { totalDouane: 2_687_700, totalPort: 205_500 }, NOTHING_PAID);
    expect(b.total).toBe(7_893_200); // = totalGeneral du moteur
    expect(b.lines[0]).toMatchObject({ key: "cif", amount: 5_000_000, basis: "declared" });
  });

  it("sans montant réel, le budget est égal au total du moteur (pas de double comptage)", () => {
    const b = buildBudget("in_transit", PRICE_CASE, ESTIMATES, { vehicleParts: { price: true } });
    expect(b.total).toBe(PRICE_CASE.valeurXof + ESTIMATES.totalDouane + ESTIMATES.totalPort);
  });

  it("montants non arrondis : même total que le moteur, au centime près", () => {
    const exact = { totalDouane: 1_243_015.15, totalPort: 170_500 };
    const b = buildBudget("not_arrived", PRICE_CASE, exact, NOTHING_PAID);
    expect(b.total).toBeCloseTo(2_663_185 + 1_243_015.15 + 170_500, 6);
  });
});
