import { useState, type ReactNode } from "react";
import { Loader2 } from "lucide-react";
import type { CaseArrivalSituation, ClearanceCase, CreateCaseInput } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useMvpTexts } from "@/lib/mvp-texts";
import { cn } from "@/lib/utils";

// Common origins, as suggestions only (free text accepted).
const COUNTRIES = [
  "Allemagne", "Belgique", "Canada", "Chine", "Corée du Sud", "Émirats arabes unis", "Espagne",
  "États-Unis", "France", "Italie", "Japon", "Nigeria", "Pays-Bas", "Royaume-Uni", "Togo",
];

export type CaseFormState = {
  arrivalSituation: CaseArrivalSituation;
  make: string; model: string; year: string; vin: string; condition: "" | "neuf" | "occasion";
  originCountry: string; departurePort: string; shippedAt: string; estimatedArrivalDate: string; arrivalDate: string;
  transportReference: string; existingReferences: string; formalitiesDone: string; knownBlockers: string; notes: string;
};

export function emptyCaseForm(arrivalSituation: CaseArrivalSituation): CaseFormState {
  return {
    arrivalSituation, make: "", model: "", year: "", vin: "", condition: "",
    originCountry: "", departurePort: "", shippedAt: "", estimatedArrivalDate: "", arrivalDate: "",
    transportReference: "", existingReferences: "", formalitiesDone: "", knownBlockers: "", notes: "",
  };
}

export function caseToForm(c: ClearanceCase): CaseFormState {
  const s = (v: string | null | undefined) => v ?? "";
  return {
    arrivalSituation: c.arrivalSituation,
    make: c.vehicle.make, model: s(c.vehicle.model), year: c.vehicle.year == null ? "" : String(c.vehicle.year),
    vin: s(c.vehicle.vin), condition: (c.vehicle.condition ?? "") as CaseFormState["condition"],
    originCountry: s(c.originCountry), departurePort: s(c.departurePort), shippedAt: s(c.shippedAt),
    estimatedArrivalDate: s(c.estimatedArrivalDate), arrivalDate: s(c.arrivalDate),
    transportReference: s(c.transportReference), existingReferences: s(c.existingReferences),
    formalitiesDone: s(c.formalitiesDone), knownBlockers: s(c.knownBlockers), notes: s(c.notes),
  };
}

/** Payload sent to the API; the server validates everything again. */
export function formToPayload(f: CaseFormState): CreateCaseInput {
  const v = (x: string) => x.trim() || null;
  const year = f.year.trim() === "" ? null : Number(f.year);
  return {
    arrivalSituation: f.arrivalSituation,
    vehicle: { make: f.make.trim(), model: v(f.model), year: Number.isFinite(year) ? year : null, vin: v(f.vin), condition: f.condition || null },
    originCountry: v(f.originCountry), departurePort: v(f.departurePort), shippedAt: v(f.shippedAt),
    estimatedArrivalDate: v(f.estimatedArrivalDate),
    // The real arrival date only exists once the vehicle has arrived.
    arrivalDate: f.arrivalSituation === "arrived" ? v(f.arrivalDate) : null,
    transportReference: v(f.transportReference), existingReferences: v(f.existingReferences),
    formalitiesDone: v(f.formalitiesDone), knownBlockers: v(f.knownBlockers), notes: v(f.notes),
  };
}

export function SituationChoice({ value, onChange }: { value: CaseArrivalSituation | null; onChange: (v: CaseArrivalSituation) => void }) {
  const t = useMvpTexts();
  return (
    <div className="grid gap-3 sm:grid-cols-2" role="radiogroup" aria-label={t.cases.situation.title}>
      {(["not_arrived", "arrived"] as const).map((s) => (
        <button
          key={s}
          type="button"
          role="radio"
          aria-checked={value === s}
          onClick={() => onChange(s)}
          className={cn(
            "rounded-2xl border p-4 text-left transition-colors",
            value === s ? "border-[#003D24] bg-[#003D24]/5 ring-1 ring-[#003D24]" : "border-slate-200 bg-white hover:bg-slate-50",
          )}
        >
          <span className="block font-semibold text-slate-900">{t.cases.situation[s]}</span>
          <span className="block text-sm text-slate-500 mt-1">{t.cases.situation[`${s}Help`]}</span>
        </button>
      ))}
    </div>
  );
}

function Field({ name, label, required, error, children }: { name: string; label: string; required?: boolean; error?: string; children: ReactNode }) {
  const t = useMvpTexts();
  return (
    <label className="block text-sm font-medium text-slate-700" htmlFor={name}>
      {label} <span className="font-normal text-slate-400">({required ? t.cases.required : t.cases.optional})</span>
      <div className="mt-1">{children}</div>
      {error && <span className="mt-1 block text-xs text-red-600" role="alert">{error}</span>}
    </label>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <fieldset className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
      <legend className="px-1 text-sm font-semibold uppercase tracking-wide text-slate-500">{title}</legend>
      {children}
    </fieldset>
  );
}

export function CaseForm({
  value, onChange, fieldErrors, submitting, submitLabel, onSubmit, showSituation, extraActions,
}: {
  value: CaseFormState;
  onChange: (v: CaseFormState) => void;
  fieldErrors: Record<string, string>;
  submitting: boolean;
  submitLabel: string;
  onSubmit: () => void;
  showSituation: boolean;
  extraActions?: ReactNode;
}) {
  const t = useMvpTexts();
  const f = t.cases.fields;
  const set = (patch: Partial<CaseFormState>) => onChange({ ...value, ...patch });
  const text = (key: keyof CaseFormState, errorKey: string, props: Record<string, unknown> = {}) => (
    <Input id={errorKey} value={value[key] as string} onChange={(e) => set({ [key]: e.target.value } as Partial<CaseFormState>)}
      aria-invalid={!!fieldErrors[errorKey]} className="h-11 text-base sm:text-sm" {...props} />
  );
  const area = (key: keyof CaseFormState, placeholder?: string) => (
    <Textarea id={key} value={value[key] as string} rows={3} maxLength={2000} placeholder={placeholder}
      onChange={(e) => set({ [key]: e.target.value } as Partial<CaseFormState>)} className="text-base sm:text-sm" />
  );
  const arrived = value.arrivalSituation === "arrived";

  return (
    <form className="space-y-5" onSubmit={(e) => { e.preventDefault(); onSubmit(); }} noValidate>
      {showSituation && (
        <div className="space-y-2">
          <p className="text-sm font-semibold text-slate-700">{t.cases.situation.title}</p>
          <SituationChoice value={value.arrivalSituation} onChange={(s) => set({ arrivalSituation: s })} />
          {fieldErrors.arrivalSituation && <p className="text-xs text-red-600" role="alert">{fieldErrors.arrivalSituation}</p>}
        </div>
      )}

      <Section title={t.cases.sections.vehicle}>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field name="vehicle.make" label={f["vehicle.make"]} required error={fieldErrors["vehicle.make"]}>{text("make", "vehicle.make", { maxLength: 80, autoComplete: "off" })}</Field>
          <Field name="vehicle.model" label={f["vehicle.model"]} error={fieldErrors["vehicle.model"]}>{text("model", "vehicle.model", { maxLength: 80, autoComplete: "off" })}</Field>
          <Field name="vehicle.year" label={f["vehicle.year"]} error={fieldErrors["vehicle.year"]}>{text("year", "vehicle.year", { inputMode: "numeric", maxLength: 4 })}</Field>
          <Field name="vehicle.condition" label={f["vehicle.condition"]} error={fieldErrors["vehicle.condition"]}>
            <select id="vehicle.condition" value={value.condition} onChange={(e) => set({ condition: e.target.value as CaseFormState["condition"] })}
              className="h-11 w-full rounded-md border border-input bg-background px-3 text-base sm:text-sm">
              {(["", "occasion", "neuf"] as const).map((c) => <option key={c} value={c}>{t.cases.condition[c]}</option>)}
            </select>
          </Field>
        </div>
        <Field name="vehicle.vin" label={f["vehicle.vin"]} error={fieldErrors["vehicle.vin"]}>
          {text("vin", "vehicle.vin", { maxLength: 40, autoCapitalize: "characters", autoComplete: "off", placeholder: t.cases.placeholders.vin })}
        </Field>
      </Section>

      <Section title={t.cases.sections.transport}>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field name="originCountry" label={f.originCountry} error={fieldErrors.originCountry}>{text("originCountry", "originCountry", { list: "simdouane-countries", maxLength: 80 })}</Field>
          <Field name="departurePort" label={f.departurePort} error={fieldErrors.departurePort}>{text("departurePort", "departurePort", { maxLength: 80 })}</Field>
          <Field name="shippedAt" label={f.shippedAt} error={fieldErrors.shippedAt}>{text("shippedAt", "shippedAt", { type: "date" })}</Field>
          <Field name="transportReference" label={f.transportReference} error={fieldErrors.transportReference}>{text("transportReference", "transportReference", { maxLength: 100 })}</Field>
        </div>
        <datalist id="simdouane-countries">{COUNTRIES.map((c) => <option key={c} value={c} />)}</datalist>
      </Section>

      <Section title={t.cases.sections.arrival}>
        <div className="grid gap-4 sm:grid-cols-2">
          {arrived ? (
            <Field name="arrivalDate" label={f.arrivalDate} error={fieldErrors.arrivalDate}>{text("arrivalDate", "arrivalDate", { type: "date" })}</Field>
          ) : (
            <Field name="estimatedArrivalDate" label={f.estimatedArrivalDate} error={fieldErrors.estimatedArrivalDate}>{text("estimatedArrivalDate", "estimatedArrivalDate", { type: "date" })}</Field>
          )}
          <div className="text-sm text-slate-600 sm:pt-7">Port d'arrivée : <strong>Cotonou</strong></div>
        </div>
        {!arrived && fieldErrors.arrivalDate && <p className="text-xs text-red-600" role="alert">{fieldErrors.arrivalDate}</p>}
      </Section>

      {arrived && (
        <Section title={t.cases.sections.current}>
          <Field name="formalitiesDone" label={f.formalitiesDone} error={fieldErrors.formalitiesDone}>{area("formalitiesDone", t.cases.placeholders.formalitiesDone)}</Field>
          <Field name="knownBlockers" label={f.knownBlockers} error={fieldErrors.knownBlockers}>{area("knownBlockers", t.cases.placeholders.knownBlockers)}</Field>
        </Section>
      )}

      <Section title={t.cases.sections.notes}>
        <Field name="existingReferences" label={f.existingReferences} error={fieldErrors.existingReferences}>{area("existingReferences", t.cases.placeholders.existingReferences)}</Field>
        <Field name="notes" label={f.notes} error={fieldErrors.notes}>{area("notes")}</Field>
      </Section>

      {Object.keys(fieldErrors).length > 0 && <p className="text-sm text-red-600" role="alert">{t.cases.fixErrors}</p>}

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        {extraActions}
        <Button type="submit" disabled={submitting} className="h-11 bg-[#003D24] hover:bg-[#004d2e] text-white">
          {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : submitLabel}
        </Button>
      </div>
    </form>
  );
}

/** HTTP status of an API error (0 when the request never reached the API). */
export function errorStatusOf(err: unknown): number {
  return (err as { status?: number } | null)?.status ?? 0;
}

/** The API's French message when it sent one (e.g. disabled account), else the fallback. */
export function errorMessageOf(err: unknown, fallback: string): string {
  return (err as { data?: { message?: string } } | null)?.data?.message ?? fallback;
}

export function fieldErrorsOf(err: unknown): Record<string, string> {
  const data = (err as { data?: { fieldErrors?: Record<string, string>; message?: string } } | null)?.data;
  if (data?.fieldErrors) return data.fieldErrors;
  return { _: data?.message ?? "Une erreur est survenue. Réessayez." };
}
