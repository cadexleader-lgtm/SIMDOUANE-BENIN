import { AlertTriangle, Info } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Budget, LineBasis } from "@/lib/budget";
import { T } from "@/lib/translations";
import { formatFCFA } from "@/lib/utils";

type Lang = "fr" | "en";

const TAG_STYLE: Record<LineBasis, string> = {
  declared: "bg-slate-100 text-slate-700",
  estimated: "bg-amber-100 text-amber-800",
  actual: "bg-green-100 text-green-800",
};

/** Results page: total budget, what is already paid and the estimated balance. */
export function BudgetCard({ budget, lang }: { budget: Budget; lang: Lang }) {
  const t = T[lang].results;
  return (
    <Card data-testid="budget-card">
      <CardHeader className="pb-3 border-b">
        <CardTitle className="text-sm font-semibold">
          {t.budgetTitle} <span className="font-normal text-muted-foreground">— {t.situationLabels[budget.situation]}</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-4 space-y-4">
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="rounded-lg bg-muted/50 p-3">
            <p className="text-[11px] text-muted-foreground">{t.budgetTotal}</p>
            <p className="font-bold text-sm" data-testid="budget-total">{formatFCFA(budget.total)}</p>
          </div>
          <div className="rounded-lg bg-green-50 border border-green-200 p-3">
            <p className="text-[11px] text-green-800">{t.budgetPaid}</p>
            <p className="font-bold text-sm text-green-900" data-testid="budget-paid">{formatFCFA(budget.paid)}</p>
          </div>
          <div className="rounded-lg p-3 text-white" style={{ backgroundColor: "#005A36" }}>
            <p className="text-[11px] opacity-80">{t.budgetRemaining}</p>
            <p className="font-bold text-sm" data-testid="budget-remaining">{formatFCFA(budget.remaining)}</p>
          </div>
        </div>

        <ul className="divide-y text-sm">
          {budget.lines.map((line) => (
            <li key={line.key} className="flex items-start justify-between gap-3 py-2" data-testid={`budget-line-${line.key}`}>
              <span className="text-muted-foreground">
                {t.lineNames[line.key]}
                <span className={`ml-2 inline-block rounded px-1.5 py-0.5 text-[10px] font-semibold ${TAG_STYLE[line.basis]}`}>
                  {t.basisTags[line.basis]}
                </span>
                {line.paid > 0 && (
                  <span className="ml-1 inline-block rounded px-1.5 py-0.5 text-[10px] font-semibold bg-green-600 text-white">{t.paidTag}</span>
                )}
              </span>
              <span className="text-right">
                <span className={line.amount === null ? "text-amber-700 font-medium" : "font-medium"}>
                  {line.amount === null ? t.notProvided : formatFCFA(line.amount)}
                </span>
                {line.estimate !== undefined && (
                  <span className="block text-[11px] text-muted-foreground">{t.estimateWas(formatFCFA(line.estimate))}</span>
                )}
              </span>
            </li>
          ))}
        </ul>

        {budget.missing.length > 0 && (
          <p className="text-xs font-medium text-amber-700 flex items-start gap-1.5" data-testid="budget-incomplete">
            <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
            {t.budgetIncomplete(budget.missing.map((m) => t.lineNames[m].toLowerCase()).join(lang === "fr" ? " et " : " and "))}
          </p>
        )}
        <p className="text-[11px] text-muted-foreground flex items-start gap-1.5">
          <Info className="h-3.5 w-3.5 shrink-0 mt-0.5" /> {t.budgetNote}
        </p>
      </CardContent>
    </Card>
  );
}
