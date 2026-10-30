/**
 * Authentication at the API level (Supabase Auth): what is refused before any
 * data is touched, first sign-in, admin gate. Real PostgreSQL
 * (TEST_DATABASE_URL, emptied between tests), identity provider stubbed
 * (test/authMock.ts); the real token checks are in identity.test.ts.
 */
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { startTestApp, TEST_DB } from "./harness";
import { authAccounts, authProvider } from "./authMock";

vi.mock("../src/lib/auth/identity", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../src/lib/auth/identity")>()),
  ...(await import("./authMock")),
}));

const PROTECTED: Array<[string, string]> = [
  ["GET", "/profile"],
  ["GET", "/simulations"],
  ["GET", "/subscription"],
  ["GET", "/cases"],
  ["GET", "/transitaire-access"],
  ["GET", "/admin/users"],
  ["GET", "/admin/transitaire-applications"],
];

describe.skipIf(!TEST_DB)("authentification Supabase Auth — API", () => {
  let app: Awaited<ReturnType<typeof startTestApp>>;
  const query = async (sql: string, params: unknown[] = []) => (await app.pool.query(sql, params)).rows;

  beforeAll(async () => {
    app = await startTestApp();
  });
  beforeEach(async () => {
    await app.reset();
  });
  afterAll(async () => {
    await app?.close();
  });

  describe("refus avant tout accès aux données", () => {
    it("sans session, avec un jeton forgé ou un en-tête mal formé : 401 partout, aucun compte créé", async () => {
      const attempts: Array<[string, Record<string, string>]> = [
        ["sans en-tête", {}],
        ["jeton forgé", { authorization: "Bearer forge.alice" }],
        ["schéma Basic", { authorization: "Basic YWxpY2U6c2VjcmV0" }],
        ["Bearer vide", { authorization: "Bearer " }],
        ["deux jetons", { authorization: "Bearer ok.alice ok.bob" }],
        ["jeton sans schéma", { authorization: "ok.alice" }],
        // Cookies are never read: a stolen or forged cookie gives nothing.
        ["cookie seul", { cookie: "sb-access-token=ok.alice; __session=ok.alice" }],
        // The former test identity header (Clerk era) is not a back door.
        ["ancien en-tête de test", { "x-test-user": "alice" }],
      ];
      for (const [label, headers] of attempts) {
        for (const [method, path] of PROTECTED) {
          const res = await app.raw(method, path, headers);
          expect(res.status, `${label} → ${method} ${path}`).toBe(401);
        }
      }
      expect(await query(`SELECT count(*)::int AS n FROM users`)).toEqual([{ n: 0 }]);
    });

    it("service d'authentification indisponible : 503 avec un message clair, aucun compte créé", async () => {
      authProvider.down = true;
      const res = await app.call("alice", "GET", "/profile");
      expect(res.status).toBe(503);
      expect(await res.json()).toMatchObject({
        error: "AUTH_PROVIDER_UNAVAILABLE",
        message: "Service d'authentification indisponible, réessayez.",
      });
      expect(await query(`SELECT count(*)::int AS n FROM users`)).toEqual([{ n: 0 }]);
    });
  });

  describe("première connexion", () => {
    it("crée le compte SimDouane relié au compte Supabase Auth, sans identifiant Clerk", async () => {
      authAccounts.set("alice", { email: "Alice@Exemple.test", fullName: "Alice Test" });
      const res = await app.call("alice", "GET", "/profile");
      expect(res.status).toBe(200);
      expect(await res.json()).toMatchObject({ email: "Alice@Exemple.test", fullName: "Alice Test", clerkId: null });
      expect(await query(`SELECT auth_user_id, clerk_id, email_verified FROM users`)).toEqual([
        { auth_user_id: "alice", clerk_id: null, email_verified: true },
      ]);
      // A second request reuses the same account.
      expect((await app.call("alice", "GET", "/profile")).status).toBe(200);
      expect(await query(`SELECT count(*)::int AS n FROM users`)).toEqual([{ n: 1 }]);
    });

    it("compte supprimé dans Supabase Auth : refusé, rien n'est créé", async () => {
      authAccounts.set("ghost", { deleted: true });
      const res = await app.call("ghost", "GET", "/cases");
      expect(res.status).toBe(401);
      expect((await res.json()).error).toBe("ACCOUNT_NOT_FOUND");
      expect(await query(`SELECT count(*)::int AS n FROM users`)).toEqual([{ n: 0 }]);
    });

    it("compte sans adresse e-mail : refusé, rien n'est créé", async () => {
      authAccounts.set("nomail", { noEmail: true });
      const res = await app.call("nomail", "GET", "/profile");
      expect(res.status).toBe(422);
      expect((await res.json()).error).toBe("EMAIL_REQUIRED");
      expect(await query(`SELECT count(*)::int AS n FROM users`)).toEqual([{ n: 0 }]);
    });
  });

  describe("administration", () => {
    it("l'email du compte Supabase Auth doit être celui de la liste, confirmé, à chaque requête", async () => {
      await app.call("admin", "GET", "/profile"); // first sign-in creates the account
      expect((await app.call("admin", "GET", "/admin/users")).status).toBe(200);

      // Email changed on the Supabase side: no longer the listed address.
      authAccounts.set("admin", { email: "autre@test.local" });
      const changed = await app.call("admin", "GET", "/admin/users");
      expect(changed.status).toBe(403);
      expect((await changed.json()).error).toBe("ADMIN_EMAIL_NOT_VERIFIED");

      // Account deleted on the Supabase side while its token is still valid.
      authAccounts.set("admin", { deleted: true });
      expect((await app.call("admin", "GET", "/admin/users")).status).toBe(403);
    });

    it("chaque action d'administration est attribuée au compte SimDouane de l'administrateur", async () => {
      await app.call("alice", "GET", "/profile");
      await app.call("admin", "GET", "/profile");
      const [{ id: aliceId }] = await query(`SELECT id FROM users WHERE auth_user_id = 'alice'`);
      const [{ id: adminId }] = await query(`SELECT id FROM users WHERE auth_user_id = 'admin'`);

      const res = await app.call("admin", "PUT", `/admin/users/${aliceId}/status`, { status: "disabled" });
      expect(res.status).toBe(200);
      expect(await query(`SELECT admin_user_id, admin_clerk_id, action, target_id FROM admin_logs`)).toEqual([
        { admin_user_id: adminId, admin_clerk_id: null, action: "update_user_status", target_id: aliceId },
      ]);
      // The disabled account is then refused on the new features.
      expect((await app.call("alice", "GET", "/cases")).status).toBe(403);
    });

    it("un utilisateur ordinaire, même avec un jeton valide, n'a aucun accès d'administration", async () => {
      for (const [method, path] of PROTECTED.filter(([, p]) => p.startsWith("/admin"))) {
        expect((await app.call("alice", method, path)).status, `${method} ${path}`).toBe(403);
      }
    });
  });
});
