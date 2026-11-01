/**
 * POST /api/simulations against a real PostgreSQL database: the server
 * validates the input, recomputes the totals with @workspace/sim-engine
 * (client totals ignored) and keeps the details of the simulation.
 * Identity provider stubbed as in data-isolation.test.ts.
 *
 *   TEST_DATABASE_URL=postgresql://... pnpm --filter @workspace/api-server test
 *
 * WARNING: the tables of TEST_DATABASE_URL are emptied. Skipped when
 * TEST_DATABASE_URL is not set.
 */
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { calculate, type FormInput } from "@workspace/sim-engine";
import { startTestApp, TEST_DB } from "./harness";

vi.mock("../src/lib/auth/identity", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../src/lib/auth/identity")>()),
  ...(await import("./authMock")),
}));

const vehicle: FormInput = {
  marque: "Toyota",
  modele: "RAV4",
  annee: 2019,
  cylindree: "2000-2500",
  carburant: "Diesel",
  valeurCIF: 8_345_678,
  joursAuPort: 17,
  regime: "Exonération partielle",
};

// Totals a modified client could send to make the import look cheaper.
const forged = { totalDouane: 1, totalPort: 2, totalGeneral: 3 };

const details = {
  schemaVersion: 1,
  valueInput: {
    mode: "price",
    valeurXof: 8_345_678,
    components: [
      {
        kind: "price",
        amount: 11_500,
        currency: "EUR",
        valeurXof: 7_543_506,
        conversion: { currency: "EUR", amount: 11_500, xofPerUnit: 655.957, method: "fixed_parity", rateDate: null, fetchedAt: null, status: "ok" },
      },
      { kind: "freight", amount: 802_172, currency: "XOF", valeurXof: 802_172, conversion: null },
    ],
    missing: ["insurance"],
  },
  situation: "at_port",
  paid: { vehicleParts: { price: true, freight: true }, portPaid: 180_000 },
};

describe.skipIf(!TEST_DB)("simulations enregistrées : contrôle et recalcul côté serveur", () => {
  let app: Awaited<ReturnType<typeof startTestApp>>;
  const call = (...args: Parameters<typeof app.call>) => app.call(...args);
  const storedRows = async () =>
    (await app.pool.query(`SELECT user_id, total_douane, total_port, total_general, details FROM simulations`)).rows;

  beforeAll(async () => {
    app = await startTestApp();
  });

  beforeEach(async () => {
    await app.reset();
  });

  afterAll(async () => {
    await app?.close();
  });

  it("enregistre les totaux recalculés par le serveur, jamais ceux envoyés par le client", async () => {
    for (const regime of ["Droit commun", "Exonération partielle", "Enlèvement direct"] as const) {
      const input = { ...vehicle, regime };
      const expected = calculate(input);
      const res = await call("alice", "POST", "/simulations", { ...input, ...forged });
      expect(res.status).toBe(201);
      const created = await res.json();
      expect(created.totalDouane).toBeCloseTo(expected.totalDouane, 2);
      expect(created.totalPort).toBeCloseTo(expected.totalPort, 2);
      expect(created.totalGeneral).toBeCloseTo(expected.totalGeneral, 2);
      expect(created.totalGeneral).not.toBe(forged.totalGeneral);
    }

    const rows = (await app.pool.query(
      `SELECT regime, total_douane, total_port, total_general FROM simulations ORDER BY regime`,
    )).rows;
    expect(rows).toHaveLength(3);
    for (const row of rows) {
      const expected = calculate({ ...vehicle, regime: row.regime });
      expect(row.total_douane).toBe(expected.totalDouane.toFixed(2));
      expect(row.total_port).toBe(expected.totalPort.toFixed(2));
      expect(row.total_general).toBe(expected.totalGeneral.toFixed(2));
    }

    const list = await (await call("alice", "GET", "/simulations")).json();
    for (const s of list.simulations) {
      expect(s.totalGeneral).toBeCloseTo(calculate({ ...vehicle, regime: s.regime }).totalGeneral, 2);
    }
  });

  it("enregistre le détail, le renvoie à la création et dans la liste, sans propriété inconnue", async () => {
    const expected = calculate(vehicle);
    const res = await call("alice", "POST", "/simulations", {
      ...vehicle,
      totalDouane: expected.totalDouane,
      totalPort: expected.totalPort,
      totalGeneral: expected.totalGeneral,
      details: { ...details, note: "ignorée", valueInput: { ...details.valueInput, guessed: true } },
    });
    expect(res.status).toBe(201);
    const created = await res.json();
    expect(created.details).toEqual(details);

    const list = await (await call("alice", "GET", "/simulations")).json();
    expect(list.simulations).toHaveLength(1);
    expect(list.simulations[0].id).toBe(created.id);
    expect(list.simulations[0].details).toEqual(details);

    expect((await storedRows())[0].details).toEqual(details);
  });

  it("accepte toujours un envoi sans détail (détail null)", async () => {
    const res = await call("alice", "POST", "/simulations", { ...vehicle, ...forged });
    expect(res.status).toBe(201);
    expect((await res.json()).details).toBeNull();
    const list = await (await call("alice", "GET", "/simulations")).json();
    expect(list.simulations[0].details).toBeNull();
  });

  it("refuse les simulations invalides (400), sans rien enregistrer ni consommer le quota", async () => {
    const invalid: Array<[string, Record<string, unknown>]> = [
      ["cylindree", { cylindree: "gt5000" }],
      ["regime", { regime: "Admission temporaire" }],
      ["valeurCIF", { valeurCIF: -1_000_000 }],
      ["valeurCIF", { valeurCIF: 0 }],
      ["valeurCIF", { valeurCIF: 5e12 }],
      ["joursAuPort", { joursAuPort: 4000 }],
      ["annee", { annee: 1850 }],
      ["details", { details: { ...details, padding: "x".repeat(21 * 1024) } }],
      ["details.situation", { details: { ...details, situation: "unknown" } }],
      ["details.valueInput.mode", { details: { ...details, valueInput: { ...details.valueInput, mode: "estimate" } } }],
      ["details.paid.portPaid", { details: { ...details, paid: { vehicleParts: {}, portPaid: -5 } } }],
    ];
    for (const [field, override] of invalid) {
      const res = await call("alice", "POST", "/simulations", { ...vehicle, ...forged, ...override });
      expect(res.status, field).toBe(400);
      const body = await res.json();
      expect(body.error).toBe("INVALID_SIMULATION");
      expect(body.message).toMatch(/^Simulation invalide/);
      expect(body.fields, field).toHaveProperty([field]);
    }
    expect(await storedRows()).toEqual([]);

    // The 3 free simulations of the month are still available.
    for (let i = 0; i < 3; i++) {
      expect((await call("alice", "POST", "/simulations", { ...vehicle, ...forged })).status).toBe(201);
    }
    expect((await call("alice", "POST", "/simulations", { ...vehicle, ...forged })).status).toBe(403);
  });

  it("refuse les appels sans session", async () => {
    expect((await call(null, "POST", "/simulations", { ...vehicle, ...forged, details })).status).toBe(401);
    expect((await call(null, "GET", "/simulations")).status).toBe(401);
    expect(await storedRows()).toEqual([]);
  });

  it("un autre utilisateur ne peut ni lire ni supprimer la simulation et son détail", async () => {
    const res = await call("alice", "POST", "/simulations", { ...vehicle, ...forged, details });
    expect(res.status).toBe(201);
    const { id, userId } = await res.json();

    const bobList = await (await call("bob", "GET", "/simulations")).json();
    expect(bobList).toEqual({ simulations: [], total: 0 });
    expect((await call("bob", "DELETE", `/simulations/${id}`)).status).toBe(404);

    // An owner sent in the body is ignored: the simulation belongs to the caller.
    const bobRes = await call("bob", "POST", "/simulations", { ...vehicle, ...forged, userId, details });
    expect(bobRes.status).toBe(201);
    expect((await bobRes.json()).userId).not.toBe(userId);

    const aliceList = await (await call("alice", "GET", "/simulations")).json();
    expect(aliceList.simulations.map((s: { id: string }) => s.id)).toEqual([id]);
    expect(aliceList.simulations[0].details).toEqual(details);
  });
});
