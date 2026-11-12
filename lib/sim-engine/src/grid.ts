/**
 * Regulatory and fee grid of the SimDouane engine (preparation of phases S4
 * and S5). Research behind it: docs/GRILLE-REGLEMENTAIRE-S1.md.
 *
 * One entry per rate, fee or rule: the value the CURRENT engine applies (if
 * any), what the sources found during phase S1 say, the best source and a
 * status. Nothing here changes the amounts: calculator.ts is untouched and
 * test/grid.test.ts checks that the values listed below are exactly those
 * calculator.ts applies.
 *
 * Rules for whoever updates this file:
 * - an entry becomes "confirmed" only with a 2026 official text that was
 *   actually read, or a written answer from a licensed customs broker (CAD)
 *   or the DGD (question number of the S1 validation form in `cadQuestion`);
 * - never write a value that no source gives;
 * - the engine is changed only once every entry it needs is "confirmed"
 *   (see `engineReadiness()`).
 */

/**
 * - confirmed: 2026 official text read, or written answer of a CAD / the DGD.
 * - old: official or institutional source, but dated; not checked for 2026.
 * - uncertain: sources contradict each other, or official excerpt incomplete.
 * - to_verify: no sufficient source.
 * - unsourced: amount used by SimDouane with no source at all.
 */
export type GridStatus = "confirmed" | "old" | "uncertain" | "to_verify" | "unsourced";

export type GridGroup = "customs" | "port" | "regime" | "other";

export interface GridEntry {
  id: string;
  group: GridGroup;
  label: string;
  /** What the current engine applies; null when it applies nothing. */
  applied: { unit: "rate" | "fcfa" | "fcfa_per_day" | "multiplier"; value: number | Record<string, number> } | null;
  /** What the sources say (free text, never used in a calculation). */
  found: string;
  status: GridStatus;
  /** Best source found; null when there is none. */
  source: string | null;
  /**
   * Number of the question in the CAD validation form
   * (docs/VALIDATION-SIMULATEUR.md, section 4; 1-13 come from
   * docs/GRILLE-REGLEMENTAIRE-S1.md).
   */
  cadQuestion: number | null;
  note: string;
}

const SRC = {
  dgdBrochure: "https://douanes.gouv.bj/storage/2020/10/brochure-douane2-mobile.pdf",
  fiscal2021: "https://api.impots.bj/media/6172b9cbdbb2e_SYSTEME%20FISCAL%20DE%20R%C3%89F%C3%89RENCE%20BENIN-2021.pdf",
  lf2024: "https://api.impots.bj/media/658ab89e86597_B%C3%A9nin-Loi%20de%20finances%202024.pdf",
  cgi2010: "https://benin.eregulations.org/media/code_general_des_impots_2010.pdf",
  dgiAib: "https://www.impots.finances.gouv.bj/les-echeances-fiscales/",
  guceCi8703: "https://guce.gouv.ci/customs/tariff/searchByTariffKeywords?tariff=8703",
  wto2017: "https://www.wto.org/french/tratop_f/tpr_f/s362-01_f.pdf",
  cci2024: "https://cci.bj/admin1/public/upload/publications/file_ebdd7fe9cb159002483fe93a16453b53.pdf",
} as const;

export const GRID_VERSION = "historique-2026-11";

export const ENGINE_GRID: readonly GridEntry[] = [
  /* ── Customs duties and taxes ─────────────────────────────────────────── */
  {
    id: "dd", group: "customs", label: "Droit de douane (DD)",
    applied: { unit: "rate", value: { lt1000: 0.20, "1000-1300": 0.22, "1300-1600": 0.25, "1600-2000": 0.28, "2000-2500": 0.30, gt2500: 0.35 } },
    found: "20 % (catégorie 3 du TEC) le plus souvent cité ; 35 % possible pour certaines lignes 8703 (5e bande du TEC). Aucune source ne montre un taux différent par tranche de cylindrée.",
    status: "uncertain", source: SRC.dgdBrochure, cadQuestion: 1,
    note: "Les 6 tranches de cylindrée du moteur n'ont pas de source et ne suivent pas le découpage de la nomenclature.",
  },
  {
    id: "rs", group: "customs", label: "Redevance statistique (RS)",
    applied: { unit: "rate", value: 0.01 },
    found: "1 % de la valeur en douane (sources concordantes).",
    status: "old", source: SRC.fiscal2021, cadQuestion: 2, note: "",
  },
  {
    id: "pc", group: "customs", label: "Prélèvement communautaire CEDEAO (PC)",
    applied: { unit: "rate", value: 0.005 },
    found: "0,5 % de la valeur en douane, dû même en cas d'exonération (loi de finances 2024).",
    status: "old", source: SRC.lf2024, cadQuestion: 2, note: "",
  },
  {
    id: "pcs", group: "customs", label: "Prélèvement communautaire de solidarité UEMOA (PCS)",
    applied: { unit: "rate", value: 0.008 },
    found: "0,8 % de la valeur en douane depuis le 01/01/2019.",
    status: "old", source: SRC.fiscal2021, cadQuestion: 2, note: "",
  },
  {
    id: "tva", group: "customs", label: "TVA",
    applied: { unit: "rate", value: 0.18 },
    found: "18 % ; base = valeur en douane augmentée des droits et taxes de toute nature, hors TVA.",
    status: "old", source: SRC.cgi2010, cadQuestion: 7,
    note: "Le taux est sûr ; la base (quelles taxes y entrent) reste à confirmer.",
  },
  {
    id: "tva_base", group: "customs", label: "Base de la TVA",
    applied: null,
    found: "Valeur en douane + droits et taxes de toute nature, hors TVA (CGI 2010).",
    status: "uncertain", source: SRC.cgi2010, cadQuestion: 7,
    note: "Le moteur prend CIF + DD + RS + PC + PCS. Faudrait-il ajouter PS, RAU, redevance informatique ? À confirmer.",
  },
  {
    id: "ps", group: "customs", label: "Prélèvement de l'Union africaine (PS)",
    applied: null,
    found: "0,2 % de la valeur en douane sur les produits hors Union africaine (système fiscal de référence 2021).",
    status: "old", source: SRC.fiscal2021, cadQuestion: 3, note: "Absent du moteur.",
  },
  {
    id: "rau", group: "customs", label: "Redevance d'aménagement urbain (RAU)",
    applied: null,
    found: "0,5 % de la valeur en douane (brochure DGD) ; un extrait de la loi de finances 2020 indique « 1 % ou 3 % de la VD majorée des droits et taxes ».",
    status: "uncertain", source: SRC.dgdBrochure, cadQuestion: 4, note: "Absente du moteur.",
  },
  {
    id: "ri", group: "customs", label: "Redevance informatique (SYDONIA)",
    applied: null,
    found: "Forfait par déclaration : 10 000 FCFA (brochure DGD, OMC) ou 5 000 FCFA (CCI Bénin 2024).",
    status: "uncertain", source: SRC.dgdBrochure, cadQuestion: 5,
    note: "Absente du moteur. Ce n'est pas la même chose que les « frais GUCE » ci-dessous.",
  },
  {
    id: "aib", group: "customs", label: "AIB (acompte sur impôt assis sur les bénéfices)",
    applied: null,
    found: "1 % avec IFU, 5 % sans IFU, sur la valeur en douane majorée des droits et taxes.",
    status: "uncertain", source: SRC.dgiAib, cadQuestion: 6,
    note: "Absent du moteur : on ne sait pas si un particulier qui importe sa voiture y est soumis.",
  },
  {
    id: "consignation", group: "customs", label: "Consignation ou acompte forfaitaire par véhicule d'occasion",
    applied: null,
    found: "50 000 FCFA par véhicule d'occasion importé (hors transit), libératoire pour l'importateur revendeur.",
    status: "uncertain", source: SRC.wto2017, cadQuestion: 9, note: "Absent du moteur ; concerne surtout les revendeurs.",
  },
  {
    id: "taxe_voirie", group: "customs", label: "Taxe de voirie",
    applied: null,
    found: "Citée par l'OMC (2017) comme exclue des réductions ; aucun montant trouvé.",
    status: "to_verify", source: SRC.wto2017, cadQuestion: 10, note: "Absente du moteur.",
  },
  {
    id: "valeur_reference", group: "customs", label: "Valeur retenue pour un véhicule d'occasion",
    applied: null,
    found: "Système de valeur plancher selon l'OMC (2017) ; la douane retiendrait une valeur de référence plutôt que la facture.",
    status: "uncertain", source: SRC.wto2017, cadQuestion: 8,
    note: "Le moteur taxe la valeur saisie par l'utilisateur ; l'écran prévient que la douane peut retenir une autre valeur.",
  },
  {
    id: "vehicule_neuf", group: "customs", label: "Abattement des véhicules neufs",
    applied: null,
    found: "Loi de finances 2024 : 99 % électrique, 95 % hybride, 90 % autres, sous condition d'IFU ; reconduction 2026 annoncée (loi n° 2025-22), texte non lu.",
    status: "uncertain", source: SRC.lf2024, cadQuestion: 11,
    note: "Signalé à l'écran (phase S7), jamais appliqué.",
  },
  {
    id: "age_occasion", group: "customs", label: "Âge maximal des véhicules d'occasion",
    applied: null,
    found: "Décret n° 2000-671 : 10 ans (tourisme), 13 ans (autres catégories).",
    status: "old", source: "https://sgg.gouv.bj/doc/decret-2000-671/download", cadQuestion: 12,
    note: "Signalé à l'écran (phase S7), rien n'est bloqué.",
  },

  /* ── Port, formalities and broker (phase S5) ──────────────────────────── */
  {
    id: "magasinage", group: "port", label: "Magasinage",
    applied: { unit: "fcfa_per_day", value: 3500 },
    found: "Aucune grille officielle actuelle trouvée.",
    status: "unsourced", source: null, cadQuestion: 14,
    note: "À demander au Port autonome de Cotonou ou au terminal.",
  },
  {
    id: "manutention", group: "port", label: "Manutention",
    applied: { unit: "fcfa", value: 45000 },
    found: "Aucune grille officielle actuelle trouvée.",
    status: "unsourced", source: null, cadQuestion: 14, note: "",
  },
  {
    id: "benin_control", group: "port", label: "Contrôle Bénin (programme de vérification des importations)",
    applied: { unit: "fcfa", value: 38000 },
    found: "Le programme existe depuis un décret de 2011, révisé en 2012 ; aucun montant actuel trouvé.",
    status: "unsourced", source: null, cadQuestion: 14, note: "",
  },
  {
    id: "segub", group: "port", label: "SEGUB",
    applied: { unit: "fcfa", value: 7500 },
    found: "Aucune grille officielle actuelle trouvée.",
    status: "unsourced", source: null, cadQuestion: 14, note: "",
  },
  {
    id: "frais_guce", group: "port", label: "Frais GUCE (guichet unique)",
    applied: { unit: "fcfa", value: 15000 },
    found: "Aucune grille officielle actuelle trouvée.",
    status: "unsourced", source: null, cadQuestion: 14, note: "",
  },
  {
    id: "frais_cad", group: "port", label: "Honoraires du commissionnaire agréé (CAD)",
    applied: { unit: "fcfa", value: 65000 },
    found: "Honoraires libres, variables selon le commissionnaire.",
    status: "unsourced", source: null, cadQuestion: 14,
    note: "Montant par défaut ; l'utilisateur peut saisir le montant réel de son CAD (phase S6).",
  },

  /* ── Regimes offered on the form ──────────────────────────────────────── */
  {
    id: "regime_exoneration_partielle", group: "regime", label: "Régime « Exonération partielle »",
    applied: { unit: "multiplier", value: { dd: 0.6, tva: 0.8 } },
    found: "Les réductions trouvées (75 % ou 60 % des droits pour certaines entreprises agréées, code des investissements) ne correspondent pas à ce régime.",
    status: "unsourced", source: SRC.wto2017, cadQuestion: 15,
    note: "Ne correspond à aucune mesure trouvée.",
  },
  {
    id: "regime_enlevement_direct", group: "regime", label: "Régime « Enlèvement direct »",
    applied: { unit: "multiplier", value: { port: 0.7 } },
    found: "Aucune source pour une réduction de 30 % des frais de port.",
    status: "unsourced", source: null, cadQuestion: 15,
    note: "Ne correspond à aucune mesure trouvée.",
  },
];

export function gridEntry(id: string): GridEntry {
  const entry = ENGINE_GRID.find((e) => e.id === id);
  if (!entry) throw new Error(`Unknown grid entry: ${id}`);
  return entry;
}

/**
 * Whether the engine can be called "validated": every entry it applies (and
 * every rule it should apply but does not) must be confirmed. Lists what is
 * still blocking, with the CAD question that would settle it.
 */
export function engineReadiness(grid: readonly GridEntry[] = ENGINE_GRID): {
  validated: boolean;
  blocking: { id: string; label: string; status: GridStatus; cadQuestion: number | null }[];
  byStatus: Record<GridStatus, number>;
} {
  const byStatus: Record<GridStatus, number> = { confirmed: 0, old: 0, uncertain: 0, to_verify: 0, unsourced: 0 };
  for (const e of grid) byStatus[e.status] += 1;
  const blocking = grid
    .filter((e) => e.status !== "confirmed")
    .map(({ id, label, status, cadQuestion }) => ({ id, label, status, cadQuestion }));
  return { validated: blocking.length === 0, blocking, byStatus };
}
