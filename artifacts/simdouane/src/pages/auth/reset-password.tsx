import { useState, type FormEvent } from "react";
import { Link, useLocation } from "wouter";
import { CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AuthError, AuthField, AuthShell } from "@/components/auth/auth-shell";
import { supabase, useAuth } from "@/lib/auth";
import { authErrorMessage, MIN_PASSWORD_LENGTH } from "@/lib/auth-errors";
import { linkError } from "@/lib/auth-links";
import { useMvpTexts } from "@/lib/mvp-texts";

/**
 * Opened from the "forgot password" e-mail: the link signs the visitor in
 * (Supabase reads the token from the address), then a new password is chosen.
 */
export default function ResetPasswordPage() {
  const t = useMvpTexts().auth;
  const [, setLocation] = useLocation();
  const { user, isLoaded } = useAuth();
  const [failedLink] = useState(() => linkError(window.location));
  const [form, setForm] = useState({ password: "", confirm: "" });
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [done, setDone] = useState(false);

  if (!isLoaded) {
    return <AuthShell title={t.reset.title}><p className="text-sm text-slate-500">{t.loading}</p></AuthShell>;
  }

  if (failedLink || !user) {
    return (
      <AuthShell title={t.reset.title}>
        <AuthError message={t.reset.invalidLink} />
        <Button asChild className="w-full h-11 bg-[#003D24] hover:bg-[#004d2e] text-white font-semibold">
          <Link href="/mot-de-passe-oublie">{t.reset.requestNew}</Link>
        </Button>
      </AuthShell>
    );
  }

  if (done) {
    return (
      <AuthShell title={t.reset.title}>
        <p className="flex gap-2 text-sm text-emerald-800"><CheckCircle2 className="h-5 w-5 shrink-0" />{t.reset.done}</p>
        <Button onClick={() => setLocation("/dashboard")} className="w-full h-11 bg-[#003D24] hover:bg-[#004d2e] text-white font-semibold">
          {t.confirmation.continue}
        </Button>
      </AuthShell>
    );
  }

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const errors: Record<string, string> = {};
    if (form.password.length < MIN_PASSWORD_LENGTH) errors.password = t.errors.weakPassword;
    if (form.confirm !== form.password) errors.confirm = t.errors.passwordMismatch;
    setFieldErrors(errors);
    setError(null);
    if (Object.keys(errors).length) return;
    setPending(true);
    const { error: updateError } = await supabase.auth.updateUser({ password: form.password });
    setPending(false);
    if (updateError) setError(authErrorMessage(updateError, t.errors));
    else setDone(true);
  };

  return (
    <AuthShell title={t.reset.title} subtitle={t.reset.subtitle}>
      <form onSubmit={submit} noValidate className="space-y-4">
        <AuthField id="password" label={t.newPassword} type="password" autoComplete="new-password" value={form.password}
          onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))} error={fieldErrors.password} hint={t.passwordHint} />
        <AuthField id="confirm" label={t.confirmPassword} type="password" autoComplete="new-password" value={form.confirm}
          onChange={(e) => setForm((f) => ({ ...f, confirm: e.target.value }))} error={fieldErrors.confirm} />
        <AuthError message={error} />
        <Button type="submit" disabled={pending} className="w-full h-11 bg-[#003D24] hover:bg-[#004d2e] text-white font-semibold">
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : t.reset.submit}
        </Button>
      </form>
    </AuthShell>
  );
}
