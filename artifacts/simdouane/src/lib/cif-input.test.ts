import { describe, expect, it } from "vitest";
import { determineCif, parseAmount, type CifInputs } from "./cif-input";
import { effectiveRates, FIXED_EUR, type RatesSnapshot } from "./currency";

// Test fixture (not real published rates).
const RATES = effectiveRates({
  status: "ok",
  rates: [FIXED_EUR, { currency: "USD", xofPerUnit: 563.053219, method: "ecb_cross", rateDate: "2026-10-30" }],
  unavailable: [],
  fetchedAt: "2026-10-31T09:00:00.000Z",
} satisfies RatesSnapshot, null);

const empty = { amount: "", currency: "XOF" as const };
const base = (over: Partial<CifInputs>): CifInputs => ({
  mode: "price",
  price: empty,
  freight: empty,
  freightUnknown: false,
  insurance: empty,
  insuranceUnknown: false,
  single: empty,
  ...over,
});

describe("lecture d'un montant", () => {
  it("vide → non renseigné ; texte invalide → NaN ; virgule acceptée", () => {
    expect(parseAmount("")).toBeUndefined();
    expect(parseAmount("   ")).toBeUndefined();
    expect(parseAmount(undefined)).toBeUndefined();
    expect(parseAmount("abc")).toBeNaN();
    expect(parseAmount("1500,5")).toBe(1500.5);
    expect(parseAmount("0")).toBe(0);
  });
});

describe("cas B — valeur CIF connue", () => {
  it("utilisée telle quelle, rien n'est ajouté", () => {
    const r = determineCif(base({ mode: "cif", single: { amount: "5000000", currency: "XOF" } }), RATES);
    expect(r).toEqual({ ok: true, value: { mode: "cif", valeurXof: 5_000_000, missing: [],
      components: [{ kind: "cif", amount: 5_000_000, currency: "XOF", valeurXof: 5_000_000, conversion: null }] } });
  });

  it("en devise : convertie, taux conservé", () => {
    const r = determineCif(base({ mode: "cif", single: { amount: "4060", currency: "EUR" } }), RATES);
    expect(r.ok && r.value.valeurXof).toBe(Math.round(4060 * 655.957));
    expect(r.ok && r.value.components[0].conversion?.method).toBe("fixed_parity");
  });

  it("vide, nul ou devise sans taux : refusé", () => {
    expect(determineCif(base({ mode: "cif" }), RATES)).toEqual({ ok: false, errors: { single: "required" } });
    expect(determineCif(base({ mode: "cif", single: { amount: "0", currency: "XOF" } }), RATES)).toEqual({ ok: false, errors: { single: "invalid" } });
    expect(determineCif(base({ mode: "cif", single: { amount: "1000", currency: "JPY" } }), RATES)).toEqual({ ok: false, errors: { single: "rate_unavailable" } });
  });
});

describe("cas C — montant global payé", () => {
  it("utilisé tel quel comme base, sans ventilation inventée", () => {
    const r = determineCif(base({ mode: "total", single: { amount: "3000000", currency: "XOF" } }), RATES);
    expect(r.ok && r.value).toMatchObject({ mode: "total", valeurXof: 3_000_000, missing: [] });
    expect(r.ok && r.value.components.map((c) => c.kind)).toEqual(["total"]);
  });
});

describe("cas A — prix d'achat", () => {
  it("prix + transport + assurance, chacun dans sa devise, additionnés en FCFA", () => {
    const r = determineCif(base({
      price: { amount: "3000", currency: "EUR" },
      freight: { amount: "1200", currency: "USD" },
      insurance: { amount: "45000", currency: "XOF" },
    }), RATES);
    const expected = Math.round(3000 * 655.957) + Math.round(1200 * 563.053219) + 45_000;
    expect(r.ok && r.value.valeurXof).toBe(expected);
    expect(r.ok && r.value.missing).toEqual([]);
    expect(r.ok && r.value.components.map((c) => c.kind)).toEqual(["price", "freight", "insurance"]);
  });

  it("transport ou assurance « pas encore connu » : signalé manquant, jamais inventé", () => {
    const r = determineCif(base({ price: { amount: "1967871", currency: "XOF" }, freightUnknown: true, insuranceUnknown: true }), RATES);
    expect(r.ok && r.value).toMatchObject({ valeurXof: 1_967_871, missing: ["freight", "insurance"] });
    expect(r.ok && r.value.components.map((c) => c.kind)).toEqual(["price"]);
  });

  it("un champ vide n'est jamais lu comme zéro : il faut un montant ou « pas encore connu »", () => {
    const r = determineCif(base({ price: { amount: "2000000", currency: "XOF" } }), RATES);
    expect(r).toEqual({ ok: false, errors: { freight: "required", insurance: "required" } });
  });

  it("0 explicite accepté (ex. pas d'assurance souscrite)", () => {
    const r = determineCif(base({ price: { amount: "2000000", currency: "XOF" }, freight: { amount: "600000", currency: "XOF" }, insurance: { amount: "0", currency: "XOF" } }), RATES);
    expect(r.ok && r.value.valeurXof).toBe(2_600_000);
    expect(r.ok && r.value.components.find((c) => c.kind === "insurance")).toMatchObject({ amount: 0, valeurXof: 0, conversion: null });
  });

  it("prix manquant, montant négatif ou devise sans taux : erreurs par champ", () => {
    const r = determineCif(base({ freight: { amount: "-5", currency: "XOF" }, insurance: { amount: "10", currency: "JPY" } }), RATES);
    expect(r).toEqual({ ok: false, errors: { price: "required", freight: "invalid", insurance: "rate_unavailable" } });
  });
});
