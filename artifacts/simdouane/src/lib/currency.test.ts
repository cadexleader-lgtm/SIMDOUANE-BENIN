import { describe, expect, it } from "vitest";
import {
  convert,
  effectiveRates,
  FIXED_EUR,
  formatRate,
  formatRateDate,
  rateAgeDays,
  ratesAreOld,
  toXof,
  type RatesSnapshot,
} from "./currency";

// Test fixture (not real published rates).
const SERVER_OK: RatesSnapshot = {
  status: "ok",
  rates: [
    FIXED_EUR,
    { currency: "USD", xofPerUnit: 563.053648, method: "ecb_cross", rateDate: "2026-10-30" },
    { currency: "JPY", xofPerUnit: 3.716470, method: "ecb_cross", rateDate: "2026-10-30" },
    { currency: "KRW", xofPerUnit: 0.397550, method: "ecb_cross", rateDate: "2026-10-30" },
  ],
  unavailable: [],
  fetchedAt: "2026-10-31T09:00:00.000Z",
};
const SERVER_DEGRADED: RatesSnapshot = { status: "degraded", rates: [FIXED_EUR], unavailable: ["USD", "JPY"], fetchedAt: null };

describe("conversion en FCFA", () => {
  it("arrondit au franc", () => {
    expect(toXof(3000, 655.957)).toBe(1_967_871);
    expect(toXof(1, 0.39755)).toBe(0);
    expect(toXof(2_500_000, 0.39755)).toBe(993_875);
  });

  it("FCFA : montant inchangé, aucune conversion enregistrée", () => {
    expect(convert(1_020_000, "XOF", effectiveRates(SERVER_OK, null))).toEqual({ valeurXof: 1_020_000, conversion: null });
  });

  it("euro : parité fixe, toujours disponible même sans service", () => {
    const r = convert(3000, "EUR", effectiveRates(undefined, null));
    expect(r?.valeurXof).toBe(1_967_871);
    expect(r?.conversion).toEqual({
      currency: "EUR", amount: 3000, xofPerUnit: 655.957, method: "fixed_parity", rateDate: null, fetchedAt: null, status: "ok",
    });
  });

  it("autre devise : taux du serveur, avec méthode, date et heure d'obtention conservées", () => {
    const r = convert(5000, "USD", effectiveRates(SERVER_OK, null));
    expect(r?.valeurXof).toBe(Math.round(5000 * 563.053648));
    expect(r?.conversion).toMatchObject({ currency: "USD", method: "ecb_cross", rateDate: "2026-10-30", fetchedAt: "2026-10-31T09:00:00.000Z", status: "ok" });
  });

  it("devise sans taux connu : refusée (null), jamais devinée", () => {
    expect(convert(5000, "USD", effectiveRates(SERVER_DEGRADED, null))).toBeNull();
    expect(convert(5000, "CAD", effectiveRates(SERVER_OK, null))).toBeNull();
  });

  it("montant vide, nul ou négatif : rien n'est calculé", () => {
    const rates = effectiveRates(SERVER_OK, null);
    expect(convert(0, "EUR", rates)).toBeNull();
    expect(convert(-5, "XOF", rates)).toBeNull();
    expect(convert(Number.NaN, "USD", rates)).toBeNull();
  });
});

describe("choix des taux et mode dégradé", () => {
  it("réponse fraîche du serveur : utilisée", () => {
    expect(effectiveRates(SERVER_OK, null).origin).toBe("server");
  });

  it("service indisponible : derniers taux gardés dans le navigateur, marqués « stale »", () => {
    for (const server of [undefined, SERVER_DEGRADED]) {
      const eff = effectiveRates(server, SERVER_OK);
      expect(eff.origin).toBe("local-cache");
      expect(eff.snapshot.status).toBe("stale");
      expect(convert(100, "USD", eff)?.conversion?.status).toBe("stale");
    }
  });

  it("service indisponible et aucun taux gardé : seulement FCFA et euro", () => {
    const eff = effectiveRates(undefined, null);
    expect(eff.origin).toBe("fixed-only");
    expect(eff.snapshot.rates).toEqual([FIXED_EUR]);
  });

  it("signale des taux de plus de 7 jours", () => {
    expect(rateAgeDays("2026-10-30", new Date("2026-10-31T12:00:00Z"))).toBe(1);
    expect(ratesAreOld(SERVER_OK, new Date("2026-11-06T12:00:00Z"))).toBe(false);
    expect(ratesAreOld(SERVER_OK, new Date("2026-11-07T12:00:00Z"))).toBe(true);
    expect(ratesAreOld(SERVER_DEGRADED, new Date("2030-01-01"))).toBe(false); // parité fixe : jamais « ancienne »
  });
});

describe("affichage", () => {
  it("date au format jour/mois/année, sans décalage horaire", () => {
    expect(formatRateDate("2026-10-30")).toBe("30/10/2026");
  });

  it("taux avec 6 chiffres significatifs", () => {
    const n = (s: string) => s.replace(/ | /g, " ");
    expect(n(formatRate(655.957, "fr"))).toBe("655,957");
    expect(n(formatRate(563.053648, "fr"))).toBe("563,054");
    expect(n(formatRate(0.39755, "en"))).toBe("0.39755");
  });
});
