import { describe, expect, it } from "vitest";
import { REGULATORY_CONFIG_2026, powertrainOf, vehicleNotices } from "./regulatory-config-2026";

const keys = (list: { key: string }[]) => list.map((n) => n.key);

describe("caractéristiques du véhicule (S7) : avertissements seulement", () => {
  it("chaque règle garde sa source et son statut « non confirmé »", () => {
    expect(REGULATORY_CONFIG_2026.version).toMatch(/to-confirm/);
    for (const rule of [REGULATORY_CONFIG_2026.newVehicleBenefits, REGULATORY_CONFIG_2026.usedVehicleAgeLimit]) {
      expect(rule.source).toMatch(/^https:\/\//);
      expect(rule.status).toMatch(/non vérifiée/);
    }
  });

  it("motorisation déduite du carburant", () => {
    expect(powertrainOf("Électrique")).toBe("Électrique");
    expect(powertrainOf("Hybride")).toBe("Hybride");
    expect(powertrainOf("Diesel")).toBe("Autre");
    expect(powertrainOf(undefined)).toBe("Autre");
  });

  it("voiture de tourisme d'occasion récente : aucun avertissement", () => {
    expect(vehicleNotices({ condition: "Occasion", carburant: "Essence", vehicleType: "tourisme", age: 8 }, "fr")).toEqual([]);
    // Valeurs par défaut (anciennes simulations sans ces champs) : occasion, tourisme.
    expect(vehicleNotices({ carburant: "Essence", age: 10 }, "fr")).toEqual([]);
  });

  it("véhicule neuf : abattement annoncé selon la motorisation, jamais appliqué", () => {
    const pct = (carburant: string) =>
      vehicleNotices({ condition: "Neuf", carburant, vehicleType: "tourisme", age: 0 }, "fr")[0].text;
    expect(pct("Électrique")).toContain("abattement de 99 %");
    expect(pct("Hybride")).toContain("abattement de 95 %");
    expect(pct("Diesel")).toContain("abattement de 90 %");
    const [notice] = vehicleNotices({ condition: "Neuf", carburant: "Diesel", age: 0 }, "fr");
    expect(notice).toMatchObject({ key: "new_benefit", strong: true });
    expect(notice.text).toContain("SimDouane ne les applique pas");
    // Pas d'avertissement d'âge pour un véhicule neuf.
    expect(keys(vehicleNotices({ condition: "Neuf", carburant: "Diesel", age: 20 }, "fr"))).toEqual(["new_benefit"]);
  });

  it("limite d'âge de l'occasion : 10 ans en tourisme, 13 ans en utilitaire, au-delà seulement", () => {
    expect(keys(vehicleNotices({ condition: "Occasion", vehicleType: "tourisme", age: 10 }, "fr"))).toEqual([]);
    const old = vehicleNotices({ condition: "Occasion", vehicleType: "tourisme", age: 11 }, "fr");
    expect(keys(old)).toEqual(["age_limit"]);
    expect(old[0].text).toContain("à 10 ans d'âge");
    expect(old[0].text).toContain("Votre véhicule a 11 ans");

    expect(keys(vehicleNotices({ condition: "Occasion", vehicleType: "utilitaire", age: 13 }, "fr"))).toEqual(["utility"]);
    const oldUtility = vehicleNotices({ condition: "Occasion", vehicleType: "utilitaire", age: 14 }, "fr");
    expect(keys(oldUtility)).toEqual(["age_limit", "utility"]);
    expect(oldUtility[0].text).toContain("à 13 ans d'âge");
  });

  it("électrique ou hybride d'occasion : aucun avantage confirmé (avertissement discret)", () => {
    const list = vehicleNotices({ condition: "Occasion", carburant: "Hybride", vehicleType: "tourisme", age: 5 }, "fr");
    expect(list).toEqual([expect.objectContaining({ key: "used_green", strong: false })]);
  });

  it("textes disponibles en anglais", () => {
    const list = vehicleNotices({ condition: "Neuf", carburant: "Électrique", vehicleType: "utilitaire", age: 0 }, "en");
    expect(keys(list)).toEqual(["new_benefit", "utility"]);
    expect(list[0].text).toContain("99% reduction");
    expect(list[1].text).toContain("Utility vehicle");
  });
});
