/**
 * Indicative exchange rates to FCFA (XOF) for the simulator.
 *
 * - EUR: fixed parity 1 EUR = 655.957 XOF (BCEAO), no outside service.
 * - Other currencies: the ECB euro reference rates (published on working
 *   days around 16:00 CET), converted through the fixed parity:
 *   XOF per unit = 655.957 / (units per euro). This is an alternative
 *   method, labelled as such: the BCEAO publishes no machine-readable feed,
 *   and its web page could not be checked from the development environment.
 *
 * These are never presented as the rate applied by customs. A currency that
 * the source does not provide is reported as unavailable, never guessed.
 * Rates are cached in memory; if the source fails, the last known rates are
 * served as "stale" with their date, and EUR stays available in any case.
 */
import { logger } from "./logger";

export const EUR_XOF_PARITY = 655.957;
export const FOREIGN_CURRENCIES = ["EUR", "USD", "CAD", "GBP", "JPY", "CNY", "KRW", "CHF"] as const;
export type ForeignCurrency = (typeof FOREIGN_CURRENCIES)[number];

export const ECB_DAILY_URL = "https://www.ecb.europa.eu/stats/eurofxref/eurofxref-daily.xml";
const CACHE_TTL_MS = 6 * 60 * 60 * 1000;
const FETCH_TIMEOUT_MS = 5000;

export type RateMethod = "fixed_parity" | "ecb_cross";

export interface XofRate {
  currency: ForeignCurrency;
  /** FCFA for one unit of the currency. */
  xofPerUnit: number;
  method: RateMethod;
  /** Publication date of the source rate (YYYY-MM-DD); null for the fixed parity. */
  rateDate: string | null;
}

export interface ExchangeRates {
  /** "ok": fresh source; "stale": source failed, last known rates; "degraded": only the fixed EUR parity. */
  status: "ok" | "stale" | "degraded";
  rates: XofRate[];
  unavailable: ForeignCurrency[];
  /** When the source was last read successfully (ISO), null if never. */
  fetchedAt: string | null;
}

export interface EcbDaily {
  date: string;
  /** Units of currency per euro. */
  perEuro: Record<string, number>;
}

/** Parses the ECB daily XML (gesmes envelope with nested Cube elements). */
export function parseEcbDaily(xml: string): EcbDaily {
  const dateMatch = /<Cube\s+time=["'](\d{4}-\d{2}-\d{2})["']/.exec(xml);
  if (!dateMatch) throw new Error("ECB file without a date");
  const perEuro: Record<string, number> = {};
  const re = /<Cube\s+currency=["']([A-Z]{3})["']\s+rate=["']([0-9.]+)["']\s*\/?>/g;
  for (let m = re.exec(xml); m; m = re.exec(xml)) {
    const rate = Number(m[2]);
    if (Number.isFinite(rate) && rate > 0) perEuro[m[1]] = rate;
  }
  if (Object.keys(perEuro).length === 0) throw new Error("ECB file without rates");
  return { date: dateMatch[1], perEuro };
}

const round6 = (n: number) => Math.round(n * 1e6) / 1e6;

const EUR_RATE: XofRate = { currency: "EUR", xofPerUnit: EUR_XOF_PARITY, method: "fixed_parity", rateDate: null };

/** Builds the XOF rates from an ECB file; currencies missing from the file are reported, not guessed. */
export function xofRatesFromEcb(ecb: EcbDaily): { rates: XofRate[]; unavailable: ForeignCurrency[] } {
  const rates: XofRate[] = [EUR_RATE];
  const unavailable: ForeignCurrency[] = [];
  for (const currency of FOREIGN_CURRENCIES) {
    if (currency === "EUR") continue;
    const perEuro = ecb.perEuro[currency];
    if (perEuro) {
      rates.push({ currency, xofPerUnit: round6(EUR_XOF_PARITY / perEuro), method: "ecb_cross", rateDate: ecb.date });
    } else {
      unavailable.push(currency);
    }
  }
  return { rates, unavailable };
}

type Fetcher = (url: string, init?: { signal?: AbortSignal }) => Promise<{ ok: boolean; status: number; text(): Promise<string> }>;

/** After a failure, wait before asking the source again (avoids a 5 s wait on every request). */
const RETRY_AFTER_FAILURE_MS = 10 * 60 * 1000;

let cache: { rates: XofRate[]; unavailable: ForeignCurrency[]; fetchedAt: number } | null = null;
let lastFailureAt: number | null = null;

/** Test helper. */
export function resetExchangeRatesCache() {
  cache = null;
  lastFailureAt = null;
}

function fallback(): ExchangeRates {
  if (cache) {
    return { status: "stale", rates: cache.rates, unavailable: cache.unavailable, fetchedAt: new Date(cache.fetchedAt).toISOString() };
  }
  return {
    status: "degraded",
    rates: [EUR_RATE],
    unavailable: FOREIGN_CURRENCIES.filter((c) => c !== "EUR"),
    fetchedAt: null,
  };
}

async function fetchEcb(fetcher: Fetcher): Promise<EcbDaily> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetcher(process.env.EXCHANGE_RATES_URL || ECB_DAILY_URL, { signal: controller.signal });
    if (!res.ok) throw new Error(`ECB answered ${res.status}`);
    return parseEcbDaily(await res.text());
  } finally {
    clearTimeout(timer);
  }
}

export async function getExchangeRates(options: { fetcher?: Fetcher; now?: number } = {}): Promise<ExchangeRates> {
  const now = options.now ?? Date.now();
  if (cache && now - cache.fetchedAt < CACHE_TTL_MS) {
    return { status: "ok", rates: cache.rates, unavailable: cache.unavailable, fetchedAt: new Date(cache.fetchedAt).toISOString() };
  }
  if (lastFailureAt !== null && now - lastFailureAt < RETRY_AFTER_FAILURE_MS) return fallback();
  try {
    const ecb = await fetchEcb(options.fetcher ?? (fetch as unknown as Fetcher));
    const { rates, unavailable } = xofRatesFromEcb(ecb);
    cache = { rates, unavailable, fetchedAt: now };
    lastFailureAt = null;
    return { status: "ok", rates, unavailable, fetchedAt: new Date(now).toISOString() };
  } catch (err) {
    lastFailureAt = now;
    logger.warn({ err: err instanceof Error ? err.message : String(err) }, "exchange rates source unavailable");
    return fallback();
  }
}
