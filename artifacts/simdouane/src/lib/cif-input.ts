/**
 * How the user knows the value of the vehicle (phase S2):
 *  - "price": purchase price only; freight and insurance are added when the
 *    user knows them. An unknown amount is reported as missing, never guessed:
 *    the base is then an incomplete CIF (under-estimated duties).
 *  - "cif": CIF value already known; nothing is added.
 *  - "total": overall amount paid, composition uncertain; used as is, with a
 *    warning, and no invented breakdown.
 * Each amount has its own currency (currency.ts). The engine receives the
 * resulting FCFA value; the customs authority may retain another value.
 */
import { convert, type CurrencyCode, type CurrencyConversion, type EffectiveRates } from "./currency";

export const CIF_MODES = ["price", "cif", "total"] as const;
export type CifMode = (typeof CIF_MODES)[number];

export type ComponentKind = "price" | "freight" | "insurance" | "cif" | "total";
export type OptionalPart = "freight" | "insurance";

export interface AmountInput {
  /** Raw text of the field ("" when empty). */
  amount: string | undefined;
  currency: CurrencyCode;
}

export interface CifComponent {
  kind: ComponentKind;
  amount: number;
  currency: CurrencyCode;
  valeurXof: number;
  /** Rate used, absent for FCFA or a zero amount. */
  conversion: CurrencyConversion | null;
}

/** What the simulation was based on; stored with the simulation. */
export interface CifDetermination {
  mode: CifMode;
  valeurXof: number;
  components: CifComponent[];
  /** Parts of the CIF the user did not know (mode "price" only). */
  missing: OptionalPart[];
}

export type FieldError = "required" | "invalid" | "rate_unavailable";

export interface CifInputs {
  mode: CifMode;
  price: AmountInput;
  freight: AmountInput;
  freightUnknown: boolean;
  insurance: AmountInput;
  insuranceUnknown: boolean;
  /** Single amount used by modes "cif" and "total". */
  single: AmountInput;
}

export type CifResult =
  | { ok: true; value: CifDetermination }
  | { ok: false; errors: Partial<Record<"price" | "freight" | "insurance" | "single", FieldError>> };

/** "" or spaces → undefined; "12.5" → 12.5; anything else → NaN. */
export function parseAmount(raw: string | undefined): number | undefined {
  if (raw === undefined) return undefined;
  const text = String(raw).trim().replace(",", ".");
  if (text === "") return undefined;
  const n = Number(text);
  return Number.isFinite(n) ? n : Number.NaN;
}

function component(
  kind: ComponentKind,
  input: AmountInput,
  rates: EffectiveRates,
  { allowZero }: { allowZero: boolean },
): CifComponent | FieldError {
  const amount = parseAmount(input.amount);
  if (amount === undefined) return "required";
  if (Number.isNaN(amount) || amount < 0 || (!allowZero && amount === 0)) return "invalid";
  if (amount === 0) return { kind, amount: 0, currency: input.currency, valeurXof: 0, conversion: null };
  const converted = convert(amount, input.currency, rates);
  if (!converted) return "rate_unavailable";
  return { kind, amount, currency: input.currency, valeurXof: converted.valeurXof, conversion: converted.conversion };
}

/** Builds the FCFA base of the simulation, or the field errors to show. */
export function determineCif(inputs: CifInputs, rates: EffectiveRates): CifResult {
  if (inputs.mode === "cif" || inputs.mode === "total") {
    const c = component(inputs.mode, inputs.single, rates, { allowZero: false });
    if (typeof c === "string") return { ok: false, errors: { single: c } };
    return { ok: true, value: { mode: inputs.mode, valeurXof: c.valeurXof, components: [c], missing: [] } };
  }

  const errors: Partial<Record<"price" | "freight" | "insurance", FieldError>> = {};
  const components: CifComponent[] = [];
  const missing: OptionalPart[] = [];

  const price = component("price", inputs.price, rates, { allowZero: false });
  if (typeof price === "string") errors.price = price;
  else components.push(price);

  // Freight and insurance: an amount (0 accepted, e.g. no insurance taken) or
  // explicitly "not known yet". An empty field is never read as zero.
  for (const part of ["freight", "insurance"] as const) {
    if (part === "freight" ? inputs.freightUnknown : inputs.insuranceUnknown) {
      missing.push(part);
      continue;
    }
    const c = component(part, inputs[part], rates, { allowZero: true });
    if (typeof c === "string") errors[part] = c;
    else components.push(c);
  }

  if (Object.keys(errors).length > 0) return { ok: false, errors };
  const valeurXof = components.reduce((sum, c) => sum + c.valeurXof, 0);
  return { ok: true, value: { mode: "price", valeurXof, components, missing } };
}
