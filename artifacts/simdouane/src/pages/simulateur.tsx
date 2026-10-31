import { useState, useMemo, useRef } from "react";
import { useLocation } from "wouter";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useFormContext, useWatch, type Control } from "react-hook-form";
import * as z from "zod";
import { Calculator, Loader2, Info, Shield, Zap, List, TrendingUp, Crown, MessageCircle, AlertTriangle, Phone, Mail, CheckCircle, ChevronRight } from "lucide-react";
import {
  Form, FormControl, FormDescription, FormField,
  FormItem, FormLabel, FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem,
  SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { calculate, FormInput, CylindreeKey, RegimeKey } from "@/lib/calculator";
import { addHistory, setCurrentSimulation } from "@/lib/history";
import { formatFCFA } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { useLang } from "@/context/language-context";
import { T } from "@/lib/translations";
import { useAuth } from "@/lib/auth";
import { useCreateSimulation, useGetUserSubscription, getGetUserSubscriptionQueryKey } from "@workspace/api-client-react";
import { UpgradeRequestForm } from "@/components/upgrade-request-form";
import { getRegulatoryNotice, Powertrain, VehicleCondition } from "@/lib/regulatory-config-2026";
import { CURRENCY_CODES, type CurrencyCode } from "@/lib/currency";
import { useExchangeRates } from "@/lib/use-exchange-rates";
import { ConversionNote, CurrencySelect } from "@/components/currency-field";
import { CIF_MODES, determineCif, type CifInputs, type CifMode, type CifResult, type FieldError } from "@/lib/cif-input";
import { Checkbox } from "@/components/ui/checkbox";

const CYL_KEYS: CylindreeKey[] = ["lt1000", "1000-1300", "1300-1600", "1600-2000", "2000-2500", "gt2500"];

const YEARS = Array.from({ length: 2025 - 1990 + 1 }, (_, i) => 2025 - i);

const formSchema = z.object({
  marque: z.string().min(1),
  modele: z.string().min(1),
  annee: z.coerce.number().min(1990).max(2025),
  condition: z.enum(["Occasion", "Neuf"]),
  cylindree: z.enum(["lt1000", "1000-1300", "1300-1600", "1600-2000", "2000-2500", "gt2500"]),
  carburant: z.string().min(1),
  // Value of the vehicle: one of three cases, each amount in its own currency
  // (checked by determineCif, the engine receives the FCFA result).
  mode: z.enum(CIF_MODES),
  montant: z.string().optional(), // cases "cif" and "total"
  devise: z.enum(CURRENCY_CODES),
  prix: z.string().optional(),
  prixDevise: z.enum(CURRENCY_CODES),
  transport: z.string().optional(),
  transportDevise: z.enum(CURRENCY_CODES),
  transportInconnu: z.boolean(),
  assurance: z.string().optional(),
  assuranceDevise: z.enum(CURRENCY_CODES),
  assuranceInconnu: z.boolean(),
  joursAuPort: z.coerce.number().min(0),
  regime: z.string().min(1),
});

const AMOUNT_FIELDS = ["montant", "prix", "transport", "assurance"] as const;
const ERROR_FIELDS = { price: "prix", freight: "transport", insurance: "assurance", single: "montant" } as const;

/**
 * Form values → inputs of determineCif. `lenient` (live preview only) treats
 * an empty freight or insurance field as "not known yet".
 */
function cifInputs(v: Partial<z.infer<typeof formSchema>>, lenient = false): CifInputs {
  const empty = (s?: string) => !s || String(s).trim() === "";
  return {
    mode: (v.mode ?? "cif") as CifMode,
    price: { amount: v.prix, currency: (v.prixDevise ?? "XOF") as CurrencyCode },
    freight: { amount: v.transport, currency: (v.transportDevise ?? "XOF") as CurrencyCode },
    freightUnknown: !!v.transportInconnu || (lenient && empty(v.transport)),
    insurance: { amount: v.assurance, currency: (v.assuranceDevise ?? "XOF") as CurrencyCode },
    insuranceUnknown: !!v.assuranceInconnu || (lenient && empty(v.assurance)),
    single: { amount: v.montant, currency: (v.devise ?? "XOF") as CurrencyCode },
  };
}

type FormValues = z.infer<typeof formSchema>;

function LivePreview({ values, valeurCIF }: { values: Partial<FormValues>; valeurCIF: number | null }) {
  const { lang } = useLang();
  const t = T[lang].sim;

  const result = useMemo(() => {
    if (!valeurCIF || valeurCIF <= 0 || !values.cylindree || !values.annee || !values.regime) return null;
    try {
      return calculate({
        marque: values.marque || "",
        modele: values.modele || "",
        annee: Number(values.annee),
        cylindree: values.cylindree as CylindreeKey,
        carburant: values.carburant || "Essence",
        valeurCIF,
        joursAuPort: Number(values.joursAuPort ?? 0),
        regime: values.regime as RegimeKey,
      } as FormInput);
    } catch { return null; }
  }, [valeurCIF, values.cylindree, values.annee, values.regime, values.joursAuPort, values.marque, values.modele, values.carburant]);

  const dash = "—";
  const fmt = (n: number) => new Intl.NumberFormat("fr-FR").format(Math.round(n));

  return (
    <div className="space-y-4">
      <div>
        <h3 className="font-bold text-base">{t.preview}</h3>
        <p className="text-xs text-muted-foreground mt-0.5">{t.previewSub}</p>
      </div>
      <div className="grid grid-cols-3 gap-2">
        <div className="bg-muted/50 rounded-lg p-3 text-center">
          <p className="text-[10px] text-muted-foreground mb-1">{t.previewCIF}</p>
          <p className="font-bold text-xs leading-tight">
            {result ? fmt(result.totalGeneral - result.totalDouane - result.totalPort) : dash}
          </p>
          <p className="text-[9px] text-muted-foreground mt-0.5">FCFA</p>
        </div>
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-center">
          <p className="text-[10px] text-amber-700 mb-1">{t.previewDuties}</p>
          <p className="font-bold text-xs text-amber-800 leading-tight">
            {result ? fmt(result.totalDouane) : dash}
          </p>
          <p className="text-[9px] text-amber-600 mt-0.5">FCFA</p>
        </div>
        <div className="bg-muted/30 rounded-lg p-3 text-center">
          <p className="text-[10px] text-muted-foreground mb-1">{t.previewPort}</p>
          <p className="font-bold text-xs leading-tight">
            {result ? fmt(result.totalPort) : dash}
          </p>
          <p className="text-[9px] text-muted-foreground mt-0.5">FCFA</p>
        </div>
      </div>
      <div className="rounded-xl p-4 text-white text-center" style={{ backgroundColor: "#005A36" }}>
        <p className="text-xs font-semibold opacity-80 uppercase tracking-wider mb-1">{t.previewTotal}</p>
        <p className="text-2xl font-bold">{result ? fmt(result.totalGeneral) : "—"}</p>
        <p className="text-xs opacity-70 mt-0.5">FCFA</p>
      </div>
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
        <p className="text-[10px] text-blue-700 leading-relaxed">{t.previewNote}</p>
      </div>
      {result && (
        <div className="space-y-1.5">
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide">
            {lang === "fr" ? "Détail rapide" : "Quick breakdown"}
          </p>
          {[
            { label: "DD", val: result.DD },
            { label: "RS", val: result.RS },
            { label: "PC", val: result.PC },
            { label: "PCS", val: result.PCS },
            { label: "TVA (18%)", val: result.TVA },
          ].map((row) => (
            <div key={row.label} className="flex justify-between text-xs text-muted-foreground">
              <span>{row.label}</span>
              <span>{fmt(row.val)} FCFA</span>
            </div>
          ))}
          <div className="border-t pt-1.5 flex justify-between text-xs font-bold">
            <span>{lang === "fr" ? "Total droits" : "Total duties"}</span>
            <span className="text-primary">{formatFCFA(result.totalDouane)}</span>
          </div>
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{lang === "fr" ? "Frais portuaires" : "Port fees"}</span>
            <span>{formatFCFA(result.totalPort)}</span>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Case A: one amount (price, freight or insurance) with its currency ─── */
type AmountField = "prix" | "transport" | "assurance";
type CurrencyField = "prixDevise" | "transportDevise" | "assuranceDevise";
type UnknownField = "transportInconnu" | "assuranceInconnu";

function AmountRow({ control, name, currencyName, unknownName, label, testId, rates, lang }: {
  control: Control<FormValues>;
  name: AmountField;
  currencyName: CurrencyField;
  unknownName?: UnknownField;
  label: string;
  testId: string;
  rates: ReturnType<typeof useExchangeRates>;
  lang: "fr" | "en";
}) {
  const t = T[lang].sim;
  const { clearErrors } = useFormContext<FormValues>();
  const currency = useWatch({ control, name: currencyName }) as CurrencyCode;
  // Same hook on every render; only meaningful when the row has a "not known yet" box.
  const unknownValue = useWatch({ control, name: unknownName ?? "transportInconnu" });
  const isUnknown = !!unknownName && !!unknownValue;

  return (
    <FormField control={control} name={name} render={({ field }) => (
      <FormItem>
        <FormLabel>{label}</FormLabel>
        <div className="flex gap-2">
          <FormField control={control} name={currencyName} render={({ field: c }) => (
            <CurrencySelect value={c.value} onChange={c.onChange} rates={rates} lang={lang} testId={`select-devise-${testId}`} disabled={isUnknown} />
          )} />
          <FormControl>
            <Input type="number" min={0} step="any" {...field} disabled={isUnknown} className="flex-1" data-testid={`input-${testId}`} />
          </FormControl>
        </div>
        {unknownName && (
          <FormField control={control} name={unknownName} render={({ field: u }) => (
            <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer w-fit">
              <Checkbox
                checked={!!u.value}
                onCheckedChange={(v) => {
                  u.onChange(v === true);
                  if (v === true) { field.onChange(""); clearErrors(name); }
                }}
                data-testid={`unknown-${testId}`}
              />
              {t.unknownYet}
            </label>
          )} />
        )}
        {!isUnknown && (
          <ConversionNote amount={Number(field.value)} currency={currency} rates={rates} lang={lang} idPrefix={`conversion-${testId}`} />
        )}
        <FormMessage />
      </FormItem>
    )} />
  );
}

/* ─── Case A: running total of the CIF, with what is still missing ───────── */
function CifSummary({ preview, lang }: { preview: CifResult; lang: "fr" | "en" }) {
  const t = T[lang].sim;
  if (!preview.ok || preview.value.mode !== "price") return null;
  const v = preview.value;
  const part = (kind: "price" | "freight" | "insurance") => {
    const c = v.components.find((x) => x.kind === kind);
    return c ? formatFCFA(c.valeurXof) : t.notKnown;
  };
  return (
    <div className="rounded-lg border bg-muted/40 px-3 py-2 space-y-1" data-testid="cif-summary">
      <p className="text-sm">
        <span className="text-muted-foreground">{t.cifComputed} : </span>
        <span className="font-bold" data-testid="cif-summary-total">{formatFCFA(v.valeurXof)}</span>
      </p>
      <p className="text-[11px] text-muted-foreground">{t.cifSumLine(part("price"), part("freight"), part("insurance"))}</p>
      {v.missing.length > 0 && (
        <p className="text-xs font-medium text-amber-700 flex items-start gap-1.5" data-testid="cif-partial">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
          {t.cifPartial(v.missing.map((m) => t.partNames[m]).join(lang === "fr" ? " et " : " and "))}
        </p>
      )}
    </div>
  );
}

/* ─── Quota Modal ─────────────────────────────────────────────────────── */
interface QuotaModalProps {
  used: number;
  limit: number;
  planName: string;
  onClose: () => void;
}
function QuotaModal({ used, limit, planName, onClose }: QuotaModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#003D24] to-[#005533] px-6 py-5 text-white">
          <div className="flex items-center gap-3 mb-2">
            <div className="h-10 w-10 bg-[#FCD116] rounded-xl flex items-center justify-center shrink-0">
              <AlertTriangle className="h-5 w-5 text-[#003D24]" />
            </div>
            <div>
              <h2 className="font-bold text-lg">Limite mensuelle atteinte</h2>
              <p className="text-green-100 text-xs">Plan {planName} — {used}/{limit} simulations utilisées</p>
            </div>
          </div>
          <div className="h-2 bg-white/20 rounded-full mt-3">
            <div className="h-2 bg-[#FCD116] rounded-full w-full" />
          </div>
        </div>

        <div className="px-6 py-5">
          <UpgradeRequestForm defaultPlan="Standard" onCancel={onClose} />
        </div>
      </div>
    </div>
  );
}

export default function Simulateur() {
  const [, setLocation] = useLocation();
  const [isCalculating, setIsCalculating] = useState(false);
  const [quotaModal, setQuotaModal] = useState(false);
  const { lang } = useLang();
  const t = T[lang].sim;
  const { user } = useAuth();
  const createSimulation = useCreateSimulation();
  const createMutationRef = useRef(createSimulation.mutate);
  createMutationRef.current = createSimulation.mutate;

  const { data: subscription } = useGetUserSubscription({
    query: { enabled: !!user, queryKey: getGetUserSubscriptionQueryKey() },
  });

  const simUsed    = subscription?.simUsedThisMonth ?? 0;
  const simLimit   = subscription?.plan.simulationsPerMonth ?? 3;
  const isAtQuota  = !!user && simLimit !== null && simUsed >= simLimit;
  const quotaRatio = simLimit ? Math.min((simUsed / simLimit) * 100, 100) : 0;

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      marque: "",
      modele: "",
      annee: undefined as unknown as number,
      condition: "Occasion",
      cylindree: undefined as unknown as CylindreeKey,
      carburant: "",
      mode: "cif",
      montant: "",
      devise: "XOF",
      prix: "",
      prixDevise: "XOF",
      transport: "",
      transportDevise: "XOF",
      transportInconnu: false,
      assurance: "",
      assuranceDevise: "XOF",
      assuranceInconnu: false,
      joursAuPort: 0,
      regime: "Droit commun",
    },
  });

  const watchedValues = useWatch({ control: form.control });
  const rates = useExchangeRates();
  const watchedMode = (watchedValues.mode ?? "cif") as CifMode;
  const watchedDevise = (watchedValues.devise ?? "XOF") as CurrencyCode;
  const preview = useMemo(() => determineCif(cifInputs(watchedValues, true), rates), [watchedValues, rates]);
  const watchedXof = preview.ok ? preview.value.valeurXof : null;

  async function onSubmit(values: FormValues) {
    // Block if quota reached for logged-in users
    if (isAtQuota) {
      setQuotaModal(true);
      return;
    }

    // No guessed amount or rate: every missing or unconvertible amount is refused.
    const determined = determineCif(cifInputs(values), rates);
    if (!determined.ok) {
      const currencyOf = { price: values.prixDevise, freight: values.transportDevise, insurance: values.assuranceDevise, single: values.devise };
      for (const [key, err] of Object.entries(determined.errors) as Array<[keyof typeof ERROR_FIELDS, FieldError]>) {
        const message = err === "rate_unavailable" ? t.rateUnavailable(currencyOf[key])
          : err === "invalid" ? t.errInvalid
          : key === "freight" || key === "insurance" ? t.errRequiredOrUnknown
          : t.errRequired;
        form.setError(ERROR_FIELDS[key], { message });
      }
      return;
    }

    setIsCalculating(true);
    await new Promise((r) => setTimeout(r, 1000));
    const condition = values.condition;
    const input: FormInput = {
      marque: values.marque,
      modele: values.modele,
      annee: values.annee,
      cylindree: values.cylindree as CylindreeKey,
      carburant: values.carburant,
      valeurCIF: determined.value.valeurXof,
      joursAuPort: values.joursAuPort,
      regime: values.regime as RegimeKey,
    };
    const result = calculate(input);
    const powertrain: Powertrain = values.carburant === "Électrique"
      ? "Électrique"
      : values.carburant === "Hybride" ? "Hybride" : "Autre";
    const metadata = {
      condition: condition as VehicleCondition,
      powertrain,
      referenceDate: new Date().toISOString().slice(0, 10),
      regulatoryYear: 2026,
      calculatorVersion: "historical",
      regulatoryConfigVersion: "2026.1-announced",
    } as const;
    const entry = addHistory({ input, result, ...metadata, valueInput: determined.value });
    setCurrentSimulation(entry);
    
    if (user) {
      createMutationRef.current(
        {
          data: {
            marque: input.marque,
            modele: input.modele,
            annee: input.annee,
            cylindree: input.cylindree,
            carburant: input.carburant,
            valeurCIF: input.valeurCIF,
            joursAuPort: input.joursAuPort,
            regime: input.regime,
            totalDouane: result.totalDouane,
            totalPort: result.totalPort,
            totalGeneral: result.totalGeneral,
            ...metadata,
          }
        },
        {
          onError: (err: any) => {
            // If quota exceeded mid-session (edge case), show modal
            if (err?.status === 403) setQuotaModal(true);
          }
        }
      );
    }
    
    setIsCalculating(false);
    setLocation("/resultats");
  }

  return (
    <>
    <TooltipProvider delayDuration={300}>
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl font-bold">{t.title}</h1>
          <p className="text-muted-foreground text-sm mt-1">{t.subtitle}</p>
        </div>

        <div className="flex flex-col lg:flex-row gap-6 items-start">
          {/* ── Form ── */}
          <div className="flex-1 min-w-0 space-y-5">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">

                {/* Vehicle card */}
                <Card>
                  <CardHeader className="border-b pb-4 mb-1">
                    <CardTitle className="text-sm font-semibold">{t.vehicleInfo}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4 pt-2">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <FormField control={form.control} name="marque" render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t.brand}</FormLabel>
                          <FormControl>
                            <Input placeholder="Ex: Toyota" {...field} data-testid="input-marque" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />

                      <FormField control={form.control} name="modele" render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t.model}</FormLabel>
                          <FormControl>
                            <Input placeholder="Ex: RAV4" {...field} data-testid="input-modele" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />

                      <FormField control={form.control} name="annee" render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t.year}</FormLabel>
                          <Select onValueChange={(v) => field.onChange(Number(v))} value={String(field.value)}>
                            <FormControl>
                              <SelectTrigger data-testid="select-annee">
                                <SelectValue placeholder={lang === "fr" ? "Sélectionner l'année" : "Select year"} />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent className="max-h-60">
                              {YEARS.map((y) => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )} />

                      <FormField control={form.control} name="carburant" render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t.fuel}</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-carburant">
                                <SelectValue placeholder={t.fuelPlaceholder} />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="Essence">{t.fuelEssence}</SelectItem>
                              <SelectItem value="Diesel">{t.fuelDiesel}</SelectItem>
                              <SelectItem value="Hybride">{t.fuelHybride}</SelectItem>
                              <SelectItem value="Électrique">{t.fuelElectrique}</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )} />
                    </div>

                    {/* Cylindrée */}
                    <FormField control={form.control} name="cylindree" render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-1.5">
                          {t.cylindree}
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                            </TooltipTrigger>
                            <TooltipContent side="right">
                              <p className="max-w-[230px] text-xs leading-relaxed">
                                <span className="font-bold block mb-1">{t.cylindreeTooltip}</span>
                                1 000cc = 1.0L<br />
                                1 500cc = 1.5L<br />
                                2 000cc = 2.0L<br />
                                2 500cc = 2.5L
                              </p>
                            </TooltipContent>
                          </Tooltip>
                        </FormLabel>

                        <div className="flex flex-wrap gap-2" data-testid="cylindree-group">
                          {CYL_KEYS.map((key) => {
                            const opt = t.cylOptions[key];
                            return (
                              <button
                                key={key}
                                type="button"
                                onClick={() => field.onChange(key)}
                                data-testid={`cylindree-${key}`}
                                className={cn(
                                  "flex flex-col items-start px-3 py-2 rounded-lg border transition-all",
                                  field.value === key
                                    ? "bg-primary text-white border-primary shadow-sm"
                                    : "bg-background text-foreground border-border hover:border-primary hover:text-primary"
                                )}
                              >
                                <span className="text-xs font-semibold leading-tight">{opt.label}</span>
                                <span className={cn(
                                  "text-[10px] font-normal leading-tight mt-0.5",
                                  field.value === key ? "text-white/70" : "text-muted-foreground"
                                )}>
                                  {opt.liters}
                                </span>
                              </button>
                            );
                          })}
                        </div>

                        <p className="text-xs text-muted-foreground mt-1.5 leading-snug">
                          {t.cylindreeHelper}
                        </p>
                        <div className="mt-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2.5 flex items-start gap-2">
                          <Info className="h-3.5 w-3.5 text-blue-500 shrink-0 mt-0.5" />
                          <p className="text-xs text-blue-700 leading-snug">
                            <span className="font-semibold block">{t.cylindreeNotice}</span>
                            {t.cylindreeNoticeText}
                          </p>
                        </div>
                        <FormMessage />
                      </FormItem>
                    )} />
                  </CardContent>
                </Card>

                {/* Value & port card */}
                <Card>
                  <CardHeader className="border-b pb-4 mb-1">
                    <CardTitle className="text-sm font-semibold">{t.valuePort}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4 pt-2">
                    <FormField control={form.control} name="mode" render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-1.5">
                          {t.modeQuestion}
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                            </TooltipTrigger>
                            <TooltipContent>
                              <p className="max-w-[220px] text-xs">{t.cifTooltip}</p>
                            </TooltipContent>
                          </Tooltip>
                        </FormLabel>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2" role="radiogroup" aria-label={t.modeQuestion}>
                          {CIF_MODES.map((m) => (
                            <button
                              key={m}
                              type="button"
                              role="radio"
                              aria-checked={field.value === m}
                              data-testid={`mode-${m}`}
                              onClick={() => { field.onChange(m); form.clearErrors([...AMOUNT_FIELDS]); }}
                              className={cn(
                                "text-left px-3 py-2 rounded-lg border transition-all",
                                field.value === m
                                  ? "bg-primary text-white border-primary shadow-sm"
                                  : "bg-background text-foreground border-border hover:border-primary",
                              )}
                            >
                              <span className="block text-xs font-semibold leading-tight">{t.modes[m].title}</span>
                              <span className={cn("block text-[10px] mt-0.5 leading-snug", field.value === m ? "text-white/75" : "text-muted-foreground")}>
                                {t.modes[m].desc}
                              </span>
                            </button>
                          ))}
                        </div>
                      </FormItem>
                    )} />

                    {watchedMode === "price" ? (
                      <div className="space-y-3">
                        <AmountRow control={form.control} name="prix" currencyName="prixDevise" label={t.priceLabel} testId="prix" rates={rates} lang={lang} />
                        <AmountRow control={form.control} name="transport" currencyName="transportDevise" unknownName="transportInconnu" label={t.freightLabel} testId="transport" rates={rates} lang={lang} />
                        <AmountRow control={form.control} name="assurance" currencyName="assuranceDevise" unknownName="assuranceInconnu" label={t.insuranceLabel} testId="assurance" rates={rates} lang={lang} />
                        <CifSummary preview={preview} lang={lang} />
                      </div>
                    ) : (
                      <FormField control={form.control} name="montant" render={({ field }) => (
                        <FormItem>
                          <FormLabel>{watchedMode === "total" ? t.totalLabel : t.cif}</FormLabel>
                          <div className="flex gap-2">
                            <FormField control={form.control} name="devise" render={({ field: deviseField }) => (
                              <CurrencySelect value={deviseField.value} onChange={deviseField.onChange} rates={rates} lang={lang} />
                            )} />
                            <FormControl>
                              <Input type="number" min={0} step="any" placeholder={t.cifPlaceholder} {...field} className="flex-1" data-testid="input-cif" />
                            </FormControl>
                          </div>
                          {watchedMode === "total" ? (
                            <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 flex items-start gap-1.5" data-testid="total-warning">
                              <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" /> {t.totalWarning}
                            </p>
                          ) : (
                            <FormDescription data-testid="cif-nothing-added">{t.cifNothingAdded}</FormDescription>
                          )}
                          <ConversionNote amount={Number(field.value)} currency={watchedDevise} rates={rates} lang={lang} />
                          <FormMessage />
                        </FormItem>
                      )} />
                    )}

                    <p className="text-xs text-muted-foreground flex items-start gap-1.5" data-testid="customs-may-differ">
                      <Info className="h-3.5 w-3.5 shrink-0 mt-0.5" /> {t.customsMayDiffer}
                    </p>

                    <div className="grid grid-cols-2 gap-4">
                      <FormField control={form.control} name="joursAuPort" render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t.days}</FormLabel>
                          <FormControl>
                            <Input type="number" min={0} {...field} data-testid="input-jours" />
                          </FormControl>
                          <FormDescription>{t.daysNote}</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )} />

                      <FormField control={form.control} name="regime" render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center gap-1.5">
                            {t.regime}
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                              </TooltipTrigger>
                              <TooltipContent>
                                <p className="max-w-[240px] text-xs leading-relaxed">
                                  <strong>Droit commun</strong> : 100%.<br />
                                  <strong>Exonération partielle</strong> : DD×60%, TVA×80%.<br />
                                  <strong>Enlèvement direct</strong> : port ×70%.
                                </p>
                              </TooltipContent>
                            </Tooltip>
                          </FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-regime">
                                <SelectValue placeholder={t.regimePlaceholder} />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="Droit commun">
                                {lang === "fr" ? "Droit commun" : "Standard regime"}
                              </SelectItem>
                              <SelectItem value="Exonération partielle">
                                {lang === "fr" ? "Exonération partielle" : "Partial exemption"}
                              </SelectItem>
                              <SelectItem value="Enlèvement direct">
                                {lang === "fr" ? "Enlèvement direct" : "Direct clearance"}
                              </SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )} />
                    </div>
                  </CardContent>
                </Card>

                {/* Quota warning banner for logged-in users */}
                {user && simLimit !== null && (
                  <div className={`rounded-xl p-3 flex items-center justify-between gap-3 text-sm ${
                    isAtQuota
                      ? "bg-red-50 border border-red-200"
                      : quotaRatio >= 80
                      ? "bg-amber-50 border border-amber-200"
                      : "bg-slate-50 border border-slate-100"
                  }`}>
                    <div className="flex items-center gap-2">
                      {isAtQuota
                        ? <AlertTriangle className="h-4 w-4 text-red-500 shrink-0" />
                        : quotaRatio >= 80
                        ? <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />
                        : <Shield className="h-4 w-4 text-slate-400 shrink-0" />
                      }
                      <span className={`text-xs font-semibold ${
                        isAtQuota ? "text-red-700" : quotaRatio >= 80 ? "text-amber-700" : "text-slate-500"
                      }`}>
                        {isAtQuota
                          ? `Quota atteint — ${simUsed}/${simLimit} simulations ce mois`
                          : `${simUsed}/${simLimit} simulations utilisées ce mois`}
                      </span>
                    </div>
                    {isAtQuota && (
                      <button
                        type="button"
                        onClick={() => setQuotaModal(true)}
                        className="text-xs font-bold text-red-700 bg-red-100 px-2.5 py-1 rounded-lg whitespace-nowrap flex items-center gap-1 hover:bg-red-200 transition-colors"
                      >
                        <Crown className="h-3 w-3" /> Upgrade
                      </button>
                    )}
                  </div>
                )}

                <Button
                  type="submit"
                  size="lg"
                  className={`w-full text-base font-semibold ${isAtQuota ? "opacity-50 cursor-not-allowed" : ""}`}
                  disabled={isCalculating}
                  data-testid="button-calculer"
                >
                  {isCalculating ? (
                    <><Loader2 className="mr-2 h-5 w-5 animate-spin" />{t.calculating}</>
                  ) : isAtQuota ? (
                    <><AlertTriangle className="mr-2 h-5 w-5" /> Limite atteinte</>
                  ) : (
                    <><Calculator className="mr-2 h-5 w-5" />{t.submit}</>
                  )}
                </Button>
              </form>
            </Form>
          </div>

          {/* ── Live preview (desktop) ── */}
          <div className="hidden lg:block w-80 xl:w-96 shrink-0">
            <Card className="sticky top-6">
              <CardContent className="pt-5 pb-5">
                <LivePreview values={watchedValues} valeurCIF={watchedXof} />
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Feature bar */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 pt-2">
          {[
            { icon: Shield,     title: lang === "fr" ? "Estimation indicative" : "Indicative estimate", desc: lang === "fr" ? "À confirmer auprès d'un commissionnaire agréé en douane (CAD)" : "To be confirmed with a licensed customs broker (CAD)" },
            { icon: List,       title: lang === "fr" ? "Transparence totale"  : "Full transparency",   desc: lang === "fr" ? "Détail complet de tous les frais appliqués"            : "Complete breakdown of all applicable fees" },
            { icon: Zap,        title: lang === "fr" ? "Gain de temps"        : "Time saving",         desc: lang === "fr" ? "Simulation rapide en quelques secondes"                : "Fast simulation in seconds" },
            { icon: TrendingUp, title: lang === "fr" ? "Décision éclairée"    : "Informed decision",   desc: lang === "fr" ? "Planifiez votre budget en toute sérénité"              : "Plan your budget with confidence" },
          ].map((f) => (
            <div key={f.title} className="bg-card border rounded-xl p-4 flex items-start gap-3">
              <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                <f.icon className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-wide">{f.title}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{f.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </TooltipProvider>

    {/* Quota modal */}
    {quotaModal && (
      <QuotaModal
        used={simUsed}
        limit={simLimit ?? 3}
        planName={subscription?.plan.name ?? "Gratuit"}
        onClose={() => setQuotaModal(false)}
      />
    )}
  </>
  );
}
