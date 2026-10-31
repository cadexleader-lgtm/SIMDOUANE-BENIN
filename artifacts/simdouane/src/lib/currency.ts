/**
 * Currency field of the simulator: indicative conversion to FCFA.
 *
 * Rates come from GET /api/exchange-rates (EUR = fixed parity 655.957;
 * other currencies = ECB reference rate converted through that parity).
 * The last good server answer is kept in localStorage: if the service is
 * unreachable, those rates are used with their date ("stale"); without them
 * only FCFA and EUR remain available. No rate is ever invented.
 * The conversion used is stored with each simulation, so an old simulation
 * keeps its own rate when rates move.
 */

export const CURRENCY_CODES = ["XOF", "EUR", "USD", "CAD", "GBP", "JPY", "CNY", "KRW", "CHF"] as const;
export type CurrencyCode = (typeof CURRENCY_CODES)[number];
export type ForeignCurrency = Exclude<CurrencyCode, "XOF">;

export const EUR_XOF_PARITY = 655.957;
const OLD_RATE_DAYS = 7;
const CACHE_KEY = "simdouane_rates_cache";

export const CURRENCY_NAMES: Record<CurrencyCode, { fr: string; en: string }> = {
  XOF: { fr: "Franc CFA (FCFA)", en: "CFA franc (FCFA)" },
  EUR: { fr: "Euro", en: "Euro" },
  USD: { fr: "Dollar américain", en: "US dollar" },
  CAD: { fr: "Dollar canadien", en: "Canadian dollar" },
  GBP: { fr: "Livre sterling", en: "Pound sterling" },
  JPY: { fr: "Yen japonais", en: "Japanese yen" },
  CNY: { fr: "Yuan chinois", en: "Chinese yuan" },
  KRW: { fr: "Won sud-coréen", en: "South Korean won" },
  CHF: { fr: "Franc suisse", en: "Swiss franc" },
};

export type RateMethod = "fixed_parity" | "ecb_cross";

export interface RateEntry {
  currency: ForeignCurrency;
  xofPerUnit: number;
  method: RateMethod;
  rateDate: string | null;
}

export interface RatesSnapshot {
  status: "ok" | "stale" | "degraded";
  rates: RateEntry[];
  unavailable: string[];
  fetchedAt: string | null;
}

/** Where the rates on screen come from. */
export type RatesOrigin = "server" | "local-cache" | "fixed-only";

export interface EffectiveRates {
  snapshot: RatesSnapshot;
  origin: RatesOrigin;
}

/** Conversion kept with a simulation (history, results page). */
export interface CurrencyConversion {
  currency: ForeignCurrency;
  amount: number;
  xofPerUnit: number;
  method: RateMethod;
  rateDate: string | null;
  /** When the rates were obtained from the server (ISO), null if only the fixed parity was used. */
  fetchedAt: string | null;
  /** "stale" when the rate came from a previous answer because the service was unavailable. */
  status: "ok" | "stale";
}

export const FIXED_EUR: RateEntry = { currency: "EUR", xofPerUnit: EUR_XOF_PARITY, method: "fixed_parity", rateDate: null };

const FIXED_ONLY: RatesSnapshot = {
  status: "degraded",
  rates: [FIXED_EUR],
  unavailable: ["USD", "CAD", "GBP", "JPY", "CNY", "KRW", "CHF"],
  fetchedAt: null,
};

/** FCFA has no subunit: amounts are rounded to the franc. */
export function toXof(amount: number, xofPerUnit: number): number {
  return Math.round(amount * xofPerUnit);
}

export function rateFor(snapshot: RatesSnapshot, currency: ForeignCurrency): RateEntry | null {
  return snapshot.rates.find((r) => r.currency === currency) ?? null;
}

/**
 * Chooses the rates to use. A fresh server answer wins; when the server has
 * nothing better than the fixed parity (or cannot be reached), the last good
 * answer kept in the browser is used, marked "stale".
 */
export function effectiveRates(server: RatesSnapshot | undefined, cached: RatesSnapshot | null): EffectiveRates {
  if (server && server.status !== "degraded") return { snapshot: server, origin: "server" };
  if (cached && cached.rates.length > 0) return { snapshot: { ...cached, status: "stale" }, origin: "local-cache" };
  return { snapshot: FIXED_ONLY, origin: "fixed-only" };
}

/**
 * Converts an amount. FCFA returns the amount itself; a currency without a
 * known rate returns null (the form must then refuse it).
 */
export function convert(
  amount: number,
  currency: CurrencyCode,
  rates: EffectiveRates,
): { valeurXof: number; conversion: CurrencyConversion | null } | null {
  if (!Number.isFinite(amount) || amount <= 0) return null;
  if (currency === "XOF") return { valeurXof: Math.round(amount), conversion: null };
  const rate = rateFor(rates.snapshot, currency);
  if (!rate) return null;
  return {
    valeurXof: toXof(amount, rate.xofPerUnit),
    conversion: {
      currency,
      amount,
      xofPerUnit: rate.xofPerUnit,
      method: rate.method,
      rateDate: rate.rateDate,
      fetchedAt: rate.method === "fixed_parity" ? null : rates.snapshot.fetchedAt,
      status: rate.method === "fixed_parity" || rates.snapshot.status === "ok" ? "ok" : "stale",
    },
  };
}

/** Age in days of a rate published on `rateDate` (YYYY-MM-DD). */
export function rateAgeDays(rateDate: string, now: Date = new Date()): number {
  const [y, m, d] = rateDate.split("-").map(Number);
  const published = Date.UTC(y, m - 1, d);
  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  return Math.round((today - published) / 86_400_000);
}

/** True when the market rates on screen are more than a week old. */
export function ratesAreOld(snapshot: RatesSnapshot, now: Date = new Date()): boolean {
  const dates = snapshot.rates.map((r) => r.rateDate).filter((d): d is string => !!d);
  if (dates.length === 0) return false;
  const newest = dates.sort()[dates.length - 1];
  return rateAgeDays(newest, now) > OLD_RATE_DAYS;
}

/** "2026-10-30" → "30/10/2026" (no time-zone conversion). */
export function formatRateDate(rateDate: string): string {
  const [y, m, d] = rateDate.split("-");
  return `${d}/${m}/${y}`;
}

/** Rate for display: 655,957 · 563,054 · 3,71647 · 0,397550 */
export function formatRate(xofPerUnit: number, lang: "fr" | "en"): string {
  return new Intl.NumberFormat(lang === "fr" ? "fr-FR" : "en-US", { maximumSignificantDigits: 6 }).format(xofPerUnit);
}

function isSnapshot(value: unknown): value is RatesSnapshot {
  const v = value as RatesSnapshot | null;
  return !!v && Array.isArray(v.rates) && v.rates.every(
    (r) => typeof r?.currency === "string" && typeof r.xofPerUnit === "number" && r.xofPerUnit > 0,
  );
}

export function loadCachedRates(): RatesSnapshot | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    return isSnapshot(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

/** Only a fresh server answer is kept. */
export function saveCachedRates(snapshot: RatesSnapshot) {
  if (snapshot.status !== "ok") return;
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(snapshot));
  } catch {
    /* storage full or disabled: the fixed EUR parity still works */
  }
}
