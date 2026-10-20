import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Info, AlertTriangle, ArrowLeft, CheckCircle2, Download } from "lucide-react";
import { getCurrentSimulation, HistoryEntry } from "@/lib/history";
import { formatFCFA } from "@/lib/utils";
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

  const ageBadge =
    result.riskLevel === "faible"
      ? { label: `${result.ageVehicule} ${lang === "fr" ? "ans" : "yrs"}`, cls: "bg-primary text-primary-foreground" }
      : result.riskLevel === "moyen"
      ? { label: `${result.ageVehicule} ${lang === "fr" ? "ans" : "yrs"}`, cls: "bg-secondary text-secondary-foreground" }
      : { label: `${result.ageVehicule} ${lang === "fr" ? "ans" : "yrs"}`, cls: "bg-destructive text-destructive-foreground" };

  const isExoneration = input.regime === "Exonération partielle";
  const isEnlevement  = input.regime === "Enlèvement direct";

  const douaneRows = [
    { id: "DD",  nom: lang === "fr" ? "Droit de Douane"                   : "Customs Duty",             base: input.valeurCIF, taux: result.ddRateLabel, montant: result.DD,  tooltip: `${lang === "fr" ? "Taxe principale à l'importation" : "Main import tax"}. ${result.ddRateLabel}.` },
    { id: "RS",  nom: lang === "fr" ? "Redevance Statistique"              : "Statistical Fee",           base: input.valeurCIF, taux: "1%",              montant: result.RS,  tooltip: lang === "fr" ? "Finance les statistiques douanières — 1% de la valeur CIF." : "Funds customs statistics — 1% of CIF value." },
    { id: "PC",  nom: lang === "fr" ? "Prélèvement CEDEAO"                 : "ECOWAS Levy",               base: input.valeurCIF, taux: "0,5%",           montant: result.PC,  tooltip: lang === "fr" ? "Contribution CEDEAO — 0,5% de la valeur CIF." : "ECOWAS contribution — 0.5% of CIF value." },
    { id: "PCS", nom: lang === "fr" ? "Prélèv. Communautaire de Solidarité": "AU Solidarity Levy",         base: input.valeurCIF, taux: "0,8%",           montant: result.PCS, tooltip: lang === "fr" ? "Contribution à l'Union Africaine — 0,8% de la valeur CIF." : "African Union contribution — 0.8% of CIF value." },
    { id: "TVA", nom: lang === "fr" ? "Taxe sur la Valeur Ajoutée"         : "Value Added Tax",           base: result.baseTVA,  taux: "18%",            montant: result.TVA, tooltip: `${lang === "fr" ? "Base TVA" : "VAT base"} = ${formatFCFA(result.baseTVA)}` },
  ];

  const portRows = [
    { nom: lang === "fr" ? "Magasinage"     : "Storage",          detail: `${input.joursAuPort} ${lang === "fr" ? "j" : "d"} × 3 500 FCFA`, montant: result.magasinage },
    { nom: lang === "fr" ? "Manutention"    : "Handling",         detail: "",                                                                  montant: result.manutention },
    { nom: lang === "fr" ? "Contrôle Bénin" : "Benin Control",    detail: "",                                                                  montant: result.beninControl },
    { nom: "SEGUB",                           detail: "",                                                                                       montant: result.segub },
    { nom: lang === "fr" ? "Frais CAD"      : "Broker Fees",      detail: lang === "fr" ? "Commissionnaire Agréé" : "Approved Broker",        montant: result.fraisCAD },
    { nom: lang === "fr" ? "Frais GUCE"     : "GUCE Fees",        detail: lang === "fr" ? "Guichet Unique" : "Single Window",                 montant: result.fraisGUCE },
  ];

  return (
    <TooltipProvider delayDuration={300}>
      <div className="max-w-3xl mx-auto space-y-6 pb-10">

        {/* Header */}
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => setLocation("/simulateur")} data-testid="button-back">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-3xl font-bold">{t.title}</h1>
            <p className="text-muted-foreground mt-1">{t.subtitle}</p>
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

        {/* Main card */}
        <Card className="border-t-4 border-t-primary shadow-md overflow-hidden">

          {/* Vehicle summary */}
          <div className="p-6 bg-card">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold" data-testid="vehicle-title">
                  {input.marque} {input.modele}
                </h2>
                <div className="flex flex-wrap items-center gap-2 mt-2 text-sm">
                  <span className="text-muted-foreground">{lang === "fr" ? "Année" : "Year"} {input.annee}</span>
                  <span className="text-muted-foreground">·</span>
                  <span className="text-muted-foreground">{input.carburant}</span>
                  <span className="text-muted-foreground">·</span>
                  <span className="text-muted-foreground">DD {result.ddRateLabel}</span>
                  <Badge className={`${ageBadge.cls} font-semibold px-2.5 py-0.5`} data-testid="badge-age">
                    {ageBadge.label}
                  </Badge>
                </div>
              </div>
              <div className="text-right shrink-0">
                <p className="text-xs text-muted-foreground mb-0.5">{t.cif}</p>
                <p className="text-xl font-bold">{formatFCFA(input.valeurCIF)}</p>
              </div>
            </div>
            <div className="mt-4 flex items-center gap-2 text-sm">
              {isExoneration || isEnlevement
                ? <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                : <Info className="h-4 w-4 text-muted-foreground shrink-0" />}
              <span className="text-muted-foreground">
                {t.regime} : <span className="font-medium text-foreground">{input.regime}</span>
                {result.regimeLabel ? ` — ${result.regimeLabel}` : ""}
              </span>
            </div>
          </div>

          {/* Age warnings */}
          {result.riskLevel === "eleve" && (
            <div className="bg-destructive/10 border-y border-destructive/20 px-5 py-4 flex items-start gap-3 text-destructive" data-testid="warning-ancien">
              <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" />
              <p className="text-sm font-medium">{t.warnOld(result.ageVehicule)}</p>
            </div>
          )}
          {result.riskLevel === "moyen" && (
            <div className="bg-secondary/10 border-y border-secondary/20 px-5 py-4 flex items-start gap-3 text-yellow-700 dark:text-yellow-500" data-testid="warning-moyen">
              <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" />
              <p className="text-sm font-medium">{t.warnMid(result.ageVehicule)}</p>
            </div>
          )}

          {/* Accordions */}
          <Accordion type="multiple" defaultValue={["douane", "port"]} className="w-full">
            <AccordionItem value="douane" className="border-t">
              <AccordionTrigger className="px-6 hover:bg-muted/40 font-bold" data-testid="accordion-douane">
                {t.customs}
              </AccordionTrigger>
              <AccordionContent className="px-6 pb-6 pt-2">
                <div className="rounded-md border overflow-hidden">
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
                        <TableCell colSpan={3} className="text-right py-4">{t.totalCustoms}</TableCell>
                        <TableCell className="text-right py-4 text-primary">{formatFCFA(result.totalDouane)}</TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
                <p className="text-xs text-muted-foreground mt-3 flex items-start gap-1.5">
                  <Info className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                  {lang === "fr" ? "Base TVA" : "VAT base"} = CIF + DD + RS + PC + PCS = {formatFCFA(result.baseTVA)}
                </p>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="port" className="border-t">
              <AccordionTrigger className="px-6 hover:bg-muted/40 font-bold" data-testid="accordion-port">
                {t.port}
              </AccordionTrigger>
              <AccordionContent className="px-6 pb-6 pt-2">
                {isEnlevement && (
                  <div className="bg-primary/10 border border-primary/20 rounded-lg px-4 py-3 mb-4 text-sm text-primary flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 shrink-0" />
                    {t.directEnlev}
                  </div>
                )}
                <div className="rounded-md border overflow-hidden">
                  <Table>
                    <TableHeader className="bg-muted/50">
                      <TableRow>
                        <TableHead>{lang === "fr" ? "Frais" : "Fee"}</TableHead>
                        <TableHead className="text-right">{lang === "fr" ? "Montant" : "Amount"}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {portRows.map((row) => (
                        <TableRow key={row.nom}>
                          <TableCell>
                            <span className="font-medium">{row.nom}</span>
                            {row.detail && <span className="text-xs text-muted-foreground ml-2">({row.detail})</span>}
                          </TableCell>
                          <TableCell className="text-right">{formatFCFA(row.montant)}</TableCell>
                        </TableRow>
                      ))}
                      <TableRow className="bg-muted/30 font-bold">
                        <TableCell className="text-right py-4">{t.totalPort}</TableCell>
                        <TableCell className="text-right py-4 text-primary">{formatFCFA(result.totalPort)}</TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>

          {/* Final summary */}
          <div className="bg-muted/30 border-t p-6">
            <p className="font-bold text-sm mb-4 text-muted-foreground uppercase tracking-wide">{t.summary}</p>
            <div className="space-y-2.5">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">{lang === "fr" ? "Valeur CIF" : "CIF Value"}</span>
                <span className="font-medium">{formatFCFA(input.valeurCIF)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">{t.totalCustoms}</span>
                <span className="font-medium">{formatFCFA(result.totalDouane)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">{t.totalPort}</span>
                <span className="font-medium">{formatFCFA(result.totalPort)}</span>
              </div>
              <div className="border-t my-3" />
              <div
                className="flex justify-between items-center bg-background border-2 border-primary/30 rounded-xl px-5 py-4 shadow-sm"
                data-testid="total-general"
              >
                <span className="font-bold text-lg">{t.grandTotal}</span>
                <span className="font-bold text-2xl text-primary">{formatFCFA(result.totalGeneral)}</span>
              </div>
            </div>
          </div>
        </Card>

        {/* Post-port + disclaimer */}
        <div className="grid md:grid-cols-2 gap-5">
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
            </CardContent>
          </Card>

          <div className="bg-secondary/10 border border-secondary/30 rounded-xl p-5 flex flex-col justify-center gap-3 text-yellow-800 dark:text-yellow-500">
            <AlertTriangle className="h-5 w-5 shrink-0" />
            <div>
              <p className="font-bold text-sm mb-1">{t.warning}</p>
              <p className="text-xs leading-relaxed">{t.warningText}</p>
            </div>
          </div>
        </div>

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
