/**
 * Integration test against a real PostgreSQL database (schema from the
 * versioned migrations). The identity provider (Supabase Auth) is replaced by
 * a stub (test/authMock.ts): `Bearer ok.<user>` is a valid session for <user>,
 * so the test checks OUR authorization code (ownership filters, admin gate).
 * The real token verification is tested in identity.test.ts.
 *
 *   TEST_DATABASE_URL=postgresql://... pnpm --filter @workspace/api-server test
 *
 * WARNING: the tables of TEST_DATABASE_URL are emptied. Never point it at a
 * database holding real data. Skipped when TEST_DATABASE_URL is not set.
 */
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { startTestApp, TEST_DB } from "./harness";

vi.mock("../src/lib/auth/identity", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../src/lib/auth/identity")>()),
  ...(await import("./authMock")),
}));

const simulation = {
  marque: "Toyota",
  modele: "Corolla",
  annee: 2018,
  cylindree: "1600-2000",
  carburant: "Essence",
  valeurCIF: 5000000,
  joursAuPort: 10,
  regime: "Droit commun",
  totalDouane: 2687700,
  totalPort: 205500,
  totalGeneral: 7893200,
};

describe.skipIf(!TEST_DB)("isolation des données entre utilisateurs", () => {
  let app: Awaited<ReturnType<typeof startTestApp>>;
  const call = (...args: Parameters<typeof app.call>) => app.call(...args);

  beforeAll(async () => {
    app = await startTestApp();
  });

  beforeEach(async () => {
    await app.reset();
  });

  afterAll(async () => {
    await app?.close();
  });

  it("refuse les appels sans session", async () => {
    expect((await call(null, "GET", "/simulations")).status).toBe(401);
    expect((await call(null, "GET", "/profile")).status).toBe(401);
  });

  it("un utilisateur ne voit ni ne supprime les simulations d'un autre", async () => {
    const created = await call("alice", "POST", "/simulations", simulation);
    expect(created.status).toBe(201);
    const { id } = await created.json();

    const bobList = await (await call("bob", "GET", "/simulations")).json();
    expect(bobList.total).toBe(0);
    expect(bobList.simulations).toEqual([]);

    expect((await call("bob", "DELETE", `/simulations/${id}`)).status).toBe(404);

    const aliceList = await (await call("alice", "GET", "/simulations")).json();
    expect(aliceList.simulations.map((s: { id: string }) => s.id)).toEqual([id]);

    expect((await call("alice", "DELETE", `/simulations/${id}`)).status).toBe(204);
  });

  it("le profil renvoyé est toujours celui de l'appelant", async () => {
    await call("alice", "PUT", "/profile", { phone: "+22900000001" });
    const bob = await (await call("bob", "GET", "/profile")).json();
    expect(bob.email).toBe("bob@test.local");
    expect(bob.phone).toBeNull();
  });

  it("la limite gratuite de 3 simulations par mois est appliquée côté serveur", async () => {
    for (let i = 0; i < 3; i++) {
      expect((await call("alice", "POST", "/simulations", simulation)).status).toBe(201);
    }
    const fourth = await call("alice", "POST", "/simulations", simulation);
    expect(fourth.status).toBe(403);
    expect((await fourth.json()).error).toBe("QUOTA_EXCEEDED");
  });

  it("l'administration est refusée aux non-administrateurs", async () => {
    await call("bob", "GET", "/profile");
    expect((await call("bob", "GET", "/admin/dashboard")).status).toBe(403);
    expect((await call("bob", "GET", "/admin/users")).status).toBe(403);

    await call("admin", "GET", "/profile");
    expect((await call("admin", "GET", "/admin/dashboard")).status).toBe(200);
  });
});
