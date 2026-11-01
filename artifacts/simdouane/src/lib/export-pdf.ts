/**
 * PDF export of a simulation (phase S9): same information as the results
 * page (phase S8), in French, with automatic page breaks.
 *
 * Built client-side with jsPDF and its built-in Helvetica font, which only
 * knows the WinAnsi (Latin-1) character set: every string goes through
 * `pdfSafe()` before being drawn.
 */
import { jsPDF } from "jspdf";
import type { HistoryEntry } from "./history";
import { buildBudget, legacyValue, NOTHING_PAID, type BudgetLine, type LineBasis } from "./budget";
import type { CifComponent } from "./cif-input";
import { formatRateDate } from "./currency";
import { buildHypotheses, rateLabel } from "./result-hypotheses";
import { T } from "./translations";

type RGB = [number, number, number];
type Colors = { bg: RGB; fg: RGB };

/** jsPDF ne sait pas rendre l'espace fine Unicode ( ) produite par
 *  Intl.NumberFormat('fr-FR') — elle s'affiche en "/" dans le PDF.
 *  On utilise l'espace insécable (Latin-1) à la place. */
function fmt(amount: number): string {
  const rounded = Math.round(amount);
  return rounded.toLocaleString("en-US").replace(/,/g, " ") + " FCFA";
}

/** Characters of WinAnsi outside Latin-1 (0x80–0x9F), supported by Helvetica. */
const WIN_ANSI_EXTRA = new Set(Array.from("€‚ƒ„…†‡ˆ‰Š‹ŒŽ‘’“”•–—˜™š›œžŸ"));
const REPLACEMENTS: Record<string, string> = {
  " ": " ", // narrow no-break space (Intl fr-FR)
  " ": " ", // thin space
  " ": " ", // figure space
  " ": " ", " ": " ", " ": " ", " ": " ",
  "‐": "-", "‑": "-", "−": "-",
  "≈": "~", "→": "->", "←": "<-", "≤": "<=", "≥": ">=",
};

/** Makes a string printable with jsPDF's built-in fonts; unsupported symbols (⚠, emoji…) are removed. */
export function pdfSafe(text: string): string {
  let out = "";
  for (const ch of text.normalize("NFC")) {
    const mapped = REPLACEMENTS[ch];
    if (mapped !== undefined) {
      out += mapped;
      continue;
    }
    const code = ch.codePointAt(0)!;
    if ((code >= 0x20 && code <= 0x7e) || (code >= 0xa0 && code <= 0xff) || WIN_ANSI_EXTRA.has(ch)) out += ch;
  }
  return out.trim();
}

/* ── Page geometry (mm) ─────────────────────────────── */
const W = 210;
const H = 297;
const MARGIN = 14;
const COL = W - MARGIN * 2;
const FOOTER_TOP = H - 15.5;
/** Lowest y content may reach; below is the footer. */
const BOTTOM = FOOTER_TOP - 5;
/** First content y on continuation pages (below the running header). */
const NEXT_PAGE_TOP = 20;
const PT = 0.3528; // mm per point

const lineHeight = (size: number) => size * PT * 1.38;
/** Baseline offset from the top of a line box. */
const ascent = (size: number) => size * PT;

/* ── Colours ────────────────────────────────────────── */
const GREEN: RGB = [0, 61, 36];
const MID_GREEN: RGB = [0, 90, 54];
const GOLD: RGB = [252, 209, 22];
const WHITE: RGB = [255, 255, 255];
const LIGHT: RGB = [243, 246, 249];
const DARK: RGB = [15, 23, 42];
const MUTED: RGB = [100, 116, 139];
const BORDER: RGB = [203, 213, 225];
const HAIRLINE: RGB = [226, 232, 240];
const PALE_GREEN: RGB = [200, 220, 200];
const TOTAL_BG: RGB = [220, 240, 225];
const AMBER: Colors = { bg: [254, 243, 199], fg: [146, 64, 14] };
const RED: Colors = { bg: [254, 226, 226], fg: [153, 27, 27] };
const SOFT_GREEN: Colors = { bg: [220, 252, 231], fg: [22, 101, 52] };
const PAID: Colors = { bg: [22, 163, 74], fg: WHITE };
const SLATE: Colors = { bg: [241, 245, 249], fg: [51, 65, 85] };
const TAG: Record<LineBasis, Colors> = { declared: SLATE, estimated: AMBER, actual: SOFT_GREEN };

type Style = "normal" | "bold";

/** jsPDF document with a cursor `y` and automatic page breaks. */
class Writer {
  readonly doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  y = 0;

  constructor(private readonly runningTitle: string) {}

  font(size: number, style: Style = "normal", color: RGB = DARK) {
    this.doc.setFont("helvetica", style);
    this.doc.setFontSize(size);
    this.doc.setTextColor(color[0], color[1], color[2]);
  }
  fill(c: RGB) {
    this.doc.setFillColor(c[0], c[1], c[2]);
  }
  stroke(c: RGB, width: number) {
    this.doc.setDrawColor(c[0], c[1], c[2]);
    this.doc.setLineWidth(width);
  }
  text(s: string, x: number, baseline: number, align?: "left" | "right" | "center") {
    this.doc.text(pdfSafe(s), x, baseline, align ? { align } : undefined);
  }
  width(s: string) {
    return this.doc.getTextWidth(pdfSafe(s));
  }
  /** Lines of `s` for the given font and width. */
  wrap(s: string, width: number, size: number, style: Style = "normal"): string[] {
    this.doc.setFont("helvetica", style);
    this.doc.setFontSize(size);
    return this.doc.splitTextToSize(pdfSafe(s), width) as string[];
  }
  textHeight(s: string, width: number, size: number, style: Style = "normal") {
    return this.wrap(s, width, size, style).length * lineHeight(size);
  }

  /** Starts a new page when `h` mm do not fit above the footer. */
  ensure(h: number) {
    if (this.y + h > BOTTOM) this.newPage();
  }
  newPage() {
    this.doc.addPage();
    this.fill(GREEN);
    this.doc.rect(0, 0, W, 12, "F");
    this.fill(GOLD);
    this.doc.rect(0, 12, W, 1.2, "F");
    this.font(11, "bold", GOLD);
    this.text("SIMDOUANE", MARGIN, 8);
    this.font(8, "normal", WHITE);
    this.text(this.runningTitle, W - MARGIN, 8, "right");
    this.y = NEXT_PAGE_TOP;
  }

  /** Wrapped text; may continue on the next page line by line. */
  paragraph(s: string, o: { size?: number; style?: Style; color?: RGB; x?: number; width?: number; after?: number } = {}) {
    const size = o.size ?? 8;
    const style = o.style ?? "normal";
    const color = o.color ?? MUTED;
    const x = o.x ?? MARGIN;
    const lines = this.wrap(s, o.width ?? COL - (x - MARGIN), size, style);
    const lh = lineHeight(size);
    for (const line of lines) {
      this.ensure(lh);
      this.font(size, style, color);
      this.text(line, x, this.y + ascent(size));
      this.y += lh;
    }
    this.y += o.after ?? 0;
  }

  /** Coloured box with an optional title; kept on one page. */
  callout(body: string, c: Colors, o: { title?: string; size?: number; style?: Style; after?: number } = {}) {
    const size = o.size ?? 8;
    const style = o.style ?? "normal";
    const padX = 4;
    const padY = 3;
    const lines = this.wrap(body, COL - padX * 2, size, style);
    const titleH = o.title ? lineHeight(9) + 0.6 : 0;
    const h = padY * 2 + titleH + lines.length * lineHeight(size);
    this.ensure(h);
    this.fill(c.bg);
    this.stroke(c.fg, 0.3);
    this.doc.roundedRect(MARGIN, this.y, COL, h, 2, 2, "FD");
    let ty = this.y + padY;
    if (o.title) {
      this.font(9, "bold", c.fg);
      this.text(o.title, MARGIN + padX, ty + ascent(9));
      ty += titleH;
    }
    this.font(size, style, c.fg);
    for (const line of lines) {
      this.text(line, MARGIN + padX, ty + ascent(size));
      ty += lineHeight(size);
    }
    this.y += h + (o.after ?? 3);
  }

  /** Small label ("estimé", "payé"…); returns its width. */
  pill(label: string, x: number, top: number, c: Colors): number {
    this.font(6.5, "bold", c.fg);
    const w = this.width(label) + 3;
    this.fill(c.bg);
    this.doc.roundedRect(x, top, w, 3.8, 1, 1, "F");
    this.text(label, x + 1.5, top + 2.72);
    return w;
  }

  /** Section title with its underline, kept with the next `keepWith` mm. */
  sectionTitle(title: string, keepWith: number) {
    this.ensure(10 + keepWith);
    this.font(11, "bold", DARK);
    this.text(title, MARGIN, this.y + ascent(11));
    this.y += lineHeight(11) + 0.6;
    this.stroke(GREEN, 0.5);
    this.doc.line(MARGIN, this.y, MARGIN + 50, this.y);
    this.y += 4;
  }

  /** Footer (© line and contact, disclaimer, page number) on every page. */
  footers() {
    const n = this.doc.getNumberOfPages();
    for (let i = 1; i <= n; i++) {
      this.doc.setPage(i);
      this.fill(GOLD);
      this.doc.rect(0, FOOTER_TOP, W, 1.5, "F");
      this.fill(GREEN);
      this.doc.rect(0, H - 14, W, 14, "F");
      this.font(7, "normal", WHITE);
      this.text("© 2026 SimDouane Bénin — Créé par HAZOUME AKUEGNON Clarence Alvin", MARGIN, H - 8.5);
      this.text("+229 56 50 13 48  |  hazoumeclarence@gmail.com", W - MARGIN, H - 8.5, "right");
      this.font(6.5, "normal", PALE_GREEN);
      this.text(T.fr.layout.disclaimer, MARGIN, H - 4.5);
      this.text(`Page ${i} / ${n}`, W - MARGIN, H - 4.5, "right");
    }
  }
}

function amountText(c: CifComponent): string {
  if (c.currency === "XOF") return fmt(c.amount);
  return `${new Intl.NumberFormat("fr-FR").format(c.amount)} ${c.currency} = ${fmt(c.valeurXof)}`;
}

export function exportSimulationPDF(simulation: HistoryEntry): void {
  const t = T.fr.results;
  const { input, result } = simulation;

  /* ── Same figures as the results page ─────────────── */
  const value = simulation.valueInput ?? legacyValue(input.valeurCIF);
  // Older simulations (before phases S2 and S6): one CIF line, nothing paid.
  const budget = buildBudget(simulation.situation ?? "not_arrived", value, result, simulation.paid ?? NOTHING_PAID);
  const lineOf = (key: BudgetLine["key"]) => budget.lines.find((l) => l.key === key)!;
  const customsLine = lineOf("customs");
  const portLine = lineOf("port");
  const vehicleLines = budget.lines.filter((l) => l.key !== "customs" && l.key !== "port");
  const vehicleAmount = vehicleLines.reduce((s, l) => s + (l.amount ?? 0), 0);
  const vehiclePaid = vehicleLines.reduce((s, l) => s + l.paid, 0);
  const vehicleAllPaid = vehicleLines.length > 0 && vehicleLines.every((l) => l.amount === null || l.paid === l.amount) && vehiclePaid > 0;
  const paidKeys = new Set<string>(vehicleLines.filter((l) => l.amount !== null && l.paid === l.amount && l.paid > 0).map((l) => l.key));
  const usesActual = customsLine.basis === "actual" || portLine.basis === "actual";
  const showPaid = budget.situation !== "not_arrived" || budget.paid > 0;
  const isEnlevement = input.regime === "Enlèvement direct";
  const hypotheses = buildHypotheses(simulation, value, "fr");

  const vehicleName = `${input.marque} ${input.modele}`;
  const w = new Writer(`Résultats de simulation — ${vehicleName} (${input.annee})`);
  const doc = w.doc;

  const tags = (basis: LineBasis, paid: boolean, partlyPaid?: number) => {
    const list: Array<{ label: string; c: Colors }> = [{ label: t.basisTags[basis], c: TAG[basis] }];
    if (paid) list.push({ label: t.paidTag, c: PAID });
    else if (partlyPaid !== undefined && partlyPaid > 0) list.push({ label: t.paidPartly(fmt(partlyPaid)), c: SOFT_GREEN });
    return list;
  };

  /** Category band (title, tags, amount), kept with its detail of `detailH` mm. */
  const category = (title: string, amount: number, tagList: ReturnType<typeof tags>, detailH: number) => {
    const h = 13;
    w.ensure(h + 3 + detailH);
    w.fill(LIGHT);
    doc.rect(MARGIN, w.y, COL, h, "F");
    w.fill(GREEN);
    doc.rect(MARGIN, w.y, 1.6, h, "F");
    w.font(10, "bold", DARK);
    w.text(title, MARGIN + 5, w.y + 5.4);
    w.text(fmt(amount), W - MARGIN - 4, w.y + 5.4, "right");
    let x = MARGIN + 5;
    for (const tag of tagList) x += w.pill(tag.label, x, w.y + 7.4, tag.c) + 1.5;
    w.y += h + 3;
  };

  const ROW = 7;
  /** One table row: optional background, then the caller draws its cells at `baseline`. */
  const tableRow = (bg: RGB | null, height: number, draw: (baseline: number) => void) => {
    if (bg) {
      w.fill(bg);
      doc.rect(MARGIN, w.y, COL, height, "F");
    }
    draw(w.y + height / 2 + 1.1);
    w.y += height;
  };

  /* ── Header (page 1) ──────────────────────────────── */
  w.fill(GREEN);
  doc.rect(0, 0, W, 32, "F");
  w.fill(GOLD);
  doc.rect(0, 32, W, 2, "F");
  w.font(22, "bold", GOLD);
  w.text("SIMDOUANE", MARGIN, 16);
  w.font(8, "normal", WHITE);
  w.text("Simulateur de droits et frais douaniers — Port de Cotonou, Bénin", MARGIN, 23);
  w.font(13, "bold", GOLD);
  w.text("Résultats de simulation", W - MARGIN, 15, "right");
  const simDate = simulation.date ? formatRateDate(simulation.date.slice(0, 10)) : null;
  const generated = new Date().toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" });
  w.font(8, "normal", WHITE);
  if (simDate) w.text(`Simulation du ${simDate}`, W - MARGIN, 22, "right");
  w.font(7.5, "normal", PALE_GREEN);
  w.text(`Document généré le ${generated}`, W - MARGIN, simDate ? 27 : 22, "right");
  w.y = 40;

  /* ── Vehicle ──────────────────────────────────────── */
  w.fill(LIGHT);
  doc.roundedRect(MARGIN, w.y, COL, 18, 3, 3, "F");
  w.font(14, "bold", DARK);
  w.text(vehicleName, MARGIN + 5, w.y + 7.5);
  const cyl = T.fr.sim.cylOptions[input.cylindree]?.label;
  const details = [`Année ${input.annee}`, input.carburant, ...(cyl ? [cyl] : [])].join("  ·  ");
  w.font(9, "normal", MUTED);
  w.text(details, MARGIN + 5, w.y + 13.8);
  const ageColors: Colors = result.riskLevel === "faible" ? { bg: GREEN, fg: WHITE }
    : result.riskLevel === "moyen" ? { bg: GOLD, fg: DARK }
    : { bg: [220, 38, 38], fg: WHITE };
  w.font(9, "normal", MUTED);
  w.pill(`${result.ageVehicule} ans`, MARGIN + 5 + w.width(details) + 3, w.y + 11, ageColors);
  w.y += 18 + 4;

  /* ── Age warnings ─────────────────────────────────── */
  if (result.riskLevel === "eleve") w.callout(t.warnOld(result.ageVehicule), RED, { style: "bold" });
  if (result.riskLevel === "moyen") w.callout(t.warnMid(result.ageVehicule), AMBER, { style: "bold" });

  /* ── What it costs ────────────────────────────────── */
  {
    const inner = COL - 10;
    const subtitle = `${t.totalSubtitle} (${t.situationLabels[budget.situation]})`;
    const engine = usesActual ? t.engineEstimate(fmt(result.totalGeneral)) : null;
    const incomplete = budget.missing.length > 0
      ? t.budgetIncomplete(budget.missing.map((m) => t.lineNames[m].toLowerCase()).join(" et "))
      : null;
    const h = 5 + lineHeight(8.5) + 10 + w.textHeight(subtitle, inner, 8)
      + (engine ? 1 + w.textHeight(engine, inner, 7.5) : 0)
      + (showPaid ? 3 + 14 : 0)
      + (incomplete ? 3 + w.textHeight(incomplete, inner, 8, "bold") : 0)
      + 5;
    w.ensure(h);
    const top = w.y;
    w.fill(WHITE);
    w.stroke(BORDER, 0.3);
    doc.rect(MARGIN, top, COL, h, "FD");
    w.fill(GREEN);
    doc.rect(MARGIN, top, COL, 1.5, "F");
    w.y = top + 5;
    w.paragraph(t.costQuestion, { size: 8.5, style: "bold", color: MUTED, x: MARGIN + 5, width: inner });
    w.font(22, "bold", GREEN);
    w.text(fmt(budget.total), MARGIN + 5, w.y + 8);
    w.y += 10;
    w.paragraph(subtitle, { size: 8, x: MARGIN + 5, width: inner });
    if (engine) {
      w.y += 1;
      w.paragraph(engine, { size: 7.5, x: MARGIN + 5, width: inner });
    }
    if (showPaid) {
      w.y += 3;
      const boxW = (inner - 4) / 2;
      w.fill(SOFT_GREEN.bg);
      w.stroke([187, 247, 208], 0.3);
      doc.roundedRect(MARGIN + 5, w.y, boxW, 14, 2, 2, "FD");
      w.font(7.5, "normal", SOFT_GREEN.fg);
      w.text(t.budgetPaid, MARGIN + 9, w.y + 5);
      w.font(11, "bold", [20, 83, 45]);
      w.text(fmt(budget.paid), MARGIN + 9, w.y + 11);
      w.fill(MID_GREEN);
      doc.roundedRect(MARGIN + 9 + boxW, w.y, boxW, 14, 2, 2, "F");
      w.font(7.5, "normal", PALE_GREEN);
      w.text(t.budgetRemaining, MARGIN + 13 + boxW, w.y + 5);
      w.font(11, "bold", WHITE);
      w.text(fmt(budget.remaining), MARGIN + 13 + boxW, w.y + 11);
      w.y += 14;
    }
    if (incomplete) {
      w.y += 3;
      w.paragraph(incomplete, { size: 8, style: "bold", color: AMBER.fg, x: MARGIN + 5, width: inner });
    }
    w.y = top + h + 5;
  }

  /* ── a. Vehicle (customs value) ───────────────────── */
  {
    const x0 = MARGIN + 5;
    const rateWidth = COL - 16;
    const rows = [
      ...value.components.map((c) => ({
        key: c.kind as string,
        label: t.componentNames[c.kind],
        text: amountText(c),
        rate: c.conversion ? rateLabel(c.conversion, "fr") : null,
        missing: false,
      })),
      ...value.missing.map((part) => ({ key: part as string, label: t.componentNames[part], text: t.notProvided, rate: null, missing: true })),
    ];
    const rowH = (rate: string | null) => 6.5 + (rate ? w.textHeight(rate, rateWidth, 7) + 0.5 : 0);
    const warning = value.mode === "price" && value.missing.length > 0 ? t.cifPartialResult
      : value.mode === "total" ? t.totalWarningResult
      : null;
    const detailH = 6.5 + rows.reduce((s, r) => s + rowH(r.rate), 0) + (warning ? 2 + w.textHeight(warning, COL - 10, 8, "bold") : 0);

    category(t.catVehicle, vehicleAmount, tags("declared", vehicleAllPaid, vehiclePaid), detailH);

    w.font(8.5, "bold", DARK);
    const basisLabel = `${t.basisTitle} :`;
    w.text(basisLabel, x0, w.y + 4);
    const bx = x0 + w.width(basisLabel) + 1.3;
    w.font(8.5, "normal", MUTED);
    w.text(t.basisModes[value.mode], bx, w.y + 4);
    w.y += 6.5;

    for (const r of rows) {
      w.stroke(HAIRLINE, 0.2);
      doc.line(x0, w.y, W - MARGIN - 4, w.y);
      w.font(8.5, "normal", MUTED);
      w.text(r.label, x0, w.y + 4.5);
      if (paidKeys.has(r.key)) w.pill(t.paidTag, x0 + w.width(r.label) + 2, w.y + 1.6, PAID);
      w.font(8.5, "bold", r.missing ? AMBER.fg : DARK);
      w.text(r.text, W - MARGIN - 4, w.y + 4.5, "right");
      w.y += 6.5;
      if (r.rate) {
        w.paragraph(r.rate, { size: 7, color: MUTED, x: x0 + 3, width: rateWidth, after: 0.5 });
      }
    }
    if (warning) {
      w.y += 2;
      w.paragraph(warning, { size: 8, style: "bold", color: AMBER.fg, x: x0, width: COL - 10 });
    }
    w.y += 4;
  }

  /* ── b. Customs duties and taxes ──────────────────── */
  {
    const douaneRows = [
      { id: "DD", nom: "Droit de Douane", base: input.valeurCIF, taux: result.ddRateLabel, montant: result.DD },
      { id: "RS", nom: "Redevance Statistique", base: input.valeurCIF, taux: "1%", montant: result.RS },
      { id: "PC", nom: "Prélèvement CEDEAO", base: input.valeurCIF, taux: "0,5%", montant: result.PC },
      { id: "PCS", nom: "Prélèv. Communautaire de Solidarité (UEMOA)", base: input.valeurCIF, taux: "0,8%", montant: result.PCS },
      { id: "TVA", nom: "Taxe sur la Valeur Ajoutée", base: result.baseTVA, taux: "18%", montant: result.TVA },
    ];
    const estimate = customsLine.estimate !== undefined ? t.estimateWas(fmt(customsLine.estimate)) : null;
    const baseTva = `Base TVA = CIF + DD + RS + PC + PCS = ${fmt(result.baseTVA)}`;
    const detailH = (estimate ? lineHeight(8) + 2 : 0) + ROW * (douaneRows.length + 2) + 2 + lineHeight(7.5);

    category(t.catCustoms, customsLine.amount ?? 0, tags(customsLine.basis, customsLine.paid > 0), detailH);
    if (estimate) w.paragraph(estimate, { size: 8, x: MARGIN + 5, after: 2 });

    const xBase = MARGIN + 128;
    const xRate = MARGIN + 145;
    const xAmount = W - MARGIN - 3;
    tableRow(GREEN, ROW, (b) => {
      w.font(7.5, "bold", WHITE);
      w.text("Taxe", MARGIN + 3, b);
      w.text("Base", xBase, b, "right");
      w.text("Taux", xRate, b, "center");
      w.text("Montant", xAmount, b, "right");
    });
    douaneRows.forEach((row, i) => {
      tableRow(i % 2 === 0 ? LIGHT : null, ROW, (b) => {
        w.font(7.5, "bold", DARK);
        w.text(row.id, MARGIN + 3, b);
        w.font(7.5, "normal", MUTED);
        w.text(row.nom, MARGIN + 15, b);
        w.text(fmt(row.base), xBase, b, "right");
        w.font(7.5, "normal", DARK);
        w.text(row.taux, xRate, b, "center");
        w.font(7.5, "bold", DARK);
        w.text(fmt(row.montant), xAmount, b, "right");
      });
    });
    tableRow(TOTAL_BG, ROW, (b) => {
      w.font(8, "bold", GREEN);
      w.text(t.totalCustoms, MARGIN + 3, b);
      w.text(fmt(result.totalDouane), xAmount, b, "right");
    });
    w.y += 2;
    w.paragraph(baseTva, { size: 7.5, x: MARGIN + 3 });
    w.y += 4;
  }

  /* ── c. Port, formalities and broker ──────────────── */
  {
    const portRows = [
      { nom: "Magasinage", detail: `${input.joursAuPort} j × 3 500 FCFA`, montant: result.magasinage },
      { nom: "Manutention", detail: "", montant: result.manutention },
      { nom: "Contrôle Bénin", detail: "", montant: result.beninControl },
      { nom: "SEGUB", detail: "", montant: result.segub },
      { nom: "Frais GUCE", detail: "Guichet Unique", montant: result.fraisGUCE },
    ];
    const portSubtotal = portRows.reduce((s, r) => s + r.montant, 0);
    const estimate = portLine.estimate !== undefined ? t.estimateWas(fmt(portLine.estimate)) : null;
    const SUB = 6;
    const enlevH = isEnlevement ? 6 + w.textHeight(t.directEnlev, COL - 8, 8) + 3 : 0;
    const detailH = (estimate ? lineHeight(8) + 2 : 0) + enlevH + SUB * 2 + ROW * (portRows.length + 3);

    category(t.catPort, portLine.amount ?? 0, tags(portLine.basis, portLine.paid > 0), detailH);
    if (estimate) w.paragraph(estimate, { size: 8, x: MARGIN + 5, after: 2 });
    if (isEnlevement) w.callout(t.directEnlev, { bg: TOTAL_BG, fg: GREEN });

    const xAmount = W - MARGIN - 3;
    const subHeader = (label: string) => tableRow(HAIRLINE, SUB, (b) => {
      w.font(7.5, "bold", DARK);
      w.text(label, MARGIN + 3, b);
    });
    subHeader(t.subPort);
    portRows.forEach((row) => {
      tableRow(null, ROW, (b) => {
        w.font(7.5, "bold", DARK);
        w.text(row.nom, MARGIN + 3, b);
        if (row.detail) {
          const x = MARGIN + 3 + w.width(row.nom) + 2;
          w.font(7, "normal", MUTED);
          w.text(`(${row.detail})`, x, b);
        }
        w.font(7.5, "normal", DARK);
        w.text(fmt(row.montant), xAmount, b, "right");
      });
      w.stroke(HAIRLINE, 0.2);
      doc.line(MARGIN, w.y, W - MARGIN, w.y);
    });
    tableRow(LIGHT, ROW, (b) => {
      w.font(7.5, "normal", MUTED);
      w.text(t.subPort, xAmount - 32, b, "right");
      w.font(7.5, "bold", DARK);
      w.text(fmt(portSubtotal), xAmount, b, "right");
    });
    subHeader(t.subBroker);
    tableRow(null, ROW, (b) => {
      w.font(7.5, "bold", DARK);
      w.text("Frais CAD", MARGIN + 3, b);
      w.font(7.5, "normal", DARK);
      w.text(fmt(result.fraisCAD), xAmount, b, "right");
    });
    tableRow(TOTAL_BG, ROW, (b) => {
      w.font(8, "bold", GREEN);
      w.text(t.totalPort, MARGIN + 3, b);
      w.text(fmt(result.totalPort), xAmount, b, "right");
    });
    w.y += 4;
  }

  /* ── Total import cost ────────────────────────────── */
  w.ensure(16);
  w.fill(GREEN);
  doc.roundedRect(MARGIN, w.y, COL, 16, 3, 3, "F");
  w.fill(GOLD);
  doc.roundedRect(MARGIN, w.y, 4, 16, 2, 2, "F");
  w.font(10, "bold", WHITE);
  w.text(t.grandTotal, MARGIN + 9, w.y + 9.6);
  w.font(15, "bold", WHITE);
  w.text(fmt(budget.total), W - MARGIN - 5, w.y + 10.2, "right");
  w.y += 16 + 7;

  /* ── After the port: not included ─────────────────── */
  {
    const items: Array<[string, number]> = [[t.technical, 20_000], [t.carte, 45_000], [t.insurance, 60_000], [t.plates, 12_000]];
    const noteH = w.textHeight(t.postPortNote, COL, 7.5);
    w.sectionTitle(t.postPort, items.length * 5.5 + 9 + noteH);
    for (const [label, amount] of items) {
      w.font(8.5, "normal", MUTED);
      w.text(label, MARGIN, w.y + 4);
      w.text(`~${fmt(amount)}`, W - MARGIN, w.y + 4, "right");
      w.y += 5.5;
    }
    w.y += 1;
    w.stroke(BORDER, 0.3);
    doc.line(MARGIN, w.y, W - MARGIN, w.y);
    w.y += 1;
    w.font(9, "bold", DARK);
    w.text(t.toRide, MARGIN, w.y + 4.5);
    w.text(`~${fmt(137_000)}`, W - MARGIN, w.y + 4.5, "right");
    w.y += 7;
    w.paragraph(t.postPortNote, { size: 7.5 });
    w.y += 6;
  }

  /* ── Assumptions and warnings (same list as the page) ─ */
  {
    const BULLET_X = MARGIN + 5;
    const bulletWidth = COL - 5;
    const itemHeight = (h: (typeof hypotheses)[number]) => h.key === "indicative"
      ? 6 + lineHeight(9) + 0.6 + w.textHeight(h.text, COL - 8, 8.5) + 3
      : w.textHeight(h.text, bulletWidth, 8, h.strong ? "bold" : "normal") + 1.6;
    w.sectionTitle(t.hypothesesTitle, hypotheses.length > 0 ? itemHeight(hypotheses[0]) : 0);
    for (const h of hypotheses) {
      if (h.key === "indicative") {
        // The disclaimer: highlighted box, never cut.
        w.callout(h.text, AMBER, { title: t.warning, size: 8.5 });
        continue;
      }
      const style: Style = h.strong ? "bold" : "normal";
      const color = h.strong ? AMBER.fg : MUTED;
      w.ensure(itemHeight(h));
      w.fill(color);
      doc.circle(MARGIN + 1.6, w.y + lineHeight(8) / 2 + 0.1, 0.7, "F");
      w.paragraph(h.text, { size: 8, style, color, x: BULLET_X, width: bulletWidth, after: 1.6 });
    }
  }

  w.footers();

  const filename = `SimDouane_${input.marque}_${input.modele}_${input.annee}.pdf`
    .replace(/[\\/:*?"<>|]/g, "")
    .replace(/\s+/g, "_");
  doc.save(filename);
}
