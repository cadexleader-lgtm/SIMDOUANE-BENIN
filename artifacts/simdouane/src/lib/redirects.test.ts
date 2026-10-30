import { describe, expect, it } from "vitest";
import { onboardingUrl, safeAppPath, signInPathFor } from "./redirects";

const ORIGIN = "https://simdouane.example";

describe("safeAppPath", () => {
  it("accepte un chemin interne, avec ou sans préfixe, avec paramètres", () => {
    expect(safeAppPath("/historique", "", ORIGIN)).toBe("/historique");
    expect(safeAppPath("/app/historique?x=1#a", "/app", ORIGIN)).toBe("/historique?x=1#a");
    expect(safeAppPath(`${ORIGIN}/profil`, "", ORIGIN)).toBe("/profil");
  });

  it("refuse tout autre site et les formes détournées", () => {
    for (const raw of [
      "https://evil.example/x",
      "//evil.example/x",
      "/\\evil.example",
      "javascript:alert(1)",
      "evil.example",
      "/ok\nevil",
      "",
      null,
      undefined,
    ]) {
      expect(safeAppPath(raw, "", ORIGIN), String(raw)).toBeNull();
    }
  });

  it("refuse les pages de connexion, d'inscription, de mot de passe et d'onboarding (boucles)", () => {
    expect(safeAppPath("/sign-in", "", ORIGIN)).toBeNull();
    expect(safeAppPath("/sign-up/verify", "", ORIGIN)).toBeNull();
    expect(safeAppPath("/onboarding?next=/x", "", ORIGIN)).toBeNull();
    expect(safeAppPath("/mot-de-passe-oublie", "", ORIGIN)).toBeNull();
    expect(safeAppPath("/nouveau-mot-de-passe", "", ORIGIN)).toBeNull();
    expect(safeAppPath("/auth/confirmation?next=/x", "", ORIGIN)).toBeNull();
  });
});

describe("parcours d'inscription", () => {
  it("sans destination : onboarding puis tableau de bord (comportement par défaut)", () => {
    expect(onboardingUrl(null, "")).toBe("/onboarding");
  });

  it("avec destination (invitation, lien direct) : onboarding puis la destination", () => {
    const wanted = safeAppPath("/invitations/abc?x=1", "", ORIGIN);
    expect(onboardingUrl(wanted, "")).toBe("/onboarding?next=%2Finvitations%2Fabc%3Fx%3D1");
    // The onboarding page reads `next` back through the same filter.
    const next = new URL(onboardingUrl(wanted, ""), ORIGIN).searchParams.get("next");
    expect(safeAppPath(next, "", ORIGIN)).toBe("/invitations/abc?x=1");
  });

  it("une page protégée renvoie vers la connexion en mémorisant la destination", () => {
    const path = signInPathFor("/historique", "?page=2", "");
    expect(path).toBe("/sign-in?redirect_url=%2Fhistorique%3Fpage%3D2");
    const back = new URL(path, ORIGIN).searchParams.get("redirect_url");
    expect(safeAppPath(back, "", ORIGIN)).toBe("/historique?page=2");
  });
});
