/**
 * Vehicle characteristics that may matter for customs (phase S7).
 *
 * Nothing here changes the amounts: the rules below are NOT confirmed for
 * 2026 (see the S1 regulatory grid), so they are only shown as warnings,
 * with their source and status. They will be applied by the engine only
 * once a licensed customs broker (CAD) or the DGD has confirmed them.
 */
import { T } from "./translations";

export type VehicleCondition = "Occasion" | "Neuf";
export type Powertrain = "Électrique" | "Hybride" | "Autre";
export const VEHICLE_TYPES = ["tourisme", "utilitaire"] as const;
export type VehicleType = (typeof VEHICLE_TYPES)[number];

export const REGULATORY_CONFIG_2026 = {
  year: 2026,
  version: "2026.2-to-confirm",
  /** Abatement on the customs value of NEW vehicles, subject to the owner's IFU. */
  newVehicleBenefits: {
    abatementPercent: { Électrique: 99, Hybride: 95, Autre: 90 } as Record<Powertrain, number>,
    status: "Loi de finances 2024 ; reconduction en 2026 (loi n° 2025-22) annoncée, non vérifiée sur le texte.",
    source: "https://api.impots.bj/media/658ab89e86597_B%C3%A9nin-Loi%20de%20finances%202024.pdf",
  },
  /** Maximum age of USED vehicles imported. */
  usedVehicleAgeLimit: {
    years: { tourisme: 10, utilitaire: 13 } as Record<VehicleType, number>,
    status: "Décret n° 2000-671 du 29 décembre 2000 ; application actuelle non vérifiée.",
    source: "https://sgg.gouv.bj/doc/decret-2000-671/download",
  },
} as const;

export function powertrainOf(carburant: string | undefined): Powertrain {
  return carburant === "Électrique" ? "Électrique" : carburant === "Hybride" ? "Hybride" : "Autre";
}

export interface VehicleNotice {
  key: "new_benefit" | "age_limit" | "utility" | "used_green";
  text: string;
  /** Warning that may change the outcome a lot (shown prominently). */
  strong: boolean;
}

/** Warnings about the vehicle itself; none of them changes the calculation. */
export function vehicleNotices(
  v: { condition?: VehicleCondition; carburant?: string; vehicleType?: VehicleType; age?: number },
  lang: "fr" | "en",
): VehicleNotice[] {
  const t = T[lang].notices;
  const condition = v.condition ?? "Occasion";
  const type = v.vehicleType ?? "tourisme";
  const powertrain = powertrainOf(v.carburant);
  const notices: VehicleNotice[] = [];

  if (condition === "Neuf") {
    notices.push({ key: "new_benefit", strong: true, text: t.newBenefit(REGULATORY_CONFIG_2026.newVehicleBenefits.abatementPercent[powertrain]) });
  } else {
    const limit = REGULATORY_CONFIG_2026.usedVehicleAgeLimit.years[type];
    if (v.age !== undefined && v.age > limit) notices.push({ key: "age_limit", strong: true, text: t.ageLimit(limit, v.age) });
    if (powertrain !== "Autre") notices.push({ key: "used_green", strong: false, text: t.usedGreen });
  }
  if (type === "utilitaire") notices.push({ key: "utility", strong: true, text: t.utility });
  return notices;
}
