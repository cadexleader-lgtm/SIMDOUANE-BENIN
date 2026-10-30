import { useState, type FormEvent } from "react";
import { CheckCircle2, KeyRound, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AuthError, AuthField } from "@/components/auth/auth-shell";
import { supabase } from "@/lib/auth";
import { authErrorMessage, MIN_PASSWORD_LENGTH } from "@/lib/auth-errors";
import { useMvpTexts } from "@/lib/mvp-texts";

/** Password change for the signed-in account (Supabase Auth). */
export function ChangePasswordCard() {
  const t = useMvpTexts().auth;
  const [form, setForm] = useState({ password: "", confirm: "" });
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [done, setDone] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const errors: Record<string, string> = {};
    if (form.password.length < MIN_PASSWORD_LENGTH) errors.password = t.errors.weakPassword;
    if (form.confirm !== form.password) errors.confirm = t.errors.passwordMismatch;
    setFieldErrors(errors);
    setError(null);
    setDone(false);
    if (Object.keys(errors).length) return;
    setPending(true);
    const { error: updateError } = await supabase.auth.updateUser({ password: form.password });
    setPending(false);
    if (updateError) {
      setError(authErrorMessage(updateError, t.errors));
      return;
    }
    setForm({ password: "", confirm: "" });
    setDone(true);
  };

  return (
    <Card className="border-slate-200 shadow-sm bg-slate-50">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <KeyRound className="h-4 w-4 text-slate-500" />
          {t.changePassword.title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={submit} noValidate className="space-y-3">
          <p className="text-xs text-slate-500 leading-relaxed">{t.changePassword.description}</p>
          <AuthField id="new-password" label={t.newPassword} type="password" autoComplete="new-password" value={form.password}
            onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))} error={fieldErrors.password} hint={t.passwordHint} />
          <AuthField id="confirm-new-password" label={t.confirmPassword} type="password" autoComplete="new-password" value={form.confirm}
            onChange={(e) => setForm((f) => ({ ...f, confirm: e.target.value }))} error={fieldErrors.confirm} />
          <AuthError message={error} />
          {done && (
            <p role="status" className="flex items-center gap-2 text-sm text-emerald-700">
              <CheckCircle2 className="h-4 w-4" />{t.changePassword.done}
            </p>
          )}
          <Button type="submit" variant="outline" size="sm" disabled={pending} className="w-full text-xs font-semibold">
            {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : t.changePassword.submit}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
