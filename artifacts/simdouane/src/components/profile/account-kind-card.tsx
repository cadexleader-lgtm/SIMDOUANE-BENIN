import { useEffect, useState } from "react";
import { Building2, Check, Loader2 } from "lucide-react";
import { getGetProfileQueryKey, useUpdateProfile, type UserProfile } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { queryClient } from "@/lib/queryClient";
import { apiErrorMessage, useMvpTexts } from "@/lib/mvp-texts";
import { cn } from "@/lib/utils";

type Kind = "particulier" | "entreprise";

export function AccountKindCard({ profile }: { profile: UserProfile }) {
  const t = useMvpTexts();
  const update = useUpdateProfile();
  const [kind, setKind] = useState<Kind>((profile.accountKind as Kind) ?? "particulier");
  const [legalName, setLegalName] = useState(profile.organization?.legalName ?? "");
  const [ifu, setIfu] = useState(profile.organization?.ifu ?? "");
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setKind((profile.accountKind as Kind) ?? "particulier");
    setLegalName(profile.organization?.legalName ?? "");
    setIfu(profile.organization?.ifu ?? "");
  }, [profile.accountKind, profile.organization?.legalName, profile.organization?.ifu]);

  const save = () => {
    setError(null);
    if (kind === "entreprise" && legalName.trim().length < 2) {
      setError(t.accountKind.legalName + " : obligatoire.");
      return;
    }
    update.mutate(
      { data: kind === "entreprise" ? { accountKind: kind, legalName: legalName.trim(), ifu: ifu.trim() || null } : { accountKind: kind } },
      {
        onSuccess: (data) => {
          queryClient.setQueryData(getGetProfileQueryKey(), data);
          setSaved(true);
          setTimeout(() => setSaved(false), 3000);
        },
        onError: (err) => setError(apiErrorMessage(err, t.common.errorGeneric)),
      },
    );
  };

  return (
    <Card className="border-slate-200 shadow-sm">
      <CardHeader className="border-b border-slate-100 pb-4">
        <CardTitle className="text-lg flex items-center gap-2">
          <Building2 className="h-5 w-5 text-[#003D24]" /> {t.accountKind.title}
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-6 space-y-4">
        <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label={t.accountKind.title}>
          {(["particulier", "entreprise"] as const).map((k) => (
            <button
              key={k}
              type="button"
              role="radio"
              aria-checked={kind === k}
              onClick={() => setKind(k)}
              className={cn(
                "rounded-xl border px-4 py-3 text-sm font-semibold transition-colors",
                kind === k ? "border-[#003D24] bg-[#003D24]/5 text-[#003D24]" : "border-slate-200 text-slate-600 hover:bg-slate-50",
              )}
            >
              {t.accountKind[k]}
            </button>
          ))}
        </div>

        {kind === "entreprise" && (
          <div className="space-y-3">
            <label className="block text-sm font-medium text-slate-700">
              {t.accountKind.legalName}
              <Input className="mt-1" value={legalName} maxLength={200} placeholder={t.accountKind.legalNamePlaceholder} onChange={(e) => setLegalName(e.target.value)} />
            </label>
            <label className="block text-sm font-medium text-slate-700">
              {t.accountKind.ifu}
              <Input className="mt-1" value={ifu} maxLength={40} inputMode="numeric" placeholder={t.accountKind.ifuPlaceholder} onChange={(e) => setIfu(e.target.value)} />
            </label>
          </div>
        )}

        <p className="text-xs text-slate-500">{t.accountKind.help}</p>
        {error && <p className="text-sm text-red-600" role="alert">{error}</p>}

        <div className="flex justify-end">
          <Button onClick={save} disabled={update.isPending} className="bg-[#003D24] hover:bg-[#004d2e] text-white">
            {update.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : saved ? <><Check className="h-4 w-4 mr-1" />{t.common.saved}</> : t.common.save}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
