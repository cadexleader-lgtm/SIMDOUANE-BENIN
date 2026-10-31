import { AlertTriangle, Info } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  CURRENCY_CODES,
  CURRENCY_NAMES,
  convert,
  formatRate,
  formatRateDate,
  rateFor,
  ratesAreOld,
  type CurrencyCode,
  type EffectiveRates,
} from "@/lib/currency";
import { T } from "@/lib/translations";
import { formatFCFA } from "@/lib/utils";

type Rates = EffectiveRates & { isLoading: boolean };
type Lang = "fr" | "en";

function isAvailable(code: CurrencyCode, rates: Rates) {
  return code === "XOF" || rates.isLoading || rateFor(rates.snapshot, code) !== null;
}

/** Currency picker; currencies without a known rate are shown but cannot be chosen. */
export function CurrencySelect({ value, onChange, rates, lang, testId = "select-devise", disabled }: {
  value: CurrencyCode;
  onChange: (code: CurrencyCode) => void;
  rates: Rates;
  lang: Lang;
  testId?: string;
  disabled?: boolean;
}) {
  const t = T[lang].sim;
  return (
    <Select value={value} onValueChange={(v) => onChange(v as CurrencyCode)} disabled={disabled}>
      <SelectTrigger className="w-28 shrink-0" aria-label={t.currency} data-testid={testId}>
        {/* Only the code in the closed field; the full name is in the list. */}
        <SelectValue>{value === "XOF" ? "FCFA" : value}</SelectValue>
      </SelectTrigger>
      <SelectContent>
        {CURRENCY_CODES.map((code) => {
          const available = isAvailable(code, rates);
          return (
            <SelectItem key={code} value={code} disabled={!available} data-testid={`devise-${code}`}>
              <span className="font-semibold">{code === "XOF" ? "FCFA" : code}</span>
              <span className="text-muted-foreground"> — {CURRENCY_NAMES[code][lang]}</span>
              {!available && <span className="text-muted-foreground"> ({t.unavailableTag})</span>}
            </SelectItem>
          );
        })}
      </SelectContent>
    </Select>
  );
}

/** Live FCFA equivalent, rate, source and date, plus the service state when relevant. */
export function ConversionNote({ amount, currency, rates, lang, idPrefix = "conversion" }: {
  amount: number;
  currency: CurrencyCode;
  rates: Rates;
  lang: Lang;
  /** Test ids: `${idPrefix}-note`, `${idPrefix}-xof`, `${idPrefix}-rate`. */
  idPrefix?: string;
}) {
  if (currency === "XOF") return null;
  const t = T[lang].sim;
  const rate = rateFor(rates.snapshot, currency);
  const usesMarketRate = currency !== "EUR";

  const banners: string[] = [];
  if (!rates.isLoading && usesMarketRate) {
    if (rates.origin === "local-cache" && rates.snapshot.fetchedAt) {
      banners.push(t.ratesStale(formatRateDate(rates.snapshot.fetchedAt.slice(0, 10))));
    }
    if (rates.origin === "fixed-only") banners.push(t.ratesFixedOnly);
    if (rate && ratesAreOld(rates.snapshot)) banners.push(t.ratesOld);
  }

  if (!rate) {
    return (
      <p className="text-xs text-amber-700 flex items-start gap-1.5" data-testid={`${idPrefix}-note`}>
        <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
        {rates.isLoading ? t.ratesLoading : t.rateUnavailable(currency)}
      </p>
    );
  }

  const converted = convert(amount, currency, rates);
  const source = rate.method === "fixed_parity" ? t.sourceFixed : t.sourceEcb(formatRateDate(rate.rateDate ?? ""));

  return (
    <div className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 space-y-1" data-testid={`${idPrefix}-note`}>
      {converted && (
        <p className="text-sm font-bold text-blue-900" data-testid={`${idPrefix}-xof`}>≈ {formatFCFA(converted.valeurXof)}</p>
      )}
      <p className="text-xs text-blue-800" data-testid={`${idPrefix}-rate`}>
        {t.rateLine(currency, formatRate(rate.xofPerUnit, lang))} · {source}
      </p>
      <p className="text-[11px] text-blue-700 flex items-start gap-1.5">
        <Info className="h-3 w-3 shrink-0 mt-0.5" />
        {t.indicativeRate}
      </p>
      {banners.map((b) => (
        <p key={b} className="text-[11px] font-medium text-amber-700 flex items-start gap-1.5" data-testid="rates-banner">
          <AlertTriangle className="h-3 w-3 shrink-0 mt-0.5" />
          {b}
        </p>
      ))}
    </div>
  );
}
