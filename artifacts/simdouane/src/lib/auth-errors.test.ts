import { describe, expect, it } from "vitest";
import { authErrorMessage, looksLikeEmail } from "./auth-errors";
import { linkError } from "./auth-links";
import { useMvpTexts } from "./mvp-texts";

const t = useMvpTexts().auth.errors;

describe("messages d'erreur de connexion", () => {
  it("traduit les codes de Supabase Auth en français", () => {
    expect(authErrorMessage({ code: "invalid_credentials", status: 400 }, t)).toBe(t.invalidCredentials);
    expect(authErrorMessage({ code: "email_not_confirmed", status: 400 }, t)).toBe(t.emailNotConfirmed);
    expect(authErrorMessage({ code: "user_already_exists", status: 422 }, t)).toBe(t.alreadyRegistered);
    expect(authErrorMessage({ code: "weak_password", status: 422 }, t)).toBe(t.weakPassword);
    expect(authErrorMessage({ code: "over_email_send_rate_limit", status: 429 }, t)).toBe(t.rateLimited);
    expect(authErrorMessage({ code: "email_address_not_authorized", status: 400 }, t)).toBe(t.emailNotAuthorized);
    expect(authErrorMessage({ code: "same_password", status: 422 }, t)).toBe(t.samePassword);
    expect(authErrorMessage({ status: 429 }, t)).toBe(t.rateLimited);
  });

  it("panne réseau : message de connexion, jamais le texte brut du service", () => {
    expect(authErrorMessage({ name: "AuthRetryableFetchError", status: 0, message: "Failed to fetch" }, t)).toBe(t.network);
    expect(authErrorMessage({ code: "unexpected_failure", status: 500, message: "Database error: secret details" }, t)).toBe(t.generic);
    expect(authErrorMessage(null, t)).toBe(t.generic);
  });

  it("forme d'adresse e-mail", () => {
    expect(looksLikeEmail("awa@exemple.bj")).toBe(true);
    expect(looksLikeEmail("  awa@exemple.bj ")).toBe(true);
    for (const value of ["", "awa", "awa@", "@exemple.bj", "awa@exemple", "a wa@exemple.bj"]) {
      expect(looksLikeEmail(value), value).toBe(false);
    }
  });
});

describe("liens reçus par e-mail", () => {
  it("repère un lien expiré ou refusé, dans le fragment ou les paramètres", () => {
    expect(linkError({ hash: "#error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid", search: "" })).toBe("otp_expired");
    expect(linkError({ hash: "", search: "?error=access_denied" })).toBe("access_denied");
  });

  it("un lien valide n'est pas une erreur", () => {
    expect(linkError({ hash: "#access_token=abc&type=signup", search: "?next=%2Fdossiers" })).toBeNull();
    expect(linkError({ hash: "", search: "" })).toBeNull();
  });
});
