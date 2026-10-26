import { Link } from "wouter";
import { ChevronRight, FolderOpen, Plus } from "lucide-react";
import { useListCases } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { CaseDisclaimer, CaseStatusBadge } from "@/components/cases/case-status-badge";
import { errorMessageOf } from "@/components/cases/case-form";
import { useMvpTexts } from "@/lib/mvp-texts";

export default function Dossiers() {
  const t = useMvpTexts();
  const { data: cases, isLoading, isError, error, refetch, isFetching } = useListCases();

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-10">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">{t.cases.listTitle}</h1>
          <p className="text-slate-500 mt-1 text-sm">{t.cases.listSubtitle}</p>
        </div>
        <Button asChild className="h-11 bg-[#003D24] hover:bg-[#004d2e] text-white">
          <Link href="/dossiers/nouveau"><Plus className="h-4 w-4 mr-1" />{t.cases.newCase}</Link>
        </Button>
      </div>
      <CaseDisclaimer />

      {isLoading && <Skeleton className="h-24 w-full rounded-2xl" />}

      {isError && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800 space-y-3" role="alert">
          <p>{errorMessageOf(error, t.cases.loadError)}</p>
          <Button variant="outline" onClick={() => refetch()} disabled={isFetching} className="h-10">{t.cases.retry}</Button>
        </div>
      )}

      {cases?.length === 0 && (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center">
          <FolderOpen className="h-10 w-10 mx-auto text-slate-300" />
          <p className="mt-3 font-semibold text-slate-700">{t.cases.empty}</p>
          <p className="mt-1 text-sm text-slate-500">{t.cases.emptyHelp}</p>
        </div>
      )}

      <ul className="space-y-3">
        {cases?.map((c) => (
          <li key={c.id}>
            <Link href={`/dossiers/${c.id}`} className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 hover:bg-slate-50 transition-colors">
              <div className="min-w-0 flex-1 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold text-slate-900 truncate">
                    {[c.vehicle.make, c.vehicle.model, c.vehicle.year].filter(Boolean).join(" ")}
                  </span>
                  <CaseStatusBadge status={c.status} />
                </div>
                <p className="text-xs text-slate-500">
                  {c.reference} · {t.cases.situation[c.arrivalSituation]}
                </p>
                <p className="text-xs text-slate-500">
                  {t.cases.missingCount(c.missingCount)} · {t.cases.updatedOn} {new Date(c.updatedAt).toLocaleDateString("fr-FR")}
                </p>
              </div>
              <ChevronRight className="h-5 w-5 text-slate-300 shrink-0" />
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
