// Unit tests of the vehicle-file rules (no database).
import { describe, expect, it } from "vitest";
import {
  caseReference,
  isIsoDate,
  missingFields,
  normalizeVin,
  recommendedFields,
  statusAfterCheck,
  todayInBenin,
  vinError,
  type CaseState,
} from "../src/lib/cases/rules";
import { validateCaseInput } from "../src/lib/cases/validate";

const complete: CaseState = {
  arrivalSituation: "not_arrived",
  originCountry: "Belgique",
  estimatedArrivalDate: "2026-12-01",
  arrivalDate: null,
  transportReference: "BL-TEST-1",
  vehicle: { make: "Toyota", model: "Corolla", year: 2018, vin: "JTDBR32E720123456" },
};

describe("complétude du dossier", () => {
  it("dossier complet avant arrivée : prêt", () => {
    expect(missingFields(complete)).toEqual([]);
    expect(statusAfterCheck(complete)).toBe("ready");
  });

  it("liste ce qui manque, selon la situation d'arrivée", () => {
    const empty: CaseState = { ...complete, originCountry: null, estimatedArrivalDate: null, vehicle: { make: "Toyota", model: null, year: null, vin: null } };
    expect(missingFields(empty)).toEqual(["vehicle.model", "vehicle.year", "originCountry", "estimatedArrivalDate"]);
    expect(statusAfterCheck(empty)).toBe("incomplete");
    expect(missingFields({ ...complete, arrivalSituation: "arrived" })).toEqual(["arrivalDate"]);
    expect(missingFields({ ...complete, arrivalSituation: "arrived", arrivalDate: "2026-10-01" })).toEqual([]);
  });

  it("le châssis et la référence de transport sont recommandés, pas bloquants", () => {
    const partial = { ...complete, transportReference: null, vehicle: { ...complete.vehicle, vin: null } };
    expect(recommendedFields(partial)).toEqual(["vehicle.vin", "transportReference"]);
    expect(statusAfterCheck(partial)).toBe("ready");
  });
});

describe("outils", () => {
  it("date du jour au Bénin (UTC+1)", () => {
    expect(todayInBenin(new Date("2026-10-26T23:30:00Z"))).toBe("2026-10-27");
    expect(todayInBenin(new Date("2026-10-26T22:59:00Z"))).toBe("2026-10-26");
  });
  it("dates AAAA-MM-JJ réelles uniquement", () => {
    expect(isIsoDate("2026-02-28")).toBe(true);
    for (const d of ["2026-02-30", "26-02-01", "2026-2-1", "2026-13-01", "demain"]) expect(isIsoDate(d), d).toBe(false);
  });
  it("numéro de châssis", () => {
    expect(normalizeVin(" jtd-br32e 720123456 ")).toBe("JTDBR32E720123456");
    expect(vinError("JTDBR32E720123456")).toBeNull();
    expect(vinError("ABC12")).toBeNull(); // ancien véhicule, châssis court accepté
    expect(vinError("JTDBR32E72012345O")).toMatch(/I, O ou Q/);
    expect(vinError("ABC")).toMatch(/5 à 30/);
    expect(vinError("ABC#12345")).toMatch(/lettres et des chiffres/);
  });
  it("référence lisible", () => {
    expect(caseReference(123, new Date("2026-10-26T12:00:00Z"))).toBe("SDB-2026-000123");
  });
});

describe("validation des saisies", () => {
  it("création : seules la situation et la marque sont obligatoires", () => {
    expect(validateCaseInput({}, "create")).toEqual({
      ok: false,
      fieldErrors: {
        arrivalSituation: "Indiquez si le véhicule est déjà arrivé au port de Cotonou.",
        "vehicle.make": "La marque est obligatoire.",
      },
    });
    const ok = validateCaseInput({ arrivalSituation: "arrived", vehicle: { make: "  Toyota " } }, "create");
    expect(ok).toEqual({ ok: true, caseChanges: { arrivalSituation: "arrived" }, vehicleChanges: { make: "Toyota" } });
  });

  it("ignore les champs que le client ne peut pas fixer (statut, propriétaire, référence)", () => {
    const r = validateCaseInput(
      { arrivalSituation: "arrived", vehicle: { make: "Kia" }, status: "ready", ownerUserId: "x", reference: "SDB-0", deletedAt: null },
      "create",
    );
    expect(r).toEqual({ ok: true, caseChanges: { arrivalSituation: "arrived" }, vehicleChanges: { make: "Kia" } });
  });

  it("refuse les valeurs invalides avec un message par champ", () => {
    const r = validateCaseInput(
      {
        arrivalSituation: "en mer",
        vehicle: { make: "Kia", year: 1850, vin: "AB", condition: "abimé" },
        shippedAt: "2026-02-30",
        notes: "x".repeat(2001),
        originCountry: 12,
      },
      "create",
    );
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(Object.keys(r.fieldErrors).sort()).toEqual(
        ["arrivalSituation", "notes", "originCountry", "shippedAt", "vehicle.condition", "vehicle.vin", "vehicle.year"].sort(),
      );
    }
  });

  it("cohérence des dates", () => {
    const tomorrow = new Date(Date.now() + 2 * 86400000).toISOString().slice(0, 10);
    const errs = (body: object, current?: Parameters<typeof validateCaseInput>[2]) => {
      const r = validateCaseInput(body, current ? "update" : "create", current);
      return r.ok ? {} : r.fieldErrors;
    };
    const base = { vehicle: { make: "Kia" } };
    expect(errs({ ...base, arrivalSituation: "arrived", arrivalDate: tomorrow }).arrivalDate).toMatch(/futur/);
    expect(errs({ ...base, arrivalSituation: "not_arrived", arrivalDate: "2026-01-10" }).arrivalDate).toMatch(/déjà arrivé/);
    expect(errs({ ...base, arrivalSituation: "arrived", shippedAt: "2026-03-01", arrivalDate: "2026-02-01" }).arrivalDate).toMatch(/précéder/);
    expect(errs({ ...base, arrivalSituation: "not_arrived", shippedAt: "2026-03-01", estimatedArrivalDate: "2026-02-01" }).estimatedArrivalDate).toMatch(/précéder/);
    // Update: the stored arrival date counts when only the situation changes.
    const stored = { ...complete, arrivalSituation: "arrived" as const, arrivalDate: "2026-10-01", shippedAt: null };
    expect(errs({ arrivalSituation: "not_arrived" }, stored).arrivalDate).toMatch(/déjà arrivé/);
    expect(errs({ arrivalSituation: "not_arrived", arrivalDate: null }, stored)).toEqual({});
  });

  it("mise à jour : la marque ne peut pas être vidée ; chaînes vides = valeur vide", () => {
    const current = { ...complete, shippedAt: null };
    const r = validateCaseInput({ vehicle: { make: " " } }, "update", current);
    expect(r.ok ? null : r.fieldErrors["vehicle.make"]).toBe("La marque est obligatoire.");
    expect(validateCaseInput({ notes: "  ", vehicle: { model: "" } }, "update", current)).toEqual({
      ok: true,
      caseChanges: { notes: null },
      vehicleChanges: { model: null },
    });
  });
});
