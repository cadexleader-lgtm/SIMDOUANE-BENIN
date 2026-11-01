import { describe, expect, it } from "vitest";
import { buildHypotheses, conversionsUsed, rateLabel } from "./result-hypotheses";
import { calculate, type FormInput } from "./calculator";
import { legacyValue } from "./budget";
import type { CifDetermination } from "./cif-input";
import type { CurrencyConversion } from "./currency";
import type { HistoryEntry } from "./history";

const EUR_FIXED: CurrencyConversion = {
  currency: "EUR", amount: 3000, xofPerUnit: 655.957, method: "fixed_parity", rateDate: null, fetchedAt: null, status: "ok",
};
const USD_STALE: CurrencyConversion = {
  currency: "USD", amount: 1000, xofPerUnit: 563.054, method: "ecb_cross", rateDate: "2026-10-30", fetchedAt: "2026-10-30T15:00:00Z", status: "stale",
};

function entry(input: Partial<FormInput>, extra: Partial<HistoryEntry> = {}): HistoryEntry {
  const full: FormInput = {
    marque: "Toyota", modele: "Corolla", annee: 2018, cylindree: "1600-2000", carburant: "Essence",
    valeurCIF: 5_000_000, joursAuPort: 10, regime: "Droit commun", ...input,
  };
  return { id: "x", date: "2026-11-01T09:30:00.000Z", input: full, result: calculate(full), ...extra };
}

const keys = (list: { key: string }[]) => list.map((h) => h.key);

describe("hypothèses et avertissements", () => {
  it("valeur CIF en FCFA : liste de base, sans taux ni avertissement de base incomplète", () => {
    const sim = entry({}, { valueInput: legacyValue(5_000_000) });
    const list = buildHypotheses(sim, sim.valueInput!, "fr");
    expect(keys(list)).toEqual(["indicative", "date", "basis", "storage", "regime", "customs", "tags"]);
    expect(list[0]).toMatchObject({ strong: true, text: expect.stringContaining("Estimation indicative") });
    expect(list.find((h) => h.key === "date")!.text).toBe("Simulation du 01/11/2026.");
    expect(list.find((h) => h.key === "basis")!.text).toBe("Base de calcul : Valeur CIF saisie.");
    expect(list.find((h) => h.key === "storage")!.text).toContain("10 jours au port");
    expect(list.find((h) => h.key === "regime")!.text).toBe("Régime : Droit commun — Toutes taxes à 100% (importation normale).");
  });

  it("prix d'achat en euro, transport inconnu : avertissement CIF incomplète et taux utilisé", () => {
    const value: CifDetermination = {
      mode: "price",
      valeurXof: 1_967_871,
      components: [
        { kind: "price", amount: 3000, currency: "EUR", valeurXof: 1_967_871, conversion: EUR_FIXED },
        { kind: "insurance", amount: 0, currency: "EUR", valeurXof: 0, conversion: null },
      ],
      missing: ["freight"],
    };
    const sim = entry({ valeurCIF: 1_967_871, joursAuPort: 1 }, { valueInput: value });
    const list = buildHypotheses(sim, value, "fr");
    expect(keys(list)).toEqual(["indicative", "date", "basis", "partial", "rates", "storage", "regime", "customs", "tags"]);
    expect(list.find((h) => h.key === "partial")!.strong).toBe(true);
    expect(list.find((h) => h.key === "rates")!.text).toBe("Taux de change utilisés : 1 EUR = 655,957 FCFA (parité fixe).");
    expect(list.find((h) => h.key === "storage")!.text).toContain("1 jour au port");
  });

  it("montant total payé : avertissement de surestimation possible", () => {
    const value: CifDetermination = {
      mode: "total", valeurXof: 6_000_000,
      components: [{ kind: "total", amount: 6_000_000, currency: "XOF", valeurXof: 6_000_000, conversion: null }],
      missing: [],
    };
    const sim = entry({ valeurCIF: 6_000_000 }, { valueInput: value });
    const list = buildHypotheses(sim, value, "fr");
    expect(keys(list)).toContain("total");
    expect(keys(list)).not.toContain("partial");
    expect(list.find((h) => h.key === "total")!.strong).toBe(true);
  });

  it("simulation ancienne (avant S2) : le taux conservé avec la simulation est repris", () => {
    const sim = entry({ valeurCIF: 1_967_871 }, { conversion: EUR_FIXED });
    const value = legacyValue(sim.input.valeurCIF);
    expect(conversionsUsed(sim, value)).toEqual([EUR_FIXED]);
    expect(buildHypotheses(sim, value, "fr").find((h) => h.key === "rates")!.text).toContain("1 EUR = 655,957 FCFA");
    // With a detailed value, the old single conversion is not added a second time.
    expect(conversionsUsed({ valueInput: value, conversion: EUR_FIXED }, value)).toEqual([]);
  });

  it("un même taux n'apparaît qu'une fois ; taux BCE ancien signalé", () => {
    const value: CifDetermination = {
      mode: "price", valeurXof: 3_000_000,
      components: [
        { kind: "price", amount: 3000, currency: "USD", valeurXof: 1_689_162, conversion: USD_STALE },
        { kind: "freight", amount: 1000, currency: "USD", valeurXof: 563_054, conversion: { ...USD_STALE, amount: 1000 } },
        { kind: "insurance", amount: 100, currency: "EUR", valeurXof: 65_596, conversion: { ...EUR_FIXED, amount: 100 } },
      ],
      missing: [],
    };
    const used = conversionsUsed({ valueInput: value }, value);
    expect(used.map((c) => c.currency)).toEqual(["USD", "EUR"]);
    expect(rateLabel(USD_STALE, "fr")).toBe(
      "1 USD = 563,054 FCFA (taux BCE du 30/10/2026 via la parité fixe, derniers taux connus, service de change indisponible)",
    );
  });

  it("sans date de simulation : pas de ligne de date", () => {
    const sim = entry({}, { date: "" });
    expect(keys(buildHypotheses(sim, legacyValue(5_000_000), "fr"))).not.toContain("date");
  });
});
