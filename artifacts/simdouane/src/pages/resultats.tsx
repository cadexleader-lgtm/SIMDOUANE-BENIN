import { useEffect, useState, type ReactNode } from "react";
import { useLocation } from "wouter";
import { Info, AlertTriangle, ArrowLeft, CheckCircle2, Download } from "lucide-react";
import { getCurrentSimulation, HistoryEntry } from "@/lib/history";
import { formatFCFA } from "@/lib/utils";
import { CifBasis } from "@/components/cif-basis";
import { buildBudget, legacyValue, NOTHING_PAID, type BudgetLine, type LineBasis } from "@/lib/budget";
import { buildHypotheses } from "@/lib/result-hypotheses";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from "@/components/ui/tooltip";
import { exportSimulationPDF } from "@/lib/export-pdf";
import { useLang } from "@/context/language-context";
import { T } from "@/lib/translations";

type Lang = "fr" | "en";

const TAG_STYLE: Record<LineBasis, string> = {
  declared: "bg-slate-100 text-slate-700",
  estimated: "bg-amber-100 text-amber-800",
  actual: "bg-green-100 text-green-800",
};

function Tags({ basis, paid, partlyPaid, lang }: { basis: LineBasis; paid: boolean; partlyPaid?: number; lang: Lang }) {
  const t = T[lang].results;
  return (
    <span className="inline-flex flex-wrap gap-1">
      <span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${TAG_STYLE[basis]}`}>{t.basisTags[basis]}</span>
      {paid && <span className="rounded px-1.5 py-0.5 text-[10px] font-semibold bg-green-600 text-white">{t.paidTag}</span>}
      {!paid && partlyPaid !== undefined && partlyPaid > 0 && (
        <span className="rounded px-1.5 py-0.5 text-[10px] font-semibold bg-green-100 text-green-800">{t.paidPartly(formatFCFA(partlyPaid))}</span>
      )}
    </span>
  );
}

/** One cost category: title, tags and amount; the detail opens on demand. */
function Category({ value, title, amount, tags, testId, children }: {
  value: string; title: string; amount: number; tags: ReactNode; testId: string; children: ReactNode;
}) {
  return (
    <AccordionItem value={value} className="border-t">
      <AccordionTrigger className="px-5 sm:px-6 py-4 hover:no-underline hover:bg-muted/40" data-testid={testId}>
        <span className="flex flex-1 items-start justify-between gap-3 pr-2 text-left">
          <span className="space-y-1">
            <span className="block font-semibold text-sm">{title}</span>
            {tags}
          </span>
          <span className="font-bold text-sm whitespace-nowrap">{formatFCFA(amount)}</span>
        </span>
      </AccordionTrigger>
      <AccordionContent className="px-5 sm:px-6 pb-5 pt-1">{children}</AccordionContent>
    </AccordionItem>
  );
}

export default function Resultats() {
  const [, setLocation] = useLocation();
  const [simulation, setSimulation] = useState<HistoryEntry | null>(null);
  const { lang } = useLang();
  const t = T[lang].results;

  useEffect(() => {
    const current = getCurrentSimulation();
    if (!current) setLocation("/simulateur");
    else setSimulation(current);
  }, [setLocation]);

  if (!simulation) return null;

  const { input, result } = simulation;
  const basis = simulation.valueInput;
  const value = basis ?? legacyValue(input.valeurCIF);
  // Older simulations (before phases S2 and S6): one CIF line, nothing paid.
  const budget = buildBudget(simulation.situation ?? "not_arrived", value, result, simulation.paid ?? NOTHING_PAID);
  const lineOf = (key: BudgetLine["key"]) => budget.lines.find((l) => l.key === key)!;
  const customsLine = lineOf("customs");
  const portLine = lineOf("port");
  const vehicleLines = budget.lines.filter((l) => l.key !== "customs" && l.key !== "port");
  const vehicleAmount = vehicleLines.reduce((s, l) => s + (l.amount ?? 0), 0);
  const vehiclePaid = vehicleLines.reduce((s, l) => s + l.paid, 0);
  const vehicleAllPaid = vehicleLines.length > 0 && vehicleLines.every((l) => l.amount === null || l.paid === l.amount) && vehiclePaid > 0;
  const paidKeys = vehicleLines.filter((l) => l.amount !== null && l.paid === l.amount && l.paid > 0).map((l) => l.key);
  const usesActual = customsLine.basis === "actual" || portLine.basis === "actual";
  const showPaid = budget.situation !== "not_arrived" || budget.paid > 0;

  const age = `${result.ageVehicule} ${lang === "fr" ? "ans" : "yrs"}`;
  const ageCls = result.riskLevel === "faible" ? "bg-primary text-primary-foreground"
    : result.riskLevel === "moyen" ? "bg-secondary text-secondary-foreground"
    : "bg-destructive text-destructive-foreground";
  const isEnlevement = input.regime === "Enlèvement direct";

  const douaneRows = [
    { id: "DD",  nom: lang === "fr" ? "Droit de Douane"                   : "Customs Duty",             base: input.valeurCIF, taux: result.ddRateLabel, montant: result.DD,  tooltip: `${lang === "fr" ? "Taxe principale à l'importation" : "Main import tax"}. ${result.ddRateLabel}.` },
    { id: "RS",  nom: lang === "fr" ? "Redevance Statistique"              : "Statistical Fee",           base: input.valeurCIF, taux: "1%",              montant: result.RS,  tooltip: lang === "fr" ? "Finance les statistiques douanières — 1% de la valeur CIF." : "Funds customs statistics — 1% of CIF value." },
    { id: "PC",  nom: lang === "fr" ? "Prélèvement CEDEAO"                 : "ECOWAS Levy",               base: input.valeurCIF, taux: "0,5%",           montant: result.PC,  tooltip: lang === "fr" ? "Contribution CEDEAO — 0,5% de la valeur CIF." : "ECOWAS contribution — 0.5% of CIF value." },
    { id: "PCS", nom: lang === "fr" ? "Prélèv. Communautaire de Solidarité (UEMOA)": "WAEMU Community Solidarity Levy", base: input.valeurCIF, taux: "0,8%",           montant: result.PCS, tooltip: lang === "fr" ? "Prélèvement de l'UEMOA (Union économique et monétaire ouest-africaine) — 0,8% de la valeur CIF." : "WAEMU (West African Economic and Monetary Union) levy — 0.8% of CIF value." },
    { id: "TVA", nom: lang === "fr" ? "Taxe sur la Valeur Ajoutée"         : "Value Added Tax",           base: result.baseTVA,  taux: "18%",            montant: result.TVA, tooltip: `${lang === "fr" ? "Base TVA" : "VAT base"} = ${formatFCFA(result.baseTVA)}` },
  ];

  // Port and formalities on one side, the broker's fee on the other (same amounts as the engine).
  const portRows = [
    { nom: lang === "fr" ? "Magasinage"     : "Storage",       detail: `${input.joursAuPort} ${lang === "fr" ? "j" : "d"} × 3 500 FCFA`, montant: result.magasinage },
    { nom: lang === "fr" ? "Manutention"    : "Handling",      detail: "",                                                                montant: result.manutention },
    { nom: lang === "fr" ? "Contrôle Bénin" : "Benin Control", detail: "",                                                                montant: result.beninControl },
    { nom: "SEGUB",                          detail: "",                                                                                  montant: result.segub },
    { nom: lang === "fr" ? "Frais GUCE"     : "GUCE Fees",     detail: lang === "fr" ? "Guichet Unique" : "Single Window",               montant: result.fraisGUCE },
  ];
  const portSubtotal = portRows.reduce((s, r) => s + r.montant, 0);

  // Shared with the PDF export (same list, same order, same texts).
  const hypotheses = buildHypotheses(simulation, value, lang);

  return (
    <TooltipProvider delayDuration={300}>
      <div className="max-w-3xl mx-auto space-y-5 pb-10">

        {/* Header: title, vehicle, PDF */}
        <div className="flex items-start gap-2 sm:gap-3">
          <Button variant="ghost" size="icon" onClick={() => setLocation("/simulateur")} data-testid="button-back" className="shrink-0">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl sm:text-3xl font-bold">{t.title}</h1>
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-1 text-sm text-muted-foreground">
              <span className="font-semibold text-foreground" data-testid="vehicle-title">{input.marque} {input.modele}</span>
              <span>· {input.annee}</span>
              <span>· {input.carburant}</span>
              <Badge className={`${ageCls} font-semibold px-2 py-0`} data-testid="badge-age">{age}</Badge>
            </div>
          </div>
          <Button
            onClick={() => exportSimulationPDF(simulation)}
            className="gap-2 shrink-0"
            style={{ backgroundColor: "#003D24" }}
            data-testid="button-pdf"
          >
            <Download className="h-4 w-4" />
            <span className="hidden sm:inline">{t.download}</span>
            <span className="sm:hidden">{t.pdf}</span>
          </Button>
        </div>

        {/* Age warnings stay visible */}
        {result.riskLevel === "eleve" && (
          <div className="rounded-xl bg-destructive/10 border border-destructive/20 px-4 py-3 flex items-start gap-3 text-destructive" data-testid="warning-ancien">
            <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" />
            <p className="text-sm font-medium">{t.warnOld(result.ageVehicule)}</p>
          </div>
        )}
        {result.riskLevel === "moyen" && (
          <div className="rounded-xl bg-secondary/10 border border-secondary/20 px-4 py-3 flex items-start gap-3 text-yellow-700 dark:text-yellow-500" data-testid="warning-moyen">
            <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" />
            <p className="text-sm font-medium">{t.warnMid(result.ageVehicule)}</p>
          </div>
        )}

        {/* What it costs */}
        <Card className="border-t-4 border-t-primary shadow-md overflow-hidden" data-testid="cost-card">
          <div className="p-5 sm:p-6 space-y-4">
            <div data-testid="total-general">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t.costQuestion}</p>
              <p className="text-3xl sm:text-4xl font-black text-primary mt-1" data-testid="budget-total">{formatFCFA(budget.total)}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {t.totalSubtitle} <span className="font-medium">({t.situationLabels[budget.situation]})</span>
              </p>
              {usesActual && (
                <p className="text-[11px] text-muted-foreground mt-1" data-testid="engine-estimate">{t.engineEstimate(formatFCFA(result.totalGeneral))}</p>
              )}
            </div>
            {showPaid && (
              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-lg bg-green-50 border border-green-200 p-3">
                  <p className="text-[11px] text-green-800">{t.budgetPaid}</p>
                  <p className="font-bold text-green-900" data-testid="budget-paid">{formatFCFA(budget.paid)}</p>
                </div>
                <div className="rounded-lg p-3 text-white" style={{ backgroundColor: "#005A36" }}>
                  <p className="text-[11px] opacity-80">{t.budgetRemaining}</p>
                  <p className="font-bold" data-testid="budget-remaining">{formatFCFA(budget.remaining)}</p>
                </div>
              </div>
            )}
            {budget.missing.length > 0 && (
              <p className="text-xs font-medium text-amber-700 flex items-start gap-1.5" data-testid="budget-incomplete">
                <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                {t.budgetIncomplete(budget.missing.map((m) => t.lineNames[m].toLowerCase()).join(lang === "fr" ? " et " : " and "))}
              </p>
            )}
            <p className="text-[11px] text-muted-foreground">{t.tapForDetails}</p>
          </div>

          <Accordion type="multiple" className="w-full">
            <Category
              value="vehicle"
              title={t.catVehicle}
              amount={vehicleAmount}
              testId="category-vehicle"
              tags={<Tags basis="declared" paid={vehicleAllPaid} partlyPaid={vehiclePaid} lang={lang} />}
            >
              <CifBasis basis={value} lang={lang} paidKeys={paidKeys} />
            </Category>

            <Category
              value="customs"
              title={t.catCustoms}
              amount={customsLine.amount ?? 0}
              testId="budget-line-customs"
              tags={<Tags basis={customsLine.basis} paid={customsLine.paid > 0} lang={lang} />}
            >
              {customsLine.estimate !== undefined && (
                <p className="text-xs text-muted-foreground mb-3">{t.estimateWas(formatFCFA(customsLine.estimate))}</p>
              )}
              <div className="rounded-md border overflow-hidden" data-testid="accordion-douane">
                <Table>
                  <TableHeader className="bg-muted/50">
                    <TableRow>
                      <TableHead>{lang === "fr" ? "Taxe" : "Tax"}</TableHead>
                      <TableHead className="text-right hidden sm:table-cell">{lang === "fr" ? "Base" : "Base"}</TableHead>
                      <TableHead className="text-center">{lang === "fr" ? "Taux" : "Rate"}</TableHead>
                      <TableHead className="text-right">{lang === "fr" ? "Montant" : "Amount"}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {douaneRows.map((row) => (
                      <TableRow key={row.id}>
                        <TableCell>
                          <div className="flex items-center gap-1.5">
                            <span className="font-semibold">{row.id}</span>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Info className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground cursor-help shrink-0" />
                              </TooltipTrigger>
                              <TooltipContent side="right">
                                <p className="max-w-[260px] text-xs leading-relaxed">{row.tooltip}</p>
                              </TooltipContent>
                            </Tooltip>
                          </div>
                          <p className="text-xs text-muted-foreground font-normal mt-0.5">{row.nom}</p>
                        </TableCell>
                        <TableCell className="text-right text-muted-foreground text-sm hidden sm:table-cell">{formatFCFA(row.base)}</TableCell>
                        <TableCell className="text-center">
                          <Badge variant="outline" className="font-mono text-xs">{row.taux}</Badge>
                        </TableCell>
                        <TableCell className="text-right font-semibold">{formatFCFA(row.montant)}</TableCell>
                      </TableRow>
                    ))}
                    <TableRow className="bg-muted/30 font-bold">
                      <TableCell colSpan={3} className="text-right py-3">{t.totalCustoms}</TableCell>
                      <TableCell className="text-right py-3 text-primary">{formatFCFA(result.totalDouane)}</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
              <p className="text-xs text-muted-foreground mt-3 flex items-start gap-1.5">
                <Info className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                {lang === "fr" ? "Base TVA" : "VAT base"} = CIF + DD + RS + PC + PCS = {formatFCFA(result.baseTVA)}
              </p>
            </Category>

            <Category
              value="port"
              title={t.catPort}
              amount={portLine.amount ?? 0}
              testId="budget-line-port"
              tags={<Tags basis={portLine.basis} paid={portLine.paid > 0} lang={lang} />}
            >
              {portLine.estimate !== undefined && (
                <p className="text-xs text-muted-foreground mb-3">{t.estimateWas(formatFCFA(portLine.estimate))}</p>
              )}
              {isEnlevement && (
                <div className="bg-primary/10 border border-primary/20 rounded-lg px-4 py-3 mb-4 text-sm text-primary flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                  {t.directEnlev}
                </div>
              )}
              <div className="rounded-md border overflow-hidden" data-testid="accordion-port">
                <Table>
                  <TableBody>
                    <TableRow className="bg-muted/50 hover:bg-muted/50">
                      <TableCell className="font-semibold text-xs uppercase tracking-wide" colSpan={2}>{t.subPort}</TableCell>
                    </TableRow>
                    {portRows.map((row) => (
                      <TableRow key={row.nom}>
                        <TableCell>
                          <span className="font-medium">{row.nom}</span>
                          {row.detail && <span className="text-xs text-muted-foreground ml-2">({row.detail})</span>}
                        </TableCell>
                        <TableCell className="text-right">{formatFCFA(row.montant)}</TableCell>
                      </TableRow>
                    ))}
                    <TableRow className="bg-muted/20">
                      <TableCell className="text-right text-sm">{t.subPort}</TableCell>
                      <TableCell className="text-right font-semibold">{formatFCFA(portSubtotal)}</TableCell>
                    </TableRow>
                    <TableRow className="bg-muted/50 hover:bg-muted/50">
                      <TableCell className="font-semibold text-xs uppercase tracking-wide" colSpan={2}>{t.subBroker}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">{lang === "fr" ? "Frais CAD" : "Broker fees"}</TableCell>
                      <TableCell className="text-right">{formatFCFA(result.fraisCAD)}</TableCell>
                    </TableRow>
                    <TableRow className="bg-muted/30 font-bold">
                      <TableCell className="text-right py-3">{t.totalPort}</TableCell>
                      <TableCell className="text-right py-3 text-primary">{formatFCFA(result.totalPort)}</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            </Category>
          </Accordion>

          <div className="border-t bg-muted/30 px-5 sm:px-6 py-4 flex items-center justify-between gap-3">
            <span className="font-bold">{t.grandTotal}</span>
            <span className="font-black text-xl text-primary whitespace-nowrap">{formatFCFA(budget.total)}</span>
          </div>
        </Card>

        {/* After the port: not included */}
        <Card>
          <CardHeader className="pb-3 border-b">
            <CardTitle className="text-sm font-semibold">{t.postPort}</CardTitle>
          </CardHeader>
          <CardContent className="pt-4 text-sm text-muted-foreground space-y-2">
            <div className="flex justify-between"><span>{t.technical}</span><span>~20 000 FCFA</span></div>
            <div className="flex justify-between"><span>{t.carte}</span><span>~45 000 FCFA</span></div>
            <div className="flex justify-between"><span>{t.insurance}</span><span>~60 000 FCFA</span></div>
            <div className="flex justify-between"><span>{t.plates}</span><span>~12 000 FCFA</span></div>
            <div className="border-t my-2" />
            <div className="flex justify-between font-semibold text-foreground">
              <span>{t.toRide}</span><span>~137 000 FCFA</span>
            </div>
            <p className="text-[11px] pt-1">{t.postPortNote}</p>
          </CardContent>
        </Card>

        {/* Assumptions and warnings */}
        <Card data-testid="hypotheses">
          <CardHeader className="pb-3 border-b">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-yellow-600" /> {t.hypothesesTitle}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <ul className="space-y-2 text-xs leading-relaxed">
              {hypotheses.map((h) => (
                <li key={h.key} className={`flex items-start gap-2 ${h.strong ? "text-yellow-800 dark:text-yellow-500 font-medium" : "text-muted-foreground"}`} data-testid={`hyp-${h.key}`}>
                  <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-current shrink-0" />
                  {h.text}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <div className="flex justify-center pt-2">
          <Button
            size="lg"
            onClick={() => setLocation("/simulateur")}
            className="w-full md:w-auto px-10"
            data-testid="button-nouvelle-simulation"
          >
            {t.newSim}
          </Button>
        </div>
      </div>
    </TooltipProvider>
  );
}
