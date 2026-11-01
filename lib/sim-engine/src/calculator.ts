export type CylindreeKey =
  | "lt1000"
  | "1000-1300"
  | "1300-1600"
  | "1600-2000"
  | "2000-2500"
  | "gt2500";

export type RegimeKey =
  | "Droit commun"
  | "Exonération partielle"
  | "Enlèvement direct";

// DD rate by engine displacement
export const DD_RATES: Record<CylindreeKey, number> = {
  "lt1000":    0.20,
  "1000-1300": 0.22,
  "1300-1600": 0.25,
  "1600-2000": 0.28,
  "2000-2500": 0.30,
  "gt2500":    0.35,
};

export const DD_RATE_LABELS: Record<CylindreeKey, string> = {
  "lt1000":    "20%",
  "1000-1300": "22%",
  "1300-1600": "25%",
  "1600-2000": "28%",
  "2000-2500": "30%",
  "gt2500":    "35%",
};

export interface FormInput {
  marque: string;
  modele: string;
  annee: number;
  cylindree: CylindreeKey;
  carburant: string;
  valeurCIF: number;
  joursAuPort: number;
  regime: RegimeKey;
}

export type RiskLevel = "faible" | "moyen" | "eleve";

export interface SimulationResult {
  ageVehicule: number;
  riskLevel: RiskLevel;
  // Taxes
  ddRate: number;
  ddRateLabel: string;
  DD: number;
  RS: number;
  PC: number;
  PCS: number;
  baseTVA: number;
  TVA: number;
  // Port fees
  magasinage: number;
  manutention: number;
  beninControl: number;
  segub: number;
  fraisCAD: number;
  fraisGUCE: number;
  portReductionApplied: boolean;
  // Regime
  regimeLabel: string;
  // Totals
  totalDouane: number;
  totalPort: number;
  totalGeneral: number;
}

export function calculate(input: FormInput): SimulationResult {
  const currentYear = new Date().getFullYear();
  const ageVehicule = currentYear - input.annee;

  const riskLevel: RiskLevel =
    ageVehicule <= 5 ? "faible" : ageVehicule <= 10 ? "moyen" : "eleve";

  // ── Customs taxes (on declared CIF) ──────────────────────────────────────
  const ddRate = DD_RATES[input.cylindree];
  const ddRateLabel = DD_RATE_LABELS[input.cylindree];

  let DD = input.valeurCIF * ddRate;
  const RS  = input.valeurCIF * 0.01;
  const PC  = input.valeurCIF * 0.005;
  const PCS = input.valeurCIF * 0.008;

  const baseTVA = input.valeurCIF + DD + RS + PC + PCS;
  let TVA = baseTVA * 0.18;

  // ── Port fees (fixed schedule — Port of Cotonou) ──────────────────────────
  let magasinage   = input.joursAuPort * 3500;
  let manutention  = 45000;
  let beninControl = 38000;
  let segub        = 7500;
  let fraisCAD     = 65000;
  let fraisGUCE    = 15000;

  // ── Regime adjustments ────────────────────────────────────────────────────
  let regimeLabel = "";
  let portReductionApplied = false;

  if (input.regime === "Exonération partielle") {
    DD  = DD  * 0.6;
    TVA = TVA * 0.8;
    regimeLabel = "DD réduit à 60% — TVA réduite à 80%";
  } else if (input.regime === "Enlèvement direct") {
    magasinage   = Math.round(magasinage   * 0.7);
    manutention  = Math.round(manutention  * 0.7);
    beninControl = Math.round(beninControl * 0.7);
    segub        = Math.round(segub        * 0.7);
    fraisCAD     = Math.round(fraisCAD     * 0.7);
    fraisGUCE    = Math.round(fraisGUCE    * 0.7);
    portReductionApplied = true;
    regimeLabel = "Frais portuaires réduits de 30%";
  } else {
    regimeLabel = "Toutes taxes à 100% (importation normale)";
  }

  const totalDouane = DD + RS + PC + PCS + TVA;
  const totalPort   = magasinage + manutention + beninControl + segub + fraisCAD + fraisGUCE;
  const totalGeneral = input.valeurCIF + totalDouane + totalPort;

  return {
    ageVehicule,
    riskLevel,
    ddRate,
    ddRateLabel,
    DD, RS, PC, PCS,
    baseTVA, TVA,
    magasinage, manutention, beninControl, segub, fraisCAD, fraisGUCE,
    portReductionApplied,
    regimeLabel,
    totalDouane,
    totalPort,
    totalGeneral,
  };
}
