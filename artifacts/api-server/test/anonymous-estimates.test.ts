/**
 * Free estimates without an account: 2 per browser identifier, the 3rd is
 * refused, the counter never resets by itself.
 */
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { startTestApp, TEST_DB } from "./harness";

const PHONE_A = "11111111-1111-4111-8111-111111111111";
const PHONE_B = "22222222-2222-4222-8222-222222222222";

describe.skipIf(!TEST_DB)("estimations gratuites sans compte", () => {
  let app: Awaited<ReturnType<typeof startTestApp>>;
  const use = (deviceId: unknown) => app.call(null, "POST", "/anonymous-estimates", { deviceId });
  const state = async (deviceId: string) => (await app.call(null, "GET", `/anonymous-estimates/${deviceId}`)).json();

  beforeAll(async () => { app = await startTestApp(); });
  beforeEach(async () => { await app.reset(); });
  afterAll(async () => { await app?.close(); });

  it("deux estimations acceptées, la troisième refusée, et les suivantes aussi", async () => {
    expect(await state(PHONE_A)).toEqual({ used: 0, limit: 2, remaining: 2 });
    const first = await use(PHONE_A);
    expect(first.status).toBe(200);
    expect(await first.json()).toEqual({ used: 1, limit: 2, remaining: 1 });
    expect(await (await use(PHONE_A)).json()).toEqual({ used: 2, limit: 2, remaining: 0 });

    for (let i = 0; i < 3; i++) {
      const refused = await use(PHONE_A);
      expect(refused.status).toBe(403);
      expect(await refused.json()).toMatchObject({ error: "ANONYMOUS_LIMIT", used: 2, limit: 2, remaining: 0 });
    }
    expect(await state(PHONE_A)).toEqual({ used: 2, limit: 2, remaining: 0 });
  });

  it("chaque téléphone a son propre compteur ; majuscules et minuscules = même téléphone", async () => {
    await use(PHONE_A);
    await use(PHONE_A.toUpperCase());
    expect((await use(PHONE_A)).status).toBe(403);
    expect((await use(PHONE_B)).status).toBe(200);
    expect(await state(PHONE_B)).toMatchObject({ used: 1, remaining: 1 });
  });

  it("demandes simultanées : jamais plus de deux acceptées", async () => {
    const results = await Promise.all(Array.from({ length: 8 }, () => use(PHONE_A)));
    expect(results.filter((r) => r.status === 200)).toHaveLength(2);
    expect(results.filter((r) => r.status === 403)).toHaveLength(6);
    const rows = (await app.pool.query(`SELECT estimates_count FROM anonymous_devices`)).rows;
    expect(rows).toEqual([{ estimates_count: 2 }]);
  });

  it("identifiant absent ou mal formé : refusé (400), rien n'est enregistré", async () => {
    for (const bad of [undefined, "", "abc", 42, "' OR 1=1 --", `${PHONE_A}x`]) {
      const res = await use(bad);
      expect(res.status, String(bad)).toBe(400);
      expect((await res.json()).error).toBe("INVALID_DEVICE");
    }
    expect((await app.call(null, "GET", "/anonymous-estimates/pas-un-identifiant")).status).toBe(400);
    expect((await app.pool.query(`SELECT count(*)::int AS n FROM anonymous_devices`)).rows[0].n).toBe(0);
  });
});
