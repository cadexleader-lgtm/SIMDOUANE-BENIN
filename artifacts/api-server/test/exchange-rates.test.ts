/**
 * Indicative FCFA rates (src/lib/exchangeRates.ts): ECB file parsing, cross
 * rates through the fixed parity, cache, outage behaviour, public route.
 * The ECB values below are a test fixture, not real published rates.
 */
import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import {
  EUR_XOF_PARITY,
  getExchangeRates,
  parseEcbDaily,
  resetExchangeRatesCache,
  xofRatesFromEcb,
} from "../src/lib/exchangeRates";
import { startTestApp, TEST_DB } from "./harness";

vi.mock("../src/lib/auth/identity", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../src/lib/auth/identity")>()),
  ...(await import("./authMock")),
}));

const ECB_FIXTURE = `<?xml version="1.0" encoding="UTF-8"?>
<gesmes:Envelope xmlns:gesmes="http://www.gesmes.org/xml/2002-08-01" xmlns="http://www.ecb.int/vocabulary/2002-08-01/eurofxref">
  <gesmes:subject>Reference rates</gesmes:subject>
  <gesmes:Sender><gesmes:name>European Central Bank</gesmes:name></gesmes:Sender>
  <Cube>
    <Cube time='2026-10-30'>
      <Cube currency='USD' rate='1.1650'/>
      <Cube currency='JPY' rate='176.50'/>
      <Cube currency='GBP' rate='0.86900'/>
      <Cube currency='CHF' rate='0.9350'/>
      <Cube currency='CAD' rate='1.6200'/>
      <Cube currency='CNY' rate='8.3000'/>
      <Cube currency='KRW' rate='1650.00'/>
      <Cube currency='SEK' rate='11.000'/>
    </Cube>
  </Cube>
</gesmes:Envelope>`;

const okFetcher = (xml: string) => vi.fn(async () => ({ ok: true, status: 200, text: async () => xml }));
const failingFetcher = () => vi.fn(async () => { throw new Error("network down"); });

describe("taux de change indicatifs", () => {
  beforeEach(() => resetExchangeRatesCache());

  it("lit le fichier quotidien de la BCE (date et taux par euro)", () => {
    const ecb = parseEcbDaily(ECB_FIXTURE);
    expect(ecb.date).toBe("2026-10-30");
    expect(ecb.perEuro.USD).toBe(1.165);
    expect(ecb.perEuro.KRW).toBe(1650);
  });

  it("refuse un fichier sans date ou sans taux", () => {
    expect(() => parseEcbDaily("<Cube><Cube currency='USD' rate='1.1'/></Cube>")).toThrow();
    expect(() => parseEcbDaily("<Cube time='2026-10-30'></Cube>")).toThrow();
  });

  it("euro = parité fixe 655,957 ; autres devises = taux BCE via la parité, avec leur date", () => {
    const { rates, unavailable } = xofRatesFromEcb(parseEcbDaily(ECB_FIXTURE));
    const by = Object.fromEntries(rates.map((r) => [r.currency, r]));
    expect(by.EUR).toEqual({ currency: "EUR", xofPerUnit: 655.957, method: "fixed_parity", rateDate: null });
    expect(by.USD.xofPerUnit).toBeCloseTo(EUR_XOF_PARITY / 1.165, 5);
    expect(by.USD).toMatchObject({ method: "ecb_cross", rateDate: "2026-10-30" });
    expect(by.JPY.xofPerUnit).toBeCloseTo(655.957 / 176.5, 5);
    expect(by.KRW.xofPerUnit).toBeCloseTo(655.957 / 1650, 5);
    expect(Object.keys(by).sort()).toEqual(["CAD", "CHF", "CNY", "EUR", "GBP", "JPY", "KRW", "USD"]);
    expect(unavailable).toEqual([]);
    expect(by.SEK).toBeUndefined(); // devise non demandée : ignorée
  });

  it("une devise absente du fichier est signalée indisponible, jamais devinée", () => {
    const { rates, unavailable } = xofRatesFromEcb(parseEcbDaily(ECB_FIXTURE.replace("<Cube currency='KRW' rate='1650.00'/>", "")));
    expect(unavailable).toEqual(["KRW"]);
    expect(rates.find((r) => r.currency === "KRW")).toBeUndefined();
  });

  it("source disponible : statut ok, puis réponses servies depuis le cache", async () => {
    const fetcher = okFetcher(ECB_FIXTURE);
    const first = await getExchangeRates({ fetcher, now: 1_000_000 });
    expect(first.status).toBe("ok");
    expect(first.fetchedAt).toBe(new Date(1_000_000).toISOString());
    const second = await getExchangeRates({ fetcher, now: 1_000_000 + 60_000 });
    expect(second.status).toBe("ok");
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it("source en panne sans taux connus : seul l'euro (parité fixe) reste disponible", async () => {
    const r = await getExchangeRates({ fetcher: failingFetcher(), now: 1_000_000 });
    expect(r.status).toBe("degraded");
    expect(r.rates).toEqual([{ currency: "EUR", xofPerUnit: 655.957, method: "fixed_parity", rateDate: null }]);
    expect(r.unavailable).toEqual(["USD", "CAD", "GBP", "JPY", "CNY", "KRW", "CHF"]);
    expect(r.fetchedAt).toBeNull();
  });

  it("source en panne après un succès : derniers taux connus, marqués « stale », avec leur date", async () => {
    await getExchangeRates({ fetcher: okFetcher(ECB_FIXTURE), now: 1_000_000 });
    const sevenHoursLater = 1_000_000 + 7 * 3600_000;
    const r = await getExchangeRates({ fetcher: failingFetcher(), now: sevenHoursLater });
    expect(r.status).toBe("stale");
    expect(r.fetchedAt).toBe(new Date(1_000_000).toISOString());
    expect(r.rates.find((x) => x.currency === "USD")?.rateDate).toBe("2026-10-30");
  });

  it("une réponse HTTP en erreur ou un fichier illisible comptent comme une panne", async () => {
    const bad = vi.fn(async () => ({ ok: false, status: 503, text: async () => "" }));
    expect((await getExchangeRates({ fetcher: bad, now: 1 })).status).toBe("degraded");
    resetExchangeRatesCache();
    expect((await getExchangeRates({ fetcher: okFetcher("<html>maintenance</html>"), now: 1 })).status).toBe("degraded");
  });

  it("après une panne, la source n'est pas réinterrogée pendant 10 minutes", async () => {
    const failing = failingFetcher();
    await getExchangeRates({ fetcher: failing, now: 1_000_000 });
    await getExchangeRates({ fetcher: failing, now: 1_000_000 + 60_000 });
    expect(failing).toHaveBeenCalledTimes(1);
    const ok = okFetcher(ECB_FIXTURE);
    expect((await getExchangeRates({ fetcher: ok, now: 1_000_000 + 11 * 60_000 })).status).toBe("ok");
  });
});

describe.skipIf(!TEST_DB)("GET /api/exchange-rates", () => {
  let app: Awaited<ReturnType<typeof startTestApp>>;
  let source: Server;

  beforeAll(async () => {
    source = createServer((_req, res) => {
      res.writeHead(200, { "content-type": "text/xml" });
      res.end(ECB_FIXTURE);
    }).listen(0);
    process.env.EXCHANGE_RATES_URL = `http://127.0.0.1:${(source.address() as AddressInfo).port}/eurofxref-daily.xml`;
    app = await startTestApp();
  });

  afterAll(async () => {
    delete process.env.EXCHANGE_RATES_URL;
    source.close();
    await app.close();
  });

  beforeEach(() => resetExchangeRatesCache());

  it("est public (sans compte) et renvoie les 8 devises avec méthode et date", async () => {
    const res = await app.call(null, "GET", "/exchange-rates");
    expect(res.status).toBe(200);
    expect(res.headers.get("cache-control")).toBe("public, max-age=900");
    const body = await res.json();
    expect(body.status).toBe("ok");
    expect(body.rates).toHaveLength(8);
    expect(body.rates[0]).toEqual({ currency: "EUR", xofPerUnit: 655.957, method: "fixed_parity", rateDate: null });
    expect(body.rates.find((r: { currency: string }) => r.currency === "CNY")).toMatchObject({ method: "ecb_cross", rateDate: "2026-10-30" });
  });
});
