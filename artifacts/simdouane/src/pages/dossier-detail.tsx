import { useEffect, useState } from "react";
import { Link, useLocation, useRoute } from "wouter";
import { ArrowLeft, CheckCircle2, ClipboardCheck, Loader2 } from "lucide-react";
import {
  getGetCaseQueryKey,
  getListCaseEventsQueryKey,
  getListCasesQueryKey,
  useArchiveCase,
  useCheckCase,
  useGetCase,
  useListCaseEvents,
  useUpdateCase,
  type ClearanceCase,
} from "@workspace/api-client-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { CaseForm, caseToForm, fieldErrorsOf, formToPayload, type CaseFormState } from "@/components/cases/case-form";
import { CaseDisclaimer, CaseStatusBadge } from "@/components/cases/case-status-badge";
import { queryClient } from "@/lib/queryClient";
import { formatDateTime, useMvpTexts } from "@/lib/mvp-texts";

function refresh(c: ClearanceCase) {
  queryClient.setQueryData(getGetCaseQueryKey(c.id), c);
  queryClient.invalidateQueries({ queryKey: getListCasesQueryKey() });
  queryClient.invalidateQueries({ queryKey: getListCaseEventsQueryKey(c.id) });
}

export default function DossierDetail() {
  const t = useMvpTexts();
  const [, params] = useRoute("/dossiers/:id");
  const id = params?.id ?? "";
  const [, setLocation] = useLocation();
  const { data: file, isLoading, isError } = useGetCase(id, { query: { queryKey: getGetCaseQueryKey(id), retry: false } });
  const { data: events } = useListCaseEvents(id, { query: { queryKey: getListCaseEventsQueryKey(id), enabled: !!file } });
  const update = useUpdateCase();
  const check = useCheckCase();
  const archive = useArchiveCase();
  const [form, setForm] = useState<CaseFormState | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (file && !form) setForm(caseToForm(file));
  }, [file, form]);

  if (isLoading) return <div className="max-w-3xl mx-auto"><Skeleton className="h-64 w-full rounded-2xl" /></div>;
  if (isError || !file) {
    return (
      <div className="max-w-3xl mx-auto space-y-4 text-center py-16">
        <p className="font-semibold text-slate-700">{t.cases.notFound}</p>
        <Link href="/dossiers" className="text-[#003D24] underline">{t.cases.back}</Link>
      </div>
    );
  }

  const save = () => {
    if (!form) return;
    setFieldErrors({});
    update.mutate(
      { id, data: formToPayload(form) },
      {
        onSuccess: (c) => { refresh(c); setForm(caseToForm(c)); setSaved(true); setTimeout(() => setSaved(false), 3000); },
        onError: (err) => setFieldErrors(fieldErrorsOf(err)),
      },
    );
  };

  const runCheck = () =>
    check.mutate({ id }, { onSuccess: (c) => { refresh(c); window.scrollTo({ top: 0, behavior: "smooth" }); } });

  const doArchive = () =>
    archive.mutate({ id }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListCasesQueryKey() });
        setLocation("/dossiers");
      },
    });

  const label = (key: string) => t.cases.fields[key] ?? key;
  const title = [file.vehicle.make, file.vehicle.model, file.vehicle.year].filter(Boolean).join(" ");

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-10">
      <Link href="/dossiers" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800">
        <ArrowLeft className="h-4 w-4" /> {t.cases.back}
      </Link>

      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">{title}</h1>
          <CaseStatusBadge status={file.status} />
        </div>
        <p className="text-sm text-slate-500">{file.reference} · {t.cases.situation[file.arrivalSituation]}</p>
        <p className="text-sm text-slate-600">{t.cases.statusHelp[file.status]}</p>
        <CaseDisclaimer />
      </div>

      {(file.missingFields.length > 0 || file.recommendedFields.length > 0) && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 space-y-2 text-sm">
          {file.missingFields.length > 0 && (
            <div>
              <p className="font-semibold text-amber-900">{t.cases.missingTitle}</p>
              <ul className="mt-1 list-disc pl-5 text-amber-900">{file.missingFields.map((k) => <li key={k}><a href={`#${k}`} className="underline">{label(k)}</a></li>)}</ul>
            </div>
          )}
          {file.recommendedFields.length > 0 && (
            <p className="text-amber-800"><span className="font-semibold">{t.cases.recommendedTitle} :</span> {file.recommendedFields.map(label).join(", ")}</p>
          )}
        </div>
      )}

      <div className="flex flex-col gap-2 sm:flex-row">
        <Button onClick={runCheck} disabled={check.isPending} variant="outline" className="h-11 border-[#003D24] text-[#003D24]">
          {check.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <><ClipboardCheck className="h-4 w-4 mr-1" />{t.cases.check}</>}
        </Button>
      </div>

      {fieldErrors._ && <p className="text-sm text-red-600" role="alert">{fieldErrors._}</p>}
      {form && (
        <CaseForm
          value={form}
          onChange={setForm}
          fieldErrors={fieldErrors}
          submitting={update.isPending}
          submitLabel={saved ? t.cases.saved : t.cases.save}
          onSubmit={save}
          showSituation
          extraActions={
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button type="button" variant="ghost" className="h-11 text-red-700">{t.cases.archive}</Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>{t.cases.archiveConfirmTitle}</AlertDialogTitle>
                  <AlertDialogDescription>{t.cases.archiveConfirmText}</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>{t.common.cancel}</AlertDialogCancel>
                  <AlertDialogAction onClick={doArchive} className="bg-red-700 hover:bg-red-800">{t.cases.archive}</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          }
        />
      )}

      {events && events.length > 0 && (
        <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500 mb-3">{t.cases.history}</h2>
          <ul className="space-y-2 text-sm">
            {events.map((e) => (
              <li key={e.id} className="flex gap-2">
                <CheckCircle2 className="h-4 w-4 text-slate-300 mt-0.5 shrink-0" />
                <span className="text-slate-700">
                  {t.cases.events[e.type] ?? e.type}
                  {e.type === "status_changed" && e.toStatus && ` : ${t.cases.status[e.toStatus as keyof typeof t.cases.status] ?? e.toStatus}`}
                  {e.type === "updated" && Array.isArray((e.details as { fields?: string[] } | null)?.fields) &&
                    ` (${((e.details as { fields: string[] }).fields).map(label).join(", ")})`}
                  <span className="block text-xs text-slate-400">{formatDateTime(e.createdAt)}{e.actorName ? ` · ${e.actorName}` : ""}</span>
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
