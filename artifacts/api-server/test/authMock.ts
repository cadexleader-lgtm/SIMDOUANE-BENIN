/**
 * Stand-in for the identity provider (src/lib/auth/identity.ts) in API tests.
 * `Authorization: Bearer ok.<userId>` is a valid session for <userId>; any
 * other token is invalid. What Supabase Auth "knows" about each account
 * (email, confirmation, deletion, outage) is set per test through
 * `authAccounts`. Header parsing (`bearerToken`) stays the real one; the real
 * signature checks are tested separately in identity.test.ts.
 */
import { HttpError } from "../src/lib/httpErrors";

type FakeAccount = { email?: string; confirmed?: boolean; deleted?: boolean; noEmail?: boolean; fullName?: string; fail?: boolean };

export const authAccounts = new Map<string, FakeAccount>();
export const authProvider = { down: false };

const unavailable = () =>
  new HttpError(503, "AUTH_PROVIDER_UNAVAILABLE", "Service d'authentification indisponible, réessayez.");

export async function verifyAccessToken(token: string): Promise<string | null> {
  if (authProvider.down) throw unavailable();
  const match = /^ok\.([A-Za-z0-9_-]+)$/.exec(token);
  return match ? match[1] : null;
}

export async function fetchAuthAccount(authUserId: string) {
  if (authProvider.down) throw unavailable();
  const a = authAccounts.get(authUserId) ?? {};
  if (a.fail) throw unavailable(); // admin API down, token still verifiable
  if (a.deleted) return null;
  return {
    id: authUserId,
    email: a.noEmail ? null : a.email ?? `${authUserId}@test.local`,
    emailConfirmed: a.confirmed !== false,
    fullName: a.fullName ?? authUserId,
  };
}

export function resetAuthMock() {
  authAccounts.clear();
  authProvider.down = false;
}

export const authHeader = (user: string) => ({ authorization: `Bearer ok.${user}` });
