/**
 * French messages for Supabase Auth errors. The raw provider message is never
 * shown: it is English and can leak details (e.g. whether an account exists).
 */
import type { MvpTexts } from "./mvp-texts";

type AuthErrorLike = { code?: string; name?: string; status?: number; message?: string } | null | undefined;

export function authErrorMessage(err: AuthErrorLike, t: MvpTexts["auth"]["errors"]): string {
  if (!err) return t.generic;
  if (err.name === "AuthRetryableFetchError" || err.status === 0 || err.message === "Failed to fetch") return t.network;
  switch (err.code) {
    case "invalid_credentials":
      return t.invalidCredentials;
    case "email_not_confirmed":
      return t.emailNotConfirmed;
    case "user_already_exists":
    case "email_exists":
      return t.alreadyRegistered;
    case "weak_password":
      return t.weakPassword;
    case "email_address_invalid":
    case "validation_failed":
      return t.invalidEmail;
    case "over_request_rate_limit":
    case "over_email_send_rate_limit":
      return t.rateLimited;
    case "email_address_not_authorized":
      return t.emailNotAuthorized;
    case "same_password":
      return t.samePassword;
  }
  if (err.status === 429) return t.rateLimited;
  return t.generic;
}

/** Basic e-mail shape check before calling the provider (the provider decides). */
export function looksLikeEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

export const MIN_PASSWORD_LENGTH = 8;
