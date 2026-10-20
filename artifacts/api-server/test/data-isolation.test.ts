/**
 * Integration test against a real PostgreSQL database (schema from the
 * versioned migrations). Clerk is replaced by a stub: the caller identity is
 * taken from the `x-test-user` header, so the test checks OUR authorization
 * code (ownership filters, admin gate), not Clerk itself.
 *
 *   TEST_DATABASE_URL=postgresql://... pnpm --filter @workspace/api-server test
 *
 * WARNING: the tables of TEST_DATABASE_URL are emptied. Never point it at a
 * database holding real data. Skipped when TEST_DATABASE_URL is not set.
 */
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { AddressInfo } from "node:net";
import type { Server } from "node:http";

const TEST_DB = process.env.TEST_DATABASE_URL;

vi.mock("@clerk/express", () => ({
  clerkMiddleware: () => (_req: unknown, _res: unknown, next: () => void) => next(),
  getAuth: (req: { headers: Record<string, string | undefined> }) => ({
    userId: req.headers["x-test-user"] ?? null,
  }),
  createClerkClient: () => ({
    users: {
      getUser: async (id: string) => ({
        emailAddresses: [{ emailAddress: `${id}@test.local` }],
        firstName: id,
        lastName: null,
        username: null,
      }),
    },
  }),
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
  let server: Server;
  let baseUrl: string;
  let pool: typeof import("@workspace/db").pool;

  const call = (user: string | null, method: string, path: string, body?: unknown) =>
    fetch(`${baseUrl}/api${path}`, {
      method,
      headers: {
        "content-type": "application/json",
        ...(user ? { "x-test-user": user } : {}),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });

  beforeAll(async () => {
    process.env.DATABASE_URL = TEST_DB;
    process.env.ADMIN_EMAILS = "admin@test.local";
    process.env.LOG_LEVEL ??= "silent";
    const { migrate } = await import("drizzle-orm/node-postgres/migrator");
    const { drizzle } = await import("drizzle-orm/node-postgres");
    ({ pool } = await import("@workspace/db"));
    await migrate(drizzle(pool), {
      migrationsFolder: new URL("../../../lib/db/migrations", import.meta.url).pathname,
    });
    const { default: app } = await import("../src/app");
    server = app.listen(0);
    baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  });

  beforeEach(async () => {
    await pool.query(
      "TRUNCATE admin_logs, upgrade_requests, simulations, subscriptions, subscription_plans, users CASCADE",
    );
  });

  afterAll(async () => {
    server?.close();
    await pool?.end();
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
