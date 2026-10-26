import { useState } from "react";
import { FileText, Loader2 } from "lucide-react";
import {
  getGetAdminTransitaireApplicationQueryKey,
  getListAdminTransitaireApplicationsQueryKey,
  getListAdminTransitairesQueryKey,
  getListAuditLogsQueryKey,
  useChangeTransitaireStatus,
  useCreateAdminTransitaireDocumentLink,
  useDecideTransitaireApplication,
  useGetAdminTransitaireApplication,
  useListAdminTransitaireApplications,
  useListAdminTransitaires,
  useListAuditLogs,
  type AdminTransitaireUser,
  type ListAdminTransitaireApplicationsStatus,
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { queryClient } from "@/lib/queryClient";
import { apiErrorMessage, formatDateTime, useMvpTexts } from "@/lib/mvp-texts";
import { startDownload } from "@/lib/private-files";
import { cn } from "@/lib/utils";

const FILTERS: ListAdminTransitaireApplicationsStatus[] = ["submitted", "approved", "rejected", "all"];

function refreshAll() {
  for (const key of [
    getListAdminTransitaireApplicationsQueryKey(),
    getListAdminTransitairesQueryKey(),
    getListAuditLogsQueryKey(),
  ]) {
    queryClient.invalidateQueries({ queryKey: [key[0]] });
  }
}

/** Admin tab: transitaire access requests, accounts and security journal. */
export function TransitairesAdmin() {
  const t = useMvpTexts();
  const [filter, setFilter] = useState<ListAdminTransitaireApplicationsStatus>("submitted");
  const [selected, setSelected] = useState<string | null>(null);
  const params = { status: filter };
  const { data: applications, isLoading } = useListAdminTransitaireApplications(params, {
    query: { queryKey: getListAdminTransitaireApplicationsQueryKey(params) },
  });

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <Card className="lg:col-span-2 border-slate-200 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">{t.admin.applications}</CardTitle>
            <div className="flex flex-wrap gap-1 pt-2">
              {FILTERS.map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setFilter(f)}
                  className={cn(
                    "px-3 py-1 rounded-full text-xs font-semibold border",
                    filter === f ? "bg-[#003D24] text-white border-[#003D24]" : "border-slate-200 text-slate-600 hover:bg-slate-50",
                  )}
                >
                  {t.admin.filters[f]}
                </button>
              ))}
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {isLoading && <Skeleton className="h-20 w-full" />}
            {applications?.length === 0 && <p className="text-sm text-slate-500">{t.admin.empty}</p>}
            {applications?.map((a) => (
              <button
                key={a.id}
                type="button"
                onClick={() => setSelected(a.id)}
                className={cn(
                  "w-full text-left rounded-xl border p-3 text-sm transition-colors",
                  selected === a.id ? "border-[#003D24] bg-[#003D24]/5" : "border-slate-200 hover:bg-slate-50",
                )}
              >
                <div className="font-semibold text-slate-800">{a.user.fullName}</div>
                <div className="text-xs text-slate-500">{a.user.email}</div>
                <div className="text-xs text-slate-500 mt-1">
                  {a.agrementNumber} · {a.documentsCount} {t.admin.documentsCount} · {t.transitaire.applicationStatus[a.status]} · {formatDateTime(a.createdAt)}
                </div>
              </button>
            ))}
          </CardContent>
        </Card>

        <div className="lg:col-span-3">
          {selected ? <ApplicationReview id={selected} /> : (
            <Card className="border-slate-200 shadow-sm"><CardContent className="py-10 text-center text-sm text-slate-500">{t.admin.selectApplication}</CardContent></Card>
          )}
        </div>
      </div>

      <TransitaireAccounts />
      <SecurityJournal />
    </div>
  );
}

function ApplicationReview({ id }: { id: string }) {
  const t = useMvpTexts();
  const { data, isLoading } = useGetAdminTransitaireApplication(id, {
    query: { queryKey: getGetAdminTransitaireApplicationQueryKey(id) },
  });
  const link = useCreateAdminTransitaireDocumentLink();
  const decide = useDecideTransitaireApplication();
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);

  if (isLoading || !data) return <Skeleton className="h-64 w-full" />;
  const { application, user, decisions } = data;

  const open = (fileId: string) =>
    link.mutate(
      { id, fileId },
      {
        onSuccess: (res) => {
          startDownload(res.url);
          refreshAll();
        },
        onError: (err) => setError(apiErrorMessage(err, t.common.errorGeneric)),
      },
    );

  const submitDecision = (decision: "approve" | "reject") => {
    setError(null);
    decide.mutate(
      { id, data: { decision, reason: reason.trim() || undefined } },
      {
        onSuccess: () => {
          setReason("");
          queryClient.invalidateQueries({ queryKey: getGetAdminTransitaireApplicationQueryKey(id) });
          refreshAll();
        },
        onError: (err) => setError(apiErrorMessage(err, t.common.errorGeneric)),
      },
    );
  };

  return (
    <Card className="border-slate-200 shadow-sm">
      <CardHeader className="pb-3 border-b border-slate-100">
        <CardTitle className="text-base">{user.fullName}</CardTitle>
        <p className="text-xs text-slate-500">{user.email} · {t.transitaire.status[user.transitaireStatus]}</p>
      </CardHeader>
      <CardContent className="pt-4 space-y-4 text-sm">
        <dl className="grid grid-cols-2 gap-2">
          <dt className="text-slate-500">{t.transitaire.agrementNumber}</dt><dd className="font-semibold">{application.agrementNumber}</dd>
          <dt className="text-slate-500">{t.admin.declaredPoste}</dt><dd>{user.poste ?? "—"}</dd>
          <dt className="text-slate-500">{t.accountKind.title}</dt><dd>{t.accountKind[user.accountKind]}</dd>
        </dl>
        {application.message && <p className="rounded-lg bg-slate-50 p-3 text-slate-700">{application.message}</p>}

        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{t.transitaire.documents}</p>
          {application.documents.length === 0 && <p className="text-amber-700 text-xs">{t.transitaire.noDocument}</p>}
          {application.documents.map((d) => (
            <div key={d.id} className="flex items-center justify-between gap-2">
              <span className="flex items-center gap-2"><FileText className="h-4 w-4 text-slate-400" />{d.originalName}</span>
              <Button size="sm" variant="outline" disabled={link.isPending} onClick={() => open(d.id)}>{t.admin.openDocument}</Button>
            </div>
          ))}
          <p className="text-xs text-slate-400">{t.admin.consultationLogged}</p>
        </div>

        {application.status === "submitted" && (
          <div className="space-y-2 border-t border-slate-100 pt-4">
            <Textarea value={reason} rows={2} maxLength={1000} placeholder={t.common.reasonOptional} onChange={(e) => setReason(e.target.value)} />
            <p className="text-xs text-slate-500">{t.admin.approveDisclaimer}</p>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" disabled={decide.isPending} onClick={() => submitDecision("reject")}>{t.admin.reject}</Button>
              <Button className="bg-[#003D24] hover:bg-[#004d2e] text-white" disabled={decide.isPending || application.documents.length === 0} onClick={() => submitDecision("approve")}>
                {decide.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : t.admin.approve}
              </Button>
            </div>
          </div>
        )}
        {error && <p className="text-red-600 text-xs" role="alert">{error}</p>}

        {decisions.length > 0 && (
          <div className="border-t border-slate-100 pt-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">{t.admin.decisions}</p>
            <ul className="space-y-1 text-xs text-slate-600">
              {decisions.map((d) => (
                <li key={d.id}>{formatDateTime(d.createdAt)} · {t.admin.decisionLabels[d.decision]} · {d.decidedByName ?? "—"}{d.reason ? ` · ${d.reason}` : ""}</li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function TransitaireAccounts() {
  const t = useMvpTexts();
  const { data } = useListAdminTransitaires({ query: { queryKey: getListAdminTransitairesQueryKey() } });
  return (
    <Card className="border-slate-200 shadow-sm">
      <CardHeader className="pb-3"><CardTitle className="text-base">{t.admin.accounts}</CardTitle></CardHeader>
      <CardContent className="space-y-2">
        {data?.length === 0 && <p className="text-sm text-slate-500">{t.admin.empty}</p>}
        {data?.map((u) => <AccountRow key={u.id} user={u} />)}
      </CardContent>
    </Card>
  );
}

function AccountRow({ user }: { user: AdminTransitaireUser }) {
  const t = useMvpTexts();
  const change = useChangeTransitaireStatus();
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);

  const act = (action: "suspend" | "reinstate" | "revoke") => {
    setError(null);
    if (action !== "reinstate" && !reason.trim()) return setError(t.admin.reasonRequired);
    change.mutate(
      { id: user.id, data: { action, reason: reason.trim() || undefined } },
      { onSuccess: () => { setReason(""); refreshAll(); }, onError: (err) => setError(apiErrorMessage(err, t.common.errorGeneric)) },
    );
  };

  return (
    <div className="rounded-xl border border-slate-200 p-3 text-sm space-y-2">
      <div className="flex flex-wrap justify-between gap-2">
        <span><span className="font-semibold">{user.fullName}</span> <span className="text-slate-500">{user.email}</span></span>
        <span className="text-xs text-slate-500">{t.transitaire.status[user.transitaireStatus]} · {formatDateTime(user.transitaireStatusChangedAt)}</span>
      </div>
      {user.transitaireStatus !== "revoked" && (
        <div className="flex flex-col sm:flex-row gap-2">
          <input value={reason} maxLength={1000} onChange={(e) => setReason(e.target.value)} placeholder={t.common.reason}
            className="flex-1 rounded-md border border-slate-200 px-3 py-1.5 text-sm" />
          {user.transitaireStatus === "active" && <Button size="sm" variant="outline" disabled={change.isPending} onClick={() => act("suspend")}>{t.admin.suspend}</Button>}
          {user.transitaireStatus === "suspended" && <Button size="sm" variant="outline" disabled={change.isPending} onClick={() => act("reinstate")}>{t.admin.reinstate}</Button>}
          <Button size="sm" variant="outline" className="text-red-700" disabled={change.isPending} onClick={() => act("revoke")}>{t.admin.revoke}</Button>
        </div>
      )}
      {error && <p className="text-red-600 text-xs" role="alert">{error}</p>}
    </div>
  );
}

function SecurityJournal() {
  const t = useMvpTexts();
  const params = { limit: 50 };
  const { data } = useListAuditLogs(params, { query: { queryKey: getListAuditLogsQueryKey(params) } });
  return (
    <Card className="border-slate-200 shadow-sm">
      <CardHeader className="pb-3"><CardTitle className="text-base">{t.admin.journal}</CardTitle></CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <tbody>
              {data?.map((l) => (
                <tr key={l.id} className="border-b border-slate-100 last:border-0">
                  <td className="py-1.5 pr-3 whitespace-nowrap text-slate-500">{formatDateTime(l.createdAt)}</td>
                  <td className="py-1.5 pr-3 whitespace-nowrap">{l.actorName ?? l.actorRole}</td>
                  <td className="py-1.5 pr-3 font-mono">{l.action}</td>
                  <td className="py-1.5 text-slate-500 font-mono truncate max-w-[16rem]">{l.targetType}:{l.targetId}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
