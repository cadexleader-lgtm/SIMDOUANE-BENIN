/**
 * Validation of POST /api/simulations bodies (src/lib/simulationInput.ts),
 * without a database. The HTTP behaviour (stored totals, isolation) is in
 * simulations-server.test.ts.
 */
import { describe, expect, it } from "vitest";
import { CreateSimulationBody } from "@workspace/api-zod";
import { MAX_DETAILS_BYTES, maxVehicleYear, parseSimulationInput } from "../src/lib/simulationInput";
import { HttpError } from "../src/lib/httpErrors";
// The web app's own value parser: what the simulator really sends must pass.
import { determineCif, type CifInputs } from "../../simdouane/src/lib/cif-input";
import { effectiveRates, FIXED_EUR, type RatesSnapshot } from "../../simdouane/src/lib/currency";

const base = {
  marque: "Toyota",
  modele: "Corolla",
  annee: 2018,
  cylindree: "1600-2000",
  carburant: "Essence",
  valeurCIF: 5_000_000,
  joursAuPort: 10,
  regime: "Droit commun",
  totalDouane: 2_687_700,
  totalPort: 205_500,
  totalGeneral: 7_893_200,
};

const details = {
  schemaVersion: 1,
  valueInput: {
    mode: "cif",
    valeurXof: 5_000_000,
    components: [{ kind: "cif", amount: 5_000_000, currency: "XOF", valeurXof: 5_000_000, conversion: null }],
    missing: [],
  },
  situation: "at_port",
  paid: { vehicleParts: { cif: true }, customsPaid: 2_500_000 },
};

/** The 400 error thrown for `body`, or a failure if it is accepted. */
function rejection(body: unknown): { message: string; fields: Record<string, string> } {
  try {
    parseSimulationInput(body);
  } catch (err) {
    expect(err).toBeInstanceOf(HttpError);
    const e = err as HttpError;
    expect(e.status).toBe(400);
    expect(e.code).toBe("INVALID_SIMULATION");
    return { message: e.message, fields: (e.details as { fields: Record<string, string> }).fields };
  }
  throw new Error("expected the body to be rejected");
}

describe("validation des simulations envoyées au serveur", () => {
  it("accepte une simulation complète et retire les propriétés inconnues", () => {
    const parsed = parseSimulationInput({
      ...base,
      condition: "Occasion",
      powertrain: "Autre",
      referenceDate: "2026-11-01",
      regulatoryYear: 2026,
      calculatorVersion: "historical",
      regulatoryConfigVersion: "2026.1-announced",
      userId: "someone-else",
      details: { ...details, injected: "<script>", paid: { ...details.paid, extra: 1 } },
    });
    expect(parsed.details).toEqual(details);
    expect(parsed).not.toHaveProperty("userId");
    // What the server accepts always satisfies the published contract.
    expect(CreateSimulationBody.safeParse(parsed).success).toBe(true);
  });

  it("reste compatible avec les anciens envois (sans détail, condition absente)", () => {
    const parsed = parseSimulationInput(base);
    expect(parsed.details).toBeUndefined();
    expect(parsed.condition).toBe("Occasion");
  });

  it.each([
    ["cylindree", { cylindree: "3000" }, /Cylindrée inconnue/],
    ["regime", { regime: "Franchise totale" }, /Régime inconnu/],
    ["valeurCIF", { valeurCIF: 0 }, /supérieure à 0/],
    ["valeurCIF", { valeurCIF: -5 }, /supérieure à 0/],
    ["valeurCIF", { valeurCIF: 1e12 + 1 }, /1 000 milliards/],
    ["valeurCIF", { valeurCIF: "5000000" }, /Type de valeur invalide/],
    ["joursAuPort", { joursAuPort: -1 }, /entre 0 et 3650/],
    ["joursAuPort", { joursAuPort: 3651 }, /entre 0 et 3650/],
    ["joursAuPort", { joursAuPort: 2.5 }, /entier/],
    ["annee", { annee: 1899 }, /entre 1900 et/],
    ["annee", { annee: 2018.5 }, /entier/],
    ["annee", { annee: maxVehicleYear() + 1 }, /entre 1900 et/],
    ["marque", { marque: "x".repeat(101) }, /100 caractères maximum/],
    ["modele", { modele: 42 }, /Type de valeur invalide/],
    ["carburant", { carburant: undefined }, /Champ obligatoire/],
    ["regulatoryYear", { regulatoryYear: 2026.5 }, /entier/],
  ])("refuse %s invalide (%j)", (field, override, expected) => {
    const { message, fields } = rejection({ ...base, ...override });
    expect(fields[field]).toMatch(expected);
    expect(message).toMatch(/^Simulation invalide/);
  });

  it("accepte l'année suivante (modèle millésimé) mais pas au-delà", () => {
    expect(parseSimulationInput({ ...base, annee: maxVehicleYear() }).annee).toBe(maxVehicleYear());
    expect(maxVehicleYear(new Date("2026-12-31T23:30:00Z"))).toBe(2028); // déjà 2027 à Cotonou
  });

  it("refuse un corps absent ou qui n'est pas un objet", () => {
    expect(rejection(undefined).message).toBe("Simulation invalide : données absentes ou mal formées.");
    expect(rejection([base]).fields).toHaveProperty("_");
  });

  it.each([
    ["details.schemaVersion", { ...details, schemaVersion: 2 }],
    ["details.schemaVersion", { situation: "at_port" }],
    ["details.situation", { ...details, situation: "lost_at_sea" }],
    ["details.valueInput.mode", { ...details, valueInput: { ...details.valueInput, mode: "guess" } }],
    ["details.valueInput.valeurXof", { ...details, valueInput: { ...details.valueInput, valeurXof: -1 } }],
    ["details.valueInput.valeurXof", { ...details, valueInput: { ...details.valueInput, valeurXof: 4_000_000 } }],
    ["details.valueInput.components.0.amount", { ...details, valueInput: { ...details.valueInput, components: [{ ...details.valueInput.components[0], amount: -10 }] } }],
    ["details.valueInput.components.0.currency", { ...details, valueInput: { ...details.valueInput, components: [{ ...details.valueInput.components[0], currency: "euro" }] } }],
    ["details.valueInput.missing.0", { ...details, valueInput: { ...details.valueInput, missing: ["price"] } }],
    ["details.paid.customsPaid", { ...details, paid: { vehicleParts: {}, customsPaid: -1 } }],
    ["details.paid.portPaid", { ...details, paid: { vehicleParts: {}, portPaid: -0.5 } }],
    ["details.paid.vehicleParts.price", { ...details, paid: { vehicleParts: { price: "yes" } } }],
    ["details", "texte"],
    ["details", null],
  ])("refuse un détail invalide : %s", (field, badDetails) => {
    expect(rejection({ ...base, details: badDetails }).fields).toHaveProperty([field]);
  });

  it(`refuse un détail de plus de ${MAX_DETAILS_BYTES / 1024} Ko (octets UTF-8, avant tri des propriétés)`, () => {
    // Under the limit in characters, over it in bytes ("é" = 2 bytes).
    const padding = "é".repeat(Math.ceil(MAX_DETAILS_BYTES / 2));
    const { fields } = rejection({ ...base, details: { ...details, padding } });
    expect(fields).toEqual({ details: "Détail trop volumineux (20 Ko maximum)." });
    expect(parseSimulationInput({ ...base, details: { ...details, padding: "a".repeat(10_000) } }).details).toEqual(details);
  });

  it("limite le nombre d'erreurs renvoyées", () => {
    const components = Array.from({ length: 30 }, () => ({ kind: "?", amount: -1, currency: "?", valeurXof: -1, conversion: 1 }));
    const { fields } = rejection({ ...base, details: { ...details, valueInput: { ...details.valueInput, components } } });
    expect(Object.keys(fields).length).toBeLessThanOrEqual(20);
  });
});

describe("ce que le simulateur envoie réellement est accepté", () => {
  // Test fixture (not real published rates).
  const RATES = effectiveRates({
    status: "ok",
    rates: [FIXED_EUR, { currency: "USD", xofPerUnit: 563.053219, method: "ecb_cross", rateDate: "2026-10-30" }],
    unavailable: [],
    fetchedAt: "2026-10-31T09:00:00.000Z",
  } satisfies RatesSnapshot, null);
  const empty = { amount: "", currency: "XOF" as const };
  const inputs = (over: Partial<CifInputs>): CifInputs => ({
    mode: "price", price: empty, freight: empty, freightUnknown: false,
    insurance: empty, insuranceUnknown: false, single: empty, ...over,
  });

  it.each([
    ["prix en euros, fret en dollars, assurance inconnue", inputs({
      price: { amount: "7500", currency: "EUR" },
      freight: { amount: "1200,50", currency: "USD" },
      insuranceUnknown: true,
    }), "in_transit", { vehicleParts: { price: true, freight: false, insurance: false, cif: false }, customsPaid: undefined, portPaid: 150_000 }],
    ["valeur CIF en FCFA", inputs({ mode: "cif", single: { amount: "5000000", currency: "XOF" } }), "not_arrived", { vehicleParts: {} }],
    ["montant total en dollars", inputs({ mode: "total", single: { amount: "9000", currency: "USD" } }), "at_port", { vehicleParts: {}, customsPaid: 0 }],
  ] as const)("%s", (_label, cif, situation, paid) => {
    const determined = determineCif(cif, RATES);
    if (!determined.ok) throw new Error("fixture should be valid");
    // Same serialisation as the browser (undefined properties disappear).
    const body = JSON.parse(JSON.stringify({
      ...base,
      valeurCIF: determined.value.valeurXof,
      details: { schemaVersion: 1, valueInput: determined.value, situation, paid },
    }));
    expect(parseSimulationInput(body).details).toEqual(body.details);
  });
});
