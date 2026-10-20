export type VehicleCondition = "Occasion" | "Neuf";
export type Powertrain = "Électrique" | "Hybride" | "Autre";

export const REGULATORY_CONFIG_2026 = {
  year: 2026,
  version: "2026.1-announced",
  sourceUrls: [
    "https://www.gouv.bj/",
    "https://www.douanes.gouv.bj/",
    "https://erepertoire.finances.bj/",
  ],
  newVehicleBenefits: {
    Électrique: {
      announcedAbatementPercent: 99,
      note: "Mesure annoncée, à confirmer selon le texte applicable, le dossier et l'éligibilité.",
    },
    Hybride: {
      announcedAbatementPercent: 95,
      note: "Mesure annoncée, à confirmer selon le texte applicable, le dossier et l'éligibilité.",
    },
    Autre: {
      announcedAbatementPercent: 90,
      note: "Mesure annoncée, à confirmer selon le texte applicable, le dossier et l'éligibilité.",
    },
  },
  usedVehicleNote:
    "Aucun avantage automatique n'est appliqué aux véhicules d'occasion dans cette couche d'information.",
} as const;

export function getRegulatoryNotice(condition: VehicleCondition, powertrain: Powertrain) {
  if (condition === "Occasion") return REGULATORY_CONFIG_2026.usedVehicleNote;
  const benefit = REGULATORY_CONFIG_2026.newVehicleBenefits[powertrain];
  return `Véhicule neuf ${powertrain} : abattement annoncé de ${benefit.announcedAbatementPercent} %. ${benefit.note} Aucun total fiscal 2026 n'est inventé par SimDouane.`;
}