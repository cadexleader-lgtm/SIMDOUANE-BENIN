import { jsPDF } from "jspdf";
import type { HistoryEntry } from "./history";

/** jsPDF ne sait pas rendre l'espace fine Unicode (\u202F) produite par
 *  Intl.NumberFormat('fr-FR') — elle s'affiche en "/" dans le PDF.
 *  On utilise un séparateur ASCII simple à la place. */
function fmt(amount: number): string {
  const rounded = Math.round(amount);
  // Séparateurs de milliers avec espace ASCII normale
  return rounded.toLocaleString("en-US").replace(/,/g, "\u00A0") + " FCFA";
}

const GREEN  = [0, 61, 36]   as [number, number, number];
const GOLD   = [252, 209, 22] as [number, number, number];
const WHITE  = [255, 255, 255] as [number, number, number];
const LIGHT  = [243, 246, 249] as [number, number, number];
const DARK   = [15, 23, 42]   as [number, number, number];
const MUTED  = [100, 116, 139] as [number, number, number];
const RED    = [220, 38, 38]   as [number, number, number];

function setFill(doc: jsPDF, color: [number, number, number]) {
  doc.setFillColor(color[0], color[1], color[2]);
}
function setTextColor(doc: jsPDF, color: [number, number, number]) {
  doc.setTextColor(color[0], color[1], color[2]);
}
function setDrawColor(doc: jsPDF, color: [number, number, number]) {
  doc.setDrawColor(color[0], color[1], color[2]);
}

export function exportSimulationPDF(entry: HistoryEntry): void {
  const { input, result } = entry;
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const W = 210;
  const MARGIN = 14;
  const COL = W - MARGIN * 2;
  let y = 0;

  /* ── Header band ──────────────────────────────────── */
  setFill(doc, GREEN);
  doc.rect(0, 0, W, 38, "F");

  // Gold accent line
  setFill(doc, GOLD);
  doc.rect(0, 38, W, 2, "F");

  // Logo placeholder (shield outline)
  setTextColor(doc, GOLD);
  doc.setFontSize(22);
  doc.setFont("helvetica", "bold");
  doc.text("SIMDOUANE", MARGIN, 20);

  setTextColor(doc, [255, 255, 255]);
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.text("Simulateur de droits et frais douaniers — Port de Cotonou, Bénin", MARGIN, 27);

  setTextColor(doc, [200, 220, 200]);
  doc.text(`Document généré le ${new Date().toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" })}`, MARGIN, 34);

  // "RÉSULTATS DE SIMULATION" on right
  setTextColor(doc, GOLD);
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text("RÉSULTATS DE", W - MARGIN, 18, { align: "right" });
  doc.text("SIMULATION", W - MARGIN, 25, { align: "right" });

  y = 50;

  /* ── Vehicle card ─────────────────────────────────── */
  setFill(doc, LIGHT);
  doc.roundedRect(MARGIN, y, COL, 28, 3, 3, "F");

  setTextColor(doc, DARK);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text(`${input.marque} ${input.modele}`, MARGIN + 5, y + 9);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  setTextColor(doc, MUTED);
  doc.text(
    `Année ${input.annee}  ·  ${input.carburant}  ·  DD ${result.ddRateLabel}  ·  ${result.ageVehicule} ans  ·  Régime : ${input.regime}`,
    MARGIN + 5, y + 16
  );

  doc.setFont("helvetica", "bold");
  setTextColor(doc, DARK);
  doc.setFontSize(9);
  doc.text("Valeur CIF déclarée", W - MARGIN - 40, y + 9);
  setTextColor(doc, GREEN[0] < 50 ? GREEN : GREEN);
  doc.setFontSize(12);
  doc.text(fmt(input.valeurCIF), W - MARGIN, y + 18, { align: "right" });

  y += 35;

  /* ── 3-stat summary boxes ─────────────────────────── */
  const BOX_W = (COL - 8) / 3;
  const boxes = [
    { label: "Valeur CIF",       val: fmt(input.valeurCIF),    bg: LIGHT,              txt: DARK },
    { label: "Droits & taxes",   val: fmt(result.totalDouane), bg: [254, 243, 199] as [number,number,number], txt: [146, 64, 14] as [number,number,number] },
    { label: "Frais portuaires", val: fmt(result.totalPort),   bg: LIGHT,              txt: DARK },
  ];
  boxes.forEach((b, i) => {
    const bx = MARGIN + i * (BOX_W + 4);
    setFill(doc, b.bg);
    doc.roundedRect(bx, y, BOX_W, 18, 2, 2, "F");
    setTextColor(doc, b.txt);
    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    doc.text(b.label, bx + BOX_W / 2, y + 5.5, { align: "center" });
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.text(b.val, bx + BOX_W / 2, y + 13, { align: "center" });
  });
  y += 24;

  /* ── Total box ────────────────────────────────────── */
  setFill(doc, GREEN);
  doc.roundedRect(MARGIN, y, COL, 22, 3, 3, "F");
  setFill(doc, GOLD);
  doc.roundedRect(MARGIN, y, 4, 22, 3, 3, "F");

  setTextColor(doc, WHITE);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text("COÛT TOTAL D'IMPORTATION", MARGIN + 10, y + 8);
  doc.setFontSize(16);
  doc.text(fmt(result.totalGeneral), W - MARGIN, y + 16, { align: "right" });

  y += 30;

  /* ── Section: Droits de douane ────────────────────── */
  setTextColor(doc, DARK);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("Droits de douane", MARGIN, y);
  y += 2;
  setDrawColor(doc, GREEN);
  doc.setLineWidth(0.5);
  doc.line(MARGIN, y, MARGIN + 50, y);
  y += 5;

  // Table header
  setFill(doc, GREEN);
  doc.rect(MARGIN, y, COL, 7, "F");
  setTextColor(doc, WHITE);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.text("Taxe", MARGIN + 3, y + 4.5);
  doc.text("Base de calcul", MARGIN + 55, y + 4.5);
  doc.text("Taux", MARGIN + 110, y + 4.5);
  doc.text("Montant", W - MARGIN, y + 4.5, { align: "right" });
  y += 7;

  const douaneRows = [
    { id: "DD",  nom: "Droit de Douane",                   base: input.valeurCIF, taux: result.ddRateLabel, montant: result.DD },
    { id: "RS",  nom: "Redevance Statistique",              base: input.valeurCIF, taux: "1%",              montant: result.RS },
    { id: "PC",  nom: "Prélèvement CEDEAO",                 base: input.valeurCIF, taux: "0,5%",           montant: result.PC },
    { id: "PCS", nom: "Prélèv. Solidarité",                 base: input.valeurCIF, taux: "0,8%",           montant: result.PCS },
    { id: "TVA", nom: "Taxe sur la Valeur Ajoutée (18%)",   base: result.baseTVA,  taux: "18%",            montant: result.TVA },
  ];

  douaneRows.forEach((row, i) => {
    if (i % 2 === 0) {
      setFill(doc, LIGHT);
      doc.rect(MARGIN, y, COL, 7, "F");
    }
    setTextColor(doc, DARK);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.text(row.id, MARGIN + 3, y + 4.5);
    doc.setFont("helvetica", "normal");
    setTextColor(doc, MUTED);
    doc.text(row.nom, MARGIN + 14, y + 4.5);
    doc.text(fmt(row.base), MARGIN + 55, y + 4.5);
    setTextColor(doc, DARK);
    doc.text(row.taux, MARGIN + 110, y + 4.5);
    doc.setFont("helvetica", "bold");
    doc.text(fmt(row.montant), W - MARGIN, y + 4.5, { align: "right" });
    y += 7;
  });

  // Total douane
  setFill(doc, [220, 240, 225]);
  doc.rect(MARGIN, y, COL, 7, "F");
  setTextColor(doc, GREEN);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.text("TOTAL DROITS DE DOUANE", MARGIN + 3, y + 4.5);
  doc.text(fmt(result.totalDouane), W - MARGIN, y + 4.5, { align: "right" });
  y += 13;

  /* ── Section: Frais portuaires ─────────────────────── */
  setTextColor(doc, DARK);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("Frais portuaires", MARGIN, y);
  y += 2;
  setDrawColor(doc, GREEN);
  doc.line(MARGIN, y, MARGIN + 50, y);
  y += 5;

  // Port table header
  setFill(doc, GREEN);
  doc.rect(MARGIN, y, COL, 7, "F");
  setTextColor(doc, WHITE);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.text("Frais", MARGIN + 3, y + 4.5);
  doc.text("Montant", W - MARGIN, y + 4.5, { align: "right" });
  y += 7;

  const portRows = [
    { nom: "Magasinage",     detail: `${input.joursAuPort} jours × 3 500 FCFA`, montant: result.magasinage },
    { nom: "Manutention",    detail: "",                                          montant: result.manutention },
    { nom: "Contrôle Bénin", detail: "",                                          montant: result.beninControl },
    { nom: "SEGUB",          detail: "",                                          montant: result.segub },
    { nom: "Frais CAD",      detail: "Commissionnaire Agréé",                    montant: result.fraisCAD },
    { nom: "Frais GUCE",     detail: "Guichet Unique",                           montant: result.fraisGUCE },
  ];

  portRows.forEach((row, i) => {
    if (i % 2 === 0) {
      setFill(doc, LIGHT);
      doc.rect(MARGIN, y, COL, 7, "F");
    }
    setTextColor(doc, DARK);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.text(row.nom, MARGIN + 3, y + 4.5);
    if (row.detail) {
      setTextColor(doc, MUTED);
      doc.setFont("helvetica", "normal");
      doc.text(`(${row.detail})`, MARGIN + 40, y + 4.5);
    }
    setTextColor(doc, DARK);
    doc.setFont("helvetica", "bold");
    doc.text(fmt(row.montant), W - MARGIN, y + 4.5, { align: "right" });
    y += 7;
  });

  // Total port
  setFill(doc, [220, 240, 225]);
  doc.rect(MARGIN, y, COL, 7, "F");
  setTextColor(doc, GREEN);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.text("TOTAL FRAIS PORTUAIRES", MARGIN + 3, y + 4.5);
  doc.text(fmt(result.totalPort), W - MARGIN, y + 4.5, { align: "right" });
  y += 13;

  /* ── Résumé final ─────────────────────────────────── */
  setFill(doc, LIGHT);
  doc.roundedRect(MARGIN, y, COL, 30, 3, 3, "F");

  setTextColor(doc, MUTED);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.text("Valeur CIF", MARGIN + 5, y + 8);
  doc.text("+ Droits et taxes", MARGIN + 5, y + 14);
  doc.text("+ Frais portuaires", MARGIN + 5, y + 20);

  setTextColor(doc, DARK);
  doc.text(fmt(input.valeurCIF), W - MARGIN, y + 8, { align: "right" });
  doc.text(fmt(result.totalDouane), W - MARGIN, y + 14, { align: "right" });
  doc.text(fmt(result.totalPort), W - MARGIN, y + 20, { align: "right" });

  setDrawColor(doc, [203, 213, 225]);
  doc.setLineWidth(0.3);
  doc.line(MARGIN + 5, y + 23, W - MARGIN, y + 23);

  setTextColor(doc, GREEN);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("COÛT TOTAL", MARGIN + 5, y + 29);
  doc.text(fmt(result.totalGeneral), W - MARGIN, y + 29, { align: "right" });
  y += 38;

  /* ── Disclaimer ───────────────────────────────────── */
  setFill(doc, [254, 243, 199]);
  doc.roundedRect(MARGIN, y, COL, 14, 2, 2, "F");
  setTextColor(doc, [146, 64, 14]);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.text("⚠ Estimation indicative", MARGIN + 4, y + 5);
  doc.setFont("helvetica", "normal");
  doc.text(
    "Ce document est une simulation basée sur les formules douanières en vigueur au Bénin. Le montant",
    MARGIN + 4, y + 10
  );
  doc.text("final est déterminé par la DGDDI. Consultez un Commissionnaire Agréé en Douane pour confirmation.", MARGIN + 4, y + 14);

  /* ── Footer ───────────────────────────────────────── */
  const pageHeight = 297;
  setFill(doc, GREEN);
  doc.rect(0, pageHeight - 14, W, 14, "F");
  setFill(doc, GOLD);
  doc.rect(0, pageHeight - 15.5, W, 1.5, "F");
  setTextColor(doc, WHITE);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.text("© 2026 SimDouane Bénin — Créé par HAZOUME AKUEGNON Clarence Alvin", MARGIN, pageHeight - 7);
  doc.text("+229 56 50 13 48  |  hazoumeclarence@gmail.com", W - MARGIN, pageHeight - 7, { align: "right" });

  /* ── Save ─────────────────────────────────────────── */
  const filename = `SimDouane_${input.marque}_${input.modele}_${input.annee}.pdf`.replace(/\s+/g, "_");
  doc.save(filename);
}
