/**
 * Identity provider: Supabase Auth.
 *
 * The browser signs in with Supabase Auth (publishable key) and sends its
 * access token as `Authorization: Bearer <token>` on every API call. The API
 * never trusts the token's content without checking it:
 * - `verifyAccessToken` checks the signature and expiry (Supabase `getClaims`:
 *   project JWKS for asymmetric keys, otherwise the Auth server itself);
 * - `fetchAuthAccount` reads the account (email, confirmation) with the
 *   service role key, server side only.
 * Cookies are never read: no session cookie, hence no cross-site request
 * forgery on the API.
 */
import type { Request } from "express";
import { createClient, isAuthRetryableFetchError, type SupabaseClient } from "@supabase/supabase-js";
import { HttpError } from "../httpErrors";
import { logger } from "../logger";

export type AuthAccount = {
  id: string;
  email: string | null;
  emailConfirmed: boolean;
  fullName: string | null;
};

// Supabase Auth user ids are UUIDs; anything else cannot be an account.
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const unavailable = () =>
  new HttpError(503, "AUTH_PROVIDER_UNAVAILABLE", "Service d'authentification indisponible, réessayez.");

let client: SupabaseClient | null = null;

function authClient(): SupabaseClient {
  if (!client) {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) {
      logger.error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required for authentication");
      throw unavailable();
    }
    // Service role key: server only, never sent to the browser.
    client = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    });
  }
  return client;
}

/** The token of an `Authorization: Bearer <token>` header, or null. */
export function bearerToken(req: Request): string | null {
  const header = req.headers.authorization;
  if (typeof header !== "string") return null;
  const match = /^Bearer ([A-Za-z0-9._~+/-]+=*)$/.exec(header.trim());
  return match ? match[1] : null;
}

/**
 * Supabase Auth user id of a valid access token; null for a missing, forged,
 * expired or non-user token. Throws 503 when the provider cannot be reached.
 */
export async function verifyAccessToken(token: string): Promise<string | null> {
  let result: Awaited<ReturnType<SupabaseClient["auth"]["getClaims"]>>;
  try {
    result = await authClient().auth.getClaims(token);
  } catch (err) {
    if (err instanceof HttpError) throw err;
    // Malformed token or unsupported algorithm.
    return null;
  }
  if (result.error) {
    if (isAuthRetryableFetchError(result.error)) throw unavailable();
    return null;
  }
  const claims = result.data?.claims;
  // Only signed-in user sessions: not the anon/service keys, not anonymous users.
  if (!claims || typeof claims.sub !== "string" || !UUID.test(claims.sub)) return null;
  if (claims.role !== "authenticated" || claims.is_anonymous === true) return null;
  return claims.sub;
}

/** The account behind a verified user id; null if it no longer exists. */
export async function fetchAuthAccount(authUserId: string): Promise<AuthAccount | null> {
  if (!UUID.test(authUserId)) return null;
  const { data, error } = await authClient().auth.admin.getUserById(authUserId);
  if (error) {
    if (error.status === 404 || error.code === "user_not_found") return null;
    logger.error({ status: error.status, code: error.code }, "Supabase Auth admin request failed");
    throw unavailable();
  }
  const user = data.user;
  if (!user) return null;
  const metadata = (user.user_metadata ?? {}) as Record<string, unknown>;
  const fullName = typeof metadata.full_name === "string" ? metadata.full_name.trim() : "";
  return {
    id: user.id,
    email: user.email ?? null,
    emailConfirmed: Boolean(user.email_confirmed_at),
    fullName: fullName || null,
  };
}
