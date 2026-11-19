/**
 * Owner's view of the activity (admin dashboard + users list) and the public
 * self-check of the deployment.
 */
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { startTestApp, TEST_DB } from "./harness";

vi.mock("../src/lib/auth/identity", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../src/lib/auth/identity")>()),
  ...(await import("./authMock")),
}));

const vehicle = {
  marque: "Toyota", modele: "Corolla", annee: 2018, cylindree: "1600-2000", carburant: "Essence",
  valeurCIF: 5_000_000, joursAuPort: 10, regime: "Droit commun",
  totalDouane: 1, totalPort: 2, totalGeneral: 3,
};
const PHONE = "33333333-3333-4333-8333-333333333333";

describe.skipIf(!TEST_DB)("activité vue par l'administrateur", () => {
  let app: Awaited<ReturnType<typeof startTestApp>>;
  beforeAll(async () => { app = await startTestApp(); });
  beforeEach(async () => { await app.reset(); });
  afterAll(async () => { await app?.close(); });

  it("compte gratuit : 3 simulations acceptées, la 4e refusée (QUOTA_EXCEEDED)", async () => {
    for (let i = 0; i < 3; i++) expect((await app.call("alice", "POST", "/simulations", vehicle)).status).toBe(201);
    const refused = await app.call("alice", "POST", "/simulations", vehicle);
    expect(refused.status).toBe(403);
    expect((await refused.json()).error).toBe("QUOTA_EXCEEDED");
    const sub = await (await app.call("alice", "GET", "/subscription")).json();
    expect(sub).toMatchObject({ simUsedThisMonth: 3, plan: { simulationsPerMonth: 3 } });
  });

  it("tableau de bord : comptes, simulations, visiteurs sans compte, demandes en attente", async () => {
    await app.call("admin", "GET", "/profile");
    for (let i = 0; i < 2; i++) await app.call("alice", "POST", "/simulations", vehicle);
    await app.call("bob", "POST", "/simulations", vehicle);
    for (let i = 0; i < 3; i++) await app.call(null, "POST", "/anonymous-estimates", { deviceId: PHONE });
    await app.call(null, "POST", "/anonymous-estimates", { deviceId: "44444444-4444-4444-8444-444444444444" });
    await app.pool.query(
      `INSERT INTO upgrade_requests (id, user_id, user_email, plan_wanted, status) SELECT gen_random_uuid()::text, id, email, 'Standard', 'submitted' FROM users WHERE email = 'bob@test.local'`,
    );

    const res = await app.call("admin", "GET", "/admin/dashboard");
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({
      totalUsers: 3,
      totalSimulations: 3,
      simulationsThisMonth: 3,
      anonymousVisitors: 2,
      anonymousEstimates: 3,
      anonymousBlocked: 1,
      pendingUpgradeRequests: 1,
    });

    const users = await (await app.call("admin", "GET", "/admin/users")).json();
    const byEmail = Object.fromEntries(users.users.map((u: { email: string }) => [u.email, u]));
    expect(byEmail["alice@test.local"]).toMatchObject({ simulationsCount: 2, simulationsThisMonth: 2 });
    expect(byEmail["bob@test.local"]).toMatchObject({ simulationsCount: 1, simulationsThisMonth: 1 });
  });

  it("transitaire : nom du client conservé avec la simulation et retrouvé par la recherche", async () => {
    const details = { schemaVersion: 1, clientName: "M. Koffi Adjovi" };
    const created = await app.call("alice", "POST", "/simulations", { ...vehicle, details });
    expect(created.status).toBe(201);
    expect((await created.json()).details).toEqual(details);
    await app.call("alice", "POST", "/simulations", { ...vehicle, marque: "Lexus" });
    const found = await (await app.call("alice", "GET", "/simulations?search=koffi")).json();
    expect(found.simulations).toHaveLength(1);
    expect(found.simulations[0].details.clientName).toBe("M. Koffi Adjovi");
    const tooLong = await app.call("alice", "POST", "/simulations", { ...vehicle, details: { schemaVersion: 1, clientName: "x".repeat(81) } });
    expect(tooLong.status).toBe(400);
  });

  it("le tableau de bord admin reste réservé à l'administrateur", async () => {
    expect((await app.call("alice", "GET", "/admin/dashboard")).status).toBe(403);
    expect((await app.call(null, "GET", "/admin/dashboard")).status).toBe(401);
  });

  it("auto-diagnostic : dit si la clé serveur manque, sans jamais montrer de valeur", async () => {
    const saved = { url: process.env.SUPABASE_URL, key: process.env.SUPABASE_SERVICE_ROLE_KEY };
    try {
      process.env.SUPABASE_URL = "https://example.supabase.co";
      process.env.SUPABASE_SERVICE_ROLE_KEY = "secret-value-never-shown";
      const ok = await app.call(null, "GET", "/health/config");
      expect(ok.status).toBe(200);
      const okText = await ok.text();
      expect(JSON.parse(okText)).toEqual({ database: "ok", accounts: "ok" });
      expect(okText).not.toContain("secret-value");

      delete process.env.SUPABASE_SERVICE_ROLE_KEY;
      const missing = await app.call(null, "GET", "/health/config");
      expect(missing.status).toBe(503);
      expect((await missing.json()).accounts).toContain("SUPABASE_SERVICE_ROLE_KEY");
    } finally {
      if (saved.url === undefined) delete process.env.SUPABASE_URL; else process.env.SUPABASE_URL = saved.url;
      if (saved.key === undefined) delete process.env.SUPABASE_SERVICE_ROLE_KEY; else process.env.SUPABASE_SERVICE_ROLE_KEY = saved.key;
    }
  });
});
