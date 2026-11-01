/**
 * "Hypothèses et avertissements" of a simulation (phases S8 and S9).
 *
 * Shared by the results page and the exported PDF so that both always show
 * exactly the same list, in the same order, with the same texts.
 */
import type { HistoryEntry } from "./history";
import type { CifDetermination } from "./cif-input";
import { formatRate, formatRateDate, type CurrencyConversion } from "./currency";
import { T } from "./translations";

export type ResultLang = "fr" | "en";

export interface Hypothesis {
  /** Stable key (data-testid `hyp-<key>` on the results page). */
  key: string;
  text: string;
  /** Warning that must stand out. */
  strong?: boolean;
}

/** "1 EUR = 655,957 FCFA (parité fixe)" — rate used for one currency. */
export function rateLabel(c: CurrencyConversion, lang: ResultLang): string {
  const t = T[lang].results;
  const source = c.method === "fixed_parity" ? t.rateFixedShort : t.rateEcbShort(formatRateDate(c.rateDate ?? ""));
  return `1 ${c.currency} = ${formatRate(c.xofPerUnit, lang)} FCFA (${source}${c.status === "stale" ? `, ${t.rateStaleShort}` : ""})`;
}

/**
 * Unique exchange rates used by a simulation: those of the value entered, or,
 * for a simulation saved before phase S2 (no `valueInput`), the single
 * conversion it kept.
 */
export function conversionsUsed(
  simulation: Pick<HistoryEntry, "valueInput" | "conversion">,
  value: CifDetermination,
): CurrencyConversion[] {
  const conversions: CurrencyConversion[] = [];
  for (const c of value.components) {
    if (c.conversion && !conversions.some((x) => x.currency === c.conversion!.currency)) conversions.push(c.conversion);
  }
  if (!simulation.valueInput && simulation.conversion) conversions.push(simulation.conversion);
  return conversions;
}

/**
 * The list shown under "Hypothèses et avertissements".
 * `value` is the base of the simulation (`valueInput`, or `legacyValue(...)`
 * for an older simulation).
 */
export function buildHypotheses(simulation: HistoryEntry, value: CifDetermination, lang: ResultLang): Hypothesis[] {
  const t = T[lang].results;
  const { input, result } = simulation;
  const conversions = conversionsUsed(simulation, value);
  const simDate = simulation.date ? formatRateDate(simulation.date.slice(0, 10)) : null;
  return [
    { key: "indicative", text: t.warningText, strong: true },
    ...(simDate ? [{ key: "date", text: t.hypDate(simDate) }] : []),
    { key: "basis", text: `${t.basisTitle} : ${t.basisModes[value.mode]}.` },
    ...(value.mode === "price" && value.missing.length > 0 ? [{ key: "partial", text: t.cifPartialResult, strong: true }] : []),
    ...(value.mode === "total" ? [{ key: "total", text: t.totalWarningResult, strong: true }] : []),
    ...(conversions.length > 0 ? [{ key: "rates", text: `${t.hypRates} : ${conversions.map((c) => rateLabel(c, lang)).join(" ; ")}.` }] : []),
    { key: "storage", text: t.hypStorage(input.joursAuPort) },
    { key: "regime", text: `${t.regime} : ${input.regime}${result.regimeLabel ? ` — ${result.regimeLabel}` : ""}.` },
    { key: "customs", text: t.customsMayDiffer },
    { key: "tags", text: t.budgetNote },
  ];
}
