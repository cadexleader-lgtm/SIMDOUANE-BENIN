import type { ArrivalSituation, CaseState } from "./rules";
import { isIsoDate, normalizeVin, todayInBenin, vinError } from "./rules";

export const CASE_TEXT_LIMITS = {
  originCountry: 80,
  departurePort: 80,
  transportReference: 100,
  existingReferences: 2000,
  formalitiesDone: 2000,
  knownBlockers: 2000,
  notes: 2000,
} as const;
export const CASE_DATE_FIELDS = ["shippedAt", "estimatedArrivalDate", "arrivalDate"] as const;

type TextField = keyof typeof CASE_TEXT_LIMITS;
type DateField = (typeof CASE_DATE_FIELDS)[number];
export type CaseFieldChanges = Partial<Record<TextField | DateField, string | null>> & {
  arrivalSituation?: ArrivalSituation;
};
export type VehicleChanges = Partial<{
  make: string;
  model: string | null;
  year: number | null;
  vin: string | null;
  condition: "neuf" | "occasion" | null;
}>;

export type ValidationResult =
  | { ok: true; caseChanges: CaseFieldChanges; vehicleChanges: VehicleChanges }
  | { ok: false; fieldErrors: Record<string, string> };

const has = (o: object, k: string) => Object.prototype.hasOwnProperty.call(o, k);

/**
 * Validates a create (all from scratch) or update (only the keys sent)
 * payload. Unknown keys — status, owner, reference… — are ignored: they can
 * never be set by the client. `current` is the stored state for updates.
 */
export function validateCaseInput(
  raw: unknown,
  mode: "create" | "update",
  current?: CaseState & { shippedAt: string | null },
): ValidationResult {
  const fieldErrors: Record<string, string> = {};
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return { ok: false, fieldErrors: { _: "Données invalides." } };
  }
  const input = raw as Record<string, unknown>;
  const caseChanges: CaseFieldChanges = {};
  const vehicleChanges: VehicleChanges = {};

  const readText = (value: unknown, key: string, max: number): string | null | undefined => {
    if (value === null) return null;
    if (typeof value !== "string") {
      fieldErrors[key] = "Valeur invalide.";
      return undefined;
    }
    const trimmed = value.trim();
    if (trimmed.length > max) {
      fieldErrors[key] = `${max} caractères maximum.`;
      return undefined;
    }
    return trimmed || null;
  };

  // Situation
  if (has(input, "arrivalSituation")) {
    if (input.arrivalSituation === "not_arrived" || input.arrivalSituation === "arrived") {
      caseChanges.arrivalSituation = input.arrivalSituation;
    } else {
      fieldErrors.arrivalSituation = "Indiquez si le véhicule est déjà arrivé au port de Cotonou.";
    }
  } else if (mode === "create") {
    fieldErrors.arrivalSituation = "Indiquez si le véhicule est déjà arrivé au port de Cotonou.";
  }

  // Free texts
  for (const [key, max] of Object.entries(CASE_TEXT_LIMITS) as [TextField, number][]) {
    if (!has(input, key)) continue;
    const value = readText(input[key], key, max);
    if (value !== undefined) caseChanges[key] = value;
  }

  // Dates
  for (const key of CASE_DATE_FIELDS) {
    if (!has(input, key)) continue;
    const value = input[key];
    if (value === null || value === "") {
      caseChanges[key] = null;
    } else if (typeof value === "string" && isIsoDate(value)) {
      caseChanges[key] = value;
    } else {
      fieldErrors[key] = "Date invalide.";
    }
  }

  // Vehicle
  const vehicle = input.vehicle;
  if (vehicle !== undefined && (vehicle === null || typeof vehicle !== "object" || Array.isArray(vehicle))) {
    fieldErrors.vehicle = "Données du véhicule invalides.";
  } else {
    const v = (vehicle ?? {}) as Record<string, unknown>;
    if (has(v, "make") || mode === "create") {
      const make = readText(v.make ?? null, "vehicle.make", 80);
      if (make === null) fieldErrors["vehicle.make"] = "La marque est obligatoire.";
      else if (make !== undefined) vehicleChanges.make = make;
    }
    if (has(v, "model")) {
      const model = readText(v.model, "vehicle.model", 80);
      if (model !== undefined) vehicleChanges.model = model;
    }
    if (has(v, "year")) {
      const maxYear = Number(todayInBenin().slice(0, 4)) + 1;
      if (v.year === null || v.year === "") vehicleChanges.year = null;
      else if (typeof v.year === "number" && Number.isInteger(v.year) && v.year >= 1900 && v.year <= maxYear) {
        vehicleChanges.year = v.year;
      } else fieldErrors["vehicle.year"] = `Année entre 1900 et ${maxYear}.`;
    }
    if (has(v, "vin")) {
      if (v.vin === null || v.vin === "") vehicleChanges.vin = null;
      else if (typeof v.vin !== "string") fieldErrors["vehicle.vin"] = "Valeur invalide.";
      else {
        const vin = normalizeVin(v.vin);
        const error = vinError(vin);
        if (error) fieldErrors["vehicle.vin"] = error;
        else vehicleChanges.vin = vin;
      }
    }
    if (has(v, "condition")) {
      if (v.condition === null || v.condition === "neuf" || v.condition === "occasion") vehicleChanges.condition = v.condition;
      else fieldErrors["vehicle.condition"] = "Choisissez « neuf » ou « occasion ».";
    }
  }

  // Cross-field checks on the resulting state.
  const pick = <K extends "shippedAt" | "estimatedArrivalDate" | "arrivalDate">(k: K) =>
    has(caseChanges, k) ? (caseChanges[k] ?? null) : (current?.[k] ?? null);
  const situation = caseChanges.arrivalSituation ?? current?.arrivalSituation;
  const shippedAt = pick("shippedAt");
  const estimated = pick("estimatedArrivalDate");
  const arrival = pick("arrivalDate");
  const today = todayInBenin();

  if (arrival && !fieldErrors.arrivalDate) {
    if (situation === "not_arrived") {
      fieldErrors.arrivalDate = "La date d'arrivée réelle ne s'indique que si le véhicule est déjà arrivé.";
    } else if (arrival > today) {
      fieldErrors.arrivalDate = "La date d'arrivée réelle ne peut pas être dans le futur.";
    } else if (shippedAt && arrival < shippedAt) {
      fieldErrors.arrivalDate = "La date d'arrivée ne peut pas précéder la date d'expédition.";
    }
  }
  if (estimated && shippedAt && estimated < shippedAt && !fieldErrors.estimatedArrivalDate) {
    fieldErrors.estimatedArrivalDate = "L'arrivée estimée ne peut pas précéder la date d'expédition.";
  }

  return Object.keys(fieldErrors).length ? { ok: false, fieldErrors } : { ok: true, caseChanges, vehicleChanges };
}
