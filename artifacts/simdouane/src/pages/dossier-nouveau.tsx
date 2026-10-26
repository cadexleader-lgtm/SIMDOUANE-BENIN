import { useState } from "react";
import { Link, useLocation } from "wouter";
import { ArrowLeft } from "lucide-react";
import { getListCasesQueryKey, useCreateCase, type CaseArrivalSituation } from "@workspace/api-client-react";
import { CaseForm, SituationChoice, emptyCaseForm, fieldErrorsOf, formToPayload, type CaseFormState } from "@/components/cases/case-form";
import { CaseDisclaimer } from "@/components/cases/case-status-badge";
import { queryClient } from "@/lib/queryClient";
import { useMvpTexts } from "@/lib/mvp-texts";

export default function DossierNouveau() {
  const t = useMvpTexts();
  const [, setLocation] = useLocation();
  const create = useCreateCase();
  const [form, setForm] = useState<CaseFormState | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const start = (situation: CaseArrivalSituation) => setForm(emptyCaseForm(situation));

  const submit = () => {
    if (!form) return;
    setFieldErrors({});
    create.mutate(
      { data: formToPayload(form) },
      {
        onSuccess: (c) => {
          queryClient.invalidateQueries({ queryKey: getListCasesQueryKey() });
          setLocation(`/dossiers/${c.id}`);
        },
        onError: (err) => setFieldErrors(fieldErrorsOf(err)),
      },
    );
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-10">
      <Link href="/dossiers" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800">
        <ArrowLeft className="h-4 w-4" /> {t.cases.back}
      </Link>
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">{t.cases.newCase}</h1>
        <p className="text-slate-500 mt-1 text-sm">{t.cases.requiredLegend}</p>
      </div>
      <CaseDisclaimer />

      {!form ? (
        <div className="space-y-3">
          <p className="text-sm font-semibold text-slate-700">{t.cases.situation.title}</p>
          <SituationChoice value={null} onChange={start} />
        </div>
      ) : (
        <>
          {fieldErrors._ && <p className="text-sm text-red-600" role="alert">{fieldErrors._}</p>}
          <CaseForm
            value={form}
            onChange={setForm}
            fieldErrors={fieldErrors}
            submitting={create.isPending}
            submitLabel={t.cases.create}
            onSubmit={submit}
            showSituation
          />
        </>
      )}
    </div>
  );
}
