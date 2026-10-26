import type { CaseStatus } from "@workspace/api-client-react";
import { useMvpTexts } from "@/lib/mvp-texts";
import { cn } from "@/lib/utils";

const STYLE: Record<CaseStatus, string> = {
  draft: "bg-slate-100 text-slate-700 border-slate-200",
  incomplete: "bg-amber-50 text-amber-800 border-amber-200",
  ready: "bg-green-50 text-green-800 border-green-200",
};

export function CaseStatusBadge({ status, className }: { status: CaseStatus; className?: string }) {
  const t = useMvpTexts();
  return (
    <span className={cn("inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold", STYLE[status], className)}>
      {t.cases.status[status]}
    </span>
  );
}

/** Reminder shown on every file screen: preparation only, not an official filing. */
export function CaseDisclaimer() {
  const t = useMvpTexts();
  return <p className="text-xs text-slate-500 border-l-2 border-[#FCD116] pl-3">{t.cases.disclaimer}</p>;
}
