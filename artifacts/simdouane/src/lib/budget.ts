/**
 * Import situation and budget (phase S6): total budget, what is already paid
 * and the estimated balance, without double counting.
 *
 * - Vehicle lines come from the value entered (cif-input.ts). They are the
 *   user's own figures ("declared"); ticking one as paid counts it as paid in
 *   full. In case "total" the amount is by definition already paid.
 * - Customs duties and port/provider fees are engine estimates. When the
 *   user enters the amount actually paid, that real amount REPLACES the
 *   estimate (never added to it).
 * - A part the user did not know (missing freight or insurance) has no
 *   amount: it is not counted, and the budget is flagged incomplete.
 */
import type { CifDetermination, ComponentKind, OptionalPart } from "./cif-input";

export const SITUATIONS = ["not_arrived", "in_transit", "at_port"] as const;
export type ImportSituation = (typeof SITUATIONS)[number];

export type VehiclePart = "price" | "freight" | "insurance" | "cif";

export interface PaidInput {
  /** Vehicle parts already paid (their declared amount is counted as paid). */
  vehicleParts: Partial<Record<VehiclePart, boolean>>;
  /** Amount actually paid for customs duties and taxes, in FCFA (undefined = not paid yet). */
  customsPaid?: number;
  /** Amount actually paid for port and provider fees, in FCFA (undefined = not paid yet). */
  portPaid?: number;
}

export type LineKey = ComponentKind | "customs" | "port";
/** declared = entered by the user; estimated = calculated by SimDouane; actual = really paid. */
export type LineBasis = "declared" | "estimated" | "actual";

export interface BudgetLine {
  key: LineKey;
  /** null when the amount is not known (missing part). */
  amount: number | null;
  basis: LineBasis;
  paid: number;
  /** For an actual amount that replaced an estimate: the estimate, shown for comparison. */
  estimate?: number;
}

export interface Budget {
  situation: ImportSituation;
  lines: BudgetLine[];
  total: number;
  paid: number;
  remaining: number;
  /** Parts not known: the total is under-estimated. */
  missing: OptionalPart[];
}

export const NOTHING_PAID: PaidInput = { vehicleParts: {} };

export function buildBudget(
  situation: ImportSituation,
  value: CifDetermination,
  estimates: { totalDouane: number; totalPort: number },
  paidInput: PaidInput,
): Budget {
  // Nothing can be paid yet in the "not arrived" estimate, except the total
  // amount of case C, which is by definition already paid.
  const paidSource = situation === "not_arrived" ? NOTHING_PAID : paidInput;
  const lines: BudgetLine[] = [];

  for (const c of value.components) {
    const isPaid = c.kind === "total" || !!paidSource.vehicleParts[c.kind as VehiclePart];
    lines.push({ key: c.kind, amount: c.valeurXof, basis: "declared", paid: isPaid ? c.valeurXof : 0 });
  }
  for (const part of value.missing) {
    lines.push({ key: part, amount: null, basis: "declared", paid: 0 });
  }

  // Amounts are kept exact and rounded only for display, like the rest of the
  // results page: with no real amount, the budget total equals the engine's total.
  const feeLine = (key: "customs" | "port", estimate: number, actual: number | undefined): BudgetLine =>
    actual !== undefined && Number.isFinite(actual) && actual >= 0
      ? { key, amount: actual, basis: "actual", paid: actual, estimate }
      : { key, amount: estimate, basis: "estimated", paid: 0 };
  lines.push(feeLine("customs", estimates.totalDouane, paidSource.customsPaid));
  lines.push(feeLine("port", estimates.totalPort, paidSource.portPaid));

  const total = lines.reduce((s, l) => s + (l.amount ?? 0), 0);
  const paid = lines.reduce((s, l) => s + l.paid, 0);
  return { situation, lines, total, paid, remaining: total - paid, missing: [...value.missing] };
}

/** Simulations saved before phase S2 have no detailed value: one declared CIF line. */
export function legacyValue(valeurCIF: number): CifDetermination {
  return {
    mode: "cif",
    valeurXof: valeurCIF,
    components: [{ kind: "cif", amount: valeurCIF, currency: "XOF", valeurXof: valeurCIF, conversion: null }],
    missing: [],
  };
}
