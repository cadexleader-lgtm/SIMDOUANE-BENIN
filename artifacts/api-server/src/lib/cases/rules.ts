/**
 * Business rules of a vehicle file (phase 3). Pure functions, unit tested.
 *
 * The completeness rules below are a first version for the MVP, to be
 * confirmed with transitaires. "Ready" means "ready for the administrative
 * preparation with a transitaire", never "lodged with Customs".
 */

export type ArrivalSituation = "not_arrived" | "arrived";
export type CaseStatus = "draft" | "incomplete" | "ready";

export type CaseState = {
  arrivalSituation: ArrivalSituation;
  originCountry: string | null;
  estimatedArrivalDate: string | null;
  arrivalDate: string | null;
  transportReference: string | null;
  vehicle: { make: string | null; model: string | null; year: number | null; vin: string | null };
};

/** Fields required before the file can be "ready". */
export function missingFields(c: CaseState): string[] {
  const missing: string[] = [];
  if (!c.vehicle.make) missing.push("vehicle.make");
  if (!c.vehicle.model) missing.push("vehicle.model");
  if (c.vehicle.year == null) missing.push("vehicle.year");
  if (!c.originCountry) missing.push("originCountry");
  if (c.arrivalSituation === "arrived" ? !c.arrivalDate : !c.estimatedArrivalDate) {
    missing.push(c.arrivalSituation === "arrived" ? "arrivalDate" : "estimatedArrivalDate");
  }
  return missing;
}

/** Useful but not blocking. */
export function recommendedFields(c: CaseState): string[] {
  const recommended: string[] = [];
  if (!c.vehicle.vin) recommended.push("vehicle.vin");
  if (!c.transportReference) recommended.push("transportReference");
  return recommended;
}

/** Status after a completeness check (a draft stays a draft until checked). */
export function statusAfterCheck(c: CaseState): CaseStatus {
  return missingFields(c).length ? "incomplete" : "ready";
}

/** Today's date in Benin (UTC+1, no daylight saving), AAAA-MM-JJ. */
export function todayInBenin(now: Date = new Date()): string {
  return new Date(now.getTime() + 60 * 60 * 1000).toISOString().slice(0, 10);
}

export function isIsoDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const d = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === value;
}

/** Upper-case, without spaces or dashes. */
export function normalizeVin(raw: string): string {
  return raw.toUpperCase().replace(/[\s-]+/g, "");
}

/** Error message for a chassis number, or null when acceptable. */
export function vinError(vin: string): string | null {
  if (!/^[A-Z0-9]{5,30}$/.test(vin)) {
    return "Le numéro de châssis ne doit contenir que des lettres et des chiffres (5 à 30 caractères).";
  }
  // ISO 3779: a 17-character VIN never uses I, O or Q.
  if (vin.length === 17 && /[IOQ]/.test(vin)) {
    return "Un numéro de châssis à 17 caractères ne contient jamais les lettres I, O ou Q.";
  }
  return null;
}

export function caseReference(sequenceValue: number | bigint, now: Date = new Date()): string {
  return `SDB-${todayInBenin(now).slice(0, 4)}-${String(sequenceValue).padStart(6, "0")}`;
}
