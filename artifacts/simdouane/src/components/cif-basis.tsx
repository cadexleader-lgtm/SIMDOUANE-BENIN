import { AlertTriangle } from "lucide-react";
import type { CifDetermination, CifComponent, OptionalPart } from "@/lib/cif-input";
import { formatRate, formatRateDate, type CurrencyConversion } from "@/lib/currency";
import { T } from "@/lib/translations";
import { formatFCFA } from "@/lib/utils";

type Lang = "fr" | "en";

function rateText(c: CurrencyConversion, lang: Lang) {
  const t = T[lang].results;
  const source = c.method === "fixed_parity" ? t.rateFixedShort : t.rateEcbShort(formatRateDate(c.rateDate ?? ""));
  return `1 ${c.currency} = ${formatRate(c.xofPerUnit, lang)} FCFA (${source}${c.status === "stale" ? `, ${t.rateStaleShort}` : ""})`;
}

function amountText(c: CifComponent, lang: Lang) {
  if (c.currency === "XOF") return formatFCFA(c.amount);
  const n = new Intl.NumberFormat(lang === "fr" ? "fr-FR" : "en-US").format(c.amount);
  return `${n} ${c.currency} = ${formatFCFA(c.valeurXof)}`;
}

/** Results page: what the base of the simulation was, and its limits. */
export function CifBasis({ basis, lang, paidKeys = [] }: { basis: CifDetermination; lang: Lang; paidKeys?: string[] }) {
  const t = T[lang].results;
  const rows: Array<{ key: string; label: string; value: string; rate?: string }> = basis.components.map((c) => ({
    key: c.kind,
    label: t.componentNames[c.kind],
    value: amountText(c, lang),
    rate: c.conversion ? rateText(c.conversion, lang) : undefined,
  }));
  const paid = new Set(paidKeys);
  for (const part of basis.missing as OptionalPart[]) {
    rows.push({ key: part, label: t.componentNames[part], value: t.notProvided });
  }

  return (
    <div className="rounded-lg border bg-muted/30 px-4 py-3 space-y-2 text-sm" data-testid="cif-basis">
      <p className="font-semibold">
        {t.basisTitle} : <span className="font-normal text-muted-foreground">{t.basisModes[basis.mode]}</span>
      </p>
      <ul className="space-y-1">
        {rows.map((r) => (
          <li key={r.key} className="flex flex-col sm:flex-row sm:justify-between gap-0.5" data-testid={`basis-${r.key}`}>
            <span className="text-muted-foreground">
              {r.label}
              {paid.has(r.key) && (
                <span className="ml-2 rounded px-1.5 py-0.5 text-[10px] font-semibold bg-green-600 text-white">{t.paidTag}</span>
              )}
            </span>
            <span className="text-right">
              <span className={r.value === t.notProvided ? "text-amber-700 font-medium" : "font-medium"}>{r.value}</span>
              {r.rate && <span className="block text-[11px] text-muted-foreground">{r.rate}</span>}
            </span>
          </li>
        ))}
      </ul>
      {basis.mode === "price" && basis.missing.length > 0 && (
        <p className="text-xs font-medium text-amber-700 flex items-start gap-1.5" data-testid="basis-warning">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" /> {t.cifPartialResult}
        </p>
      )}
      {basis.mode === "total" && (
        <p className="text-xs font-medium text-amber-700 flex items-start gap-1.5" data-testid="basis-warning">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" /> {t.totalWarningResult}
        </p>
      )}
    </div>
  );
}
