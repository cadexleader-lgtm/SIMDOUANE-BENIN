/**
 * Phase 3 — vehicle files: creation, reading, update, completeness check,
 * archiving, isolation between users and validation errors.
 * Real PostgreSQL (TEST_DATABASE_URL, emptied between tests), Clerk stubbed.
 */
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { startTestApp, TEST_DB } from "./harness";

vi.mock("@clerk/express", async () => (await import("./clerkMock")).default);

const minimal = { arrivalSituation: "not_arrived", vehicle: { make: "Toyota" } };
const full = {
  arrivalSituation: "not_arrived",
  vehicle: { make: "Toyota", model: "Corolla", year: 2018, vin: "jtdbr32e720123456", condition: "occasion" },
  originCountry: "Belgique",
  departurePort: "Anvers",
  shippedAt: "2026-10-01",
  estimatedArrivalDate: "2026-11-15",
  transportReference: "BL-FICTIF-001",
  notes: "Informations fictives de test.",
};

describe.skipIf(!TEST_DB)("phase 3 — dossiers véhicules", () => {
  let app: Awaited<ReturnType<typeof startTestApp>>;
  const call = (...a: Parameters<typeof app.call>) => app.call(...a);
  const query = async (q: string, p: unknown[] = []) => (await app.pool.query(q, p)).rows;
  const create = async (user: string, body: unknown = minimal) => {
    const res = await call(user, "POST", "/cases", body);
    expect(res.status, JSON.stringify(await res.clone().json())).toBe(201);
    return res.json();
  };

  beforeAll(async () => {
    app = await startTestApp();
  });
  beforeEach(async () => {
    await app.reset();
  });
  afterAll(async () => {
    await app?.close();
  });

  it("refuse toutes les routes sans session", async () => {
    for (const [m, p] of [["GET", "/cases"], ["POST", "/cases"], ["GET", "/cases/x"], ["PATCH", "/cases/x"], ["DELETE", "/cases/x"], ["POST", "/cases/x/check"], ["GET", "/cases/x/events"]]) {
      expect((await call(null, m, p, m === "GET" || m === "DELETE" ? undefined : {})).status, `${m} ${p}`).toBe(401);
    }
  });

  describe("création", () => {
    it("crée un brouillon avec seulement la situation et la marque", async () => {
      const c = await create("alice");
      expect(c).toMatchObject({ status: "draft", arrivalSituation: "not_arrived", arrivalPort: "Cotonou", vehicle: { make: "Toyota", model: null } });
      expect(c.reference).toMatch(/^SDB-\d{4}-\d{6}$/);
      expect(c.missingFields).toEqual(["vehicle.model", "vehicle.year", "originCountry", "estimatedArrivalDate"]);
      const list = await (await call("alice", "GET", "/cases")).json();
      expect(list).toMatchObject([{ id: c.id, status: "draft", missingCount: 4 }]);
      expect(await query(`SELECT action FROM audit_logs`)).toEqual([{ action: "case.created" }]);
    });

    it("références uniques et croissantes ; châssis normalisé", async () => {
      const a = await create("alice", full);
      const b = await create("bob", { ...minimal, arrivalSituation: "arrived" });
      expect(a.vehicle.vin).toBe("JTDBR32E720123456");
      expect(Number(b.reference.slice(-6))).toBe(Number(a.reference.slice(-6)) + 1);
    });

    it("le client ne peut fixer ni le statut, ni le propriétaire, ni la référence", async () => {
      await call("bob", "GET", "/profile");
      const [{ id: bobId }] = await query(`SELECT id FROM users WHERE clerk_id = 'bob'`);
      const c = await create("alice", { ...minimal, status: "ready", ownerUserId: bobId, reference: "SDB-0000-000000" });
      expect(c.status).toBe("draft");
      expect(c.reference).not.toBe("SDB-0000-000000");
      const [{ clerk_id }] = await query(`SELECT u.clerk_id FROM clearance_cases c JOIN users u ON u.id = c.owner_user_id`);
      expect(clerk_id).toBe("alice");
    });

    it("erreurs de validation : message par champ, rien n'est créé", async () => {
      const res = await call("alice", "POST", "/cases", {
        vehicle: { year: 1800, vin: "AB#" },
        arrivalDate: "2026-02-30",
      });
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toBe("VALIDATION_ERROR");
      expect(Object.keys(body.fieldErrors).sort()).toEqual(["arrivalDate", "arrivalSituation", "vehicle.make", "vehicle.vin", "vehicle.year"]);
      expect(body.fieldErrors["vehicle.make"]).toBe("La marque est obligatoire.");
      expect(await query(`SELECT count(*)::int AS n FROM clearance_cases`)).toEqual([{ n: 0 }]);
      expect(await query(`SELECT count(*)::int AS n FROM vehicles`)).toEqual([{ n: 0 }]);

      const future = new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10);
      const arrived = await call("alice", "POST", "/cases", { ...minimal, arrivalSituation: "arrived", arrivalDate: future });
      expect((await arrived.json()).fieldErrors.arrivalDate).toMatch(/futur/);
      expect((await call("alice", "POST", "/cases", "pas un objet")).status).toBe(400);
    });

    it("limite de dossiers actifs par compte", async () => {
      const c = await create("alice");
      const [{ owner_user_id }] = await query(`SELECT owner_user_id FROM clearance_cases WHERE id = $1`, [c.id]);
      await query(
        `WITH v AS (
           INSERT INTO vehicles (id, owner_user_id, make) SELECT 'v' || g, $1, 'Fictif' FROM generate_series(1, 99) g RETURNING id
         )
         INSERT INTO clearance_cases (id, reference, owner_user_id, vehicle_id, arrival_situation)
         SELECT 'c-' || v.id, 'SDB-TEST-' || v.id, $1, v.id, 'arrived' FROM v`,
        [owner_user_id],
      );
      const res = await call("alice", "POST", "/cases", minimal);
      expect(res.status).toBe(409);
      expect((await res.json()).error).toBe("TOO_MANY_CASES");
    });
  });

  describe("isolation entre utilisateurs", () => {
    it("un autre utilisateur, même administrateur, ne peut ni voir, ni modifier, ni vérifier, ni archiver le dossier", async () => {
      const c = await create("alice", full);
      for (const user of ["bob", "admin"]) {
        expect((await call(user, "GET", `/cases/${c.id}`)).status, `${user} GET`).toBe(404);
        expect((await call(user, "PATCH", `/cases/${c.id}`, { notes: "piraté" })).status, `${user} PATCH`).toBe(404);
        expect((await call(user, "POST", `/cases/${c.id}/check`)).status, `${user} check`).toBe(404);
        expect((await call(user, "GET", `/cases/${c.id}/events`)).status, `${user} events`).toBe(404);
        expect((await call(user, "DELETE", `/cases/${c.id}`)).status, `${user} DELETE`).toBe(404);
        expect(await (await call(user, "GET", "/cases")).json()).toEqual([]);
      }
      const after = await (await call("alice", "GET", `/cases/${c.id}`)).json();
      expect(after).toMatchObject({ notes: full.notes, status: "draft" });
      expect(await query(`SELECT count(*)::int AS n FROM case_events WHERE type <> 'created'`)).toEqual([{ n: 0 }]);
    });

    it("un identifiant inconnu répond comme un dossier d'autrui (404)", async () => {
      expect((await call("alice", "GET", "/cases/00000000-0000-0000-0000-000000000000")).status).toBe(404);
    });

    it("un compte désactivé par l'administrateur n'accède plus aux dossiers", async () => {
      await create("alice");
      await query(`UPDATE users SET status = 'disabled' WHERE clerk_id = 'alice'`);
      const res = await call("alice", "GET", "/cases");
      expect(res.status).toBe(403);
      expect((await res.json()).error).toBe("ACCOUNT_DISABLED");
    });
  });

  describe("statuts et historique", () => {
    it("brouillon → à compléter → prêt → à compléter, avec historique", async () => {
      const c = await create("alice");
      const kept = await (await call("alice", "PATCH", `/cases/${c.id}`, { originCountry: "France" })).json();
      expect(kept.status).toBe("draft"); // a draft stays a draft until checked

      const checked = await (await call("alice", "POST", `/cases/${c.id}/check`)).json();
      expect(checked).toMatchObject({ status: "incomplete", missingFields: ["vehicle.model", "vehicle.year", "estimatedArrivalDate"] });

      const ready = await (await call("alice", "PATCH", `/cases/${c.id}`, {
        vehicle: { model: "Yaris", year: 2019 },
        estimatedArrivalDate: "2026-12-20",
      })).json();
      expect(ready).toMatchObject({ status: "ready", missingFields: [], recommendedFields: ["vehicle.vin", "transportReference"] });

      const back = await (await call("alice", "PATCH", `/cases/${c.id}`, { vehicle: { model: null } })).json();
      expect(back).toMatchObject({ status: "incomplete", missingFields: ["vehicle.model"] });

      const events = await (await call("alice", "GET", `/cases/${c.id}/events`)).json();
      expect(events.map((e: { type: string; fromStatus: string | null; toStatus: string | null }) => [e.type, e.fromStatus, e.toStatus]).reverse()).toEqual([
        ["created", null, "draft"],
        ["updated", null, null],
        ["status_changed", "draft", "incomplete"],
        ["updated", null, null],
        ["status_changed", "incomplete", "ready"],
        ["updated", null, null],
        ["status_changed", "ready", "incomplete"],
      ]);
      expect(events[1].details).toEqual({ fields: ["vehicle.model"] });
      expect(events.every((e: { sourceCategory: string }) => e.sourceCategory === "simdouane")).toBe(true);
    });

    it("parcours B (déjà arrivé) : date d'arrivée réelle, formalités déjà faites, blocages", async () => {
      const today = new Date(Date.now() + 3600000).toISOString().slice(0, 10);
      const c = await create("alice", {
        arrivalSituation: "arrived",
        vehicle: { make: "Hyundai", model: "Tucson", year: 2017 },
        originCountry: "Canada",
        arrivalDate: today,
        formalitiesDone: "Déclaration anticipée faite par le transitaire (fictif).",
        knownBlockers: "Facture finale manquante (fictif).",
      });
      const checked = await (await call("alice", "POST", `/cases/${c.id}/check`)).json();
      expect(checked).toMatchObject({ status: "ready", arrivalDate: today, knownBlockers: "Facture finale manquante (fictif)." });
      // Switching back to "not arrived" while keeping the real arrival date is refused.
      const bad = await call("alice", "PATCH", `/cases/${c.id}`, { arrivalSituation: "not_arrived" });
      expect(bad.status).toBe(400);
      expect((await bad.json()).fieldErrors.arrivalDate).toMatch(/déjà arrivé/);
    });

    it("l'historique ne peut pas être modifié", async () => {
      await create("alice");
      await expect(query(`UPDATE case_events SET type = 'x'`)).rejects.toThrow(/ajout seul/);
      await expect(query(`DELETE FROM case_events`)).rejects.toThrow(/ajout seul/);
    });
  });

  describe("archivage", () => {
    it("masque le dossier sans l'effacer, et le journalise", async () => {
      const c = await create("alice", full);
      expect((await call("alice", "DELETE", `/cases/${c.id}`)).status).toBe(204);
      expect((await call("alice", "GET", `/cases/${c.id}`)).status).toBe(404);
      expect((await call("alice", "PATCH", `/cases/${c.id}`, { notes: "x" })).status).toBe(404);
      expect((await call("alice", "DELETE", `/cases/${c.id}`)).status).toBe(404);
      expect(await (await call("alice", "GET", "/cases")).json()).toEqual([]);
      const [row] = await query(`SELECT deleted_at IS NOT NULL AS archived, notes FROM clearance_cases WHERE id = $1`, [c.id]);
      expect(row).toEqual({ archived: true, notes: full.notes });
      expect(await query(`SELECT action FROM audit_logs ORDER BY created_at`)).toEqual([{ action: "case.created" }, { action: "case.archived" }]);
    });
  });
});
