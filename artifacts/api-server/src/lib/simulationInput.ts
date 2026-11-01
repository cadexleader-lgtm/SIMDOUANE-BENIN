/**
 * Validation of POST /api/simulations. The contract (lib/api-spec/openapi.yaml,
 * generated CreateSimulationBody) already carries the enums, ranges, lengths
 * and the shape of `details`; this module adds what it cannot express
 * (integers, current year, size of `details`, consistency) and turns zod
 * issues into French messages. Unknown properties are dropped by the parser,
 * so only the documented fields are ever stored.
 */
import { CreateSimulationBody } from "@workspace/api-zod";
import type { z, ZodIssue } from "zod";
import { HttpError } from "./httpErrors";
import { todayInBenin } from "./cases/rules";

/** Maximum size of `details` as JSON (UTF-8 bytes). */
export const MAX_DETAILS_BYTES = 20 * 1024;
/** Maximum number of field errors returned in one answer. */
const MAX_FIELD_ERRORS = 20;

export const CYLINDREES = ["lt1000", "1000-1300", "1300-1600", "1600-2000", "2000-2500", "gt2500"] as const;
export const REGIMES = ["Droit commun", "Exonération partielle", "Enlèvement direct"] as const;

/** Latest accepted model year: next year, in Benin time (UTC+1). */
export function maxVehicleYear(now: Date = new Date()): number {
  return Number(todayInBenin(now).slice(0, 4)) + 1;
}

const yearMessage = () => `Année invalide : un nombre entier entre 1900 et ${maxVehicleYear()}.`;
const DAYS_MESSAGE = "Nombre de jours au port invalide : un nombre entier entre 0 et 3650.";

const SimulationInput = CreateSimulationBody.superRefine((v, ctx) => {
  const issue = (path: (string | number)[], message: string) => ctx.addIssue({ code: "custom", path, message });

  // Lower bounds (1900, 0 day) and the 3650-day maximum are in the generated schema.
  if (!Number.isInteger(v.annee) || v.annee > maxVehicleYear()) issue(["annee"], yearMessage());
  if (!Number.isInteger(v.joursAuPort)) issue(["joursAuPort"], DAYS_MESSAGE);
  if (v.regulatoryYear != null && !Number.isInteger(v.regulatoryYear)) {
    issue(["regulatoryYear"], "Année réglementaire invalide : un nombre entier.");
  }
  // Ignored (recomputed by the server) but must still be numbers.
  for (const key of ["totalDouane", "totalPort", "totalGeneral"] as const) {
    if (!Number.isFinite(v[key])) issue([key], "Montant invalide.");
  }

  const d = v.details;
  if (!d) return;
  if (d.schemaVersion !== 1) {
    issue(["details", "schemaVersion"], "Version du détail non prise en charge (seule la version 1 est acceptée).");
  }
  // The detailed value is the very value the totals are computed on.
  if (d.valueInput && Number.isFinite(v.valeurCIF) && Math.abs(d.valueInput.valeurXof - v.valeurCIF) > 1) {
    issue(["details", "valueInput", "valeurXof"], "La valeur détaillée du véhicule ne correspond pas à la valeur CIF.");
  }
});

export type SimulationInput = z.infer<typeof SimulationInput>;

const FIELD_LABELS: Record<string, string> = {
  marque: "Marque",
  modele: "Modèle",
  annee: "Année",
  cylindree: "Cylindrée",
  carburant: "Carburant",
  valeurCIF: "Valeur CIF",
  joursAuPort: "Jours au port",
  regime: "Régime",
};

const formatNumber = (n: number | bigint) => Number(n).toLocaleString("fr-FR");

function frenchMessage(issue: ZodIssue): string {
  const field = String(issue.path[issue.path.length - 1] ?? "");
  if (issue.code === "invalid_type" && issue.received === "undefined") return "Champ obligatoire.";
  if (issue.path.length === 1) {
    if (field === "annee") return yearMessage();
    if (field === "joursAuPort") return DAYS_MESSAGE;
    if (field === "valeurCIF" && issue.code === "too_small") return "La valeur CIF doit être supérieure à 0.";
    if (field === "valeurCIF" && issue.code === "too_big") return "La valeur CIF ne peut pas dépasser 1 000 milliards de FCFA.";
  }
  switch (issue.code) {
    case "custom":
      return issue.message;
    case "invalid_type":
      return "Type de valeur invalide.";
    case "invalid_enum_value":
      if (field === "cylindree") return `Cylindrée inconnue (valeurs acceptées : ${CYLINDREES.join(", ")}).`;
      if (field === "regime") return `Régime inconnu (valeurs acceptées : ${REGIMES.join(", ")}).`;
      if (field === "situation") return "Situation inconnue (not_arrived, in_transit ou at_port).";
      if (field === "mode") return "Mode de saisie de la valeur inconnu (price, cif ou total).";
      return "Valeur non reconnue.";
    case "too_small":
      if (issue.type === "number") {
        return issue.inclusive
          ? `Doit être supérieur ou égal à ${formatNumber(issue.minimum)}.`
          : `Doit être strictement supérieur à ${formatNumber(issue.minimum)}.`;
      }
      return "Valeur trop courte.";
    case "too_big":
      if (issue.type === "string") return `${formatNumber(issue.maximum)} caractères maximum.`;
      if (issue.type === "array") return `${formatNumber(issue.maximum)} éléments maximum.`;
      if (issue.type === "number") return `Doit être inférieur ou égal à ${formatNumber(issue.maximum)}.`;
      return "Valeur trop grande.";
    case "invalid_string":
      return "Format invalide.";
    case "not_finite":
      return "Nombre invalide.";
    default:
      return "Valeur invalide.";
  }
}

function invalid(fields: Record<string, string>): HttpError {
  const keys = Object.keys(fields);
  let message = "Simulation invalide : vérifiez les champs signalés.";
  if (keys.length === 1 && keys[0] === "_") message = "Simulation invalide : données absentes ou mal formées.";
  else if (keys.length === 1) message = `Simulation invalide (${FIELD_LABELS[keys[0]] ?? keys[0]}) : ${fields[keys[0]]}`;
  return new HttpError(400, "INVALID_SIMULATION", message, { fields });
}

/** Validated input, or an HttpError 400 INVALID_SIMULATION with French messages per field. */
export function parseSimulationInput(body: unknown): SimulationInput {
  // Size first, on what was sent (before unknown properties are dropped).
  const rawDetails = body && typeof body === "object" ? (body as { details?: unknown }).details : undefined;
  if (rawDetails !== undefined && new TextEncoder().encode(JSON.stringify(rawDetails)).length > MAX_DETAILS_BYTES) {
    throw invalid({ details: `Détail trop volumineux (${MAX_DETAILS_BYTES / 1024} Ko maximum).` });
  }

  const parsed = SimulationInput.safeParse(body);
  if (parsed.success) return parsed.data;

  const fields: Record<string, string> = {};
  for (const issue of parsed.error.issues) {
    const key = issue.path.length ? issue.path.join(".") : "_";
    if (!(key in fields)) fields[key] = frenchMessage(issue);
    if (Object.keys(fields).length >= MAX_FIELD_ERRORS) break;
  }
  throw invalid(fields);
}
