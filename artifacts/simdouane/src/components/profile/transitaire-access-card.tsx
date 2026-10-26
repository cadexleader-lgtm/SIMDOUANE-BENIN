import { useRef, useState } from "react";
import { BadgeCheck, FileText, Loader2, Paperclip, ShieldAlert } from "lucide-react";
import {
  getGetProfileQueryKey,
  getGetTransitaireAccessQueryKey,
  useCreateTransitaireApplication,
  useCreateTransitaireDocumentLink,
  useGetTransitaireAccess,
  type TransitaireApplication,
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { queryClient } from "@/lib/queryClient";
import { apiErrorMessage, formatDateTime, useMvpTexts } from "@/lib/mvp-texts";
import { ACCEPTED_TYPES, MAX_UPLOAD_BYTES, startDownload, uploadTransitaireDocumentFile } from "@/lib/private-files";

const STATUS_STYLE: Record<string, string> = {
  none: "bg-slate-100 text-slate-600",
  pending: "bg-amber-50 text-amber-700 border border-amber-200",
  active: "bg-green-50 text-green-700 border border-green-200",
  suspended: "bg-red-50 text-red-700 border border-red-200",
  revoked: "bg-red-50 text-red-700 border border-red-200",
};

function refresh() {
  queryClient.invalidateQueries({ queryKey: getGetTransitaireAccessQueryKey() });
  queryClient.invalidateQueries({ queryKey: getGetProfileQueryKey() });
}

export function TransitaireAccessCard() {
  const t = useMvpTexts();
  const { data, isLoading } = useGetTransitaireAccess();
  const create = useCreateTransitaireApplication();
  const [agrement, setAgrement] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState<string | null>(null);

  if (isLoading || !data) {
    return <Skeleton className="h-48 w-full" />;
  }

  const current = data.applications.find((a) => a.status === "submitted");
  const past = data.applications.filter((a) => a.status !== "submitted");
  const status = data.status;

  const submit = () => {
    setError(null);
    create.mutate(
      { data: { agrementNumber: agrement.trim(), message: message.trim() || undefined } },
      {
        onSuccess: () => {
          setAgrement("");
          setMessage("");
          refresh();
        },
        onError: (err) => setError(apiErrorMessage(err, t.common.errorGeneric)),
      },
    );
  };

  return (
    <Card className="border-slate-200 shadow-sm">
      <CardHeader className="border-b border-slate-100 pb-4">
        <CardTitle className="text-lg flex items-center gap-2">
          <BadgeCheck className="h-5 w-5 text-[#003D24]" /> {t.transitaire.title}
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-6 space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${STATUS_STYLE[status] ?? ""}`}>{t.transitaire.status[status]}</span>
          {data.statusChangedAt && <span className="text-xs text-slate-400">{formatDateTime(data.statusChangedAt)}</span>}
        </div>

        <p className="text-sm text-slate-600">{t.transitaire.intro}</p>
        <p className="text-xs text-slate-500">{t.transitaire.disclaimer} {t.transitaire.posteNote}</p>

        {status === "suspended" && (
          <p className="text-sm text-red-700 flex items-center gap-2"><ShieldAlert className="h-4 w-4" />{t.transitaire.suspendedHelp}</p>
        )}

        {current && <ApplicationBlock application={current} editable />}

        {data.canApply && (
          <div className="space-y-3 rounded-xl border border-slate-200 p-4">
            <label className="block text-sm font-medium text-slate-700">
              {t.transitaire.agrementNumber}
              <Input className="mt-1" value={agrement} maxLength={60} placeholder={t.transitaire.agrementPlaceholder} onChange={(e) => setAgrement(e.target.value)} />
            </label>
            <label className="block text-sm font-medium text-slate-700">
              {t.transitaire.message}
              <Textarea className="mt-1" value={message} maxLength={1000} rows={3} onChange={(e) => setMessage(e.target.value)} />
            </label>
            {error && <p className="text-sm text-red-600" role="alert">{error}</p>}
            <div className="flex justify-end">
              <Button onClick={submit} disabled={create.isPending || agrement.trim().length < 2} className="bg-[#003D24] hover:bg-[#004d2e] text-white">
                {create.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : past.length ? t.transitaire.applyAgain : t.transitaire.submit}
              </Button>
            </div>
          </div>
        )}

        {past.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-semibold text-slate-700">{t.transitaire.history}</p>
            {past.map((a) => <ApplicationBlock key={a.id} application={a} />)}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ApplicationBlock({ application, editable = false }: { application: TransitaireApplication; editable?: boolean }) {
  const t = useMvpTexts();
  const link = useCreateTransitaireDocumentLink();
  const fileInput = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    setError(null);
    if (file.size > MAX_UPLOAD_BYTES) return setError(t.files.tooLarge);
    if (!ACCEPTED_TYPES.includes(file.type)) return setError(t.files.badType);
    setUploading(true);
    try {
      await uploadTransitaireDocumentFile(application.id, file);
      refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : t.common.errorGeneric);
    } finally {
      setUploading(false);
      if (fileInput.current) fileInput.current.value = "";
    }
  };

  const open = (fileId: string) =>
    link.mutate(
      { id: application.id, fileId },
      { onSuccess: (res) => startDownload(res.url), onError: (err) => setError(apiErrorMessage(err, t.common.errorGeneric)) },
    );

  return (
    <div className="rounded-xl border border-slate-200 p-4 space-y-3 text-sm">
      <div className="flex flex-wrap justify-between gap-2">
        <span className="font-semibold text-slate-800">{t.transitaire.agrementNumber} : {application.agrementNumber}</span>
        <span className="text-xs text-slate-500">{t.transitaire.applicationStatus[application.status]} · {formatDateTime(application.decidedAt ?? application.createdAt)}</span>
      </div>
      {application.decisionReason && (
        <p className="text-slate-600"><span className="font-medium">{t.transitaire.decisionReason} :</span> {application.decisionReason}</p>
      )}
      <div className="space-y-1">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{t.transitaire.documents}</p>
        {application.documents.length === 0 && editable && <p className="text-amber-700 text-xs">{t.transitaire.noDocument}</p>}
        {application.documents.map((d) => (
          <button key={d.id} type="button" onClick={() => open(d.id)} className="flex items-center gap-2 text-[#003D24] hover:underline">
            <FileText className="h-4 w-4" /> {d.originalName}
          </button>
        ))}
      </div>
      {editable && application.documents.length < 5 && (
        <div>
          <input ref={fileInput} type="file" accept={ACCEPTED_TYPES.join(",")} className="hidden" onChange={(e) => onFile(e.target.files?.[0])} />
          <Button type="button" variant="outline" size="sm" disabled={uploading} onClick={() => fileInput.current?.click()}>
            {uploading ? <><Loader2 className="h-4 w-4 animate-spin mr-1" />{t.files.uploading}</> : <><Paperclip className="h-4 w-4 mr-1" />{t.transitaire.addDocument}</>}
          </Button>
          <p className="text-xs text-slate-500 mt-1">{t.transitaire.documentsHelp}</p>
        </div>
      )}
      {error && <p className="text-red-600 text-xs" role="alert">{error}</p>}
    </div>
  );
}
