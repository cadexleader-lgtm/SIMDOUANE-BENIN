/**
 * Real token verification (src/lib/auth/identity.ts + supabase-js), offline:
 * a local stand-in for the Supabase Auth server publishes a JWKS and answers
 * the admin and /user endpoints; tokens are signed here with real ES256 keys.
 * No database needed.
 */
import { createServer, type Server } from "node:http";
import { generateKeyPairSync, sign, type KeyObject } from "node:crypto";
import type { AddressInfo } from "node:net";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import type { Request } from "express";

type Identity = typeof import("../src/lib/auth/identity");

const b64url = (data: Buffer | string) => Buffer.from(data).toString("base64url");
const now = () => Math.floor(Date.now() / 1000);

function jwt(payload: Record<string, unknown>, key: KeyObject | null, header: Record<string, unknown> = { alg: "ES256", kid: "k1", typ: "JWT" }) {
  const head = `${b64url(JSON.stringify(header))}.${b64url(JSON.stringify(payload))}`;
  const signature = key ? sign("sha256", Buffer.from(head), { key, dsaEncoding: "ieee-p1363" }) : Buffer.alloc(0);
  return `${head}.${b64url(signature)}`;
}

const USER_1 = "11111111-1111-4111-8111-111111111111";
const USER_UNCONFIRMED = "22222222-2222-4222-8222-222222222222";
const USER_500 = "55555555-5555-4555-8555-555555555555";
const USER_HS = "33333333-3333-4333-8333-333333333333";
const UNKNOWN = "99999999-9999-4999-8999-999999999999";

const projectKey = generateKeyPairSync("ec", { namedCurve: "P-256" });
const attackerKey = generateKeyPairSync("ec", { namedCurve: "P-256" });
const session = (overrides: Record<string, unknown> = {}) => ({
  sub: USER_1, role: "authenticated", aud: "authenticated", exp: now() + 600, ...overrides,
});
const HS_TOKEN_ACCEPTED_BY_SERVER = jwt(session({ sub: USER_HS }), null, { alg: "HS256", typ: "JWT" }) + "accepted";

const users: Record<string, Record<string, unknown>> = {
  [USER_1]: { id: USER_1, email: "awa@exemple.test", email_confirmed_at: "2026-10-30T10:00:00Z", user_metadata: { full_name: "Awa Test" } },
  [USER_UNCONFIRMED]: { id: USER_UNCONFIRMED, email: "x@exemple.test", email_confirmed_at: null, user_metadata: {} },
};

let server: Server;
let baseUrl: string;
let userEndpointCalls = 0;
let identity: Identity;

beforeAll(async () => {
  const jwk = { ...projectKey.publicKey.export({ format: "jwk" }), kid: "k1", alg: "ES256", use: "sig" };
  server = createServer((req, res) => {
    const json = (status: number, body: unknown) => {
      res.writeHead(status, { "content-type": "application/json" });
      res.end(JSON.stringify(body));
    };
    const url = req.url ?? "";
    if (url === "/auth/v1/.well-known/jwks.json") return json(200, { keys: [jwk] });
    if (url === "/auth/v1/user") {
      userEndpointCalls++;
      if (req.headers.authorization === `Bearer ${HS_TOKEN_ACCEPTED_BY_SERVER}`) {
        return json(200, { id: USER_HS, aud: "authenticated", role: "authenticated", email: "hs@exemple.test" });
      }
      return json(401, { code: 401, error_code: "bad_jwt", msg: "invalid JWT" });
    }
    const admin = /^\/auth\/v1\/admin\/users\/([^/?]+)/.exec(url);
    if (admin) {
      if (admin[1] === USER_500) return json(500, { code: 500, error_code: "unexpected_failure", msg: "boom" });
      const user = users[admin[1]];
      return user ? json(200, user) : json(404, { code: 404, error_code: "user_not_found", msg: "User not found" });
    }
    json(404, {});
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  process.env.LOG_LEVEL = "silent";
  process.env.SUPABASE_URL = baseUrl;
  process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-role-key";
  identity = await import("../src/lib/auth/identity");
});

afterAll(() => {
  server?.close();
});

describe("jeton d'accès : vérification réelle (signature ES256, JWKS du projet)", () => {
  it("accepte un jeton valide signé par la clé du projet", async () => {
    expect(await identity.verifyAccessToken(jwt(session(), projectKey.privateKey))).toBe(USER_1);
  });

  it("refuse un jeton signé par une autre clé (même identifiant de clé)", async () => {
    expect(await identity.verifyAccessToken(jwt(session(), attackerKey.privateKey))).toBeNull();
  });

  it("refuse un jeton modifié après signature (autre utilisateur)", async () => {
    const [head, , signature] = jwt(session(), projectKey.privateKey).split(".");
    const tampered = `${head}.${b64url(JSON.stringify(session({ sub: "admin" })))}.${signature}`;
    expect(await identity.verifyAccessToken(tampered)).toBeNull();
  });

  it("refuse un jeton expiré ou sans date d'expiration", async () => {
    expect(await identity.verifyAccessToken(jwt(session({ exp: now() - 5 }), projectKey.privateKey))).toBeNull();
    expect(await identity.verifyAccessToken(jwt(session({ exp: undefined }), projectKey.privateKey))).toBeNull();
  });

  it("refuse ce qui n'est pas une session d'utilisateur (clé anon, utilisateur anonyme, sans sujet)", async () => {
    expect(await identity.verifyAccessToken(jwt(session({ role: "anon" }), projectKey.privateKey))).toBeNull();
    expect(await identity.verifyAccessToken(jwt(session({ role: "service_role" }), projectKey.privateKey))).toBeNull();
    expect(await identity.verifyAccessToken(jwt(session({ is_anonymous: true }), projectKey.privateKey))).toBeNull();
    expect(await identity.verifyAccessToken(jwt(session({ sub: undefined }), projectKey.privateKey))).toBeNull();
    expect(await identity.verifyAccessToken(jwt(session({ sub: "admin" }), projectKey.privateKey))).toBeNull();
  });

  it("refuse les jetons mal formés ou sans signature", async () => {
    for (const token of ["", "abc", "a.b", "a.b.c", jwt(session(), null, { alg: "none", typ: "JWT" })]) {
      expect(await identity.verifyAccessToken(token), token).toBeNull();
    }
  });

  it("jeton symétrique (HS256) : jamais cru sur parole, toujours vérifié par le serveur d'authentification", async () => {
    const before = userEndpointCalls;
    expect(await identity.verifyAccessToken(jwt(session({ sub: USER_HS }), null, { alg: "HS256", typ: "JWT" }))).toBeNull();
    expect(await identity.verifyAccessToken(HS_TOKEN_ACCEPTED_BY_SERVER)).toBe(USER_HS);
    expect(userEndpointCalls - before).toBe(2);
  });
});

describe("compte Supabase Auth (API d'administration)", () => {
  it("lit l'email, sa confirmation et le nom", async () => {
    expect(await identity.fetchAuthAccount(USER_1)).toEqual({
      id: USER_1, email: "awa@exemple.test", emailConfirmed: true, fullName: "Awa Test",
    });
    expect(await identity.fetchAuthAccount(USER_UNCONFIRMED)).toMatchObject({ emailConfirmed: false, fullName: null });
  });

  it("compte supprimé : null ; panne du service : erreur 503", async () => {
    expect(await identity.fetchAuthAccount(UNKNOWN)).toBeNull();
    expect(await identity.fetchAuthAccount("pas-un-uuid")).toBeNull();
    await expect(identity.fetchAuthAccount(USER_500)).rejects.toMatchObject({ status: 503, code: "AUTH_PROVIDER_UNAVAILABLE" });
  });
});

describe("en-tête Authorization", () => {
  const req = (authorization?: string) => ({ headers: authorization === undefined ? {} : { authorization } }) as Request;
  it("n'accepte que « Bearer <jeton> »", () => {
    expect(identity.bearerToken(req("Bearer aaa.bbb.ccc"))).toBe("aaa.bbb.ccc");
    for (const value of [undefined, "", "Bearer", "Bearer ", "Basic dXNlcjpwYXNz", "Bearer a b", "aaa.bbb.ccc"]) {
      expect(identity.bearerToken(req(value)), String(value)).toBeNull();
    }
  });
});

describe("service d'authentification injoignable", () => {
  // A signing key already fetched stays cached (supabase-js, 10 min): tokens
  // signed with it are still verified offline, which is safe. An unknown key
  // must be fetched; if the server cannot be reached, the API answers 503.
  it("clé inconnue et serveur injoignable : 503, jamais d'accès accordé", async () => {
    const closed = createServer();
    await new Promise<void>((resolve) => closed.listen(0, "127.0.0.1", resolve));
    const port = (closed.address() as AddressInfo).port;
    await new Promise<void>((resolve) => closed.close(() => resolve()));

    vi.resetModules();
    process.env.SUPABASE_URL = `http://127.0.0.1:${port}`;
    const offline: Identity = await import("../src/lib/auth/identity");
    const unknownKid = jwt(session(), projectKey.privateKey, { alg: "ES256", kid: "k2", typ: "JWT" });
    await expect(offline.verifyAccessToken(unknownKid)).rejects.toMatchObject({ status: 503 });
    await expect(offline.fetchAuthAccount(USER_1)).rejects.toMatchObject({ status: 503 });
    process.env.SUPABASE_URL = baseUrl;
  });
});
